# ESO Toolkit (esotk.com) — Full-Platform Audit — 2026-07-06

Scope: the React web app (`src/`), both Cloudflare Workers (`roster-hub-api/`, `discord-bot/`),
the CI/CD and deploy pipelines (`.github/`), the production build output, and a runtime pass of
a local production build. This audit reconciles the prior `AUDIT-REPORT-2026-05-23.md` backlog
against the current code.

**Method.** Four parallel code reviews (workers security, web-app security/data-handling,
CI/CD, code health) plus a local `vite build` + `vite preview` driven with headless Chromium,
a Lighthouse pass, and `npm audit`. Production esotk.com response headers and a production
Lighthouse run could **not** be captured from the audit sandbox (outbound egress to esotk.com is
blocked and external fonts/APIs fail to load locally); those items are marked **VERIFY IN PROD**.

## Overall assessment

The platform is in **good** shape and materially healthier than the May audit. Highlights:

- **Dependencies**: `npm audit` reports **0 production vulnerabilities** (3 dev-only: `@babel/core`,
  `esbuild`, `js-yaml` — all fixable with `npm audit fix`). The May audit's "17 vulns / lodash chain"
  is resolved; the stack is on current majors (React 19, Router 7, Apollo 4, Vite 8, MUI 9, TS 6).
- **XSS**: both `dangerouslySetInnerHTML` sinks flagged in May now sanitize with DOMPurify's safe
  defaults (no `ADD_ATTR`/`ALLOWED_ATTR`/`addHook` overrides anywhere in `src/`).
- **Workers**: SQL is fully parameterized, every mutation carries an ownership predicate (no IDOR),
  Discord ed25519 verification is correct, secret comparisons are timing-safe, and `/fetch-guide`
  has serious SSRF hardening. No CRITICAL findings.
- **CI/CD**: least-privilege `permissions:` on 15/16 workflows, all third-party actions SHA-pinned,
  short-lived GitHub App tokens, no exploitable `pull_request_target` + checkout pattern.
- **Code health**: 1 TODO marker in app source; 341 unit-test files + 54 Playwright specs.

The most important open item is that the **security headers in `public/_headers` are almost
certainly not served in production** (GitHub Pages ignores that file), which was independently
reached by both the web-app and CI reviews. Everything below is ranked by severity.

---

## HIGH

### H-1. Security headers (`_headers`) are inert on GitHub Pages — CSP/HSTS not enforced
**Files:** `public/_headers`, `.github/actions/build-and-deploy/action.yml:74-80`

The site deploys to **GitHub Pages** (`actions/upload-pages-artifact` → `actions/deploy-pages`).
`public/_headers` is a Cloudflare Pages / Netlify convention; GitHub Pages does not read it and
cannot set custom response headers. So the full CSP, HSTS-preload, `X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` the file declares are very
likely **not present** on responses from esotk.com — meaning the app runs with no CSP, no
clickjacking protection, and no HSTS, despite the file suggesting otherwise.

**VERIFY IN PROD:** `curl -sI https://esotk.com/` and inspect for `content-security-policy` /
`strict-transport-security`. If esotk.com is fronted by Cloudflare (orange-cloud), the domain may
already inject headers via Transform Rules or a Worker — in which case reconcile the two sources so
they don't drift.

**Remediation (pick one):**
1. Move hosting to **Cloudflare Pages** (the repo already uses `*.eso-toolkit.pages.dev` previews),
   where `_headers` works natively. Lowest-drift option.
2. Reproduce the headers as **Cloudflare Transform Rules / a front Worker** if CF already fronts the domain.
3. As a partial fallback, add a `<meta http-equiv="Content-Security-Policy">` to `index.html`
   mirroring the `_headers` policy. Caveats: `frame-ancestors`, HSTS, and `X-Frame-Options` cannot
   be set via `<meta>`; the app uses web workers (Comlink), Three.js, and echarts, so the meta CSP
   must include the right `worker-src`/`wasm` allowances or it will break at runtime — **test live
   before shipping**. This was intentionally left out of this PR's quick wins for that reason.

Separately, the intended CSP itself carries `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'`,
which substantially weakens its XSS value. Tighten toward nonces/hashes when the header path is fixed.

### H-2. Production source maps are published to the public site — **FIXED IN THIS PR**
**Files:** `.github/actions/build-and-deploy/action.yml`, `vite.config.mjs:279`

`deploy.yml` builds with `enable_sourcemaps: 'true'`; `vite.config.mjs` uses `'hidden'` source maps,
which still **emit `.map` files** into `build/assets/` (only the `//# sourceMappingURL` comment is
omitted). The whole `build/` directory was then uploaded, so `https://esotk.com/assets/<bundle>.js.map`
would return the original TypeScript source, comments, and file paths (filename is trivially derived
from the JS filename).

