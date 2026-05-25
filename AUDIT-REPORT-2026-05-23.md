# Comprehensive Codebase Audit Report

**Date:** May 23, 2026
**Branch:** `fix/comprehensive-audit-may-2026`
**Audited by:** Claude Code (Opus 4.6)

---

## Executive Summary

The ESO Toolkit codebase is in **solid working condition** — TypeScript compiles cleanly, ESLint passes with zero warnings, all 2,851 unit tests pass, and the production build succeeds. The main issues are: 568 files with formatting drift (fixed in this PR), backup file debris (removed), several major dependency version gaps, security patterns that need hardening, and oversized production bundles.

---

## Test Results

| Suite | Result |
|-------|--------|
| **TypeScript** | **PASS** — zero errors |
| **ESLint** | **PASS** — zero warnings, zero errors |
| **Prettier** | **FAILED** — 568 files had formatting issues (now fixed) |
| **Unit Tests** | **PASS** — 173/174 suites, 2,851/2,868 tests pass (1 suite skipped, 17 tests skipped) |
| **Production Build** | **PASS** — builds in 1m 25s, 3 oversized chunk warnings |
| **E2E Smoke** | **PASS** — 37/37 tests pass (5.1m) |

---

## CRITICAL — Fix Now

### 1. Node.js Version Out of Range

**Current:** v22.12.0 — **Required by dependencies:** >=22.13.0

Multiple packages (`@inquirer/*`, `eslint-visitor-keys`) require Node.js 22.13.0+. Running on 22.12.0 causes engine compatibility warnings. **Upgrade Node.js to 22.13.0+ (LTS).**

### 2. XSS Vulnerabilities (2 instances)

- **`src/components/TextEditor.tsx:860,910`** — Uses `dangerouslySetInnerHTML` and `innerHTML` with ESO format text. The `deserializeFromESO()` function converts color codes to HTML spans via regex without comprehensive sanitization.
- **`src/components/Calculator.tsx:1607`** — Uses `dangerouslySetInnerHTML` with tooltip `content` containing inline HTML.

**Recommendation:** Sanitize with DOMPurify or switch to React component-based rendering.

### 3. Auth Tokens in localStorage

**Files:** `src/features/auth/auth.ts:36,48,83`, `src/features/auth/AuthContext.tsx:83,93`

Access tokens and refresh tokens stored in `localStorage` are vulnerable to XSS-based theft. If either XSS vulnerability above is exploited, tokens are immediately compromised.

**Recommendation:** Migrate to httpOnly cookies (requires backend support) or implement token rotation.

---

## HIGH — Fix Soon

### 4. npm Audit: 17 Vulnerabilities (5 moderate, 12 high)

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| `brace-expansion` | moderate | Zero-step sequence DoS | Transitive dep (eslint, glob) |
| `lodash` | **high** | Prototype pollution + code injection via `_.template` | Requires `@graphql-codegen/*` v7 (breaking) |
| `qs` | moderate | DoS on null entries with `encodeValuesOnly` | `npm audit fix` available |
| `ws` | moderate | Uninitialized memory disclosure | `npm audit fix` available |
| `ip-address` | moderate | XSS in Address6 HTML methods | `npm audit fix` available |

`npm audit fix` (without `--force`) could not resolve these automatically because they're locked by the `@graphql-codegen` dependency chain. The lodash vulnerabilities require upgrading graphql-codegen from v5 to v7 (breaking change).

### 5. Missing Content Security Policy (CSP)

No CSP headers configured in Vite or deployment config. Without CSP, inline script injection and data exfiltration attacks are easier.

**Recommendation:** Implement `Content-Security-Policy` headers at the CDN/server level.

### 6. Missing Security Headers

- No `Strict-Transport-Security` (HSTS)
- No `X-Content-Type-Options: nosniff`
- No `X-Frame-Options`

These should be set in the Cloudflare/CDN configuration for `esotk.com`.

### 7. Oversized Production Bundles

| Chunk | Size | Gzip | Issue |
|-------|------|------|-------|
| `itemIconResolver` | **13,718 kB** | 1,220 kB | Massive icon data file |
| `index` | **1,512 kB** | 300 kB | Main entry point |
| `FightReplay` | **1,068 kB** | 284 kB | Three.js 3D renderer |

