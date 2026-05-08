/**
 * api/waf-alerts.js
 *
 * Returns alerts that were caught by the LOCAL fallback
 * (when Render was sleeping / unreachable).
 *
 * These are stored in the wafClient module-level array.
 * The Render /admin dashboard shows alerts caught by the AI model.
 * This endpoint shows alerts caught by local signature rules as backup.
 *
 * GET  /api/waf-alerts        → list all local alerts
 * DELETE /api/waf-alerts      → clear local alerts
 */

import { localAlerts } from '../utils/wafClient.js';

export default function handler(req, res) {
  if (req.method === 'DELETE') {
    localAlerts.length = 0;
    return res.status(200).json({ status: 'cleared' });
  }

  return res.status(200).json({
    alerts: [...localAlerts].reverse(),
    total: localAlerts.length,
    note: 'These are alerts caught by the local fallback when the AI firewall was unreachable.',
  });
}