**Fix applied:** a `Remove source maps from public artifact` step
(`find build -name '*.map' -type f -delete`) now runs before `upload-pages-artifact`. Rollbar
symbolication is unaffected — it uses maps produced by the separate `rollbar-sourcemaps.yml` build.
(Severity is HIGH if the repo is private; LOW if public — downgrade accordingly, but not publishing
maps is best practice either way.)

---

## MEDIUM

### M-1. GraphQL proxy is unauthenticated with no rate limit — quota-exhaustion / anonymous data proxy
**File:** `roster-hub-api/src/graphql-proxy.ts:113-235`, CORS at `roster-hub-api/src/index.ts:197-211`

The `/graphql` endpoint is fully unauthenticated and injects the server's own ESO Logs
**client-credentials** token into every forwarded request. The only gates are a 100 KB body cap and
an allowlist match on the *operation name* — the **query body is never validated**, so an attacker
can send arbitrary deeply-nested field selections under an allowlisted name. Unlike `/search-addons`
and `/fetch-guide`, `/graphql` has **no per-IP or global rate limit**, so it can be driven at
unlimited volume: exhausting the ESO Logs API quota tied to the client credentials (denying log
analysis to every site visitor) and mining public guild/report data at scale through the anonymous
proxy. CORS does not mitigate this — a script/curl ignores it.

**Remediation:** add an IP-based rate limit mirroring `/search-addons` (in-memory bucket or D1
`rate_limit_events`); ideally move to **persisted queries** (hash-allowlist the exact documents the
frontend ships) or add query depth/complexity limits rather than trusting arbitrary bodies.

### M-2. OAuth access + refresh tokens stored in localStorage
**Files:** `src/features/auth/auth.ts:37-38`, `src/OAuthRedirect.tsx:139-142` (read at `AuthContext.tsx:83,93,129,308`)

ESO Logs access **and** refresh tokens live in `localStorage` (Discord tokens correctly use
`sessionStorage`). Any XSS or malicious in-page dependency can exfiltrate both; the refresh token is
long-lived, granting durable access. This is the standard static-SPA tradeoff (no backend for
httpOnly cookies) and the May audit's claim is **still accurate** — not yet migrated. Rated MEDIUM
(not CRITICAL) because both innerHTML sinks are now DOMPurify-sanitized.

**Remediation:** proxy token exchange/refresh through the existing Worker and keep the refresh token
server-side (httpOnly cookie / worker session), returning only short-lived access tokens to the page.
Minimum: move the refresh token to `sessionStorage` like the Discord token.

### M-3. Logout does not clear the refresh token — **FIXED IN THIS PR**
**Files:** `src/components/HeaderBar.tsx:616-621`, `src/pages/Banned.tsx:21-25`

Both logout paths removed only `access_token`, leaving `refresh_token` in localStorage. On a shared
machine, `refreshAccessToken()` could silently mint a new access token for the next user — "logout"
was not a real logout.

**Fix applied:** both handlers now also `removeItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY)`. Server-side
token revocation on logout remains a follow-up.

### M-4. CORS wildcard trusts all `*.eso-toolkit.pages.dev` origins
**File:** `roster-hub-api/src/index.ts:197-211`

The allowlist regex `^https:\/\/[a-z0-9-]+\.eso-toolkit\.pages\.dev$` treats any subdomain under the
shared Pages apex as trusted. Real risk is limited (auth is a Bearer token, not cookies), but the
wildcard is broader than needed. **Remediation:** restrict to the exact preview pattern actually used,
or enumerate. Re-evaluate immediately if cookie-based auth is ever introduced.

### M-5. Image moderation is close to cosmetic
**File:** `roster-hub-api/src/image-moderation.ts:24-90` (callers `index.ts:1121-1136,1382-1397`)

Moderation runs `@cf/microsoft/resnet-50` — a 1000-class ImageNet **object** classifier, not an
NSFW/CSAM model — and blocks only 8 weapon-ish labels at ≥0.25 confidence. Pornographic, gore, or
illegal imagery does not map to those classes and uploads cleanly to ImgBB, then serves from
profiles/rosters. Uploads are authenticated (ESO Logs login) and rate-limited (10/hr), so abuse is
attributable and throttled (hence MEDIUM). **Remediation:** use a purpose-built safety model / external
moderation API, or treat the current check as format-validation only and ensure the `image_reports`
reactive-takedown workflow is actually actioned.

### M-6. Several worker endpoints lack input-shape validation / rate limits
**File:** `roster-hub-api/src/index.ts:1455-1486` (and `/rosters/:id/comments` GET at `:558-569`)

