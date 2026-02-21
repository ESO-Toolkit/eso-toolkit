/**
 * Tests for potionDetectionUtils
 * Tests ESO combat potion type detection and formatting utilities.
 */

import {
  abbreviatePotion,
  describePotionType,
  detectPotionType,
  getPotionColor,
  type PotionType,
} from './potionDetectionUtils';

// Use the same mock IDs as in the source constants so Stage-1 detection works
// in tests without hitting the real abilities.ts module.
jest.mock('../types/abilities', () => ({
  STAMINA_POTION_RESTORE_EFFECT: new Set([6119]),
  MAGICKA_POTION_RESTORE_EFFECT: new Set([6118]),
  POTION_TIMER_IDS: new Set([63551, 63631, 63653, 63654, 63673, 66255, 72985, 81733, 82679, 82680]),
  // Food sets reused by foodDetectionUtils (must be present to avoid import errors)
  TRI_STAT_FOOD: new Set([]),
  HEALTH_AND_REGEN_FOOD: new Set([]),
  HEALTH_FOOD: new Set([]),
  MAGICKA_FOOD: new Set([]),
  STAMINA_FOOD: new Set([]),
  INCREASE_MAX_HEALTH_AND_STAMINA: new Set([]),
  INCREASE_MAX_HEALTH_AND_MAGICKA: new Set([]),
}));

// ─── detectPotionType ────────────────────────────────────────────────────────

describe('detectPotionType', () => {
  describe('when potionUse is 0', () => {
    it('returns "none" regardless of auras', () => {
      const auras = [{ name: 'Major Brutality', id: 99999 }];
      expect(detectPotionType(auras, 0)).toBe('none');
    });

    it('returns "none" with empty auras', () => {
      expect(detectPotionType([], 0)).toBe('none');
    });

    it('returns "none" with undefined auras', () => {
      expect(detectPotionType(undefined, 0)).toBe('none');
    });
  });

  describe('when auras are empty / undefined but potionUse > 0', () => {
    it('returns "unknown" for undefined auras', () => {
      expect(detectPotionType(undefined, 3)).toBe('unknown');
    });

    it('returns "unknown" for empty aura list', () => {
      expect(detectPotionType([], 2)).toBe('unknown');
    });
  });

  // ─── Stage 1: exclusive ID detection ──────────────────────────────────────

  describe('Stage-1 ID-based detection', () => {
    it('detects stamina potion via restore-effect ID 6119', () => {
      const auras = [
        { name: 'Some Aura', id: 6119 },
        { name: 'Major Brutality', id: 100 },
      ];
      expect(detectPotionType(auras, 5)).toBe('stamina');
    });

    it('detects magicka potion via restore-effect ID 6118', () => {
      const auras = [{ name: 'Some Aura', id: 6118 }];
      expect(detectPotionType(auras, 4)).toBe('magicka');
    });

    it('stamina detection takes priority over weapon-power when ID is present', () => {
      const auras = [
        { name: 'Major Brutality', id: 1 },
        { name: 'Major Savagery', id: 2 },
        { name: 'Stamina Restore', id: 6119 }, // ID wins
      ];
      expect(detectPotionType(auras, 4)).toBe('stamina');
    });
  });

  // ─── Stage 2: Major Heroism (tri-stat) ───────────────────────────────────

  describe('tri-stat / Major Heroism detection', () => {
    it('detects tri-stat via Major Heroism known ID (61709)', () => {
      const auras = [{ name: 'Major Heroism', id: 61709 }];
      expect(detectPotionType(auras, 1)).toBe('tri-stat');
    });

    it('detects tri-stat via Major Heroism name pattern', () => {
      const auras = [{ name: 'Major Heroism', id: 9999 }];
      expect(detectPotionType(auras, 2)).toBe('tri-stat');
    });

    it('is case-insensitive for Major Heroism', () => {
      const auras = [{ name: 'major heroism', id: 9999 }];
      expect(detectPotionType(auras, 1)).toBe('tri-stat');
    });
  });

  // ─── Stage 2: buff-combo detection ───────────────────────────────────────

  describe('Weapon Power Potion detection', () => {
    it('detects weapon-power when both Major Brutality and Major Savagery are present', () => {
      const auras = [
        { name: 'Major Brutality', id: 55602 },
        { name: 'Major Savagery', id: 55603 },
      ];
      expect(detectPotionType(auras, 4)).toBe('weapon-power');
    });

    it('does NOT detect weapon-power when only Major Brutality is present', () => {
      const auras = [{ name: 'Major Brutality', id: 55602 }];
      expect(detectPotionType(auras, 3)).not.toBe('weapon-power');
    });

    it('does NOT detect weapon-power when only Major Savagery is present', () => {
      const auras = [{ name: 'Major Savagery', id: 55603 }];
      expect(detectPotionType(auras, 3)).not.toBe('weapon-power');
    });
  });

  describe('Spell Power Potion detection', () => {
    it('detects spell-power when both Major Sorcery and Major Prophecy are present', () => {
      const auras = [
        { name: 'Major Sorcery', id: 33317 },
        { name: 'Major Prophecy', id: 61687 },
      ];
      expect(detectPotionType(auras, 3)).toBe('spell-power');
    });

    it('does NOT detect spell-power when only Major Sorcery is present', () => {
      const auras = [{ name: 'Major Sorcery', id: 33317 }];
      expect(detectPotionType(auras, 3)).not.toBe('spell-power');
    });
  });

  // ─── Fallback ─────────────────────────────────────────────────────────────

  describe('unknown fallback', () => {
    it('returns "unknown" when potionUse > 0 but no identifying auras', () => {
      const auras = [
        { name: 'Minor Resolve', id: 50000 },
        { name: 'Major Protection', id: 50001 },
      ];
      expect(detectPotionType(auras, 2)).toBe('unknown');
    });
  });
});