The `itemIconResolver` alone is 13.7MB. This should be lazy-loaded or served as a separate data endpoint. The other two should be further code-split.

### 8. Backup/Debris Files in Source Tree (FIXED)

Removed in this PR:
- `src/components/Calculator.tsx.backup`
- `src/components/Calculator.tsx.backup2`
- `src/components/TextEditor.tsx.backup`
- `src/components/TextEditor.tsx.cleanup`

### 9. Formatting Drift (FIXED)

568 files had Prettier formatting issues. All fixed with `npm run format` in this PR.

---

## IMPORTANT — Plan Migrations

### 10. Major Dependency Version Gaps

These are all **multi-major-version gaps** requiring dedicated migration efforts:

| Package | Current | Latest | Gap | Notes |
|---------|---------|--------|-----|-------|
| **Vite** | 6.4.2 | **8.0.14** | 2 major | v8 uses Rolldown (Rust bundler), `build.rollupOptions` → `build.rolldownOptions` |
| **MUI** | 7.3.x | **9.0.1** | 2 major | v8 skipped, v9 adds NumberField, 30% sx perf boost, a11y improvements |
| **TypeScript** | 5.9.3 | **6.0.3** | 1 major | Last JS-based compiler, migration prep for TS 7.0 (Go rewrite) |
| **Storybook** | 9.1.x | **10.4.1** | 1 major | v10 is ESM-only, 29% smaller install |
| **web-vitals** | 2.1.4 | **5.2.0** | 3 major | v2 is heavily outdated, missing INP metric |
| **@vitejs/plugin-react-swc** | 3.11.0 | **4.3.1** | 1 major | Required for Vite 8 |
| **rollbar** | 2.26.5 | **3.1.0** | 1 major | Session Replay config changed |
| **react-ga4** | 2.1.0 | **3.0.1** | 1 major | |
| **react-markdown** | 9.1.0 | **10.1.0** | 1 major | |
| **cross-env** | 7.0.3 | **10.1.0** | 3 major | Consider replacing with native Node.js `--env-file` |
| **dotenv** | 16.6.1 | **17.4.2** | 1 major | |
| **glob** | 11.1.0 | **13.0.6** | 2 major | |
| **@testing-library/user-event** | 13.5.0 | **14.6.1** | 1 major | v14 makes all APIs async, significant test migration |
| **@graphql-codegen/** | 5.x | **7.0.0** | 2 major | Fixes lodash vulnerability chain |
| **@types/node** | 20.19.x | **25.9.1** | 5 major | Node 22 APIs missing type coverage |

### 11. Unmaintained Dependencies

| Package | Last Published | Risk |
|---------|---------------|------|
| **redux-persist** | 3+ years ago | Not compatible with RTK v2 without workarounds. No active maintainer. |
| **redux-first-history** | 2+ years ago | No React Router v7 support documented. 1 maintainer. |

### 12. Safe Semver Updates Available (within `^` range)

These can be applied with `npm update`:

| Package | Current → Latest |
|---------|-----------------|
| `@apollo/client` | 4.1.9 → 4.2.0 |
| `date-fns` | 4.1.0 → 4.3.0 |
| `echarts` | 6.0.0 → 6.1.0 |
| `framer-motion` | 12.38.0 → 12.40.0 |
| `react` / `react-dom` | 19.2.5 → 19.2.6 |
| `react-router-dom` | 7.14.2 → 7.15.1 |
| `@swc/core` | 1.15.33 → 1.15.40 |
| And ~15 more dev dependencies |

---

## MEDIUM — Backlog

### 13. Security: Open Redirect Validation

**File:** `src/features/auth/auth.ts:59-65`

`getIntendedDestination()` checks `startsWith('/')` and `!startsWith('//')` but doesn't prevent all open redirect vectors. Consider a strict allowlist approach.

### 14. Security: Desktop OAuth Callback

**File:** `src/OAuthRedirect.tsx:77-110`

Tokens sent to `http://localhost:<port>/callback` without HTTPS or CSRF/state validation.

### 15. Security: Missing iframe Sandbox

**File:** `src/features/roster-hub/components/RosterPreviewDialog.tsx:479`

Iframe lacks `sandbox` attribute. Add `sandbox="allow-same-origin allow-scripts allow-popups"`.

### 16. Code Quality: Monolithic Components

6 components exceed 1,000+ lines:

| File | Lines |
|------|-------|
| `Calculator.tsx` | 6,245 |
| `LandingPage.tsx` | 3,410 |
| `RosterBuilderPage.tsx` | 3,320 |
| `BuildViewPage.tsx` | 2,995 |
| `PlayerCard.tsx` | 2,734 |
| `ParseAnalysisPage.tsx` | 2,694 |

### 17. Code Quality: `any` Types

58 instances of `any` types across 19 files (mostly in test files and GraphQL generated code). The GraphQL codegen config should be tightened to avoid `data?: any | null` patterns.

### 18. Code Quality: Console Statements

629 `console.log/warn/error/debug` statements across 31 files. Production code should use the Logger context.

### 19. Code Quality: TODOs and FIXMEs

204 TODO/FIXME/HACK/TEMP markers across 14 files. Notable concentrations in:
- `src/features/loadout-manager/data/classSkillIds.ts` (66 occurrences)
- `src/data/skill-lines/class/` (40+ per file)

### 20. Accessibility Gaps

Only ~363 aria attributes found across 1,115+ source files. Missing:
- aria-labels on interactive icons and buttons
- Screen reader announcements for dynamic content
- Keyboard navigation gaps in custom widgets

### 21. Missing Feature-Level Error Boundaries

Global `ErrorBoundary` exists in `App.tsx`, but no feature-specific boundaries around:
- `src/features/fight_replay/` (3D renderer, crash-prone)
- `src/features/loadout-manager/` (complex form handling)
- `src/features/report_details/` (critical user data)

### 22. ESLint Disable Comments

90 `eslint-disable` comments across 30 files. Many suppress legitimate warnings that should be properly fixed.

---

## Changes Made in This PR

1. **Prettier formatting** — Fixed 568 files to pass `format:check`
2. **Removed backup files** — Deleted 4 `.backup` / `.cleanup` files from `src/components/`

---

## Recommended Migration Priority

### Phase 1 — Quick Wins (1-2 days)
- [ ] Upgrade Node.js to 22.13.0+ LTS
- [ ] Run `npm update` for safe semver bumps
- [ ] Add DOMPurify to sanitize `dangerouslySetInnerHTML` usage
- [ ] Add security headers via Cloudflare (CSP, HSTS, X-Frame-Options)
- [ ] Add `sandbox` attribute to iframe in RosterPreviewDialog

### Phase 2 — Moderate Effort (1 week)
- [ ] Upgrade `@graphql-codegen/*` v5 → v7 (fixes lodash vulnerability chain)
- [ ] Upgrade `web-vitals` 2 → 5 (adds INP metric)
- [ ] Upgrade `@testing-library/user-event` 13 → 14
- [ ] Migrate auth tokens from localStorage to httpOnly cookies
- [ ] Add error boundaries to fight_replay, loadout-manager, report_details

### Phase 3 — Major Migrations (2-4 weeks each)
- [ ] TypeScript 5.9 → 6.0 (prep for TS 7.0 Go rewrite)
- [ ] Vite 6 → 8 (Rolldown migration)
- [ ] MUI 7 → 9 (skip v8)
- [ ] Storybook 9 → 10 (ESM-only)
- [ ] Evaluate replacing redux-persist (unmaintained)
- [ ] Evaluate replacing redux-first-history (unmaintained)

### Phase 4 — Long-term Cleanup
- [ ] Break up 6 monolithic components (>1,000 LOC each)
- [ ] Lazy-load `itemIconResolver` (13.7MB chunk)
- [ ] Audit and remove 629 console statements
- [ ] Address 204 TODO/FIXME markers
- [ ] Improve accessibility (aria-labels, keyboard nav)
- [ ] Remove/justify 90 eslint-disable comments
