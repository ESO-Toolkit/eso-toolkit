/**
 * Multi-CDN icon source helpers.
 *
 * ESO ability and gear icons are served — by the SAME filename — from two CDNs:
 *
 *   1. RPGLogs  (https://assets.rpglogs.com/img/eso/abilities/<name>.png)
 *      Commercial, reliable CDN. Already the source for every skill/ability
 *      icon the app renders. PRIMARY.
 *   2. UESP     (https://esoicons.uesp.net/esoui/art/icons/<name>.png)
 *      Community wiki CDN. Has the widest coverage (esp. brand-new / obscure
 *      items) but is frequently blocked by ad/privacy blockers, DNS filters
 *      (Pi-hole, NextDNS, Brave shields) and corporate firewalls, and it
 *      rate-limits / filters by User-Agent. FALLBACK only.
 *
 * Rendering an icon from a single CDN means one blocked/flaky host makes the
 * icon vanish. Build an ORDERED list of equivalent URLs instead and let
 * <ResilientImg> walk it on error, so a blocked UESP (the common real-world
 * failure) silently falls through to RPGLogs, and a name that only exists on
 * UESP still resolves when RPGLogs 404s.
 */

/** Primary CDN base — reliable, also serves skill icons. */
export const RPGLOGS_ICON_BASE = 'https://assets.rpglogs.com/img/eso/abilities/';

/** Fallback CDN base — widest coverage but frequently blocked/flaky. */
export const UESP_ICON_BASE = 'https://esoicons.uesp.net/esoui/art/icons/';

/**
 * True when a value is already a full URL (http/https or protocol-relative or a
 * bundled-asset path) rather than a bare icon filename.
 */
function isResolvedUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('/') || value.startsWith('data:');
}

/**
 * Ordered list of CDN URLs for a bare ESO icon filename (no extension), most
 * reliable first. Returns `[]` for nullish/empty input so callers can keep
 * their existing falsy guards. If a full URL is passed it is returned as-is
 * (single element) — callers may mix resolved URLs and bare names freely.
 */
export function iconSourcesFromName(name: string | null | undefined): string[] {
  if (!name) return [];
  if (isResolvedUrl(name)) return [name];
  const file = `${encodeURIComponent(name)}.png`;
  return [`${RPGLOGS_ICON_BASE}${file}`, `${UESP_ICON_BASE}${file}`];
}

/**
 * Ordered CDN URLs for an ability/skill icon filename. Identical resolution to
 * {@link iconSourcesFromName} — abilities and gear share the same filename
 * namespace on both CDNs — exposed under an ability-specific name for call-site
 * clarity.
 */
export const abilityIconSources = iconSourcesFromName;
