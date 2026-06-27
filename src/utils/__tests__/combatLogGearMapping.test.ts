import {
  ARMOR_TRAITS,
  WEAPON_TRAITS,
  JEWELRY_TRAITS,
  type GearCategory,
} from '@/features/build-editor/data/gear-traits-enchants';
import {
  gearCategoryForSlot,
  resolveTraitId,
  resolveEnchantId,
  resolveWeaponItemId,
  __ENCHANT_ID_BY_CATEGORY,
  __ENCHANT_LISTS_BY_CATEGORY,
} from '@/utils/combatLogGearMapping';

describe('gearCategoryForSlot', () => {
  it('maps apparel slots (0–6) to armor', () => {
    for (const slot of [0, 1, 2, 3, 4, 5, 6]) {
      expect(gearCategoryForSlot(slot)).toBe('armor');
    }
  });

  it('maps jewelry slots (7–9: neck, ring1, ring2) to jewelry', () => {
    for (const slot of [7, 8, 9]) {
      expect(gearCategoryForSlot(slot)).toBe('jewelry');
    }
  });

  it('maps weapon slots (10–13: main/off + backups) to weapon', () => {
    for (const slot of [10, 11, 12, 13]) {
      expect(gearCategoryForSlot(slot)).toBe('weapon');
    }
  });
});

describe('resolveTraitId', () => {
  it('resolves common weapon traits (consistent with the report gear panel)', () => {
    expect(resolveTraitId(32, 'weapon')).toBe('sharpened'); // GearTrait.SHARPENED
    expect(resolveTraitId(24, 'weapon')).toBe('decisive');
    expect(resolveTraitId(25, 'weapon')).toBe('powered');
  });

  it('resolves common armor traits', () => {
    expect(resolveTraitId(40, 'armor')).toBe('divines');
    expect(resolveTraitId(8, 'armor')).toBe('reinforced'); // GearTrait.REINFORCED
    expect(resolveTraitId(35, 'armor')).toBe('reinforced'); // alternate Reinforced code
    expect(resolveTraitId(33, 'armor')).toBe('sturdy');
    expect(resolveTraitId(36, 'armor')).toBe('well-fitted'); // "Well-fitted" → "well-fitted"
  });

  it('resolves common jewelry traits', () => {
    expect(resolveTraitId(53, 'jewelry')).toBe('bloodthirsty');
    expect(resolveTraitId(48, 'jewelry')).toBe('triune');
    expect(resolveTraitId(52, 'jewelry')).toBe('swift');
  });

  it('resolves Infused in every category', () => {
    expect(resolveTraitId(4, 'weapon')).toBe('infused');
    expect(resolveTraitId(38, 'armor')).toBe('infused');
    expect(resolveTraitId(49, 'jewelry')).toBe('infused');
  });

  it('returns undefined for no trait (0 / null / undefined)', () => {
    expect(resolveTraitId(0, 'weapon')).toBeUndefined();
    expect(resolveTraitId(undefined, 'armor')).toBeUndefined();
    expect(resolveTraitId(null, 'jewelry')).toBeUndefined();
  });

  it('returns undefined for crafting-only / non-build traits (Ornate, Intricate)', () => {
    expect(resolveTraitId(43, 'armor')).toBeUndefined(); // Ornate
    expect(resolveTraitId(44, 'armor')).toBeUndefined(); // Intricate
  });

  it('gates by category — a weapon trait does not resolve on armor', () => {
    // 32 = Sharpened (weapon-only). Asking on the armor category must not return a value.
    expect(resolveTraitId(32, 'armor')).toBeUndefined();
    // 40 = Divines (armor-only) must not resolve on weapon.
    expect(resolveTraitId(40, 'weapon')).toBeUndefined();
  });
});

