/**
 * wafClient.js  — fixed for Render free-tier cold starts
 *
 * Problem that was happening:
 *   Render free tier sleeps after 15 min inactivity.
 *   Cold start = 30–50 s.  Vercel function timeout = 10 s.
 *   So fetch to Render timed out → local fallback blocked correctly
 *   BUT could not reach Render to log the alert → dashboard stayed at 0.
 *
 * Fix:
 *   1. 8 s timeout on WAF call (leaves 2 s for response handling).
 *   2. On timeout/unreachable → local fallback blocks AND stores alert
 *      in module-level memory (survives within the same lambda warm instance).
 *   3. A background retry fires after the block response is sent,
 *      attempting to forward the alert to Render once it wakes up.
 *   4. /api/waf-alerts.js exposes the local store so your own page
 *      can show alerts even when Render is cold.
 */

import { inspectInput } from './wafRules.js';

const WAF_URL = process.env.WAF_URL || 'https://firewall-o5y1.onrender.com';
const WAF_TIMEOUT_MS = 8000; // 8 seconds
const WAF_CHECK_PATH_JSON = process.env.WAF_CHECK_PATH_JSON || '/api/waf';
const WAF_CHECK_PATH_HTML = process.env.WAF_CHECK_PATH_HTML || '/';

// ── In-memory local alert store (Vercel lambda warm-instance scope) ──────────
// Holds up to 200 alerts caught during Render cold-start / unreachable periods.
export const localAlerts = [];
const MAX_LOCAL_ALERTS = 200;

function storeLocalAlert(alert) {
  if (localAlerts.length >= MAX_LOCAL_ALERTS) localAlerts.shift();
  localAlerts.push(alert);
}

function joinUrl(base, pathname) {
  const b = String(base || '').replace(/\/+$/, '');
  let p = String(pathname || '');
  if (!p.startsWith('/')) p = '/' + p;
  // Common misconfig: base already ends with "/api" and code adds "/api/..."
  if (b.endsWith('/api') && p.startsWith('/api/')) p = p.slice(4);
  return b + p;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseWafHtmlResult(html) {
  const headline = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || '';
  const headlineText = stripHtml(headline);

  const explanationBlock =
    html.match(/<p>\s*<b>\s*Explanation:\s*<\/b>\s*<\/p>\s*<p>([\s\S]*?)<\/p>/i)?.[1] || '';
  const explanation = stripHtml(explanationBlock);

  const m = headlineText.match(/ATTACK\s*DETECTED\s*:\s*(.+?)\s*\(confidence:\s*([0-9.]+)\)/i);
  const attackType = m?.[1]?.trim() || null;
  const confidence = m?.[2] ? Number(m[2]) : null;

  const isNormal = /NORMAL INPUT/i.test(headlineText) || html.includes('✅ NORMAL INPUT');
  const isAttack = /ATTACK DETECTED/i.test(headlineText) || html.includes('🚨 ATTACK DETECTED');

  return { isNormal, isAttack, headline: headlineText, explanation, attackType, confidence };
}

// ── Background: forward alert to Render once it wakes up ─────────────────────
function forwardToRender(alertData) {
  // Try every 10 s, up to 5 attempts (50 s total — covers Render cold start)
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  function tryForward() {
    attempts++;
    fetch(`${WAF_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertData),
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => {
        if (r.ok) {
          console.log('[WAF FORWARD] Alert sent to Render dashboard after ' + attempts + ' attempt(s)');
        } else if (attempts < MAX_ATTEMPTS) {
          setTimeout(tryForward, 10000);
        }
      })
      .catch(() => {
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(tryForward, 10000);
        }
      });
  }

  // First attempt after 5 s (give Render time to start waking up)
  setTimeout(tryForward, 5000);
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function checkWAF(payload, source) {
  source = source || 'api';
  const str = String(payload || '').trim();
  if (!str) return { blocked: false };

  async function readJsonOrThrow(response) {
    const contentType =
      (response.headers && response.headers.get && response.headers.get('content-type')) || '';
    const raw = await response.text();

    // Render/proxies sometimes return HTML error pages (starts with "<!doctype" / "<html>").
    // Avoid throwing "Unexpected token '<'" by validating content-type before parsing.
    if (!/application\/json/i.test(contentType)) {
      const snippet = raw.slice(0, 120).replace(/\s+/g, ' ').trim();
      throw new Error(
        `Non-JSON response from WAF (status=${response.status}, content-type=${contentType || 'unknown'}) | first_bytes=${snippet}`
      );
    }

    try {
      return JSON.parse(raw);
    } catch (_) {
      const snippet = raw.slice(0, 120).replace(/\s+/g, ' ').trim();
      throw new Error(`Invalid JSON from WAF (status=${response.status}) | first_bytes=${snippet}`);
    }
  }

  // ── PRIMARY: call the AI firewall on Render ───────────────────────────────
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WAF_TIMEOUT_MS);

    let wafRes;
    try {
      wafRes = await fetch(joinUrl(WAF_URL, WAF_CHECK_PATH_JSON), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: str, source }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // Some deployments expose only an HTML form at "/" (no JSON API).
    // If the JSON endpoint returns 404, fall back to HTML and parse the result.
    if (wafRes.status === 404) {
      const htmlRes = await fetch(joinUrl(WAF_URL, WAF_CHECK_PATH_HTML), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'payload=' + encodeURIComponent(str),
        signal: AbortSignal.timeout(7000),
      });

      const html = await htmlRes.text();
      const parsed = parseWafHtmlResult(html);

      if (parsed.isAttack && !parsed.isNormal) {
        console.warn('[WAF BLOCK][AI-HTML] source=' + source + ' | payload=' + str.slice(0, 120));
        return {
          blocked: true,
          message: 'Your request was blocked by the security firewall.',
          explanation: parsed.explanation || undefined,
          attack_type: parsed.attackType || undefined,
          confidence: Number.isFinite(parsed.confidence) ? parsed.confidence : undefined,
        };
      }

      return { blocked: false };
    }

    const data = await readJsonOrThrow(wafRes);

    if (data.block === true) {
      console.warn('[WAF BLOCK][AI] source=' + source + ' | payload=' + str.slice(0, 120));
      // Render already stored the alert in its own alert_store → /admin shows it
      return { blocked: true, message: 'Your request was blocked by the security firewall.' };
    }

    return { blocked: false };

  } catch (err) {
    const isTimeout = err && (err.name === 'AbortError' || err.name === 'TimeoutError');
    console.error(
      '[WAF ' + (isTimeout ? 'TIMEOUT' : 'UNREACHABLE') + '] source=' + source +
      ' | error=' + (err && err.message)
    );

    // ── FALLBACK: local signature rules ──────────────────────────────────────
    const local = inspectInput(str);

    if (local.blocked) {
      console.warn('[WAF BLOCK][LOCAL FALLBACK] source=' + source + ' | reason=' + local.reason);

      const alert = {
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        attack_type: 'Signature Match (local fallback)',
        confidence: 1,
        explanation: local.reason || 'Blocked by local signature rules.',
        payload: str,
        source: source + '-local-fallback',
      };

      // Store locally (instantly visible via /api/waf-alerts)
      storeLocalAlert(alert);

      // Also try to forward to Render dashboard in background
      forwardToRender(alert);

      return {
        blocked: true,
        message: 'Your request was blocked by the security firewall.',
        explanation: local.reason || undefined,
        attack_type: 'Signature Match (local fallback)',
        confidence: 1,
      };
    }

    return { blocked: false };
  }
}
