import { CriticalDamageValues } from '@/types/abilities';

export type CriticalDamageSourceInclusion = 'included' | 'excluded' | 'unknown';

/**
 * Critical damage to subtract from the displayed graph for the toggleable always-on stars
 * (Fighting Finesse, Backstabber) that are currently switched off.
 *
 * The subtraction is gated on whether the worker actually BAKED the star into the static
 * critical damage (`*Included`, derived from the source's `wasActive`). Once companion
 * evidence proves a star isn't slotted, the worker excludes it (wasActive=false), so we must
 * NOT subtract it again here — subtracting only when `included && !enabled` avoids that
 * double-subtract while preserving the pre-companion behaviour (no evidence => included=true).
 */
export function computeCritDamageAdjustment(p: {
  fightingFinesseInclusion: CriticalDamageSourceInclusion;
  fightingFinesseEnabled: boolean;
  backstabberInclusion: CriticalDamageSourceInclusion;
  backstabberEnabled: boolean;
}): number {
  let adjustment = 0;
  if (p.fightingFinesseInclusion === 'included' && !p.fightingFinesseEnabled) {
    adjustment += CriticalDamageValues.FIGHTING_FINESSE;
  }
  if (p.backstabberInclusion === 'included' && !p.backstabberEnabled) {
    adjustment += CriticalDamageValues.BACKSTABBER;
  }
  return adjustment;
}
