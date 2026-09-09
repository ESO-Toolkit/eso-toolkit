import assert from 'node:assert/strict';
import test from 'node:test';

import { handleRequest, SECURITY_HEADERS } from './index.js';

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
  assert.equal(response.headers.get('Content-Security-Policy-Report-Only'), expectedCsp);
  assert.equal(response.headers.get('Content-Security-Policy'), null);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(response.headers.get(name), value, `${name} is present`);
  }
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
  assertSecurityHeaders(response, csp);
});
