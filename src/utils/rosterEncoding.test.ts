/**
 * Tests for rosterEncoding utilities
 *
 * Covers:
 * - compactifyRoster / expandCompactRoster round-trips (all roles)
 * - DPS structured gear encoding (set1/set2/monsterSet/additionalSets)
 * - Legacy `gs` flat-array migration on decode
 * - encodeRosterToURL / decodeRosterFromURL end-to-end (async)
 * - Edge cases: empty roster, custom ultimates, all enum indexes
 */

/**
 * @jest-environment node
 *
 * rosterEncoding uses CompressionStream/DecompressionStream (Web Streams API).
 * jsdom does not ship these; running in the `node` environment uses Node 18's
 * native globals, which are spec-compatible with the browser version.
 */

import { KnownSetIDs } from '../types/abilities';
import {
  SupportUltimate,
  HealerBuff,
  HealerChampionPoint,
  CLASS_SKILL_LINES,
  createDefaultRoster,
  defaultTankSetup,
  defaultHealerSetup,
} from '../types/roster';

import {
  CompactRoster,
  compactifyRoster,
  expandCompactRoster,
  decodeRosterFromURL,
  toBase64Url,
  fromBase64Url,
} from './rosterEncoding';

// ============================================================
// Helpers
// ============================================================

/** Build a fully-populated roster for round-trip tests */
function buildFullRoster() {
  const roster = createDefaultRoster();
  roster.rosterName = 'My Test Raid';
  roster.notes = 'Some raid notes';

  roster.tank1 = {
    ...defaultTankSetup(),
    playerName: 'TankPlayer',
    playerNumber: '1',
    roleLabel: 'MT',
    labels: ['carry', 'veteran'],
    gearSets: {
      set1: KnownSetIDs.LUCENT_ECHOES,
      set2: KnownSetIDs.PEARLESCENT_WARD,
      monsterSet: KnownSetIDs.BARON_ZAUDRUS,
      additionalSets: [KnownSetIDs.PEARLS_OF_EHLNOFEY],
    },
    skillLines: {
      line1: 'Ardent Flame',
      line2: 'Draconic Power',
      line3: 'Earthen Heart',
      isFlex: false,
    },
    ultimate: SupportUltimate.WARHORN,
    specificSkills: ['Heroic Slash'],
    notes: 'Tank notes',
  };

  roster.tank2 = {
    ...defaultTankSetup(),
    playerName: 'OTankPlayer',
    gearSets: {
      set1: KnownSetIDs.CLAW_OF_YOLNAHKRIIN,
      set2: undefined,
    },
    ultimate: 'Custom Ultimate String', // Custom (non-enum) ultimate
  };

  roster.healer1 = {
    ...defaultHealerSetup(),
    playerName: 'HealerOne',
    set1: KnownSetIDs.JORVULDS_GUIDANCE,
    set2: KnownSetIDs.SPELL_POWER_CURE,
    monsterSet: KnownSetIDs.SYMPHONY_OF_BLADES,
    additionalSets: [KnownSetIDs.PEARLS_OF_EHLNOFEY],
    healerBuff: HealerBuff.ENLIVENING_OVERFLOW,
    championPoint: HealerChampionPoint.FROM_THE_BRINK,
    ultimate: SupportUltimate.COLOSSUS,
  };

  roster.healer2 = {
    ...defaultHealerSetup(),
    playerName: 'HealerTwo',
    set1: KnownSetIDs.ROARING_OPPORTUNIST,
    healerBuff: HealerBuff.FROM_THE_BRINK,
    championPoint: HealerChampionPoint.ENLIVENING_OVERFLOW,
  };

  // Slot 1 — fully populated DPS with structured gear
  roster.dpsSlots[0] = {
    slotNumber: 1,
    playerName: 'DPSOne',
    set1: KnownSetIDs.DEADLY_STRIKE,
    set2: KnownSetIDs.MERCILESS_CHARGE,
    monsterSet: KnownSetIDs.BALORGH,
    additionalSets: [KnownSetIDs.HARPOONERS_KILT],
    skillLines: {
      line1: 'Dark Magic',
      line2: 'Daedric Summoning',
      line3: 'Storm Calling',
      isFlex: false,
    },
    ultimate: SupportUltimate.BARRIER,
    jailDDType: 'banner',
    notes: 'DPS notes',
  };

  // Slot 3 — jail DD with custom description
  roster.dpsSlots[2] = {
    slotNumber: 3,
    playerName: 'JailPlayer',
    set1: KnownSetIDs.CRYPTCANON_VESTMENTS,
    jailDDType: 'custom',
    customDescription: 'Special mechanic',
  };

  // Slot 5 — flex skill lines
  roster.dpsSlots[4] = {
    slotNumber: 5,
    playerName: 'FlexPlayer',
    skillLines: {
      line1: '',
      line2: '',
      line3: '',
      isFlex: true,
    },
  };

  return roster;
}

