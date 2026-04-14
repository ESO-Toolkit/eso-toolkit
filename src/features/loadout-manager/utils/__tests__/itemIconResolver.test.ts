/**
 * Tests for icon-URL parsing — specifically the weapon-type derivation used
 * by BuildViewPage to replace the generic " Weapon" suffix with a specific
 * type (Sword, Dagger, Bow, …).
 *
 * The parser operates on the already-resolved icon URL so it stays aligned
 * with:
 *   - the local-data path (synchronous `getItemIconUrl`)
 *   - the page-level `resolvedIconId` correction for generic/slot-mismatched
 *     item IDs
 *   - the async UESP fallback path (`fetchItemIconUrl`), which also emits
 *     URLs of the same CDN shape.
 */

import {
  applyWeaponTypeToName,
  deriveItemNameForSlot,
  GENERIC_WEAPON_SUFFIXES,
  getItemIconUrl,
  parseWeaponTypeFromIconUrl,
} from '../itemIconResolver';

const CDN = 'https://esoicons.uesp.net/esoui/art/icons';

describe('parseWeaponTypeFromIconUrl', () => {
  it.each([
    ['1haxe', 'Axe'],
    ['1hsword', 'Sword'],
    ['1hhammer', 'Mace'],
    ['1hmace', 'Mace'],
    ['1hdagger', 'Dagger'],
    ['2haxe', 'Battle Axe'],
    ['2hsword', 'Greatsword'],
    ['2hhammer', 'Maul'],
    ['2hmace', 'Maul'],
    ['dagger', 'Dagger'],
    ['bow', 'Bow'],
    ['staff', 'Staff'],
    ['shield', 'Shield'],
  ])('maps token %s to %s', (token, label) => {
    expect(parseWeaponTypeFromIconUrl(`${CDN}/gear_argonian_${token}_d.png`)).toBe(label);
  });

  it('maps companion equipment staff icons to specific types', () => {
    expect(parseWeaponTypeFromIconUrl(`${CDN}/companions_u30_equipment_infernostaff.png`)).toBe(
      'Inferno Staff',
    );
    expect(parseWeaponTypeFromIconUrl(`${CDN}/companions_u30_equipment_froststaff.png`)).toBe(
      'Ice Staff',
    );
    expect(parseWeaponTypeFromIconUrl(`${CDN}/companions_u30_equipment_lightningstaff.png`)).toBe(
      'Lightning Staff',
    );
    expect(parseWeaponTypeFromIconUrl(`${CDN}/companions_u30_equipment_restostaff.png`)).toBe(
      'Restoration Staff',
    );
  });

  it('handles multi-segment style names like gear_ancient_elf_staff_a', () => {
    expect(parseWeaponTypeFromIconUrl(`${CDN}/gear_ancient_elf_staff_a.png`)).toBe('Staff');
  });

  it('handles tokens at end of filename (no trailing letter suffix)', () => {
    expect(parseWeaponTypeFromIconUrl(`${CDN}/gear_blackiron_staff.png`)).toBe('Staff');
  });

  it('returns null for armor icons', () => {
    expect(parseWeaponTypeFromIconUrl(`${CDN}/gear_argonian_light_hands_d.png`)).toBeNull();
    expect(parseWeaponTypeFromIconUrl(`${CDN}/gear_argonian_light_head_d.png`)).toBeNull();
  });

  it('returns null for non-gear icons', () => {
    expect(parseWeaponTypeFromIconUrl(`${CDN}/ability_mundusstones_001.png`)).toBeNull();
  });

  it('returns null for null or empty input', () => {
    expect(parseWeaponTypeFromIconUrl(null)).toBeNull();
    expect(parseWeaponTypeFromIconUrl(undefined)).toBeNull();
    expect(parseWeaponTypeFromIconUrl('')).toBeNull();
  });

  it('returns null for malformed URLs that do not point at the icon CDN path', () => {
    expect(
      parseWeaponTypeFromIconUrl('https://example.com/gear_argonian_1hsword_d.png'),
    ).toBeNull();
    expect(parseWeaponTypeFromIconUrl('gear_argonian_1hsword_d')).toBeNull();
  });

  it('tolerates query strings and fragments on the URL', () => {
    expect(parseWeaponTypeFromIconUrl(`${CDN}/gear_argonian_1hsword_d.png?v=2`)).toBe('Sword');
    expect(parseWeaponTypeFromIconUrl(`${CDN}/gear_argonian_bow_d.png#anchor`)).toBe('Bow');
  });

  it('does not false-match on unrelated tokens (e.g. "axe" inside a style name)', () => {
    // "baxe" is a real non-weapon substring (crafting_enchantment_baxe_…) —
    // the regex anchors on `_<token>_` so this must not match as "1haxe".
    expect(
      parseWeaponTypeFromIconUrl(`${CDN}/crafting_enchantment_baxe_bloodstone_r1.png`),
    ).toBeNull();
  });
});