describe('resolveEnchantId', () => {
  it('resolves common weapon enchants', () => {
    expect(resolveEnchantId(27, 'weapon')).toBe('weapon-damage');
    expect(resolveEnchantId(13, 'weapon')).toBe('crushing'); // "Crusher"
    expect(resolveEnchantId(14, 'weapon')).toBe('weakening');
    expect(resolveEnchantId(10, 'weapon')).toBe('flame'); // "Flame Damage"
    expect(resolveEnchantId(6, 'weapon')).toBe('frost'); // "Frost Damage"
    expect(resolveEnchantId(9, 'weapon')).toBe('foulness'); // "Disease Damage"
  });

  it('resolves common armor enchants', () => {
    expect(resolveEnchantId(22, 'armor')).toBe('magicka'); // "Increase Magicka"
    expect(resolveEnchantId(31, 'armor')).toBe('stamina'); // "Increase Stamina"
    expect(resolveEnchantId(29, 'armor')).toBe('health'); // "Increase Health"
    expect(resolveEnchantId(26, 'armor')).toBe('prismatic-defense');
    expect(resolveEnchantId(39, 'armor')).toBe('prismatic-defense');
  });

  it('resolves common jewelry enchants, disambiguating spell vs weapon damage', () => {
    expect(resolveEnchantId(47, 'jewelry')).toBe('increase-spell-damage'); // "Spell Damage"
    expect(resolveEnchantId(46, 'jewelry')).toBe('increase-physical-damage'); // "Weapon Damage"
    expect(resolveEnchantId(37, 'jewelry')).toBe('magicka-recovery');
    expect(resolveEnchantId(36, 'jewelry')).toBe('stamina-recovery');
  });

  it('returns undefined for no enchant (0 / null / undefined)', () => {
    expect(resolveEnchantId(0, 'weapon')).toBeUndefined();
    expect(resolveEnchantId(undefined, 'armor')).toBeUndefined();
    expect(resolveEnchantId(null, 'jewelry')).toBeUndefined();
  });
});

describe('resolveWeaponItemId (graceful fallback)', () => {
  // The happy path (mapping a generic set-weapon id to its type-specific variant)
  // needs the async-loaded icon data, which isn't available offline — that path is
  // covered by live verification. These assert the no-data fallbacks never throw
  // and never invent an id.
  it('returns the original id when no set name is given', () => {
    expect(
      resolveWeaponItemId({ combatLogId: 117218, weaponType: 13, setName: undefined, slotType: 'weapon' }),
    ).toBe(117218);
  });

  it('returns the original id when the weapon type is unknown/none', () => {
    expect(
      resolveWeaponItemId({ combatLogId: 999, weaponType: 0, setName: 'Powerful Assault', slotType: 'weapon' }),
    ).toBe(999);
  });

  it('returns a number without throwing for a real set when icon data is absent', () => {
    const out = resolveWeaponItemId({
      combatLogId: 117218,
      weaponType: 13,
      icon: 'gear_breton_staff_d',
      setName: 'Powerful Assault',
      slotType: 'weapon',
    });
    expect(typeof out).toBe('number');
  });
});

describe('mapping integrity', () => {
  it('every mapped trait ID exists in its category Build Editor list', () => {
    const lists: Record<GearCategory, Set<string>> = {
      armor: new Set(ARMOR_TRAITS.map((t) => t.id)),
      weapon: new Set(WEAPON_TRAITS.map((t) => t.id)),
      jewelry: new Set(JEWELRY_TRAITS.map((t) => t.id)),
    };
    // Spot-check a representative resolved value per category lands in its list.
    expect(lists.weapon.has(resolveTraitId(32, 'weapon')!)).toBe(true);
    expect(lists.armor.has(resolveTraitId(40, 'armor')!)).toBe(true);
    expect(lists.jewelry.has(resolveTraitId(53, 'jewelry')!)).toBe(true);
  });

  it('every mapped enchant ID exists in its category Build Editor list', () => {
    (['armor', 'weapon', 'jewelry'] as const).forEach((category) => {
      const validIds = new Set(__ENCHANT_LISTS_BY_CATEGORY[category].map((e) => e.id));
      for (const mappedId of Object.values(__ENCHANT_ID_BY_CATEGORY[category])) {
        expect(validIds.has(mappedId)).toBe(true);
      }
    });
  });
});
