/**
 * Categorization for the Latest Reports zone filter.
 *
 * The ESO Logs `worldData.zones` list is small (~19 entries) and does NOT expose
 * dungeons individually — every group dungeon is collapsed into a single
 * "Dungeons" super-zone (id 10) whose `encounters` are the individual dungeons.
 * The report list API (`reports(zoneID:)`) can therefore filter to "all
 * dungeons" but not to one specific dungeon. We surface that honestly by
 * grouping the picker into Trials / Arenas / Dungeons and presenting the
 * Dungeons super-zone as a clean "All Dungeons" option.
 */

export type ZoneCategory = 'Trials' | 'Arenas' | 'Dungeons';

/** Display order of category groups in the picker. */
export const ZONE_CATEGORY_ORDER: ReadonlyArray<ZoneCategory> = ['Trials', 'Arenas', 'Dungeons'];

/** The ESO Logs zone id for the "Dungeons" super-zone. */
export const DUNGEONS_ZONE_ID = 10;

// Arena zones are name-matched rather than id-matched so the categorization
// survives id changes / new arenas: solo + group arenas all live here.
// Matches "Arena"/"Arenas", plus the named solo arenas (Maelstrom is "… Arena",
// Iron Atronach, Vateshran is "… Gauntlet"/"Hollows", Dragonhold "Ordeal", etc.).
const ARENA_NAME_RE = /arena|atronach|ordeal|gauntlet|hollows/i;

/**
 * Classify a zone into a picker category. Name-based so it is resilient to id
 * drift; the "Dungeons" super-zone is matched exactly by name.
 */
export function categorizeZone(name: string): ZoneCategory {
  const trimmed = name.trim();
  if (/^dungeons$/i.test(trimmed)) return 'Dungeons';
  if (ARENA_NAME_RE.test(trimmed)) return 'Arenas';
  return 'Trials';
}

/**
 * The label to show for a zone in the picker. The "Dungeons" super-zone reads
 * better as "All Dungeons" since selecting it filters to every dungeon report.
 */
export function zoneDisplayLabel(name: string): string {
  return /^dungeons$/i.test(name.trim()) ? 'All Dungeons' : name;
}
