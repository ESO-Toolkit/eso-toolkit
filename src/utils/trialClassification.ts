/**
 * Trial / boss classification helpers.
 *
 * Pure functions for mapping ESO Logs fights to trials, resolving difficulty
 * labels, and deriving a fight's kill/wipe outcome. Extracted from
 * `ReportFightsView` so the report list and the fight-replay chapter rail share
 * a single source of truth (no duplicated boss-name tables or kill heuristics).
 *
 * @module utils/trialClassification
 */

import type { FightFragment, ReportFragment } from '../graphql/gql/graphql';

/**
 * Map a boss name (falling back to the report zone) to its trial name.
 *
 * Boss names are checked first so a mixed-trial report still resolves each pull
 * to the right trial; the zone name is only a fallback.
 */
export function getTrialNameFromBoss(
  bossName: string,
  reportData: ReportFragment | null | undefined,
): string {
  const zone = reportData?.zone;
  const zoneName = (zone?.name || '').toLowerCase();

  // Check boss names FIRST to handle mixed-trial reports
  const cleanBossName = bossName.toLowerCase();

  // Opulent Ordeal bosses (single ranked encounter; individual names are trash, not bosses)
  if (cleanBossName.includes('opulent trio')) {
    return 'Opulent Ordeal';
  }

  // Ossein Cage bosses
  if (
    [
      'gedna relvel',
      'hall of fleshcraft',
      'shaper of flesh',
      'shapers of flesh',
      'tortured ranyu',
      'tortured kathutet',
      'tortured amkaos',
      'tortured trio',
      'jynorah',
      'skorkhif',
      'blood drinker thisa',
      'overfiend kazpian',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Ossein Cage';
  }

  // Sanity's Edge bosses
  if (
    ['ansuul', 'spiral', 'twelvane', 'yaseyla', 'yasela'].some((name) =>
      cleanBossName.includes(name),
    )
  ) {
    return "Sanity's Edge";
  }

  // Kyne's Aegis bosses
  if (['falgravn', 'vrol', 'yandir'].some((name) => cleanBossName.includes(name))) {
    return "Kyne's Aegis";
  }

  // Other trials... (keep existing boss checks but update to use includes for partial matches)
  if (['lokke', 'nahviintaas', 'yolnahkriin'].some((name) => cleanBossName.includes(name))) {
    return 'Sunspire';
  }

  if (["z'maja", 'galenwe', 'relequen', 'siroria'].some((name) => cleanBossName.includes(name))) {
    return 'Cloudrest';
  }

  if (
    ['lord felms', 'saint felms', 'saint llothis', 'saint olms'].some((name) =>
      cleanBossName.includes(name),
    )
  ) {
    return 'Asylum Sanctorium';
  }

  if (
    [
      'xoryn',
      'count ryelaz',
      'zilyesset',
      'cavot agnan',
      'orphic shattered shard',
      'cavot',
      'orphic',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Lucent Citadel';
  }

  if (
    ['oaxiltso', 'flame-herald bahsei', 'xalvakka', 'ash titan', 'basks-in-snakes', 'basks'].some(
      (name) => cleanBossName.includes(name),
    )
  ) {
    return 'Rockgrove';
  }

  if (
    [
      'lylanar and turlassil',
      'sail ripper',
      'bow breaker',
      'reef guardian',
      'tideborn taleria',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Dreadsail Reef';
  }

  if (
    [
      'hunter-killer fabricant',
      'pinnacle factotum',
      'archcustodian',
      'assembly general',
      'refabrication committee',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Halls of Fabrication';
  }

  if (
    ["zhaj'hassa the forgotten", 'vashai', 'rakkhat', 'twins', "zhaj'hassa"].some((name) =>
      cleanBossName.includes(name),
    )
  ) {
    return 'Maw of Lorkhaj';
  }

  if (
    [
      'possessed manticora',
      'possessed mantikora',
      'stonebreaker',
      'ozara',
      'serpent',
      'mantikora',
      'manticora',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Sanctum Ophidia';
  }

  if (
    ['ra kotu', "yokeda rok'dun", 'yokedas', 'the warrior'].some((name) =>
      cleanBossName.includes(name),
    )
  ) {
    return 'Hel Ra Citadel';
  }

  if (
    [
      'storm atronach',
      'stone atronach',
      'varlariel',
      'the mage',
      'foundation stone atronach',
      'lightning storm atronach',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Aetherian Archive';
  }

  // Check for trial names in zone name as fallback
  const trialFromZone = [
    { names: ["sanity's edge", 'vse'], id: "Sanity's Edge" },
    { names: ["kyne's aegis", 'vka'], id: "Kyne's Aegis" },
    { names: ['sunspire', 'vss'], id: 'Sunspire' },
    { names: ['cloudrest', 'vcr'], id: 'Cloudrest' },
    { names: ['asylum', 'vas'], id: 'Asylum Sanctorium' },
    { names: ['rockgrove', 'vrg'], id: 'Rockgrove' },
    { names: ['dreadsail', 'vdsr'], id: 'Dreadsail Reef' },
    { names: ['halls of fabrication', 'vhof'], id: 'Halls of Fabrication' },
    { names: ['maw of lorkhaj', 'vmol'], id: 'Maw of Lorkhaj' },
    { names: ['sanctum ophidia', 'vso'], id: 'Sanctum Ophidia' },
    { names: ['hel ra', 'vhrc'], id: 'Hel Ra Citadel' },
    { names: ['aetherian', 'vaa'], id: 'Aetherian Archive' },
    { names: ['ossein cage'], id: 'Ossein Cage' },
    { names: ['opulent ordeal', 'voo'], id: 'Opulent Ordeal' },
    { names: ['eye of the storm'], id: 'Eye of the Storm' },
  ].find((trial) => trial.names.some((name) => zoneName.includes(name)));

  if (trialFromZone) {
    return trialFromZone.id;
  }

  // Final fallback to zone name if boss not recognized
  return reportData?.zone?.name || 'Unknown Trial';
}

/**
 * Resolve a human-readable difficulty label for a boss fight.
 *
 * Cloudrest and Asylum Sanctorium use the +1/+2/+3 hard-mode ladder (difficulty
 * codes 123-125); every other trial uses the standard Normal/Veteran/Veteran HM
 * mapping (codes ≤120 / 121 / 122).
 */
export function getDifficultyLabel(difficulty: number | null, trialName: string): string | null {
  // Difficulty codes: Normal ≤ 120, Veteran 121, Veteran HM 122 (+1/+2/+3 = 123/124/125).
  if (!difficulty || difficulty < 121) {
    return 'Normal';
  }

  // Special handling for Cloudrest and Asylum Sanctorium
  const isCloudrest = trialName.includes('Cloudrest') || trialName.includes('CR');
  const isAsylum = trialName.includes('Asylum') || trialName.includes('AS');

  if (isCloudrest || isAsylum) {
    if (difficulty === 125) return 'Veteran +3';
    if (difficulty === 124) return 'Veteran +2';
    if (difficulty === 123) return 'Veteran +1';
    if (difficulty === 122) return 'Veteran HM';
    if (difficulty === 121) return 'Veteran';
    return 'Veteran';
  }

  // General difficulty mapping for all other trials
  if (difficulty === 122) return 'Veteran HM';
  if (difficulty === 121) return 'Veteran';

  return 'Veteran';
}

/**
 * Detects if a fight marked as a ~100% wipe is likely a false positive (actually
 * a kill) — an ESO Logs quirk where some kills report full boss health. Uses
 * heuristics based on fight duration, difficulty, and boss percentage.
 */
export function isFalsePositiveWipe(fight: FightFragment): boolean {
  if (!fight.bossPercentage || fight.bossPercentage < 99.5) {
    return false; // Not a 100% wipe
  }

  const durationMs = fight.endTime - fight.startTime;

  // More aggressive heuristics for false positive detection:

  // 1. Very short fights (< 45 seconds) with high boss health are likely false positives
  if (durationMs < 45000 && fight.bossPercentage >= 95) {
    return true;
  }

  // 2. Exactly 100.0% is very suspicious (ESO bug)
  if (Math.abs(fight.bossPercentage - 100) < 0.1) {
    return true;
  }

  // 3. Any fight with 100% that lasted more than 10 seconds but less than 5 minutes
  if (fight.bossPercentage >= 99.9 && durationMs > 10000 && durationMs < 300000) {
    return true;
  }

  // 4. Normal/veteran difficulty with very high boss health in reasonable time
  if (
    fight.difficulty != null &&
    fight.difficulty >= 1 &&
    fight.difficulty < 10 &&
    fight.bossPercentage >= 98 &&
    durationMs > 15000 &&
    durationMs < 600000
  ) {
    return true;
  }

  return false;
}

/** The kill/wipe outcome of a fight, with the boss-vs-trash distinction resolved. */
export interface FightOutcome {
  /** True when the fight is a boss encounter (has a difficulty), false for trash. */
  isBoss: boolean;
  /** True when the boss was killed (or a false-positive wipe), or trash cleared. */
  isKill: boolean;
  /** True when the pull was a genuine wipe (not a kill, not a false positive). */
  isWipe: boolean;
  /** True when a ~100% "wipe" was reclassified as a kill (ESO Logs quirk). */
  isFalsePositiveWipe: boolean;
  /** Boss health % remaining at the end (rounded), or null for trash / unknown. */
  bossPercentage: number | null;
}

/**
 * Derive a fight's outcome using the same rules the report fight cards use:
 * boss fights are judged on `bossPercentage` (<=1% = kill), trash on `kill`.
 */
export function getFightOutcome(fight: FightFragment): FightOutcome {
  const isBoss = fight.difficulty != null;

  if (isBoss) {
    const pct = fight.bossPercentage;
    const bossWasKilled = pct !== null && pct !== undefined && pct <= 1.0;
    const rawIsWipe = pct !== null && pct !== undefined && pct > 1.0;
    const falsePositive = rawIsWipe && isFalsePositiveWipe(fight);
    return {
      isBoss: true,
      isKill: bossWasKilled || falsePositive,
      isWipe: rawIsWipe && !falsePositive,
      isFalsePositiveWipe: falsePositive,
      bossPercentage: pct !== null && pct !== undefined ? Math.round(pct) : null,
    };
  }

  // Trash: `kill === false` is a wipe; true/null is treated as cleared.
  const wasKilled = fight.kill === true || fight.kill === null;
  return {
    isBoss: false,
    isKill: wasKilled,
    isWipe: fight.kill === false,
    isFalsePositiveWipe: false,
    bossPercentage: null,
  };
}
