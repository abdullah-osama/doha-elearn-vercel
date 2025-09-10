// Vercel Edge Function proxy to InfinityFree (/elearn)
export const config = { runtime: 'edge' };

const ORIGIN = 'https://dohaelearning.infinityfree.me';
const BASE_PATH = '/elearn';

function joinPath(base, path) {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

export default async function handler(req) {
  const reqUrl = new URL(req.url);

  // Build target URL keeping /elearn prefix
  const target = new URL(ORIGIN);
  target.pathname = joinPath(BASE_PATH, reqUrl.pathname);
  target.search = reqUrl.search;

  const init = {
    method: req.method,
    headers: req.headers,
    redirect: 'manual'
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target.toString(), init);
  const headers = new Headers(upstream.headers);

  // Keep redirects inside *.vercel.app
  const backendHost = new URL(ORIGIN).host;
  const loc = headers.get('location');
  if (loc) {
    const locUrl = new URL(loc, ORIGIN);
    if (locUrl.host === backendHost) {
      const newLoc = reqUrl.origin + locUrl.pathname.replace(/^\/elearn/, '') + locUrl.search + locUrl.hash;
      headers.set('location', newLoc);
    }
  }

  const ctype = headers.get('content-type') || '';
  if (ctype.includes('text/html')) {
    let html = await upstream.text();
    const origin = reqUrl.origin;
    html = html
      .replaceAll('https://dohaelearning.infinityfree.me/elearn', origin)
      .replaceAll('https://dohaelearning.infinityfree.me', origin)
      .replaceAll('href="/elearn/', 'href="/')
      .replaceAll('src="/elearn/', 'src="/')
      .replaceAll('action="/elearn/', 'action="/');
    headers.delete('content-length');
    headers.delete('strict-transport-security');
    return new Response(html, { status: upstream.status, headers });
  }

  headers.delete('strict-transport-security');
  return new Response(upstream.body, { status: upstream.status, headers });
}