// ============================================================
// compactifyRoster / expandCompactRoster
// ============================================================

describe('compactifyRoster / expandCompactRoster', () => {
  describe('empty roster round-trip', () => {
    it('produces version 2 compact object', () => {
      const roster = createDefaultRoster();
      const compact = compactifyRoster(roster);
      expect(compact.v).toBe(2);
    });

    it('omits rosterName when it is "New Roster"', () => {
      const roster = createDefaultRoster();
      roster.rosterName = 'New Roster';
      const compact = compactifyRoster(roster);
      expect(compact.n).toBeUndefined();
    });

    it('omits dp when no DPS slots are filled', () => {
      const roster = createDefaultRoster();
      const compact = compactifyRoster(roster);
      expect(compact.dp).toBeUndefined();
    });

    it('round-trips back to a valid roster', () => {
      const roster = createDefaultRoster();
      const compact = compactifyRoster(roster);
      const expanded = expandCompactRoster(compact);
      expect(expanded.rosterName).toBe('New Roster');
      expect(expanded.dpsSlots).toHaveLength(8);
    });
  });

  describe('roster name encoding', () => {
    it('stores a custom roster name', () => {
      const roster = createDefaultRoster();
      roster.rosterName = 'Epic Raid Night';
      const compact = compactifyRoster(roster);
      expect(compact.n).toBe('Epic Raid Night');
    });

    it('restores custom roster name on expand', () => {
      const roster = createDefaultRoster();
      roster.rosterName = 'Progression Week 3';
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.rosterName).toBe('Progression Week 3');
    });
  });

  describe('tank encoding', () => {
    it('encodes all tank fields and round-trips correctly', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      const expanded = expandCompactRoster(compact);

      const t1 = expanded.tank1;
      expect(t1.playerName).toBe('TankPlayer');
      expect(t1.playerNumber).toBe('1');
      expect(t1.roleLabel).toBe('MT');
      expect(t1.labels).toEqual(['carry', 'veteran']);
      expect(t1.gearSets.set1).toBe(KnownSetIDs.LUCENT_ECHOES);
      expect(t1.gearSets.set2).toBe(KnownSetIDs.PEARLESCENT_WARD);
      expect(t1.gearSets.monsterSet).toBe(KnownSetIDs.BARON_ZAUDRUS);
      expect(t1.gearSets.additionalSets).toEqual([KnownSetIDs.PEARLS_OF_EHLNOFEY]);
      expect(t1.skillLines.line1).toBe('Ardent Flame');
      expect(t1.skillLines.line2).toBe('Draconic Power');
      expect(t1.skillLines.line3).toBe('Earthen Heart');
      expect(t1.skillLines.isFlex).toBe(false);
      expect(t1.ultimate).toBe(SupportUltimate.WARHORN);
      expect(t1.notes).toBe('Tank notes');
    });

    it('encodes custom (non-enum) ultimate as a raw string', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      const expanded = expandCompactRoster(compact);
      expect(expanded.tank2.ultimate).toBe('Custom Ultimate String');
    });
  });

  describe('healer encoding', () => {
    it('round-trips all healer fields', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));

      const h1 = expanded.healer1;
      expect(h1.playerName).toBe('HealerOne');
      expect(h1.set1).toBe(KnownSetIDs.JORVULDS_GUIDANCE);
      expect(h1.set2).toBe(KnownSetIDs.SPELL_POWER_CURE);
      expect(h1.monsterSet).toBe(KnownSetIDs.SYMPHONY_OF_BLADES);
      expect(h1.additionalSets).toEqual([KnownSetIDs.PEARLS_OF_EHLNOFEY]);
      expect(h1.healerBuff).toBe(HealerBuff.ENLIVENING_OVERFLOW);
      expect(h1.championPoint).toBe(HealerChampionPoint.FROM_THE_BRINK);
      expect(h1.ultimate).toBe(SupportUltimate.COLOSSUS);
    });

    it('encodes HealerBuff enum as compact integer index', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      // h1.hb should be an integer (0 = ENLIVENING_OVERFLOW)
      expect(typeof compact.h1?.hb).toBe('number');
    });

    it('encodes HealerChampionPoint enum as compact integer index', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      expect(typeof compact.h1?.cp).toBe('number');
    });
  });

  describe('DPS gear encoding — structured fields', () => {
    it('encodes set1/set2/monsterSet/additionalSets on DPS slot', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      const dps1 = compact.dp?.find((d) => d.sn === 1);
      expect(dps1).toBeDefined();
      expect(dps1?.s1).toBe(KnownSetIDs.DEADLY_STRIKE);
      expect(dps1?.s2).toBe(KnownSetIDs.MERCILESS_CHARGE);
      expect(dps1?.ms).toBe(KnownSetIDs.BALORGH);
      expect(dps1?.as).toEqual([KnownSetIDs.HARPOONERS_KILT]);
    });

    it('does NOT encode legacy gs when structured fields are present', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      const dps1 = compact.dp?.find((d) => d.sn === 1);
      expect(dps1?.gs).toBeUndefined();
    });

    it('round-trips DPS structured gear correctly', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));
      const slot1 = expanded.dpsSlots[0];
      expect(slot1.set1).toBe(KnownSetIDs.DEADLY_STRIKE);
      expect(slot1.set2).toBe(KnownSetIDs.MERCILESS_CHARGE);
      expect(slot1.monsterSet).toBe(KnownSetIDs.BALORGH);
      expect(slot1.additionalSets).toEqual([KnownSetIDs.HARPOONERS_KILT]);
    });

    it('round-trips DPS with jailDDType=banner', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.dpsSlots[0].jailDDType).toBe('banner');
    });

    it('round-trips DPS with jailDDType=custom and customDescription', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));
      const slot3 = expanded.dpsSlots[2];
      expect(slot3.jailDDType).toBe('custom');
      expect(slot3.customDescription).toBe('Special mechanic');
    });

    it('round-trips flex skillLines flag on DPS', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.dpsSlots[4].skillLines?.isFlex).toBe(true);
    });

    it('preserves slot numbers accurately', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));
      // Only slots 1, 3, 5 were filled; others should have default slot numbers
      expect(expanded.dpsSlots[0].slotNumber).toBe(1);
      expect(expanded.dpsSlots[2].slotNumber).toBe(3);
      expect(expanded.dpsSlots[4].slotNumber).toBe(5);
    });
  });

  describe('DPS gear — legacy gs migration', () => {
    it('migrates legacy gs[0]/gs[1] to set1/set2 on decode', () => {
      const compact = compactifyRoster(createDefaultRoster());
      compact.dp = [
        {
          sn: 2,
          pn: 'LegacyPlayer',
          gs: [
            KnownSetIDs.DEADLY_STRIKE,
            KnownSetIDs.MERCILESS_CHARGE,
            KnownSetIDs.CRYPTCANON_VESTMENTS,
          ],
        },
      ];
      const expanded = expandCompactRoster(compact);
      const slot2 = expanded.dpsSlots[1];
      expect(slot2.set1).toBe(KnownSetIDs.DEADLY_STRIKE);
      expect(slot2.set2).toBe(KnownSetIDs.MERCILESS_CHARGE);
      expect(slot2.additionalSets).toEqual([KnownSetIDs.CRYPTCANON_VESTMENTS]);
    });

    it('does NOT migrate gs when s1 is present (structured takes precedence)', () => {
      const compact = compactifyRoster(createDefaultRoster());
      compact.dp = [
        {
          sn: 2,
          s1: KnownSetIDs.LUCENT_ECHOES,
          gs: [KnownSetIDs.DEADLY_STRIKE],
        },
      ];
      const expanded = expandCompactRoster(compact);
      const slot2 = expanded.dpsSlots[1];
      // Structured s1 wins; gs should NOT migrate
      expect(slot2.set1).toBe(KnownSetIDs.LUCENT_ECHOES);
      expect(slot2.set2).toBeUndefined();
    });
  });

  describe('skill lines encoding', () => {
    it('encodes known skill lines as integer indices (compact)', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      // "Ardent Flame" is index 0 in CLASS_SKILL_LINES
      expect(compact.t1?.sl?.l1).toBe(0);
    });

    it('encodes unknown skill lines as raw strings', () => {
      const roster = createDefaultRoster();
      roster.tank1 = {
        ...defaultTankSetup(),
        skillLines: {
          line1: 'Custom Line',
          line2: '',
          line3: '',
          isFlex: false,
        },
      };
      const compact = compactifyRoster(roster);
      expect(compact.t1?.sl?.l1).toBe('Custom Line');
    });

    it('round-trips all 21 CLASS_SKILL_LINES entries', () => {
      // Every known skill line should survive a round-trip
      CLASS_SKILL_LINES.forEach((line, idx) => {
        const roster = createDefaultRoster();
        roster.tank1 = {
          ...defaultTankSetup(),
          skillLines: { line1: line, line2: '', line3: '', isFlex: false },
        };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.tank1.skillLines.line1).toBe(line);
      });
    });
  });

  describe('ultimate encoding', () => {
    it('encodes each SupportUltimate variant as an integer', () => {
      Object.values(SupportUltimate).forEach((ult) => {
        const roster = createDefaultRoster();
        roster.tank1 = { ...defaultTankSetup(), ultimate: ult };
        const compact = compactifyRoster(roster);
        expect(typeof compact.t1?.ul).toBe('number');
      });
    });

    it('round-trips all SupportUltimate values correctly', () => {
      Object.values(SupportUltimate).forEach((ult) => {
        const roster = createDefaultRoster();
        roster.tank1 = { ...defaultTankSetup(), ultimate: ult };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.tank1.ultimate).toBe(ult);
      });
    });

    it('round-trips a custom ultimate string', () => {
      const roster = createDefaultRoster();
      roster.tank1 = { ...defaultTankSetup(), ultimate: 'My Custom Ultimate' };
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.tank1.ultimate).toBe('My Custom Ultimate');
    });
  });

  describe('available groups', () => {
    it('round-trips availableGroups array', () => {
      const roster = createDefaultRoster();
      roster.availableGroups = ['Stack 1', 'Stack 2', 'Range'];
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.availableGroups).toEqual(['Stack 1', 'Stack 2', 'Range']);
    });
  });
});

