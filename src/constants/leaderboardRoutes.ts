/**
 * Human-readable slugs for the crawlable /build-leaderboard sub-routes.
 *
 * Why this exists: every leaderboard view used to live behind `?tab=`, `?class=`
 * and `?boss=`, reachable only by operating a MUI Select or ToggleButton. There
 * was not a single anchor on the page, so a crawler could discover exactly one
 * URL out of 21 real views. `?boss=57:122` was also an opaque
 * `encounterId:difficulty` key, which is unusable as a shareable ranking URL.
 *
 * The slug table is DELIBERATELY STATIC rather than derived from
 * `/dps-leaderboard/encounters` at runtime. Public URLs must be stable and
 * reviewable, and prerendering (`scripts/generate-static-routes.cjs`) runs under
 * plain node with no network. See `./leaderboard-routes.json`.
 *
 * WHEN THE INGEST ADDS A NEW ENCOUNTER: it will have no entry here, and
 * `getBossSlug` returns undefined for it. The picker then falls back to the
 * legacy `?boss=` query form so the view stays reachable and correct; it just
 * is not crawlable until someone adds a slug. Nothing breaks, so the failure
 * mode is a missing SEO surface rather than a missing board.
 */

import leaderboardRoutes from './leaderboard-routes.json';

export const LEADERBOARD_BASE_PATH = '/build-leaderboard';

export interface LeaderboardClassRoute {
  /** URL segment. Permanent once shipped. */
  readonly slug: string;
  /** Value the API's `class` filter expects (note the capital K in DragonKnight). */
  readonly esoClass: string;
  /** Display name (Dragonknight, not DragonKnight). */
  readonly label: string;
  readonly title: string;
  readonly description: string;
}

export interface LeaderboardBossRoute {
  /** URL segment. Permanent once shipped. */
  readonly slug: string;
  readonly encounterId: number;
  readonly difficulty: number;
  readonly name: string;
  /** Trial or arena the encounter belongs to, for prose. */
  readonly zone: string;
  readonly title: string;
  readonly description: string;
}

export const LEADERBOARD_CLASS_ROUTES: readonly LeaderboardClassRoute[] = leaderboardRoutes.classes;

export const LEADERBOARD_BOSS_ROUTES: readonly LeaderboardBossRoute[] = leaderboardRoutes.bosses;

const CLASS_BY_SLUG = new Map(LEADERBOARD_CLASS_ROUTES.map((entry) => [entry.slug, entry]));
const CLASS_BY_ESO_CLASS = new Map(
  LEADERBOARD_CLASS_ROUTES.map((entry) => [entry.esoClass, entry]),
);
const BOSS_BY_SLUG = new Map(LEADERBOARD_BOSS_ROUTES.map((entry) => [entry.slug, entry]));

/**
 * Keyed on `encounterId:difficulty`, not on encounterId alone. The same boss is
 * genuinely served at more than one difficulty (Cloudrest +1/+2/+3, and the API
 * has returned Xoryn at both 121 and 122), so an encounterId-only key would
 * hand two different boards the same URL.
 */
const BOSS_BY_ENCOUNTER_KEY = new Map(
  LEADERBOARD_BOSS_ROUTES.map((entry) => [`${entry.encounterId}:${entry.difficulty}`, entry]),
);

/** The opaque key the legacy `?boss=` param uses, and the API's grouping key. */
export const encounterKeyOf = (encounterId: number, difficulty: number): string =>
  `${encounterId}:${difficulty}`;

export const getClassRouteBySlug = (slug: string | undefined): LeaderboardClassRoute | undefined =>
  slug === undefined ? undefined : CLASS_BY_SLUG.get(slug);

export const getClassRouteByEsoClass = (
  esoClass: string | undefined,
): LeaderboardClassRoute | undefined =>
  esoClass === undefined ? undefined : CLASS_BY_ESO_CLASS.get(esoClass);

export const getBossRouteBySlug = (slug: string | undefined): LeaderboardBossRoute | undefined =>
  slug === undefined ? undefined : BOSS_BY_SLUG.get(slug);

/** Undefined for an encounter the ingest returns but this table has no slug for. */
export const getBossRouteByEncounter = (
  encounterId: number,
  difficulty: number,
): LeaderboardBossRoute | undefined =>
  BOSS_BY_ENCOUNTER_KEY.get(encounterKeyOf(encounterId, difficulty));

// ─── Path builders ───────────────────────────────────────────────────────────
// Namespaced (/class/, /boss/) rather than flat so a class slug and a boss slug
// can never collide, and so a future /trial/ dimension has somewhere to go.

export const classLeaderboardPath = (classSlug: string, bossSlug?: string): string =>
  bossSlug
    ? `${LEADERBOARD_BASE_PATH}/class/${classSlug}/${bossSlug}`
    : `${LEADERBOARD_BASE_PATH}/class/${classSlug}`;

export const bossLeaderboardPath = (bossSlug: string): string =>
  `${LEADERBOARD_BASE_PATH}/boss/${bossSlug}`;

/**
 * Every path this feature contributes to route metadata, prerendering and the
 * sitemap: 7 pooled class boards plus 14 per-encounter boards.
 *
 * The 98 class-narrowed-to-one-boss permutations are intentionally absent. They
 * are reachable and linkable, but they are near-duplicates of the pooled class
 * board, so they stay out of the sitemap and canonicalize to it instead of
 * spending crawl budget on thin pages.
 */
export const LEADERBOARD_ROUTE_META: Readonly<
  Record<string, { title: string; description: string }>
> = Object.freeze({
  ...Object.fromEntries(
    LEADERBOARD_CLASS_ROUTES.map((entry) => [
      classLeaderboardPath(entry.slug),
      { title: entry.title, description: entry.description },
    ]),
  ),
  ...Object.fromEntries(
    LEADERBOARD_BOSS_ROUTES.map((entry) => [
      bossLeaderboardPath(entry.slug),
      { title: entry.title, description: entry.description },
    ]),
  ),
});
