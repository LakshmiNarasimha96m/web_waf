/**
 * api/waf-ping.js
 *
 * Called by the browser on every page load (from main.js).
 * Hits Render's /health endpoint to wake it up BEFORE any attack is attempted.
 *
 * This means by the time a real user submits a form, Render is already warm
 * and the WAF fetch will succeed within the 8 s timeout.
 *
 * GET /api/waf-ping
 */

const WAF_URL = process.env.WAF_URL || 'https://firewall-o5y1.onrender.com';

export default async function handler(req, res) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    let status = 'unreachable';
    try {
      const r = await fetch(`${WAF_URL}/health`, { signal: controller.signal });
      status = r.ok ? 'ok' : 'error';
    } finally {
      clearTimeout(timer);
    }

    return res.status(200).json({ firewall: status });
  } catch (_) {
    return res.status(200).json({ firewall: 'waking-up' });
  }
}