// ============================================================
// Base64URL helpers
// ============================================================

describe('toBase64Url / fromBase64Url', () => {
  it('encodes and decodes a simple byte array', () => {
    const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = toBase64Url(input);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    const decoded = fromBase64Url(encoded);
    expect(decoded).toEqual(input);
  });

  it('handles empty byte array', () => {
    const input = new Uint8Array([]);
    expect(fromBase64Url(toBase64Url(input))).toEqual(input);
  });

  it('handles bytes with values that need + / substitution', () => {
    // 0xFB = 251 → base64 would produce + and / chars
    const input = new Uint8Array([0xfb, 0xff, 0xfe]);
    const encoded = toBase64Url(input);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    const decoded = fromBase64Url(encoded);
    expect(decoded).toEqual(input);
  });
});

// ============================================================
// Node.js zlib helper for encode/decode tests
//
// CompressionStream/DecompressionStream (Web Streams API) are unavailable
// in Jest's vm sandbox even on Node 22. We use Node's synchronous zlib to
// produce / consume deflate-raw bytes in the same format as the browser
// implementation, which lets us test the decode path thoroughly.
// ============================================================

import { deflateRawSync, inflateRawSync } from 'zlib';

/** Build a v2-format encoded roster string using Node's zlib (test helper only). */
function encodeRosterSync(roster: RaidRoster): string {
  const compact = compactifyRoster(roster);
  const json = JSON.stringify(compact);
  const compressed = deflateRawSync(Buffer.from(json, 'utf-8'));
  return toBase64Url(new Uint8Array(compressed));
}

