import assert from 'node:assert/strict';
import test from 'node:test';

import { CSP_REPORT_PATH, handleRequest, SECURITY_HEADERS } from './index.js';

const resolvedCsp =
  "default-src 'self'; frame-ancestors 'self'; script-src 'self' 'sha256-resolved-inline-hash='";

const makeAssets = ({ headersFile = `/*\n  Content-Security-Policy: ${resolvedCsp}\n*/` } = {}) => {
  const requests = [];

  return {
    requests,
    async fetch(request) {
      const receivedRequest = new Request(request);
      requests.push(receivedRequest);
      const { pathname } = new URL(receivedRequest.url);

      if (pathname === '/_headers') {
        return new Response(headersFile, { status: 200 });
      }

      if (pathname === '/index.html') {
        return new Response(receivedRequest.method === 'HEAD' ? null : '<!doctype html>', {
          headers: { 'Content-Type': 'text/html' },
          status: 200,
        });
      }

      return new Response('not found', { status: 404 });
    },
  };
};

const assertSecurityHeaders = (response, expectedCsp = resolvedCsp) => {
  assert.equal(
    response.headers.get('Content-Security-Policy-Report-Only'),
    `${expectedCsp}; report-uri ${CSP_REPORT_PATH}; report-to csp-violations`,
  );
  assert.equal(response.headers.get('Content-Security-Policy'), null);
  const reportingEndpoints = response.headers.get('Reporting-Endpoints');
  assert.equal(reportingEndpoints, `csp-violations="${CSP_REPORT_PATH}"`);
  const endpointPath = reportingEndpoints.match(/^csp-violations="([^"]+)"$/)?.[1];
  assert.equal(new URL(endpointPath, 'https://esotk.com/report/example').href, 'https://esotk.com/csp-reports');
  assert.equal(response.headers.get('Report-To'), null);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(response.headers.get(name), value, `${name} is present`);
  }
};

const requestReport = (body, options = {}) =>
  new Request(`https://esotk.com${CSP_REPORT_PATH}`, {
    body,
    headers: { 'Content-Type': 'application/csp-report', ...options.headers },
    method: 'POST',
    ...options,
  });

const assertSafeReportResponse = async (response, expectedStatus) => {
  assert.equal(response.status, expectedStatus);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assertSecurityHeaders(response);
};

test('serves the app shell with success semantics for Analyzer history routes', async () => {
  const assets = makeAssets();
  const response = await handleRequest(
    new Request('https://esotk.com/report/example/fight/42/summary?tab=damage'),
    { ASSETS: assets },
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '<!doctype html>');
  assert.equal(new URL(assets.requests[0].url).pathname, '/index.html');
  assert.equal(new URL(assets.requests[0].url).search, '');
  assertSecurityHeaders(response);
});

test('strips query parameters when loading the Analyzer app shell', async () => {
  const assets = makeAssets();
  const response = await handleRequest(
    new Request('https://esotk.com/bv?source=leaderboard&region=NA'),
    { ASSETS: assets },
  );
  const appShellRequest = assets.requests.find(
    (request) => new URL(request.url).pathname === '/index.html',
  );

  assert.equal(response.status, 200);
  assert.equal(appShellRequest?.url, 'https://esotk.com/index.html');
});

test('handles all deployed Analyzer route families without masking unknown paths', async () => {
  for (const pathname of ['/report/abc', '/u/player', '/b/build', '/bv', '/rv/fight']) {
    const assets = makeAssets();
    const response = await handleRequest(new Request(`https://esotk.com${pathname}`), {
      ASSETS: assets,
    });

    assert.equal(response.status, 200, pathname);
    assert.equal(new URL(assets.requests[0].url).pathname, '/index.html', pathname);
  }

  const assets = makeAssets();
  const response = await handleRequest(new Request('https://esotk.com/assets/missing.js'), {
    ASSETS: assets,
  });

  assert.equal(response.status, 404);
  assert.equal(new URL(assets.requests[0].url).pathname, '/assets/missing.js');
  assertSecurityHeaders(response);
});

