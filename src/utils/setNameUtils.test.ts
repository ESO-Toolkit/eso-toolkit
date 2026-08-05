import libsetsSetNames from '../../data/libsets-set-names.json';
import { KnownSetIDs } from '../types/abilities';

import * as errorTracking from './errorTracking';
import {
  getSetDisplayName,
  findSetIdByName,
  isUnsupportedSet,
  getAllSetIds,
  getSetIdsSortedByName,
  getAllSetDisplayNames,
  getSetDisplayNameWithUnsupportedIndicator,
  rosterSetNameToId,
  setIdToRosterName,
  SET_DISPLAY_NAMES,
  UNSUPPORTED_SET_NAMES,
} from './setNameUtils';

// Mock errorTracking
jest.mock('./errorTracking', () => ({
  reportError: jest.fn(),
}));

describe('setNameUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSetDisplayName', () => {
    it('should return empty string for undefined setId', () => {
      const result = getSetDisplayName(undefined);
      expect(result).toBe('');
      expect(errorTracking.reportError).not.toHaveBeenCalled();
    });

    it('should return empty string for null setId', () => {
      const result = getSetDisplayName(null);
      expect(result).toBe('');
      expect(errorTracking.reportError).not.toHaveBeenCalled();
    });

    it('should return correct display name for known set', () => {
      const result = getSetDisplayName(KnownSetIDs.ROARING_OPPORTUNIST);
      expect(result).toBe('Roaring Opportunist');
      expect(errorTracking.reportError).not.toHaveBeenCalled();
    });

    it('should return "Unknown Set" message for unknown set ID', () => {
      const unknownSetId = 99999 as KnownSetIDs;
      const result = getSetDisplayName(unknownSetId);
      expect(result).toBe('Unknown Set (99999)');
    });

    it('should report error to error tracking when unknown set is detected', () => {
      // Use a unique ID (88888) — 99999 was already added to the dedup Set by the previous test
      const unknownSetId = 88888 as KnownSetIDs;
      getSetDisplayName(unknownSetId);

      expect(errorTracking.reportError).toHaveBeenCalledTimes(1);
      expect(errorTracking.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unknown set ID detected: 88888',
        }),
        expect.objectContaining({
          setId: 88888,
          setIdType: 'number',
          component: 'setNameUtils',
          function: 'getSetDisplayName',
          availableSetCount: expect.any(Number),
        }),
      );
    });

    it('should not report the same unknown set ID more than once (ESO-689)', () => {
      const unknownSetId = 77777 as KnownSetIDs;
      getSetDisplayName(unknownSetId);
      getSetDisplayName(unknownSetId);
      getSetDisplayName(unknownSetId);

      expect(errorTracking.reportError).toHaveBeenCalledTimes(1);
    });

    it('should include context data in error tracking report', () => {
      const unknownSetId = 12345 as KnownSetIDs;
      getSetDisplayName(unknownSetId);

      const errorCall = (errorTracking.reportError as jest.Mock).mock.calls[0];
      const context = errorCall[1];

      expect(context).toHaveProperty('setId', 12345);
      expect(context).toHaveProperty('setIdType', 'number');
      expect(context).toHaveProperty('component', 'setNameUtils');
      expect(context).toHaveProperty('function', 'getSetDisplayName');
      expect(context).toHaveProperty('availableSetCount');
      expect(typeof context.availableSetCount).toBe('number');
      expect(context.availableSetCount).toBeGreaterThan(0);
    });

    it('should not report error for known Unknown Set IDs', () => {
      const result = getSetDisplayName(KnownSetIDs.HUNTSMANS_WARMASK);
      expect(result).toBe("Huntsman's Warmask");
      expect(errorTracking.reportError).not.toHaveBeenCalled();
    });

    it('should handle multiple calls to unknown sets independently', () => {
      getSetDisplayName(11111 as KnownSetIDs);
      getSetDisplayName(22222 as KnownSetIDs);
      getSetDisplayName(33333 as KnownSetIDs);

      expect(errorTracking.reportError).toHaveBeenCalledTimes(3);

      const calls = (errorTracking.reportError as jest.Mock).mock.calls;
      expect(calls[0][1].setId).toBe(11111);
      expect(calls[1][1].setId).toBe(22222);
      expect(calls[2][1].setId).toBe(33333);
    });
  });

  describe('findSetIdByName', () => {
    it('should return undefined for null or undefined names', () => {
      expect(findSetIdByName(null)).toBeUndefined();
      expect(findSetIdByName(undefined)).toBeUndefined();
      expect(findSetIdByName('')).toBeUndefined();
    });

    it('should find set by exact name match', () => {
      const result = findSetIdByName('Roaring Opportunist');
      expect(result).toBe(KnownSetIDs.ROARING_OPPORTUNIST);
    });

    it('should find set by case-insensitive match', () => {
      const result = findSetIdByName('roaring opportunist');
      expect(result).toBe(KnownSetIDs.ROARING_OPPORTUNIST);
    });

    it('should find set by name without "Perfected" prefix', () => {
      const result = findSetIdByName('Perfected Saxhleel Champion');
      expect(result).toBeDefined();
    });

    it('should return undefined for unknown set names', () => {
      const result = findSetIdByName('Nonexistent Set Name');
      expect(result).toBeUndefined();
    });

    describe('strip-"Perfected" fallback only fires for real perfected variants', () => {
      // The fallback exists so a "Perfected <base>" string resolves to the base
      // ID when needed, but it must not mask typos by stripping "Perfected " off
      // a set that has no perfected variant, nor accept stacked prefixes.
      it('rejects "Perfected <X>" when X has no perfected variant', () => {
        // Roar of Alkosh ('Alkosh') has no perfected variant — must not resolve.
        expect(findSetIdByName('Perfected Alkosh')).toBeUndefined();
        // War Machine / Nazaray / Earthgore likewise have no perfected variant.
        expect(findSetIdByName('Perfected War Machine')).toBeUndefined();
        expect(findSetIdByName('Perfected Nazaray')).toBeUndefined();
        expect(findSetIdByName('Perfected Earthgore')).toBeUndefined();
      });

      it('rejects stacked "Perfected Perfected <X>" prefixes', () => {
        expect(findSetIdByName('Perfected Perfected Saxhleel Champion')).toBeUndefined();
      });

      it('still resolves every real base/perfected pair to its own ID', () => {
        // Direct hits — the rename gave each variant its own canonical name.
        expect(findSetIdByName('Saxhleel Champion')).toBe(KnownSetIDs.SAXHLEEL_CHAMPION);
        expect(findSetIdByName('Perfected Saxhleel Champion')).toBe(
          KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION,
        );
        expect(findSetIdByName('Claw of Yolnahkriin')).toBe(KnownSetIDs.CLAW_OF_YOLNAHKRIIN);
        expect(findSetIdByName('Perfected Claw of Yolnahkriin')).toBe(
          KnownSetIDs.PERFECTED_CLAW_OF_YOLNAHKRIIN,
        );
      });
    });
  });

  describe('Perfected/base set name collisions (roster edit regression)', () => {
    /**
     * Regression guard for the "Edit roster" bug: base and Perfected variants of
     * these sets previously shared a display name (or the base used a non-canonical
     * name), so SET_NAME_TO_ID_INDEX collapsed Perfected → base on round-trip and
     * Claw of Yolnahkriin rendered as bare "Yolnahkriin". Each variant must now map
     * to its own canonical name and back to its own ID.
     */
    const variantPairs: Array<{ baseId: KnownSetIDs; perfectedId: KnownSetIDs }> = [
      {
        baseId: KnownSetIDs.CLAW_OF_YOLNAHKRIIN,
        perfectedId: KnownSetIDs.PERFECTED_CLAW_OF_YOLNAHKRIIN,
      },
      {
        baseId: KnownSetIDs.SAXHLEEL_CHAMPION,
        perfectedId: KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION,
      },
      {
        baseId: KnownSetIDs.XORYNS_MASTERPIECE,
        perfectedId: KnownSetIDs.PERFECTED_XORYNS_MASTERPIECE,
      },
    ];

    it.each(variantPairs)(
      'base and Perfected variants have distinct display names ($baseId / $perfectedId)',
      ({ baseId, perfectedId }) => {
        const baseName = getSetDisplayName(baseId);
        const perfectedName = getSetDisplayName(perfectedId);
        expect(baseName).not.toBe(perfectedName);
        expect(perfectedName).toBe(`Perfected ${baseName}`);
      },
    );

    it.each(variantPairs)(
      'each variant round-trips to its own ID ($baseId / $perfectedId)',
      ({ baseId, perfectedId }) => {
        expect(findSetIdByName(getSetDisplayName(baseId))).toBe(baseId);
        expect(findSetIdByName(getSetDisplayName(perfectedId))).toBe(perfectedId);
      },
    );

    it('Claw of Yolnahkriin uses its canonical in-game name (not bare "Yolnahkriin")', () => {
      expect(getSetDisplayName(KnownSetIDs.CLAW_OF_YOLNAHKRIIN)).toBe('Claw of Yolnahkriin');
      // The old non-canonical name must no longer resolve to any set.
      expect(findSetIdByName('Yolnahkriin')).toBeUndefined();
    });

    it('no two real sets share a display name (only "Unknown" placeholders may collide)', () => {
      const nameToIds = new Map<string, number[]>();
      for (const [idStr, name] of Object.entries(SET_DISPLAY_NAMES)) {
        if (name === 'Unknown') continue;
        const ids = nameToIds.get(name) ?? [];
        ids.push(Number(idStr));
        nameToIds.set(name, ids);
      }
      const collisions = [...nameToIds.entries()].filter(([, ids]) => ids.length > 1);
      expect(collisions).toEqual([]);
    });
  });

  describe('isUnsupportedSet', () => {
    it('should return true for unsupported sets', () => {
      expect(isUnsupportedSet('Shattered Fate')).toBe(true);
      expect(isUnsupportedSet("Spriggan's Thorns")).toBe(true);
    });

    it('should return false for supported sets', () => {
      expect(isUnsupportedSet('Roaring Opportunist')).toBe(false);
      expect(isUnsupportedSet('Some Random Set')).toBe(false);
    });
  });

  describe('KnownSetIDs coverage (ESO-684 regression)', () => {
    /**
     * Regression test for ESO-684 / ESO-686: ensures every value in the
     * KnownSetIDs enum has a corresponding entry in SET_DISPLAY_NAMES.
     *
     * "Unknown set ID detected" Rollbar errors (counters 7, 12) were triggered
     * when users opened roster share links whose gear sets had valid KnownSetIDs
     * values (e.g. 641 Serpent's Disdain, 620 Gryphon's Reprisal, 701 Peace and
     * Serenity) that were missing from SET_DISPLAY_NAMES at build time.
     *
     * Adding a new entry to KnownSetIDs without a matching SET_DISPLAY_NAMES
     * entry will fail this test and prevent a repeat of the incident.
     */
    it('every KnownSetIDs value must have a SET_DISPLAY_NAMES entry', () => {
      const missingIds: Array<{ name: string; id: number }> = [];

      for (const [name, value] of Object.entries(KnownSetIDs)) {
        // KnownSetIDs is a numeric enum — filter out the reverse-mapping strings
        if (typeof value !== 'number') continue;

        const displayName = getSetDisplayName(value as KnownSetIDs);
        if (!displayName) {
          missingIds.push({ name, id: value });
        }
      }

      // Clear reportError calls generated above so they don't leak into other tests
      jest.clearAllMocks();

      if (missingIds.length > 0) {
        const formatted = missingIds.map(({ name, id }) => `  ${name} = ${id}`).join('\n');
        throw new Error(
          `${missingIds.length} KnownSetIDs value(s) have no SET_DISPLAY_NAMES entry.\n` +
            `Add them to SET_DISPLAY_NAMES in setNameUtils.ts:\n${formatted}`,
        );
      }
    });
  });
});