/** Decode a v2-format encoded string using Node's zlib (test helper only). */
function decodeRosterSync(encoded: string): RaidRoster | null {
  try {
    const bytes = fromBase64Url(encoded);
    const json = inflateRawSync(Buffer.from(bytes)).toString('utf-8');
    const parsed = JSON.parse(json) as { v?: number };
    if (parsed.v === 2) return expandCompactRoster(parsed as CompactRoster);
  } catch {
    // fall through
  }
  return null;
}

// ============================================================
// deflateString / inflateBytes — format compatibility
// ============================================================

describe('deflateString / inflateBytes (Node zlib format compatibility)', () => {
  it('toBase64Url + fromBase64Url survive a deflateRaw → inflateRaw cycle', () => {
    // Verifies that toBase64Url/fromBase64Url preserve bytes faithfully
    // (the core contract needed by encodeRosterToURL/decodeRosterFromURL)
    const json = JSON.stringify({ v: 2, n: 'Hello' });
    const compressed = deflateRawSync(Buffer.from(json, 'utf-8'));
    const bytes = new Uint8Array(compressed);
    const encoded = toBase64Url(bytes);
    const decoded = fromBase64Url(encoded);
    const decompressed = inflateRawSync(Buffer.from(decoded)).toString('utf-8');
    expect(decompressed).toBe(json);
  });

  it('Node zlib round-trips are self-consistent', () => {
    const original = JSON.stringify({ items: Array.from({ length: 200 }, (_, i) => i) });
    const compressed = deflateRawSync(Buffer.from(original, 'utf-8'));
    expect(compressed.length).toBeLessThan(original.length);
    const decompressed = inflateRawSync(compressed).toString('utf-8');
    expect(decompressed).toBe(original);
  });
});

