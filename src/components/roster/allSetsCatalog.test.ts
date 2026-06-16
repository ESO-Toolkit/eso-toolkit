import { KnownSetIDs } from '../../types/abilities';
import { getSetDisplayName } from '../../utils/setNameUtils';

import { getAssignableSets, getSetTooltipProps, getSlotKindForSetName } from './allSetsCatalog';

describe('allSetsCatalog', () => {
  const sets = getAssignableSets();

  it('exposes a large assignable universe (far more than the curated support sets)', () => {
    // ~230 enum-backed sets (the 3 "Unknown" placeholders are excluded).
    expect(sets.length).toBeGreaterThan(150);
  });

  it('excludes the "Unknown" placeholder sets', () => {
    expect(sets.some((s) => s.name === 'Unknown')).toBe(false);
    expect(sets.some((s) => s.name.startsWith('Unknown Set'))).toBe(false);
  });

  it('gives every set a resolvable slot kind (no dead-ends)', () => {
    for (const s of sets) {
      expect(s.slotKind === 'fivePiece' || s.slotKind === 'monster').toBe(true);
    }
  });

  it('every set is resolvable back to an id via its display name', () => {
    // The browser stores by id; a name that does not round-trip would fail to assign.
    for (const s of sets) {
      expect(getSetDisplayName(s.id)).toBe(s.name);
    }
  });

  describe('getSlotKindForSetName', () => {
    it('classifies a 5-piece support set as fivePiece', () => {
      expect(getSlotKindForSetName(getSetDisplayName(KnownSetIDs.SPELL_POWER_CURE))).toBe(
        'fivePiece',
      );
    });

    it('classifies a monster set as monster', () => {
      expect(getSlotKindForSetName(getSetDisplayName(KnownSetIDs.ENGINE_GUARDIAN))).toBe('monster');
    });

    it('classifies a mythic (1-piece) as monster slot', () => {
      expect(getSlotKindForSetName(getSetDisplayName(KnownSetIDs.OAKENSOUL))).toBe('monster');
    });

    it('classifies an arbitrary non-support trial 5-piece as fivePiece', () => {
      // Tide-Born Wildstalker is in SET_DISPLAY_NAMES but not in the curated
      // support lists — it must still route to the 5-piece slot.
      expect(getSlotKindForSetName(getSetDisplayName(KnownSetIDs.TIDEBORN_WILDSTALKER))).toBe(
        'fivePiece',
      );
    });

    it('returns null for an unknown name', () => {
      expect(getSlotKindForSetName('Not A Real Set')).toBeNull();
      expect(getSlotKindForSetName('')).toBeNull();
      expect(getSlotKindForSetName(undefined)).toBeNull();
    });
  });

  describe('getSetTooltipProps', () => {
    const byName = (n: string) => sets.find((s) => s.name === n)!;

    it('returns a rich tooltip (name + bonuses) for a catalog-matched set', () => {
      const props = getSetTooltipProps(byName('Spell Power Cure'));
      expect(props.setName).toBe('Spell Power Cure');
      expect(props.setBonuses.length).toBeGreaterThan(0);
    });

    it('resolves bonuses for an abbreviated support name via the alias map', () => {
      // "Olorime" only resolves to bonuses through CATALOG_NAME_ALIASES.
      const olorime = sets.find((s) => s.name === 'Olorime');
      if (olorime) {
        const props = getSetTooltipProps(olorime);
        expect(props.setName).toBe('Olorime');
        expect(props.setBonuses.length).toBeGreaterThan(0);
      }
    });

    it('always returns a tooltip with the roster name, even with no catalog match', () => {
      // Every assignable set must get a usable hover card — no nulls.
      for (const s of sets) {
        const props = getSetTooltipProps(s);
        expect(props.setName).toBe(s.name);
        expect(Array.isArray(props.setBonuses)).toBe(true);
      }
    });
  });
});
