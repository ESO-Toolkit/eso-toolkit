const FALLBACK_CSP =
  "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self'; script-src 'self' 'wasm-unsafe-eval' https://www.googletagmanager.com https://cdn.jsdelivr.net; worker-src 'self' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https:; connect-src 'self' https://www.esologs.com https://roster-hub-api.eso-toolkit.workers.dev https://eso-toolkit-discord-bot.eso-toolkit.workers.dev https://api.github.com https://gist.githubusercontent.com https://api.rollbar.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://esolog.uesp.net https://cdn.jsdelivr.net https://tessdata.projectnaptha.com; frame-src 'self' kalpa:; manifest-src 'self'";

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const analyzerRoutePrefixes = ['/report/', '/u/', '/b/'];

export const isAnalyzerHistoryPath = (pathname) =>
  pathname === '/report' ||
  pathname === '/u' ||
  pathname === '/b' ||
  pathname === '/bv' ||
  pathname.startsWith('/bv/') ||
  pathname === '/rv' ||
  pathname.startsWith('/rv/') ||
  analyzerRoutePrefixes.some((prefix) => pathname.startsWith(prefix));

const isHistoryRequest = (request) =>
  (request.method === 'GET' || request.method === 'HEAD') &&
  isAnalyzerHistoryPath(new URL(request.url).pathname);

const getAppShellRequest = (request) => {
  const url = new URL(request.url);
  // Cloudflare Assets does not apply an index-document fallback when html_handling
  // is disabled, so request the built shell explicitly rather than relying on /.
  url.pathname = '/index.html';
  url.search = '';
  return new Request(url, { headers: request.headers, method: request.method });
};

const getHeadersAssetRequest = (request) => {
  const url = new URL(request.url);
  url.pathname = '/_headers';
  url.search = '';
  return new Request(url, { method: 'GET' });
};

export const extractCsp = (headersFile) => {
  const match = headersFile.match(/^\s*Content-Security-Policy:\s*(.+?)\s*$/im);
  const policy = match?.[1]?.trim();
  return policy && !policy.includes('__CSP_INLINE_SCRIPT_HASHES__') ? policy : undefined;
};

const getReportOnlyCsp = async (request, assets) => {
  try {
    const headersAsset = await assets.fetch(getHeadersAssetRequest(request));
    if (headersAsset.ok) {
      return extractCsp(await headersAsset.text()) ?? FALLBACK_CSP;
    }
  } catch {
    // A response must remain safe even if a bad asset release omits _headers.
  }

  return FALLBACK_CSP;
};

const addSecurityHeaders = (response, csp, request) => {
  const headers = new Headers(response.headers);
  headers.delete('Content-Security-Policy');
  headers.set('Content-Security-Policy-Report-Only', csp);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(request.method === 'HEAD' ? null : response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

export const handleRequest = async (request, env) => {
  const assetRequest = isHistoryRequest(request) ? getAppShellRequest(request) : request;
  const [response, csp] = await Promise.all([
    env.ASSETS.fetch(assetRequest),
    getReportOnlyCsp(request, env.ASSETS),
  ]);

  return addSecurityHeaders(response, csp, request);
};

export default { fetch: handleRequest };
