import { validateField, sanitizeInput } from '../utils/wafRules.js';
import { checkWAF } from '../utils/wafClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST is allowed for login.' });
  }

  const username = String(req.body?.username ?? '').trim();
  const password  = String(req.body?.password ?? '');

  const userVal = validateField(username, { minLength: 3, maxLength: 32 });
  const passVal = validateField(password,  { minLength: 5, maxLength: 128 });

  if (!userVal.valid) return res.status(400).json({ error: userVal.message });
  if (!passVal.valid) return res.status(400).json({ error: passVal.message });

  // ── WAF check ────────────────────────────────────────────────────────────
  const waf = await checkWAF(username, 'login');
  if (waf.blocked) {
    return res.status(403).json({ blocked: true, message: waf.message });
  }

  const safeUsername = sanitizeInput(username);
  return res.status(200).json({ message: `Welcome back, ${safeUsername}!`, username: safeUsername });
}