// ============================================================
// O(1) index consistency and list utilities
// (These do not depend on error tracking, no mock needed)
// ============================================================

describe('SET_DISPLAY_NAMES ↔ findSetIdByName bidirectional consistency', () => {
  it('every display name in SET_DISPLAY_NAMES can be looked up by findSetIdByName', () => {
    // Build a set of names that appear more than once (e.g. base and Perfected share a name).
    // For duplicate names the O(1) index returns the last-registered ID — that is intentional.
    const nameCounts = new Map<string, number>();
    for (const name of Object.values(SET_DISPLAY_NAMES)) {
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }

    const failures: string[] = [];
    for (const [idStr, name] of Object.entries(SET_DISPLAY_NAMES)) {
      if (name === 'Unknown') continue; // Intentionally shared
      if ((nameCounts.get(name) ?? 0) > 1) continue; // Duplicate names — index picks one; skip exact-ID check
      const id = Number(idStr) as KnownSetIDs;
      const found = findSetIdByName(name);
      if (found !== id) {
        failures.push(`ID ${id} ("${name}") → findSetIdByName returned ${String(found)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('findSetIdByName followed by getSetDisplayName returns the original name', () => {
    // Build a map of all names that appear exactly once (unique names only).
    // Duplicate names are intentional (base set + Perfected share the same name)
    // and the index maps a duplicate name to exactly one of the IDs — that is fine.
    const nameCounts = new Map<string, number>();
    for (const name of Object.values(SET_DISPLAY_NAMES)) {
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }

    const failures: string[] = [];
    for (const name of Object.values(SET_DISPLAY_NAMES)) {
      if (name === 'Unknown') continue;
      if ((nameCounts.get(name) ?? 0) > 1) continue; // Duplicates — both map to the same display name, OK

      const id = findSetIdByName(name);
      if (id === undefined) {
        failures.push(`"${name}" not found by findSetIdByName`);
        continue;
      }
      const roundTripped = getSetDisplayName(id);
      if (roundTripped !== name) {
        failures.push(`"${name}" → ID ${id} → "${roundTripped}" (mismatch)`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('getAllSetIds', () => {
  it('returns a non-empty array of numbers', () => {
    const ids = getAllSetIds();
    expect(ids.length).toBeGreaterThan(0);
    ids.forEach((id) => expect(typeof id).toBe('number'));
  });

  it('includes key known set IDs', () => {
    const ids = getAllSetIds();
    expect(ids).toContain(KnownSetIDs.LUCENT_ECHOES);
    expect(ids).toContain(KnownSetIDs.SYMPHONY_OF_BLADES);
    expect(ids).toContain(KnownSetIDs.PEARLS_OF_EHLNOFEY);
  });
});

describe('getSetIdsSortedByName', () => {
  it('returns IDs in alphabetical display-name order', () => {
    const sorted = getSetIdsSortedByName();
    const names = sorted.map((id) => SET_DISPLAY_NAMES[id]);
    const expected = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(expected);
  });
});

describe('getAllSetDisplayNames', () => {
  it('returns sorted display name strings', () => {
    const names = getAllSetDisplayNames();
    const expected = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(expected);
  });

  it('contains well-known set names', () => {
    const names = getAllSetDisplayNames();
    expect(names).toContain('Lucent Echoes');
    expect(names).toContain("Jorvuld's Guidance");
  });
});

describe('getSetDisplayNameWithUnsupportedIndicator', () => {
  it('appends (unsupported) for sets in the unsupported list', () => {
    const key = Object.keys(UNSUPPORTED_SET_NAMES)[0];
    expect(getSetDisplayNameWithUnsupportedIndicator(key)).toBe(`${key} (unsupported)`);
  });

  it('returns the name unchanged for supported sets', () => {
    expect(getSetDisplayNameWithUnsupportedIndicator('Lucent Echoes')).toBe('Lucent Echoes');
  });
});

describe('rosterSetNameToId wrapper', () => {
  it('delegates correctly to findSetIdByName', () => {
    expect(rosterSetNameToId('Lucent Echoes')).toBe(KnownSetIDs.LUCENT_ECHOES);
    expect(rosterSetNameToId(undefined)).toBeUndefined();
  });
});

describe('setIdToRosterName wrapper', () => {
  it('delegates correctly to getSetDisplayName', () => {
    expect(setIdToRosterName(KnownSetIDs.LUCENT_ECHOES)).toBe('Lucent Echoes');
    expect(setIdToRosterName(undefined)).toBe('');
  });
});

// ============================================================
// Canonical-name validation against the LibSets dump
// ============================================================

/**
 * `SET_DISPLAY_NAMES` is hand-maintained, so a name can silently drift to a
 * wrong-but-unique value (e.g. "Yolnahkriin" instead of "Claw of Yolnahkriin")
 * without tripping the duplicate/round-trip guards above.
 *
 * `data/libsets-set-names.json` (generated from the LibSets addon, keyed by the
 * same set IDs) is the authoritative source for a set's full in-game name. This
 * test asserts every display name either equals the dump's canonical `en` name
 * or is an explicitly allowlisted intentional shorthand. Adding a new set with a
 * name that doesn't match the dump — or letting an existing name drift — fails
 * here and forces a deliberate choice: fix the name, or allowlist the shorthand.
 *
 * To intentionally diverge from the canonical name (short label, set-name-over-
 * proc-name for weapons, retained legacy alias, "Unknown" placeholder), add the
 * set ID to INTENTIONAL_NAME_DIVERGENCE_IDS with a comment explaining why.
 */
describe('SET_DISPLAY_NAMES canonical-name validation (libsets dump)', () => {
  const dumpSets = (libsetsSetNames as { sets: Record<string, { en?: string }> }).sets;

  // Set IDs whose display name intentionally differs from the dump's canonical
  // English name. Each is a deliberate product choice, not a drift bug.
  const INTENTIONAL_NAME_DIVERGENCE_IDS = new Set<number>([
    // ── Short labels (full name is verbose for a roster chip) ──
    147, // WAY_OF_MARTIAL_KNOWLEDGE — "Martial Knowledge" vs "Way of Martial Knowledge"
    391, // VESTMENT_OF_OLORIME — "Olorime" vs "Vestment of Olorime"
    395, // PERFECTED_VESTMENT_OF_OLORIME — "Perfected Olorime"
    455, // ZENS_REDRESS — "Zen's Redress" vs "Z'en's Redress"
    232, // ROAR_OF_ALKOSH — "Alkosh" vs "Roar of Alkosh"
    577, // ENCRATIS_BEHEMOTH — "Encratis" vs "Encratis's Behemoth"
    687, // OZEZAN — "Ozezan" vs "Ozezan the Inferno"
    456, // AZUREBLIGHT — "Azureblight" vs "Azureblight Reaper"
    503, // WILD_HUNT — "Wild Hunt" vs "Ring of the Wild Hunt"
    602, // CRIMSON_OATH — "Crimson Oath" vs "Crimson Oath's Rive"
    671, // GOURMAND — "Gourmand" vs "Back-Alley Gourmand"
    766, // MORA_SCRIBE — "Mora Scribe" vs "Mora Scribe's Thesis"
    773, // MORA_SCRIBE_PERFECTED — "Perfected Mora Scribe"
    795, // JERENSI — "Jerensi" vs "Jerensi's Bladestorm"
    815, // KAZPIAN — "Kazpian's" vs "Kazpian's Cruel Signet"
    820, // KAZPIAN_PERFECTED — "Perfected Kazpian's"
    575, // PALE_ORDER — "Pale Order" vs "Ring of the Pale Order"
    623, // STORM_CURSED — "Storm-Cursed" vs "Storm-Cursed's Revenge"
    675, // STORMWEAVER — "Stormweaver" vs "Stormweaver's Cavort"
    690, // AKATOSHS_LAW — "Akatosh's Law" vs "Judgment of Akatosh"
    757, // THE_WEALD — "The Weald" vs "Symmetry of the Weald"
    794, // VANDORALLEN — "Vandorallen" vs "Vandorallen's Resonance"
    805, // THREE_QUEENS — "Three Queens" vs "Three Queens Wellspring"
    193, // OVERWHELMING — "Overwhelming" vs "Overwhelming Surge"
    210, // THE_PARIAH — "The Pariah" vs "Mark of the Pariah"
    126, // ANCIENT_GRACE — "Ancient Grace" vs "Grace of the Ancients"
    173, // VICIOUS_OPHIDIAN — "Vicious Ophidian" vs "Vicious Serpent"

    // ── Retained legacy / pre-rename aliases players still recognize ──
    137, // ADVANCING_YOKEDA vs "Berserking Warrior"
    138, // RESILIENT_YOKEDA vs "Defending Warrior"
    171, // ETERNAL_YOKEDA vs "Eternal Warrior"
    140, // AETHER_DESTRUCTION — "Aether" vs "Destructive Mage"
    172, // INFALLIBLE_AETHER — "Infallible Aether" vs "Infallible Mage"
    29, // THE_SERGEANT vs "Sergeant's Mail"
    46, // THE_NOBLE_DUELIST vs "Noble Duelist's Silks"
    77, // THE_CRUSADER vs "Crusader"
    84, // PRISMATIC_WEAPON vs "Orgnum's Scales"

    // ── Weapon/arena sets: app uses the SET name, dump uses the proc name ──
    314, // THE_MASTERS_MACE vs "Puncturing Remedy"
    316, // THE_MASTERS_BOW vs "Caustic Arrow"
    317, // THE_MASTERS_ICE_STAFF vs "Destructive Impact"
    318, // THE_MASTERS_RESTORATION_STAFF vs "Grand Rejuvenation"
    358, // ASYLUM_PERFECTED_DAGGER vs "Perfected Defensive Position"
    362, // ASYLUM_PERFECTED_RESTO vs "Perfected Timeless Blessing"
    372, // MAELSTROMS_BOW vs "Thunderous Volley"
    413, // BLACKROSE_DAGGER vs "Spectral Cloak"
    414, // BLACKROSE_BOW vs "Virulent Shot"
    415, // BLACKROSE_ICE_STAFF vs "Wild Impulse"
    416, // BLACKROSE_RESTO vs "Mender's Ward"
    425, // BLACKROSE_PERFECTED_DAGGER vs "Perfected Spectral Cloak"
    426, // BLACKROSE_PERFECTED_BOW vs "Perfected Virulent Shot"
    427, // BLACKROSE_PERFECTED_ICE_STAFF vs "Perfected Wild Impulse"
    428, // BLACKROSE_PERFECTED_RESTO vs "Perfected Mender's Ward"
    559, // VATESHRAN_GREATSWORD vs "Frenzied Momentum"
    563, // VATESHRAN_PERFECTED_SWORD vs "Perfected Executioner's Blade"
    564, // VATESHRAN_PERFECTED_DAGGER vs "Perfected Void Bash"
    567, // VATESHRAN_PERFECTED_STAFF vs "Perfected Wrath of Elements"

    // ── "<Owner>'s Perfected" word-order convention for some perfected sets ──
    389, // RELEQUEN — "Relequen" vs "Arms of Relequen"
    393, // RELEQUEN_PERFECTED — "Relequen's Perfected" vs "Perfected Arms of Relequen"
    394, // SIRORIA_PERFECTED — "Siroria's Perfected" vs "Perfected Mantle of Siroria"
    392, // GALENWES_PERFECTED_RESTO — "Galenwe's Perfected" vs "Perfected Aegis of Galenwe"
    450, // LOKKESTIIZ_PERFECTED — "Lokkestiiz's Perfected" vs "Perfected Tooth of Lokkestiiz"
    495, // VROL_PERFECTED — "Vrol's Perfected" vs "Perfected Vrol's Command"
    449, // FALSE_GODS_PERFECTED — "Perfected False God's" vs "Perfected False God's Devotion"

    // ── Placeholder for an unmapped/unknown set ──
    846, // UNKNOWN_SET_846 — kept as "Unknown" placeholder vs dump "Xanmeer Genesis"
  ]);

  it('every display name matches the LibSets canonical name (or is an allowlisted shorthand)', () => {
    const drift: string[] = [];

    for (const [idStr, appName] of Object.entries(SET_DISPLAY_NAMES)) {
      const id = Number(idStr);
      const canonical = dumpSets[idStr]?.en;
      if (!canonical) continue; // dump doesn't cover this id — nothing to validate against
      if (appName === canonical) continue; // exact match
      if (INTENTIONAL_NAME_DIVERGENCE_IDS.has(id)) continue; // deliberate divergence

      drift.push(`  ${id}: SET_DISPLAY_NAMES="${appName}"  canonical="${canonical}"`);
    }

    if (drift.length > 0) {
      throw new Error(
        `${drift.length} set display name(s) diverge from the LibSets canonical name without being ` +
          `allowlisted. Either fix the name in SET_DISPLAY_NAMES to match, or — if the divergence is ` +
          `intentional — add the set ID to INTENTIONAL_NAME_DIVERGENCE_IDS with a reason:\n${drift.join('\n')}`,
      );
    }
  });

  it('the four bug-fixed sets exactly match the canonical dump name', () => {
    const expectations: Array<[KnownSetIDs, string]> = [
      [KnownSetIDs.CLAW_OF_YOLNAHKRIIN, 'Claw of Yolnahkriin'],
      [KnownSetIDs.PERFECTED_CLAW_OF_YOLNAHKRIIN, 'Perfected Claw of Yolnahkriin'],
      [KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION, 'Perfected Saxhleel Champion'],
      [KnownSetIDs.PERFECTED_XORYNS_MASTERPIECE, "Perfected Xoryn's Masterpiece"],
    ];
    for (const [id, expected] of expectations) {
      expect(getSetDisplayName(id)).toBe(expected);
      expect(dumpSets[String(id)]?.en).toBe(expected);
    }
  });
});