`POST /users/avatars/lookup` (unauthenticated, no rate limit — a cheap D1-read amplifier) and
`PUT /users/me/display-names` both call `c.req.json()` with no try/catch (non-JSON → 500), and
display names are stored with only `.trim()` and no length cap. **Remediation:** wrap JSON parsing in
try/catch → 400; cap `na`/`eu` display names (≤64 chars); add a per-IP rate limit to the avatar lookup
and to unauthenticated comment listing.

### M-7. CI: authenticated Playwright reports published to a public repo
**Files:** `nightly-tests.yml:250-251,556-565`, `screen-size-testing.yml` (secrets + publish steps)

Nightly/screen-size tests authenticate to ESO Logs with a client secret and publish Playwright HTML
reports to the **public** `ESO-Toolkit/eso-log-aggregator-reports` Pages site. Playwright traces can
embed full request/response dumps including `Authorization` headers and token-endpoint responses.
**Remediation:** confirm `trace`/`video`/HAR settings; strip attachments before publish (or merge
reports without attachments); or make the reports repo private and use artifact-only distribution.

### M-8. CI: no environment protection on production deploy credentials
**Files:** `deploy-worker.yml:14-28`, `deploy.yml:22-24`

`CLOUDFLARE_API_TOKEN` (worker deploys) and the Pages deploy run without an `environment:` gate, so any
collaborator with write access — or any workflow holding `actions: write` — can deploy to production
with no review. **Remediation:** create protected `production` environments (required reviewers +
branch restriction to `main`) holding the deploy secrets and reference them from the deploy jobs.

### M-9. CI: `nightly-tests.yml` had no top-level `permissions:` — **FIXED IN THIS PR**
**File:** `.github/workflows/nightly-tests.yml`

The workflow (and its `setup` / `nightly-tests` jobs) inherited the repo-default token while running
`npm ci` + Playwright against third-party dependency code. **Fix applied:** added top-level
`permissions: contents: read`; jobs that publish declare their own broader scope, which overrides it.
Recommend also setting the org/repo default `GITHUB_TOKEN` policy to read-only.

### M-10. CI: `cla.yml` uses `pull_request_target` with a broad write token (latent)
**File:** `.github/workflows/cla.yml:6,11-15`

Safe **today** — no step checks out or executes PR code — but it runs in the privileged base context on
every fork PR with `contents: write` + `actions: write` + an App token. One future edit adding
`actions/checkout` of `head.sha` would become full repo compromise, and the supply-chain guard would
not catch it. **Remediation:** scope permissions per-step; add a comment banning checkout of PR refs;
extend `ci-supply-chain-guard.yml` to fail on `pull_request_target` + PR-ref checkout.

---

## LOW / cleanup

- **L-1. Bundle: 10.9 MB `itemIconResolver` chunk is module-preloaded eagerly.**
  `build/assets/itemIconResolver-*.js` is 10.9 MB raw (603 KB gzip) and appears in the eager
  `modulepreload` set of the initial document (via `src/index.tsx:5` `preloadIconData`). Total eagerly
  preloaded ≈ 12.6 MB raw / 1.17 MB gzip across 58 chunks. The May audit's 13.7 MB figure is now
  10.9 MB — still the dominant payload and the top perf lever. **Remediation:** load the icon-name map
  lazily (on first gear/build view) rather than importing it from the app entry; consider a compact
  binary/lookup format or serving it as fetched JSON instead of a JS chunk.
- **L-2. `chunkSizeWarningLimit: 1000` (`vite.config.mjs:312`)** masks large-chunk warnings — several
  chunks exceed 1 MB (`FightReplay` 1.5 MB, `itemIcons` 2.8 MB, `index` 943 KB). Lower it and treat
  new >1 MB chunks as regressions.
- **L-3. Accessibility (local Lighthouse: a11y 95).** Two real failures on the landing/consent surface:
  a `color-contrast` miss on `.light-text`, and a `heading-order` skip (an `<h3>` styled as h5 followed
  by an `<h6>`). Also, `eslint.config.mjs` disables `jsx-a11y/no-autofocus`, `role-supports-aria-props`,
  and `aria-role` — re-enable where feasible.
- **L-4. Dead code to delete:** `src/serviceWorker/cacheManager.ts` (no `navigator.serviceWorker.register`
  anywhere — never runs); `src/assets/calculator/calculator.js` (legacy, unbundled, uses raw innerHTML);
  `scripts/deploy.cjs` (wired to `npm run deploy*` but no workflow calls it; would write git metadata
  into the public `build/`). The stray `worker/` directory (only an accidentally-committed vitest cache
  file) is **removed in this PR**.