describe('applyWeaponTypeToName', () => {
  it('replaces " Weapon" suffix with the specific type', () => {
    expect(
      applyWeaponTypeToName(
        "Mother's Sorrow Weapon",
        `${CDN}/gear_argonian_1hsword_d.png`,
        'weapon',
      ),
    ).toBe("Mother's Sorrow Sword");
  });

  it('replaces " Off-Hand" suffix (shield in off-hand)', () => {
    expect(
      applyWeaponTypeToName(
        "Mother's Sorrow Off-Hand",
        `${CDN}/gear_argonian_shield_d.png`,
        'offhand',
      ),
    ).toBe("Mother's Sorrow Shield");
  });

  it('replaces " Gear" suffix for generic set IDs once the icon is resolved', () => {
    expect(
      applyWeaponTypeToName("Mother's Sorrow Gear", `${CDN}/gear_argonian_1haxe_d.png`, 'weapon'),
    ).toBe("Mother's Sorrow Axe");
  });

  it('no-ops when slot is not weapon/offhand', () => {
    expect(
      applyWeaponTypeToName(
        "Mother's Sorrow Chest",
        `${CDN}/gear_argonian_light_robe_d.png`,
        'chest',
      ),
    ).toBe("Mother's Sorrow Chest");
  });

  it('no-ops when the icon URL has no weapon token', () => {
    expect(
      applyWeaponTypeToName(
        "Mother's Sorrow Weapon",
        `${CDN}/gear_argonian_light_hands_d.png`,
        'weapon',
      ),
    ).toBe("Mother's Sorrow Weapon");
  });

  it('no-ops when the raw name has no recognized suffix', () => {
    expect(
      applyWeaponTypeToName('Totally Custom Name', `${CDN}/gear_argonian_1hsword_d.png`, 'weapon'),
    ).toBe('Totally Custom Name');
  });

  it('no-ops on null/undefined icon URL (falls back to generic name)', () => {
    expect(applyWeaponTypeToName("Mother's Sorrow Weapon", null, 'weapon')).toBe(
      "Mother's Sorrow Weapon",
    );
    expect(applyWeaponTypeToName("Mother's Sorrow Weapon", undefined, 'weapon')).toBe(
      "Mother's Sorrow Weapon",
    );
  });

  it('does not double up if the suffix already matches the weapon type', () => {
    // If a name already says "Sword" it won't match any generic suffix, so no-op.
    expect(
      applyWeaponTypeToName(
        "Mother's Sorrow Sword",
        `${CDN}/gear_argonian_1hsword_d.png`,
        'weapon',
      ),
    ).toBe("Mother's Sorrow Sword");
  });
});

describe('GENERIC_WEAPON_SUFFIXES', () => {
  it('contains the four known generic slot-name endings', () => {
    expect([...GENERIC_WEAPON_SUFFIXES]).toEqual([' Weapon', ' Off-Hand', ' Offhand', ' Gear']);
  });
});

