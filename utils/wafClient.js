/**
 * wafClient.js
 * -----------
 * Shared utility used by every API route to:
 *  1. Call the AI firewall (Render service).
 *  2. Fall back to local signature rules if the firewall is unreachable.
 *  3. Log every blocked request to the server console (shows in Vercel logs).
 */

import fetch from 'node-fetch';
import { inspectInput } from './wafRules.js';

const WAF_URL = process.env.WAF_URL || 'https://firewall-o5y1.onrender.com';

/**
 * checkWAF(payload, source)
 * Returns: { blocked: true } or { blocked: false }
 * 
 * When blocked, the firewall already stored the full alert internally.
 * We also emit a Vercel log line so you can see it in your dashboard.
 */
export async function checkWAF(payload, source = 'api') {
  const str = String(payload || '').trim();
  if (!str) return { blocked: false };

  // ── Primary: call the AI firewall ────────────────────────────────────────
  try {
    const wafRes = await fetch(`${WAF_URL}/api/waf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: str, source }),
    });

    const data = await wafRes.json();

    if (data.block === true) {
      console.warn(
        '[WAF BLOCK][AI] source=' + source +
        ' | payload=' + str.slice(0, 120)
      );
      return { blocked: true, message: 'Your request was blocked by the security firewall.' };
    }

    return { blocked: false };

  } catch (err) {
    // ── Fallback: local signature rules ──────────────────────────────────
    console.error('[WAF UNREACHABLE] source=' + source + ' | error=' + (err && err.message));

    const local = inspectInput(str);
    if (local.blocked) {
      console.warn(
        '[WAF BLOCK][LOCAL FALLBACK] source=' + source +
        ' | reason=' + local.reason +
        ' | payload=' + str.slice(0, 120)
      );

      // Attempt to push the locally-caught alert to the firewall admin dashboard
      fetch(`${WAF_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attack_type: 'Signature Match (local fallback)',
          confidence: 1,
          explanation: local.reason || 'Blocked by local signature rules.',
          payload: str,
          source: source + '-local-fallback',
        }),
      }).catch(() => {});

      return { blocked: true, message: 'Your request was blocked by the security firewall.' };
    }

    // WAF down but input looks clean — fail open
    return { blocked: false };
  }
}
