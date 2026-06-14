/**
 * Ability-icon corrections for broken icon filenames served by ESO Logs.
 *
 * ESO Logs occasionally ships an icon filename in a report (in both
 * `combatantInfo.talents[].abilityIcon` and `masterData.abilities[].icon`) that
 * 403/404s on the rpglogs CDN, leaving the skill rendered with no icon.
 *
 * The canonical case (U49/U50): Stone Giant → Magma Fist (DK Earthen Heart).
 * ESO Logs serves `ability_dragonknight_013_stonefist_b` for several game ids
 * (31816, 258293, …), but that file 403s on https://assets.rpglogs.com. The real
 * icon is `ability_dragonknight_013_a` (verified HTTP 200, and the value the
 * build-time oracles data/abilities.json + data/abilityIcons.json map for
 * 31816 / 133027 / 134340).
 *
 * Two complementary, perf-safe lookups — both are tiny hand-curated tables, NOT
 * a copy of the ~5 MB `abilityIcons.json` oracle (which is dev/build-time only
 * and must never be imported into the runtime bundle):
 *
 *   1. ID-keyed (primary). Matches the repo's established override idiom
 *      (`SKILL_ICON_OVERRIDE_MAP: Record<number,string>` in
 *      loadout-manager/data/skillLineSkills.ts) and corrects every render path
 *      that has an ability id in scope (all of them do).
 *   2. FILENAME-keyed (fallback). Catches ids that map to a known-broken file
 *      but are absent from our id table — e.g. 258293, a U50 id ESO Logs serves
 *      with the same broken `stonefist_b` art. One filename entry covers them.
 *
 * Maintenance: entries are added ONLY after confirming the replacement returns
 * HTTP 200 on the rpglogs CDN. There is no auto-generator — no repo oracle flags
 * which CDN filenames 403.
 */

/**
 * Correct icon filename (no extension) keyed by ESO Logs ability id, for ids
 * whose report-served `abilityIcon` 403s on the CDN.
 */
export const ABILITY_ICON_ID_OVERRIDES: Readonly<Record<number, string>> = {
  31816: 'ability_dragonknight_013_a', // Magma Fist / report "Stone Giant" (base id)
  133027: 'ability_dragonknight_013_a', // Magma Fist (U49 damage id)
  258293: 'ability_dragonknight_013_a', // Magma Fist (U50 id)
};

/**
 * Correct icon filename (no extension) keyed by the broken filename ESO Logs
 * serves. Catches any ability id mapped to this file that is not in the id
 * table above.
 */
export const ABILITY_ICON_FILE_OVERRIDES: Readonly<Record<string, string>> = {
  ability_dragonknight_013_stonefist_b: 'ability_dragonknight_013_a',
};

/** Base URL for ESO Logs ability icons on the rpglogs CDN. */
export const ABILITY_ICON_BASE_URL = 'https://assets.rpglogs.com/img/eso/abilities/';

/**
 * Resolves the correct ability-icon filename from a report-supplied filename and
 * (optionally) the ability id. The id override wins, then the filename override,
 * then the raw value unchanged. Nullish/empty input is returned as-is so callers
 * can keep their existing falsy guards.
 *
 * Pure and synchronous — safe on the lazy-tooltip hot path.
 */
export function correctAbilityIcon<T extends string | null | undefined>(
  icon: T,
  abilityId?: number | string | null,
): T {
  if (abilityId != null) {
    const id = typeof abilityId === 'number' ? abilityId : Number(abilityId);
    if (Number.isFinite(id) && ABILITY_ICON_ID_OVERRIDES[id]) {
      return ABILITY_ICON_ID_OVERRIDES[id] as T;
    }
  }
  if (!icon) return icon;
  return (ABILITY_ICON_FILE_OVERRIDES[icon] ?? icon) as T;
}

/**
 * Builds a full rpglogs CDN URL for a report-supplied ability icon filename,
 * applying any known correction first. Returns `undefined` for nullish/empty
 * input so callers can conditionally render. Pass the ability id when available
 * so an id-keyed correction can apply even if the raw filename is unrecognised.
 */
export function abilityIconUrl(
  icon: string | null | undefined,
  abilityId?: number | string | null,
): string | undefined {
  const corrected = correctAbilityIcon(icon, abilityId);
  return corrected ? `${ABILITY_ICON_BASE_URL}${corrected}.png` : undefined;
}