test('preserves HEAD semantics for Analyzer history routes', async () => {
  const assets = makeAssets();
  const response = await handleRequest(
    new Request('https://esotk.com/report/example', { method: 'HEAD' }),
    {
      ASSETS: assets,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  assert.equal(assets.requests[0].method, 'HEAD');
  assert.equal(new URL(assets.requests[0].url).pathname, '/index.html');
  assertSecurityHeaders(response);
});

test('does not rewrite non-GET Analyzer requests', async () => {
  const assets = makeAssets();
  const response = await handleRequest(
    new Request('https://esotk.com/report/example/fight/42', { method: 'POST' }),
    { ASSETS: assets },
  );
  const requestedPaths = assets.requests.map((request) => new URL(request.url).pathname);

  assert.equal(response.status, 404);
  assert.ok(requestedPaths.includes('/report/example/fight/42'));
  assert.ok(!requestedPaths.includes('/index.html'));
  assertSecurityHeaders(response);
});

test('uses a marker-free report-only CSP fallback if the built header asset is unavailable', async () => {
  const assets = makeAssets({
    headersFile: 'Content-Security-Policy: __CSP_INLINE_SCRIPT_HASHES__',
  });
  const response = await handleRequest(new Request('https://esotk.com/report/example'), {
    ASSETS: assets,
  });

  const csp = response.headers.get('Content-Security-Policy-Report-Only');
  assert.ok(csp?.includes("frame-ancestors 'self'"));
  assert.ok(!csp?.includes('__CSP_INLINE_SCRIPT_HASHES__'));
  const fallbackCsp = csp?.replace(`; report-uri ${CSP_REPORT_PATH}; report-to csp-violations`, '');
  assertSecurityHeaders(response, fallbackCsp);
});

test('links report-only CSP headers to the bounded report endpoint without retaining another endpoint', async () => {
  const assets = makeAssets({
    headersFile: `/*\n  Content-Security-Policy: ${resolvedCsp}; report-uri https://unsafe.example/reports; report-to legacy\n*/`,
  });
  const response = await handleRequest(new Request('https://esotk.com/report/example'), {
    ASSETS: assets,
  });

  const csp = response.headers.get('Content-Security-Policy-Report-Only');
  assert.equal(csp?.includes('https://unsafe.example/reports'), false);
  assert.equal(csp?.includes('report-to legacy'), false);
  assertSecurityHeaders(response);
});

test('accepts a valid legacy CSP report without persisting or echoing its contents', async () => {
  const assets = makeAssets();
  const report = JSON.stringify({
    'csp-report': {
      'document-uri': 'https://esotk.com/report/private-code?player=private-player',
      'effective-directive': 'script-src',
    },
  });
  const response = await handleRequest(requestReport(report), { ASSETS: assets });

  await assertSafeReportResponse(response, 204);
  assert.equal(
    assets.requests.some((request) => new URL(request.url).pathname === '/index.html'),
    false,
  );
});

test('accepts a valid Reporting API CSP report', async () => {
  const assets = makeAssets();
  const report = JSON.stringify([
    {
      body: { effectiveDirective: 'img-src' },
      type: 'csp-violation',
      url: 'https://esotk.com/report/redacted',
    },
  ]);
  const response = await handleRequest(
    requestReport(report, {
      headers: { 'Content-Type': 'application/reports+json; charset=utf-8' },
    }),
    { ASSETS: assets },
  );

  await assertSafeReportResponse(response, 204);
});

test('rejects malformed reports and unsupported content types without exposing report data', async () => {
  const assets = makeAssets();
  const malformed = await handleRequest(requestReport('{private-report-code'), { ASSETS: assets });
  await assertSafeReportResponse(malformed, 400);

  const invalidSchema = await handleRequest(
    requestReport(JSON.stringify({ 'csp-report': { 'effective-directive': ' ' } })),
    { ASSETS: assets },
  );
  await assertSafeReportResponse(invalidSchema, 400);

  const unsupportedContentType = await handleRequest(
    requestReport('{"private":"report-code"}', { headers: { 'Content-Type': 'text/plain' } }),
    { ASSETS: assets },
  );
  await assertSafeReportResponse(unsupportedContentType, 415);
});

test('rejects oversized CSP reports after a bounded read', async () => {
  const assets = makeAssets();
  const response = await handleRequest(requestReport('x'.repeat(8 * 1024 + 1)), {
    ASSETS: assets,
  });

  await assertSafeReportResponse(response, 413);
});

test('allows only POST requests to the CSP report endpoint', async () => {
  const assets = makeAssets();
  const response = await handleRequest(
    new Request(`https://esotk.com${CSP_REPORT_PATH}`, { method: 'GET' }),
    { ASSETS: assets },
  );

  await assertSafeReportResponse(response, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
});
