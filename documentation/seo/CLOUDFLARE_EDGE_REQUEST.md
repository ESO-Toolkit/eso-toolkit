# Request: put a Cloudflare edge layer in front of esotk.com

**Audience:** whoever administers the `esotk.com` domain / Cloudflare account.
**Requested by:** ESO Toolkit maintainers.
**Status:** not yet actioned. Requires registrar/DNS access that the requester does not have.

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

## Current DNS state, verified 2026-08-28

This matters because the ask below was originally written as "orange-cloud the DNS record",
which assumes the zone already lives on Cloudflare. It does not.

    $ nslookup esotk.com
    185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153   (GitHub Pages)

    $ curl -sI https://esotk.com/
    Server: GitHub.com          <- no cf-ray header, so nothing is proxying

    $ nslookup -type=NS esotk.com
    ns-345.awsdns-43.com, ns-936.awsdns-53.net,
    ns-1105.awsdns-10.org, ns-1833.awsdns-37.co.uk      <- AWS Route 53

So `esotk.com` is served straight off GitHub Pages with DNS authoritative on Route 53, and there
is no Cloudflare zone for it to orange-cloud. The Cloudflare account that already runs
`roster-hub-api` and `eso-toolkit-discord-bot` does not currently hold this domain.

`/u/somebody` still returns 404 today, confirming the problem is live.

### Three ways to get an edge layer, and which to pick

**A. Move the zone to Cloudflare (recommended).** Repoint the nameservers at the registrar from
Route 53 to the Cloudflare pair issued when the zone is added. Works on the free plan. Best fit
here because the Worker would sit on the same account as `roster-hub-api`, so it can call the API
through a service binding rather than a public round trip. Cost: one nameserver change, plus
recreating any non-Pages Route 53 records (mail, verification TXT) in Cloudflare first. Do that
before flipping, and the switch is uneventful.

**B. Cloudflare partial (CNAME) setup.** Keeps DNS on Route 53 and proxies only specific
hostnames. Rejected: partial zones require the Business plan, currently 200 USD/month, for a
feature the free plan gives outright under option A.

**C. Stay on AWS: CloudFront plus CloudFront Functions in front of GitHub Pages.** Achieves all
three goals without touching the nameservers, since Route 53 can alias straight to a CloudFront
distribution. Reasonable if moving DNS is undesirable. The tradeoff is that the edge code then
lives on a different provider from the API it has to call, so the metadata fetch becomes a public
internet request instead of a binding, and the project ends up maintaining edge logic in two
clouds.

## What we are asking for, in order of value

1. **Put `esotk.com` behind an edge layer** with GitHub Pages as origin. Per the section above
   this means moving the zone to Cloudflare (option A) rather than flipping a proxy toggle, since
   the domain is on Route 53 today.
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
- Rollback is removing the Worker route, or repointing the nameservers back to Route 53. Keep the
  existing Route 53 hosted zone in place until the change has been stable for a while, so the
  revert is a nameserver change rather than a rebuild.
- No data is stored at the edge. The Worker reads public report metadata only.

## Contact

Open an issue on `ESO-Toolkit/eso-toolkit` or reach the maintainers in the project Discord.
