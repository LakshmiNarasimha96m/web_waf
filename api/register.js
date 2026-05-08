import { validateField, sanitizeInput } from '../utils/wafRules.js';
import { checkWAF } from '../utils/wafClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST is allowed for register.' });
  }

  const username = String(req.body?.username ?? '').trim();
  const email    = String(req.body?.email    ?? '').trim();
  const password = String(req.body?.password ?? '');

  const userVal  = validateField(username, { minLength: 3,  maxLength: 32  });
  const emailVal = validateField(email,    { minLength: 5,  maxLength: 128 });
  const passVal  = validateField(password, { minLength: 5,  maxLength: 128 });

  if (!userVal.valid)  return res.status(400).json({ error: userVal.message });
  if (!emailVal.valid) return res.status(400).json({ error: emailVal.message });
  if (!passVal.valid)  return res.status(400).json({ error: passVal.message });

  // ── WAF check on username + email combined ───────────────────────────────
  const combined = username + ' ' + email;
  const waf = await checkWAF(combined, 'register');
  if (waf.blocked) {
    return res.status(403).json({ blocked: true, message: waf.message });
  }

  const safeUsername = sanitizeInput(username);
  const safeEmail    = sanitizeInput(email);
  return res.status(200).json({
    message: `Registration successful for ${safeUsername}.`,
    username: safeUsername,
    email: safeEmail,
  });
}
