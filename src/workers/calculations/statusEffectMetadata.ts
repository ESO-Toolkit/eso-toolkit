import { KnownAbilities } from '../../types/abilities';

/**
 * Canonical display name + icon for each tracked status effect.
 *
 * WHY THIS EXISTS
 * ESO status effects (Burning, Poisoned, Hemorrhaging, …) are derived game
 * mechanics. A report's `masterData.abilities` only lists abilities the ESO Logs
 * API explicitly emits for that report, and these status-effect ability ids are
 * frequently ABSENT from it. When they are, the UI's master-data lookup
 * (`abilitiesById[id]?.name`) returns nothing, so the Status Effect Uptimes panel
 * fell back to a raw `"Ability 18084"` placeholder with no icon.
 *
 * These ids are fixed, well-known game abilities, so we resolve them from a tiny
 * static table instead of depending on per-report master data. The values are the
 * exact ESO Logs game-data name + icon for each id (data/abilities.json oracle),
 * and every icon filename below was confirmed HTTP 200 on the rpglogs CDN
 * (https://assets.rpglogs.com/img/eso/abilities/<icon>.png).
 *
 * The panel still PREFERS report master data when it is present
 * (`ability?.name || uptime.abilityName`), so this only supplies the fallback —
 * it never overrides a real per-report name.
 */
export interface StatusEffectMetadata {
  name: string;
  /** rpglogs CDN icon filename, WITHOUT the `.png` extension. */
  icon: string;
}

export const STATUS_EFFECT_METADATA: Readonly<Record<number, StatusEffectMetadata>> = {
  [KnownAbilities.BURNING]: { name: 'Burning', icon: 'ability_mage_062' },
  [KnownAbilities.POISONED]: { name: 'Poisoned', icon: 'ability_rogue_030' },
  [KnownAbilities.HEMMORRHAGING]: {
    name: 'Hemorrhaging',
    icon: 'death_recap_bleed_dot_heavy',
  },
  [KnownAbilities.CHILL]: { name: 'Chill', icon: 'ability_mage_065' },
  [KnownAbilities.CONCUSSION]: { name: 'Concussion', icon: 'ability_mage_065' },
  [KnownAbilities.DISEASED]: { name: 'Diseased', icon: 'ability_mage_065' },
  [KnownAbilities.OVERCHARGED]: { name: 'Overcharged', icon: 'ability_mage_065' },
  [KnownAbilities.SUNDERED]: { name: 'Sundered', icon: 'ability_mage_065' },
};

/**
 * Resolve the canonical display name for a tracked status-effect ability id,
 * falling back to a readable `"Ability <id>"` placeholder for any id without an
 * entry (should not happen for tracked effects, but keeps the worker total).
 */
export function getStatusEffectName(abilityId: number): string {
  return STATUS_EFFECT_METADATA[abilityId]?.name ?? `Ability ${abilityId}`;
}

/**
 * Resolve the canonical icon filename (no extension) for a tracked status-effect
 * ability id, or `undefined` if unknown.
 */
export function getStatusEffectIcon(abilityId: number): string | undefined {
  return STATUS_EFFECT_METADATA[abilityId]?.icon;
}