// ─── abbreviatePotion ────────────────────────────────────────────────────────

describe('abbreviatePotion', () => {
  const cases: Array<[PotionType, string]> = [
    ['tri-stat', 'TRI'],
    ['weapon-power', 'WPN'],
    ['spell-power', 'SPL'],
    ['stamina', 'STAM'],
    ['magicka', 'MAG'],
    ['health', 'HP'],
    ['unknown', '?'],
    ['none', 'NONE'],
  ];

  test.each(cases)('abbreviates "%s" as "%s"', (type, expected) => {
    expect(abbreviatePotion(type)).toBe(expected);
  });
});

// ─── getPotionColor ───────────────────────────────────────────────────────────

describe('getPotionColor', () => {
  it('returns a hex colour string for each type', () => {
    const types: PotionType[] = [
      'tri-stat',
      'weapon-power',
      'spell-power',
      'stamina',
      'magicka',
      'health',
      'unknown',
      'none',
    ];
    for (const t of types) {
      expect(getPotionColor(t)).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
    }
  });

  it('returns grey for "none" and "unknown"', () => {
    expect(getPotionColor('none')).toBe('#888');
    expect(getPotionColor('unknown')).toBe('#888');
  });
});

// ─── describePotionType ───────────────────────────────────────────────────────

describe('describePotionType', () => {
  it('returns a non-empty description for every type', () => {
    const types: PotionType[] = [
      'tri-stat',
      'weapon-power',
      'spell-power',
      'stamina',
      'magicka',
      'health',
      'unknown',
      'none',
    ];
    for (const t of types) {
      expect(describePotionType(t).length).toBeGreaterThan(0);
    }
  });

  it('mentions "No potion" for the "none" type', () => {
    expect(describePotionType('none')).toMatch(/no potion/i);
  });

  it('mentions Tri-Stat for "tri-stat" type', () => {
    expect(describePotionType('tri-stat')).toMatch(/tri-?stat/i);
  });
});
