# SEO action items requiring owner access

**For:** whoever holds admin on the `ESO-Toolkit` GitHub org and DNS/registrar access for `esotk.com`.

**Context:** an SEO audit of esotk.com in August 2026 found several defects. Everything fixable from the
repository is done and shipping in PR #1460. The four items below cannot be done from the repo, because
they need permissions the contributor does not have.

Ordered by payoff for time spent. Items 1 and 2 take about fifteen minutes combined and are the two that
matter most.

---

## 1. GitHub repository and org metadata (about 5 minutes)

**Why:** these repos currently outrank esotk.com for our own brand queries, and they have no description,
no website link, and no topics. Search engines fall back to extracting license boilerplate as the result
snippet. GitHub repo pages rank very well for niche software queries, so this is the cheapest win
available. `ESO-Toolkit/kalpa` in particular is the only result that appears for "Kalpa ESO addon
manager", and it currently tells visitors nothing and does not link to the site.

**Current state (verified):** all three have `description: null`, `homepage: null`, and zero topics.

### ESO-Toolkit/kalpa

Settings, or the About panel on the repo home page.

- **Description:**
  `Fast, open-source addon manager for The Elder Scrolls Online. A modern Minion alternative with one-click installs, automatic dependency resolution, addon profiles, and SavedVariables backup.`
- **Website:** `https://esotk.com/kalpa`
- **Topics:** `elder-scrolls-online` `eso` `addon-manager` `minion-alternative` `addons` `tauri` `rust` `react`

### ESO-Toolkit/eso-toolkit

- **Description:**
  `Free combat-log analytics, 3D fight replay, and build and roster planning tools for The Elder Scrolls Online.`
- **Website:** `https://esotk.com`
- **Topics:** `elder-scrolls-online` `eso` `combat-log` `analytics` `esologs` `raid-tools` `react` `typescript`

### ESO-Toolkit organisation

Organisation settings, Profile.

- **Description:** `Free, open-source tools for The Elder Scrolls Online.`
- **URL:** `https://esotk.com`

### Equivalent CLI, if preferred

Requires admin or maintain on each repo.

```bash
gh repo edit ESO-Toolkit/kalpa \
  --description "Fast, open-source addon manager for The Elder Scrolls Online. A modern Minion alternative with one-click installs, automatic dependency resolution, addon profiles, and SavedVariables backup." \
  --homepage "https://esotk.com/kalpa"

gh repo edit ESO-Toolkit/kalpa \
  --add-topic elder-scrolls-online,eso,addon-manager,minion-alternative,addons,tauri,rust,react

gh repo edit ESO-Toolkit/eso-toolkit \
  --description "Free combat-log analytics, 3D fight replay, and build and roster planning tools for The Elder Scrolls Online." \
  --homepage "https://esotk.com"

gh repo edit ESO-Toolkit/eso-toolkit \
  --add-topic elder-scrolls-online,eso,combat-log,analytics,esologs,raid-tools,react,typescript
```

**Alternative:** granting the contributor the **maintain** role on both repos lets them do this and keep it
current without further owner involvement. Repo metadata edits require admin or maintain. `push` is not
enough, and the API returns a confusing 404 rather than a 403 when permission is missing.

---

## 2. Google Search Console (about 10 minutes, needs DNS access)

**Why:** there is currently no visibility into how Google sees the site. No index coverage, no query data,
and no way to confirm that the canonical fixes in PR #1460 actually took effect. This is the measurement
tool for everything else in this list, so do it first if you only do one thing.

1. Go to https://search.google.com/search-console and add a property.
2. Choose **Domain**, not URL prefix. Domain properties cover http, https, www, and all subdomains in a
   single property. This is why DNS access is needed.
3. Enter `esotk.com`.
4. Google supplies a TXT record. Add it at the registrar or DNS host, then click Verify. Propagation is
   usually minutes, but can take longer.
5. Once verified, go to **Sitemaps** and submit: `sitemap.xml`
6. Optionally use **URL Inspection** on `https://esotk.com/kalpa/` once PR #1460 deploys, and request
   indexing to speed up first discovery.

