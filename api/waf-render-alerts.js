/**
 * api/waf-render-alerts.js
 *
 * Server-side proxy: fetches the alert list from the Render firewall
 * and returns it to the browser. Avoids CORS issues and hides the
 * Render URL from the client.
 *
 * GET /api/waf-render-alerts
 */

const WAF_URL = process.env.WAF_URL || 'https://firewall-o5y1.onrender.com';

export default async function handler(req, res) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    let alerts = [];
    try {
      const r = await fetch(`${WAF_URL}/admin/alerts`, { signal: controller.signal });
      if (r.ok) {
        const contentType = r.headers.get('content-type') || '';
        const raw = await r.text();
        if (/application\/json/i.test(contentType)) {
          try {
            const data = JSON.parse(raw);
            alerts = data.alerts || [];
          } catch (_) {
            alerts = [];
          }
        } else {
          // HTML/non-JSON (e.g., Render error page) → treat as no alerts available
          alerts = [];
        }
      }
    } finally {
      clearTimeout(timer);
    }

    return res.status(200).json({ alerts, total: alerts.length });
  } catch (_) {
    return res.status(200).json({ alerts: [], total: 0, note: 'Render firewall unreachable' });
  }
}