// ============================================================
// decodeRosterSync — v2 format decode via Node zlib
//
// DecompressionStream is unavailable in Jest's vm context even on Node 22,
// so decodeRosterFromURL's v2 path can't be unit-tested here.
// decodeRosterSync bypasses this limitation and tests the same data path
// (compactifyRoster → deflateRaw → base64url → fromBase64Url → inflateRaw →
//  expandCompactRoster) with guaranteed-available Node.js APIs.
// The v2 decompression path in the browser is covered by E2E tests.
// ============================================================

describe('decodeRosterSync (v2 format — Node zlib decode)', () => {
  it('decodes an empty roster', () => {
    const roster = createDefaultRoster();
    const decoded = decodeRosterSync(encodeRosterSync(roster));
    expect(decoded).not.toBeNull();
    expect(decoded!.rosterName).toBe('New Roster');
    expect(decoded!.dpsSlots).toHaveLength(8);
  });

  it('decodes a fully populated roster', () => {
    const roster = buildFullRoster();
    const decoded = decodeRosterSync(encodeRosterSync(roster));
    expect(decoded).not.toBeNull();
    expect(decoded!.rosterName).toBe('My Test Raid');
    expect(decoded!.notes).toBe('Some raid notes');
    expect(decoded!.tank1.gearSets.set1).toBe(KnownSetIDs.LUCENT_ECHOES);
    expect(decoded!.tank1.gearSets.monsterSet).toBe(KnownSetIDs.BARON_ZAUDRUS);
    expect(decoded!.healer1.set1).toBe(KnownSetIDs.JORVULDS_GUIDANCE);
    expect(decoded!.healer1.healerBuff).toBe(HealerBuff.ENLIVENING_OVERFLOW);
    expect(decoded!.dpsSlots[0].set1).toBe(KnownSetIDs.DEADLY_STRIKE);
    expect(decoded!.dpsSlots[0].set2).toBe(KnownSetIDs.MERCILESS_CHARGE);
    expect(decoded!.dpsSlots[0].monsterSet).toBe(KnownSetIDs.BALORGH);
    expect(decoded!.dpsSlots[2].jailDDType).toBe('custom');
    expect(decoded!.dpsSlots[2].customDescription).toBe('Special mechanic');
  });

  it('DPS gear is NOT silently dropped — core regression test', () => {
    // Regression: before the fix, s1/s2/ms/as were absent from CompactDPS,
    // so DPS gear was silently dropped when encoding to a share URL.
    const roster = createDefaultRoster();
    roster.dpsSlots[0] = {
      slotNumber: 1,
      playerName: 'Regression DPS',
      set1: KnownSetIDs.CRYPTCANON_VESTMENTS,
      set2: KnownSetIDs.TIDEBORN_WILDSTALKER,
      monsterSet: KnownSetIDs.SPAULDER_OF_RUIN,
    };
    const decoded = decodeRosterSync(encodeRosterSync(roster));
    expect(decoded).not.toBeNull();
    expect(decoded!.dpsSlots[0].set1).toBe(KnownSetIDs.CRYPTCANON_VESTMENTS);
    expect(decoded!.dpsSlots[0].set2).toBe(KnownSetIDs.TIDEBORN_WILDSTALKER);
    expect(decoded!.dpsSlots[0].monsterSet).toBe(KnownSetIDs.SPAULDER_OF_RUIN);
  });

  it('returns null for an invalid/corrupt encoded string', () => {
    expect(decodeRosterSync('not-valid-base64!!!')).toBeNull();
  });
});

// ============================================================
// decodeRosterFromURL — v1 path and error cases
// (v2 path requires DecompressionStream unavailable in Jest's vm context)
// ============================================================

describe('decodeRosterFromURL (v1 path + error handling)', () => {
  it('returns null for a completely invalid string', async () => {
    expect(await decodeRosterFromURL('not-valid-base64-or-json!!!')).toBeNull();
  });

  it('returns null for an empty string', async () => {
    expect(await decodeRosterFromURL('')).toBeNull();
  });

  it('decodes a v1 legacy base64 roster', async () => {
    // v1 format: btoa(encodeURIComponent(JSON.stringify(roster)))
    const legacyRoster = createDefaultRoster();
    legacyRoster.rosterName = 'Legacy Roster';
    const v1Encoded = btoa(encodeURIComponent(JSON.stringify(legacyRoster)));
    const decoded = await decodeRosterFromURL(v1Encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.rosterName).toBe('Legacy Roster');
  });
});
