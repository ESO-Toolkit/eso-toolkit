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

import { parseWeaponTypeFromIconUrl } from '../itemIconResolver';

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
