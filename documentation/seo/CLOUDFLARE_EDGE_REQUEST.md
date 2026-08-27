# Request: put a Cloudflare edge layer in front of esotk.com

**Audience:** whoever administers the `esotk.com` domain / Cloudflare account.
**Requested by:** ESO Toolkit maintainers.
**Status:** not yet actioned. Requires DNS/Cloudflare access that the requester does not have.

## Summary of the ask

Route `esotk.com` through Cloudflare (Workers or Pages) in front of the existing GitHub Pages
origin, so that HTML responses can be modified and headers can be set at the edge.

Nothing about the current build or deploy pipeline needs to change. GitHub Pages stays the origin.

## Why: three problems that cannot be fixed from the repo

### 1. Every shared report, profile, and build link returns HTTP 404

`esotk.com` serves a React SPA with `BrowserRouter`. Static routes are prerendered into
`build/<route>/index.html`, so they return 200. But parameterized routes cannot be
prerendered, and GitHub Pages returns a real 404 for them, falling back to `404.html`
which bounces the user to `/` via JavaScript:

    curl -o /dev/null -w '%{http_code}' https://esotk.com/report/abc123   ->  404
    curl -o /dev/null -w '%{http_code}' https://esotk.com/u/someuser      ->  404

Affected: `/report/*`, `/u/:username`, `/b/:slug`, `/bv`, `/rv`.

Real users mostly survive this (the JS redirect restores the route), but crawlers and link
preview bots see a 404 and stop.

### 2. No shared link has ever produced a rich preview card

The app sets per-report Open Graph tags at runtime in `src/components/DynamicMetaTags.tsx`,
inside a `useEffect`. Discord, Slack, Twitter/X, and Facebook scrapers do not execute
JavaScript, and they reject non-200 responses. So every shared report or build link falls back
to the generic sitewide card, or no card at all.

This matters more than general SEO for this product: sharing a log link into a guild Discord is
the main distribution channel.

### 3. Security headers are documented as inert

`public/_headers` already carries a CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors`, and
Permissions-Policy. Its own header comment states the problem:

> GitHub Pages cannot set response headers ... move the site to a header-capable host
> (Cloudflare Pages/Workers, or a CF Transform Rule in front of Pages).

Today the site ships only a browser-side `<meta http-equiv="Content-Security-Policy">` fallback.
`frame-ancestors`, HSTS, and Permissions-Policy cannot be expressed that way and are simply absent.

## What we are asking for, in order of value

1. **Proxy `esotk.com` through Cloudflare** with GitHub Pages as origin (orange-cloud the DNS
   record, or move to Cloudflare Pages pointed at the same build output).
2. **Allow us to deploy a Worker** on the `esotk.com/*` route. We will write and maintain it. It will:
   - intercept `/report/*`, `/u/*`, `/b/*`, `/bv`, `/rv`, return the app shell with HTTP **200**
     instead of 404, and inject per-URL `<title>` and Open Graph tags (report title, boss, player
     name) fetched from our existing Cloudflare Worker API (`roster-hub-api`, already on this account).
   - leave all other paths untouched, passing through to the GitHub Pages origin.
3. **Apply the response headers** in `public/_headers` at the edge, either via the Worker or a
   Cloudflare Transform Rule. This activates the CSP/HSTS/Permissions-Policy work that is already
   written and currently doing nothing.

## What we do NOT need

- No change to the repository, the build, or the GitHub Actions deploy workflow.
- No migration off GitHub Pages if that is undesirable: a Transform Rule plus a Worker route in
  front of the existing Pages origin is sufficient.
- No new origin infrastructure. The API Workers (`roster-hub-api`, `eso-toolkit-discord-bot`)
  already run on the same Cloudflare account.

## Risk and rollback

- The Worker is additive and path-scoped. If it errors it can `fetch(request)` straight through to
  origin, so worst case is current behaviour.
- Rollback is removing the Worker route or grey-clouding the DNS record.
- No data is stored at the edge. The Worker reads public report metadata only.

## Contact

Open an issue on `ESO-Toolkit/eso-toolkit` or reach the maintainers in the project Discord.
