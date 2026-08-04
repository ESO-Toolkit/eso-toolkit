import { KnownAbilities } from '../../types/abilities';

import {
  getStatusEffectIcon,
  getStatusEffectName,
  STATUS_EFFECT_METADATA,
} from './statusEffectMetadata';

// The exact set of status-effect ability ids the worker tracks. Kept in sync
// with STATUS_EFFECT_BUFF_ABILITIES + STATUS_EFFECT_DEBUFF_ABILITIES in
// CalculateStatusEffectUptimes.ts — if a new tracked effect is added there, this
// guard fails until metadata is supplied, preventing a regression back to the
// raw "Ability <id>" placeholder.
const TRACKED_STATUS_EFFECTS = [
  KnownAbilities.BURNING,
  KnownAbilities.POISONED,
  KnownAbilities.HEMMORRHAGING,
  KnownAbilities.CHILL,
  KnownAbilities.CONCUSSION,
  KnownAbilities.DISEASED,
  KnownAbilities.OVERCHARGED,
  KnownAbilities.SUNDERED,
];

describe('statusEffectMetadata', () => {
  it('has a name and icon for every tracked status effect', () => {
    for (const id of TRACKED_STATUS_EFFECTS) {
      const entry = STATUS_EFFECT_METADATA[id];
      expect(entry).toBeDefined();
      expect(entry.name).toBeTruthy();
      expect(entry.name).not.toMatch(/^Ability \d+$/);
      expect(entry.icon).toBeTruthy();
    }
  });

  it('resolves canonical names for known status effects', () => {
    expect(getStatusEffectName(KnownAbilities.BURNING)).toBe('Burning');
    expect(getStatusEffectName(KnownAbilities.POISONED)).toBe('Poisoned');
    expect(getStatusEffectName(KnownAbilities.HEMMORRHAGING)).toBe('Hemorrhaging');
  });

  it('resolves verified CDN icon filenames for known status effects', () => {
    expect(getStatusEffectIcon(KnownAbilities.BURNING)).toBe('ability_mage_062');
    expect(getStatusEffectIcon(KnownAbilities.POISONED)).toBe('ability_rogue_030');
    expect(getStatusEffectIcon(KnownAbilities.HEMMORRHAGING)).toBe('death_recap_bleed_dot_heavy');
  });

  it('falls back to a readable placeholder for an unknown id', () => {
    expect(getStatusEffectName(999999)).toBe('Ability 999999');
    expect(getStatusEffectIcon(999999)).toBeUndefined();
  });
});
