const FALLBACK_CSP =
  "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self'; script-src 'self' 'wasm-unsafe-eval' https://www.googletagmanager.com https://cdn.jsdelivr.net; worker-src 'self' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https:; connect-src 'self' https://www.esologs.com https://roster-hub-api.eso-toolkit.workers.dev https://eso-toolkit-discord-bot.eso-toolkit.workers.dev https://api.github.com https://gist.githubusercontent.com https://api.rollbar.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://esolog.uesp.net https://cdn.jsdelivr.net https://tessdata.projectnaptha.com; frame-src 'self' kalpa:; manifest-src 'self'";

export const CSP_REPORT_PATH = '/csp-reports';
const CSP_REPORTING_GROUP = 'csp-violations';
const MAX_CSP_REPORT_BYTES = 8 * 1024;
const CSP_REPORT_CONTENT_TYPES = new Set(['application/csp-report', 'application/reports+json']);

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const REPORTING_HEADERS = {
  'Reporting-Endpoints': `${CSP_REPORTING_GROUP}="${CSP_REPORT_PATH}"`,
  'Report-To': JSON.stringify({
    group: CSP_REPORTING_GROUP,
    max_age: 86_400,
    endpoints: [{ url: CSP_REPORT_PATH }],
  }),
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

const withCspReportingEndpoint = (csp) => {
  const directives = csp
    .split(';')
    .map((directive) => directive.trim())
    .filter((directive) => directive.length > 0 && !/^report-(?:uri|to)\s/i.test(directive));

  return `${directives.join('; ')}; report-uri ${CSP_REPORT_PATH}; report-to ${CSP_REPORTING_GROUP}`;
};

const addSecurityHeaders = (response, csp, request) => {
  const headers = new Headers(response.headers);
  headers.delete('Content-Security-Policy');
  headers.set('Content-Security-Policy-Report-Only', withCspReportingEndpoint(csp));

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  for (const [name, value] of Object.entries(REPORTING_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(request.method === 'HEAD' ? null : response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const hasNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isLegacyCspReport = (report) => {
  if (!isRecord(report) || !isRecord(report['csp-report'])) {
    return false;
  }

  const payload = report['csp-report'];
  return hasNonEmptyString(payload['effective-directive']);
};

const isModernCspReport = (report) =>
  isRecord(report) &&
  report.type === 'csp-violation' &&
  hasNonEmptyString(report.url) &&
  isRecord(report.body) &&
  hasNonEmptyString(report.body.effectiveDirective);

const hasValidCspReportSchema = (report) =>
  isLegacyCspReport(report) ||
  (Array.isArray(report) && report.length > 0 && report.every(isModernCspReport));

const isAcceptedCspReportContentType = (request) => {
  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0]?.trim().toLowerCase();
  return contentType !== undefined && CSP_REPORT_CONTENT_TYPES.has(contentType);
};

const contentLengthStatus = (request) => {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength === null) {
    return undefined;
  }

  if (!/^\d+$/.test(contentLength)) {
    return 400;
  }

  return Number(contentLength) > MAX_CSP_REPORT_BYTES ? 413 : undefined;
};

const readBoundedBody = async (request) => {
  if (!request.body) {
    return { status: 400 };
  }

  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      length += value.byteLength;
      if (length > MAX_CSP_REPORT_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // The response remains bounded even if the client has already closed the stream.
        }
        return { status: 413 };
      }

      chunks.push(value);
    }
  } catch {
    return { status: 400 };
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { body: new TextDecoder().decode(body) };
};

const reportResponse = (status, csp, request) =>
  addSecurityHeaders(
    new Response(null, {
      headers: { 'Cache-Control': 'no-store' },
      status,
    }),
    csp,
    request,
  );

const handleCspReport = async (request, assets) => {
  const csp = await getReportOnlyCsp(request, assets);

  if (request.method !== 'POST') {
    const response = reportResponse(405, csp, request);
    response.headers.set('Allow', 'POST');
    return response;
  }

  if (!isAcceptedCspReportContentType(request)) {
    return reportResponse(415, csp, request);
  }

  const declaredLengthStatus = contentLengthStatus(request);
  if (declaredLengthStatus) {
    return reportResponse(declaredLengthStatus, csp, request);
  }

  const boundedBody = await readBoundedBody(request);
  if ('status' in boundedBody) {
    return reportResponse(boundedBody.status, csp, request);
  }

  try {
    const parsedReport = JSON.parse(boundedBody.body);
    return reportResponse(hasValidCspReportSchema(parsedReport) ? 204 : 400, csp, request);
  } catch {
    return reportResponse(400, csp, request);
  }
};

export const handleRequest = async (request, env) => {
  if (new URL(request.url).pathname === CSP_REPORT_PATH) {
    return handleCspReport(request, env.ASSETS);
  }

  const assetRequest = isHistoryRequest(request) ? getAppShellRequest(request) : request;
  const [response, csp] = await Promise.all([
    env.ASSETS.fetch(assetRequest),
    getReportOnlyCsp(request, env.ASSETS),
  ]);

  return addSecurityHeaders(response, csp, request);
};

export default { fetch: handleRequest };