describe('deriveItemNameForSlot (integration — real itemIds through local icon data)', () => {
  // These item IDs are real Mother's Sorrow weapons from itemIdMap, chosen
  // because they exercise the full chain: getItemInfo → getItemIconUrl / weaponTypes data
  // → applyWeaponTypeToName. Staff items (97227-97230) are resolved via the
  // weaponTypes data in itemIcons.json since all staff icons use the same generic token.
  it.each([
    [97219, 'weapon' as const, "Mother's Sorrow Axe"],
    [97221, 'weapon' as const, "Mother's Sorrow Sword"],
    [97225, 'weapon' as const, "Mother's Sorrow Dagger"],
    [97226, 'weapon' as const, "Mother's Sorrow Bow"],
    [97227, 'weapon' as const, "Mother's Sorrow Inferno Staff"],
    [97228, 'weapon' as const, "Mother's Sorrow Ice Staff"],
    [97229, 'weapon' as const, "Mother's Sorrow Lightning Staff"],
    [97230, 'weapon' as const, "Mother's Sorrow Restoration Staff"],
    [97231, 'offhand' as const, "Mother's Sorrow Shield"],
  ])('resolves item %i in slot %s → %s', (itemId, slotType, expected) => {
    // Sanity-check the upstream link first — if the icon JSON changes shape,
    // we want a specific failure here, not a silent regression elsewhere.
    const iconUrl = getItemIconUrl(itemId);
    expect(iconUrl).toMatch(/\/icons\/gear_/);
    expect(deriveItemNameForSlot(itemId, slotType)).toBe(expected);
  });

  it('iconUrlOverride wins over local icon lookup (async UESP fallback path)', () => {
    // Item 97221 locally resolves to a 1hsword icon → "Sword". Force-override
    // to a bow icon; the helper must follow the override (so it stays in
    // lockstep with whatever the component is rendering after an async fetch).
    const bowUrl = `${CDN}/gear_argonian_bow_d.png`;
    expect(deriveItemNameForSlot(97221, 'weapon', bowUrl)).toBe("Mother's Sorrow Bow");
  });

  it('returns raw name for non-weapon slots (no type derivation)', () => {
    expect(deriveItemNameForSlot(97232, 'chest')).toMatch(/Chest$/);
  });

  it('returns "Item #X" placeholder for unknown itemIds', () => {
    expect(deriveItemNameForSlot(99999999, 'weapon')).toBe('Item #99999999');
  });

  it('handles null/undefined itemId gracefully', () => {
    expect(deriveItemNameForSlot(null, 'weapon')).toBe('Item #?');
    expect(deriveItemNameForSlot(undefined, 'weapon')).toBe('Item #?');
    expect(deriveItemNameForSlot(0, 'weapon')).toBe('Item #?');
  });
});

describe('deriveItemNameForSlot (slot-specificity guard — regression for /bv false-assertion bug)', () => {
  // Generic set IDs (no slot field in itemIdMap) must NOT be rewritten to a
  // specific weapon type. In BuildViewPage, the icon for these comes from a
  // getSetItemsBySlot(setName, slot)[0] fallback — an arbitrary choice among
  // several weapon variants. Asserting the fallback's type as definitive
  // would silently corrupt shared build displays.
  //
  // Item 2558 is "Mother's Sorrow Gear" — a LibSets set-level ID with no
  // `slot` field. Mother's Sorrow has 12 slot='weapon' entries (axe, sword,
  // dagger, bow, staff variants, etc.) so the first-match fallback is a
  // coin flip.
  it('keeps generic set IDs as "<Set> Gear" even when caller has a weapon-shaped icon URL', () => {
    const bowIconOverride = `${CDN}/gear_argonian_bow_d.png`;
    expect(deriveItemNameForSlot(2558, 'weapon', bowIconOverride)).toBe("Mother's Sorrow Gear");
  });

  it('keeps generic set IDs as "<Set> Gear" with no override (local icon lookup)', () => {
    expect(deriveItemNameForSlot(2558, 'weapon')).toBe("Mother's Sorrow Gear");
  });

  it('still rewrites for slot-specific item IDs (positive control)', () => {
    // Same call shape, but itemInfo.slot === 'weapon' — the derivation is
    // safe because the itemId uniquely identifies the weapon type.
    expect(deriveItemNameForSlot(97221, 'weapon')).toBe("Mother's Sorrow Sword");
  });

  it('keeps non-weapon-slot items unchanged even if caller forces a weapon icon URL', () => {
    // Item 97232 = "Mother's Sorrow Chest" (slot='chest'). An adversarial
    // caller passing a bow URL must not produce "Mother's Sorrow Bow".
    const bowIconOverride = `${CDN}/gear_argonian_bow_d.png`;
    expect(deriveItemNameForSlot(97232, 'chest', bowIconOverride)).toBe("Mother's Sorrow Chest");
  });
});
