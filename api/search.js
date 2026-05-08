/**
 * api/search.js
 * 
 * Flow:
 * 1. Receive user input
 * 2. Send to AI firewall (Render) via wafClient
 * 3. If blocked  → firewall logs the alert internally + we log to Vercel console → return {blocked:true}
 * 4. If allowed  → return search results
 * 
 * The client JS (search.js) ONLY displays {blocked:true}. It never decides to block.
 * ALL logging happens here on the server → admin dashboard gets populated.
 */

import { checkWAF } from '../utils/wafClient.js';

const sampleProducts = [
  { title: 'Abstract oil painting',  description: 'A colorful abstract oil painting for modern interiors.' },
  { title: 'Classic sculpture',      description: 'A hand-finished modern sculpture in resin and stone.' },
  { title: 'Contemporary canvas',    description: 'A vibrant canvas print that brightens any room.' },
  { title: 'Minimalist art print',   description: 'A simple, elegant print that works in every home.' },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST is allowed for search.' });
  }

  const rawTerm    = req.body?.searchFor ?? '';
  const searchTerm = String(rawTerm).trim();

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search term is required.' });
  }

  // ── WAF CHECK (server-side, always) ─────────────────────────────────────
  // checkWAF calls the AI firewall on Render.
  // On block: firewall stores alert → visible on /admin dashboard.
  // On firewall unreachable: falls back to local signature rules.
  const waf = await checkWAF(searchTerm, 'search');
  if (waf.blocked) {
    return res.status(403).json({
      blocked: true,
      message: waf.message
    });
  }

  // ── NORMAL SEARCH ────────────────────────────────────────────────────────
  const lower   = searchTerm.toLowerCase();
  const results = sampleProducts.filter(
    (item) =>
      item.title.toLowerCase().includes(lower) ||
      item.description.toLowerCase().includes(lower)
  );

  return res.status(200).json({
    searchTerm,
    results: results.length
      ? results
      : [{ title: 'No matches found', description: `No results for "${searchTerm}".` }],
  });
}
