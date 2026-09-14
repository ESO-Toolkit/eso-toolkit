/**
 * The authoritative fight result shared by report cards and replay analysis.
 * Explicit API kill data takes precedence over the percentage fallback.
 */
export interface FightOutcomeInput {
  encounterID?: number | null;
  difficulty?: number | null;
  kill?: boolean | null;
  bossPercentage?: number | null;
}

export type FightStatus = 'kill' | 'wipe' | 'unknown';

export interface CanonicalFightOutcome {
  isBoss: boolean;
  status: FightStatus;
  bossHealthRemaining: number | null;
}

export function isBossFight(fight: FightOutcomeInput): boolean {
  return (fight.encounterID ?? 0) !== 0 || fight.difficulty != null;
}

export function wasKill(fight: FightOutcomeInput): boolean {
  if (fight.kill === true) return true;
  if (fight.kill === false) return false;

  const percentage = fight.bossPercentage;
  return percentage != null && Number.isFinite(percentage) && percentage >= 0 && percentage <= 1.0;
}

export function bossHealthRemaining(fight: FightOutcomeInput): number | null {
  if (
    fight.bossPercentage == null ||
    !Number.isFinite(fight.bossPercentage) ||
    fight.bossPercentage < 0 ||
    fight.bossPercentage > 100
  ) {
    return null;
  }

  return fight.bossPercentage;
}

export function getCanonicalFightOutcome(fight: FightOutcomeInput): CanonicalFightOutcome {
  const healthRemaining = bossHealthRemaining(fight);
  const isBoss = isBossFight(fight);

  if (wasKill(fight)) {
    return { isBoss, status: 'kill', bossHealthRemaining: healthRemaining };
  }

  if (fight.kill === false || (isBoss && healthRemaining != null)) {
    return { isBoss, status: 'wipe', bossHealthRemaining: healthRemaining };
  }

  return { isBoss, status: 'unknown', bossHealthRemaining: healthRemaining };
}
