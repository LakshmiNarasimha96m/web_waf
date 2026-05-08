import { NextResponse } from 'next/server';

// ─── CONFIG ─────────────────────────────────────────────────────────────────
// Set WAF_URL in your Vercel project environment variables.
// e.g.  https://your-firewall.onrender.com
const WAF_URL = process.env.WAF_URL || 'https://firewall-o5y1.onrender.com';

// Paths that bypass the middleware WAF check entirely
const EXEMPT_PREFIXES = [
  '/_next/',
  '/favicon.ico',
  '/images/',
  '/css/',
  '/js/',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function buildBlockedHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Request Blocked</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;background:#0b0f19;color:#e5e7eb;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:#111827;border:1px solid #991b1b;border-radius:14px;padding:36px 40px;max-width:520px;text-align:center}
    .icon{font-size:2.8rem;margin-bottom:16px}
    h1{font-size:1.35rem;font-weight:800;color:#f87171;margin-bottom:10px}
    p{font-size:.92rem;color:#9ca3af;line-height:1.6}
    .badge{display:inline-block;margin-top:18px;padding:4px 14px;border-radius:999px;background:#7f1d1d;color:#fecaca;font-size:.78rem;font-weight:700;letter-spacing:.04em}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#x1F6E1;</div>
    <h1>Request Blocked by AI Firewall</h1>
    <p>Your request was identified as potentially malicious and has been blocked to protect this site.</p>
    <p style="margin-top:12px">If you believe this is an error, please contact the site administrator.</p>
    <span class="badge">BLOCKED</span>
  </div>
</body>
</html>`;
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Build payload: query string + body (for POST/PUT/PATCH)
  let payloadParts = [];

  const qs = request.nextUrl.search;
  if (qs) payloadParts.push(qs);

  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const bodyText = await request.clone().text();
      if (bodyText) payloadParts.push(bodyText);
    } catch (_) {
      // body unreadable - skip
    }
  }

  const payload = payloadParts.join(' ').trim();
  if (!payload) return NextResponse.next();

  // ── Call the AI WAF ──────────────────────────────────────────────────────
  try {
    const wafRes = await fetch(`${WAF_URL}/api/waf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload,
        source: 'middleware:' + pathname,
      }),
    });

    const wafData = await wafRes.json();

    if (wafData.block === true) {
      // Server-side log (visible in Vercel Functions logs)
      console.warn(
        '[WAF BLOCK] middleware | path=' + pathname + ' | payload=' + payload.slice(0, 120)
      );

      // Return HTML block page for browser requests; JSON for API callers
      const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
      if (acceptsHtml) {
        return new NextResponse(buildBlockedHtml(), {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return new NextResponse(
        JSON.stringify({ blocked: true, message: 'Your request was blocked by the security firewall.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    // WAF unreachable - fail open (do not block real users due to infra issues)
    console.error('[WAF UNREACHABLE] middleware:', err && err.message);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