- **L-5. Rollbar hardening (`src/utils/errorTracking.ts:63-127,138`):** no `scrubFields`/`captureIp`
  config, and `window.location.href` is reported verbatim (an error on `/oauth-redirect?code=…` reports
  the code — mitigated by single-use PKCE). Add `captureIp: 'anonymize'` and a `transform` that strips
  query strings. Consent-gating and email-dropping are already done well.
- **L-6. GA mid-session revoke (`src/utils/analytics.ts`):** per-call consent checks stop app events, but
  the already-loaded gtag keeps auto-collecting until reload. On revoke, set
  `window['ga-disable-<MEASUREMENT_ID>'] = true`.
- **L-7. Open-redirect hardening — partially FIXED IN THIS PR.** `isValidPath` in `index.html` now also
  rejects backslash paths (`/\evil.com`); apply the same guard to
  `src/components/HashRouteRedirect.tsx:15-37` for parity (the SPA restore path). Not exploitable today
  (cross-origin `replaceState` throws a handled `SecurityError`), pure hardening.
- **L-8. `window.open` without `noopener`** at `BuffUptimeProgressBar.tsx:195,614` and
  `HealingDonePanelView.tsx:140` (trusted esologs.com links) — add for reverse-tabnabbing hygiene.
- **L-9. Worker LOW nits:** 4xx error handler can echo `err.message` (`index.ts:78-83`); Discord
  `withCors` sets no `Vary: Origin`; in-memory rate limiters are per-isolate (best-effort — prefer the
  D1-backed limiter for anything that matters); Discord OAuth `dev-previews` redirect regex is allowed
  even in production (`discord-bot/src/index.ts:86` — gate behind `ENVIRONMENT === 'development'`).
- **L-10. Rollbar sourcemap build mismatch (`rollbar-sourcemaps.yml:35-37`):** the separate Rollbar build
  uses `VITE_BASE_URL=/eso-toolkit/` and a different version scheme than the production `deploy.yml` build
  (root base, custom domain), so chunk hashes differ and symbolication frequently won't match. Consolidate:
  upload maps from the same build as `deploy.yml`.
- **L-11. Dependency classification (`package.json`):** `@mui/material` / `@mui/icons-material` are runtime
  deps used in 394 source files but sit in `devDependencies`; conversely `@testing-library/*`, `@types/react`,
  `@types/react-dom` sit in `dependencies`. No runtime impact (the app is bundled by Vite), but the
  classification is inverted — fix for correctness if any tooling ever runs `npm ci --omit=dev`.
- **L-12. Disabled tests:** 4 unconditional `it.skip` in `src/hooks/useSelectedTargetIds.test.tsx:480,538,577,616`
  and 2 in `tests/dashboard.spec.ts:50,255` — re-enable or delete with a reason.
- **L-13. `public/social-preview.png` is a placeholder text file, not an image.** It contains
  instructions to create a 1200×630 preview. The OG/Twitter tags now point at the valid (but square,
  512×512) `android-chrome-512x512.png`; create a proper 1200×630 `social-preview.png` and repoint the
  tags for correctly-framed link previews.

---

## Quick wins applied in this PR

| Item | Change | Files |
|------|--------|-------|
| Source-map leak (H-2) | Delete `*.map` before Pages upload | `.github/actions/build-and-deploy/action.yml` |
| Logout token leak (M-3) | Clear `refresh_token` on logout | `src/components/HeaderBar.tsx`, `src/pages/Banned.tsx` |
| CI least-privilege (M-9) | Top-level `permissions: contents: read` | `.github/workflows/nightly-tests.yml` |
| SEO: OG/Twitter tags | Absolute URLs, valid `android-chrome-512x512.png`, add `<link rel="canonical">` | `index.html` |
| SEO: sitemap | New `sitemap.xml`, referenced from `robots.txt` | `public/sitemap.xml`, `public/robots.txt` |
| Open-redirect hardening (L-7) | Reject backslash paths in `isValidPath` | `index.html` |
| Dead code | Remove stray `worker/` (accidental vitest cache) | `worker/` |

## Verify-in-production checklist (unreachable from the audit sandbox)

- [ ] `curl -sI https://esotk.com/` — confirm CSP / HSTS / `X-Frame-Options` are actually present (H-1).
- [ ] Fetch a `.../assets/<bundle>.js.map` URL post-deploy — confirm it 404s (H-2 fix landed).
- [ ] Run Lighthouse against production (the sandbox's blocked external fonts/APIs made local perf
      numbers — FCP 12 s — unrepresentative; a11y/SEO/best-practices scored 95/100/96).
- [ ] Confirm the ESO Logs client-credentials quota headroom for the unauthenticated `/graphql` proxy (M-1).