**What to look at once data appears, after a few days:** _Indexing, Pages_ for coverage problems, and
_Performance, Queries_ for what the site actually ranks for. Note that historically the homepage has been
ranking for queries that subpages should own, which is the exact symptom the canonical fix in #1460
addresses. Confirming that shift is the main thing to watch.

---

## 3. Bing Webmaster Tools and IndexNow (about 5 minutes)

**Why:** the site currently has **zero pages in Bing's index**. That matters more than Bing's search share
suggests, because its index also feeds DuckDuckGo, Ecosia, and several AI assistants and AI search
products. At the moment none of them can surface or cite esotk.com at all.

1. Go to https://www.bing.com/webmasters and sign in.
2. Choose **Import from Google Search Console**. This is by far the fastest route and carries verification
   across, so do item 2 first.
3. Confirm `https://esotk.com/sitemap.xml` is listed after import.

**IndexNow is already wired up in PR #1460** and needs no setup, but it is worth one sanity check after
that PR merges and deploys. The deploy workflow submits changed URLs automatically, which gets new pages
into Bing in hours rather than months.

- Check that the key file is reachable: `https://esotk.com/e95121a458dc464baa2a081d3220c741.txt`
- It should return HTTP 200 and contain exactly `e95121a458dc464baa2a081d3220c741`
- If it returns 404, the deploy did not publish it and the pings will be silently rejected.

---

## 4. Cloudflare edge layer (larger, needs domain access)

**Why:** every shared report, profile, and build link returns HTTP 404 from GitHub Pages, because those
routes are parameterised and cannot be prerendered. Social scrapers reject non-200 responses and do not
run JavaScript, so no shared log link has ever produced a rich preview card in Discord, Slack, or Twitter.
For a tool whose main distribution channel is people pasting log links into guild Discords, this is
probably the highest-value remaining fix.

It would also activate the security headers in `public/_headers`, which are inert today because GitHub
Pages cannot set response headers. That file's own comments already identify this as the fix.

This is a larger piece of work than the items above and is written up separately, including the specific
ask, what does **not** need to change, and the rollback plan:

**See [CLOUDFLARE_EDGE_REQUEST.md](./CLOUDFLARE_EDGE_REQUEST.md).**

Short version: proxy `esotk.com` through Cloudflare with GitHub Pages still serving as the origin, and
allow a Worker on the `esotk.com/*` route. No repository, build, or deploy changes are required, and no
migration off GitHub Pages is necessary. The API Workers already run on the same Cloudflare account.

---

## Optional, no special access needed

Anyone can do these, and for a launch-stage tool like Kalpa they are worth more than on-site SEO.
Third-party listing pages tend to rank for "alternative to X" queries better than a product's own site does.

- **List Kalpa on alternativeto.net** as a Minion alternative. The competing project
  `arviceblot/eso-addons` ranks largely on the strength of its listing there.
- **List Kalpa on esoui.com** under tools and utilities.
- **Archive `BraydenPB/eso-addon-manager`** with a README pointing at `ESO-Toolkit/kalpa`. It still shows
  up in search results carrying what is effectively Kalpa's description, so it competes with the real
  project instead of funnelling traffic to it.

---

## Already done, for reference

All shipping in PR #1460. No action needed on these.

- Canonical tags and sitemap entries pointed at URLs that redirect, so every page declared a canonical
  that redirected back to itself. Fixed, and the sitemap is now generated at build time from the same
  route list that drives prerendering, so the two cannot drift apart again.
- Runtime page titles overwrote the better prerendered ones during hydration on eight routes. Now unified
  behind a single shared source of truth.
- Kalpa had no page on the site at all, only a banner linking out to GitHub. `https://esotk.com/kalpa`
  now exists, prerendered, with structured data and an FAQ.
- Preview and Storybook deployments were publicly crawlable copies of the entire site on a second domain.
  Now marked noindex at deploy time.
- First structured data on the site, a corrected `/pack-hub` description, and a social preview image
  reduced from 804 KB to 165 KB.
