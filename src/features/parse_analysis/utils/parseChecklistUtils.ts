import type { BuildIssue, MissingBuffIssue } from '../../../utils/detectBuildIssues';
import { TRIAL_DUMMY_TARGET_NAMES } from '../constants/trialDummyConstants';
import type { BuffChecklistResult } from '../types/buffChecklist';
import type { DebuffChecklistResult } from '../types/debuffChecklist';
import type { ParseChecklistItem } from '../types/parseChecklist';

import type {
  ActivePercentageResult,
  BarSwapAnalysisResult,
  DotUptimeResult,
  FoodDetectionResult,
  MundusStoneResult,
  PenCritCapResult,
  ResourceSustainResult,
  RotationAnalysisResult,
  UltimateUsageResult,
  WeaveAnalysisResult,
} from './parseAnalysisUtils';

interface BuildParseChecklistInput {
  fightName: string | null;
  foodResult: FoodDetectionResult | null;
  activeTimeResult: ActivePercentageResult | null;
  cpm: number | null;
  weaveResult: WeaveAnalysisResult | null;
  rotationResult: RotationAnalysisResult | null;
  buffChecklist: BuffChecklistResult | null;
  debuffChecklist: DebuffChecklistResult | null;
  buildIssues: BuildIssue[] | null;
  mundusResult: MundusStoneResult | null;
  barSwapResult: BarSwapAnalysisResult | null;
  ultimateResult: UltimateUsageResult | null;
  dotUptimeResult: DotUptimeResult | null;
  penCritCapResult: PenCritCapResult | null;
  resourceSustainResult: ResourceSustainResult | null;
  potionUse: number | null;
}

const MAJOR_BUFF_NAMES = new Set([
  'Major Sorcery',
  'Major Brutality',
  'Major Prophecy',
  'Major Savagery',
]);

const CP_PASSIVE_NAMES = new Set(['Exploiter', 'Skilled Tracker']);

function getMissingBuffIssues(buildIssues: BuildIssue[] | null, buffNames: Set<string>): string[] {
  if (!buildIssues) return [];
  return buildIssues
    .filter(
      (issue): issue is MissingBuffIssue => 'buffName' in issue && buffNames.has(issue.buffName),
    )
    .map((issue) => issue.buffName);
}

function getGearIssues(buildIssues: BuildIssue[] | null): number {
  if (!buildIssues) return 0;
  return buildIssues.filter((issue) => 'gearName' in issue).length;
}

export function buildParseChecklist({
  fightName,
  foodResult,
  activeTimeResult,
  cpm,
  weaveResult,
  rotationResult,
  buffChecklist,
  debuffChecklist,
  buildIssues,
  mundusResult,
  barSwapResult,
  ultimateResult,
  dotUptimeResult,
  penCritCapResult,
  resourceSustainResult,
  potionUse,
}: BuildParseChecklistInput): ParseChecklistItem[] {
  const items: ParseChecklistItem[] = [];

  const isTrialDummy =
    !!fightName && TRIAL_DUMMY_TARGET_NAMES.some((name) => fightName.includes(name));

  items.push({
    id: 'trial-dummy',
    title: 'Trial dummy target detected',
    status: fightName ? (isTrialDummy ? 'pass' : 'fail') : 'info',
    detail: fightName ? `Fight: ${fightName}` : 'Fight name unavailable',
  });

  if (foodResult) {
    items.push({
      id: 'food',
      title: 'Food or drink active',
      status: foodResult.hasFood ? 'pass' : 'fail',
      detail: foodResult.hasFood
        ? foodResult.foodNames.length > 0
          ? foodResult.foodNames.join(', ')
          : 'Food buff detected'
        : 'No food detected',
    });
  } else {
    items.push({
      id: 'food',
      title: 'Food or drink active',
      status: 'info',
      detail: 'Food detection unavailable',
    });
  }

  const missingMajorBuffs = getMissingBuffIssues(buildIssues, MAJOR_BUFF_NAMES);
  items.push({
    id: 'major-buffs',
    title: 'Major damage/crit buffs active',
    status: buildIssues ? (missingMajorBuffs.length > 0 ? 'fail' : 'pass') : 'info',
    detail: buildIssues
      ? missingMajorBuffs.length > 0
        ? `Missing: ${missingMajorBuffs.join(', ')}`
        : 'Major damage and crit buffs detected'
      : 'Build issue data unavailable',
  });

  if (activeTimeResult) {
    const activePercentage = activeTimeResult.activePercentage;
    items.push({
      id: 'activity',
      title: 'Activity uptime ≥ 95%',
      status: activePercentage >= 95 ? 'pass' : activePercentage >= 85 ? 'warn' : 'fail',
      detail: `${activePercentage.toFixed(1)}% active (${activeTimeResult.downtimeSeconds.toFixed(1)}s downtime)`,
    });
  } else {
    items.push({
      id: 'activity',
      title: 'Activity uptime ≥ 95%',
      status: 'info',
      detail: 'Activity data unavailable',
    });
  }

  if (cpm != null) {
    items.push({
      id: 'cpm',
      title: 'Casts per minute ≥ 60',
      status: cpm >= 60 ? 'pass' : cpm >= 50 ? 'warn' : 'fail',
      detail: `${cpm.toFixed(1)} CPM`,
    });
  } else {
    items.push({
      id: 'cpm',
      title: 'Casts per minute ≥ 60',
      status: 'info',
      detail: 'CPM data unavailable',
    });
  }

  if (weaveResult) {
    items.push({
      id: 'weave',
      title: 'Weave accuracy ≥ 90%',
      status:
        weaveResult.weaveAccuracy >= 90
          ? 'pass'
          : weaveResult.weaveAccuracy >= 80
            ? 'warn'
            : 'fail',
      detail: `${weaveResult.weaveAccuracy.toFixed(1)}% (${weaveResult.properWeaves}/${weaveResult.totalSkills})`,
    });

    items.push({
      id: 'heavy-attacks',
      title: 'No heavy attacks unless planned',
      status: weaveResult.heavyAttacks > 0 ? 'warn' : 'pass',
      detail:
        weaveResult.heavyAttacks > 0
          ? `${weaveResult.heavyAttacks} heavy attacks detected`
          : 'No heavy attacks detected',
    });
  } else {
    items.push({
      id: 'weave',
      title: 'Weave accuracy ≥ 90%',
      status: 'info',
      detail: 'Weave data unavailable',
    });
    items.push({
      id: 'heavy-attacks',
      title: 'No heavy attacks unless planned',
      status: 'info',
      detail: 'Weave data unavailable',
    });
  }

  if (rotationResult) {
    items.push({
      id: 'opener',
      title: 'Opener detected',
      status: rotationResult.opener.length > 0 ? 'pass' : 'warn',
      detail: `${rotationResult.opener.length} opener casts`,
    });

    const hasExecute = rotationResult.skillIntervals?.some((skill) => skill.isExecute) ?? false;
    const fightDurationMs = activeTimeResult?.fightDurationMs ?? 0;
    items.push({
      id: 'execute',
      title: 'Execute skill usage in late fight',
      status: hasExecute ? 'pass' : fightDurationMs > 20000 ? 'warn' : 'info',
      detail: hasExecute
        ? 'Execute phase casts detected'
        : fightDurationMs > 20000
          ? 'No execute usage detected'
          : 'Fight too short to evaluate',
    });
  } else {
    items.push({
      id: 'opener',
      title: 'Opener detected',
      status: 'info',
      detail: 'Rotation data unavailable',
    });
    items.push({
      id: 'execute',
      title: 'Execute skill usage in late fight',
      status: 'info',
      detail: 'Rotation data unavailable',
    });
  }

  if (buffChecklist) {
    const missingMajor = buffChecklist.majorBuffs.filter(
      (buff) => !buff.isProvidedByDummy && !buff.isProvidedByPlayer,
    ).length;
    const missingMinor = buffChecklist.minorBuffs.filter(
      (buff) => !buff.isProvidedByDummy && !buff.isProvidedByPlayer,
    ).length;

    items.push({
      id: 'buff-coverage',
      title: 'Major/minor buff coverage',
      status: missingMajor + missingMinor === 0 ? 'pass' : 'warn',
      detail:
        missingMajor + missingMinor === 0
          ? 'All tracked buffs covered'
          : `Missing major: ${missingMajor}, minor: ${missingMinor}`,
    });
  } else {
    items.push({
      id: 'buff-coverage',
      title: 'Major/minor buff coverage',
      status: 'info',
      detail: 'Buff checklist unavailable',
    });
  }

  if (debuffChecklist) {
    const missingMajor = debuffChecklist.majorDebuffs.filter(
      (debuff) => !debuff.isAppliedByPlayer && !debuff.isAppliedByDummy,
    ).length;
    const missingMinor = debuffChecklist.minorDebuffs.filter(
      (debuff) => !debuff.isAppliedByPlayer && !debuff.isAppliedByDummy,
    ).length;

    items.push({
      id: 'debuff-coverage',
      title: 'Major/minor debuff coverage',
      status: missingMajor + missingMinor === 0 ? 'pass' : 'warn',
      detail:
        missingMajor + missingMinor === 0
          ? 'All tracked debuffs applied'
          : `Missing major: ${missingMajor}, minor: ${missingMinor}`,
    });
  } else {
    items.push({
      id: 'debuff-coverage',
      title: 'Major/minor debuff coverage',
      status: 'info',
      detail: 'Debuff checklist unavailable',
    });
  }

  const missingCpPassives = getMissingBuffIssues(buildIssues, CP_PASSIVE_NAMES);
  items.push({
    id: 'cp-passives',
    title: 'Relevant CP/passives active',
    status: buildIssues ? (missingCpPassives.length > 0 ? 'warn' : 'pass') : 'info',
    detail: buildIssues
      ? missingCpPassives.length > 0
        ? `Missing: ${missingCpPassives.join(', ')}`
        : 'Exploiter/Skilled Tracker detected'
      : 'Build issue data unavailable',
  });

  const gearIssues = getGearIssues(buildIssues);
  items.push({
    id: 'gear-quality',
    title: 'Gear quality and CP 160',
    status: buildIssues ? (gearIssues > 0 ? 'warn' : 'pass') : 'info',
    detail: buildIssues
      ? gearIssues > 0
        ? `${gearIssues} gear issues detected`
        : 'No gear quality issues found'
      : 'Build issue data unavailable',
  });

  // ─── Mundus Stone ────────────────────────────────────────────────────────────
  if (mundusResult) {
    items.push({
      id: 'mundus-stone',
      title: 'Mundus stone equipped',
      status: mundusResult.hasMundus ? 'pass' : 'fail',
      detail: mundusResult.hasMundus
        ? (mundusResult.mundusName ?? 'Mundus stone detected')
        : 'No mundus stone detected',
    });
  } else {
    items.push({
      id: 'mundus-stone',
      title: 'Mundus stone equipped',
      status: 'info',
      detail: 'Mundus detection unavailable',
    });
  }

  // ─── Potion Uptime ───────────────────────────────────────────────────────────
  if (potionUse != null && activeTimeResult) {
    const fightDuration = activeTimeResult.fightDurationMs / 1000;
    const expectedPotions = Math.max(1, Math.floor(fightDuration / 45));
    const potionRatio = potionUse / expectedPotions;
    items.push({
      id: 'potions',
      title: 'Potion uptime (Major buffs)',
      status: potionRatio >= 0.8 ? 'pass' : potionRatio >= 0.5 ? 'warn' : 'fail',
      detail: `${potionUse} potions used (expected ~${expectedPotions} for ${fightDuration.toFixed(0)}s fight)`,
    });
  } else {
    items.push({
      id: 'potions',
      title: 'Potion uptime (Major buffs)',
      status: 'info',
      detail: 'Potion use data unavailable — verify potion use every ~45s',
    });
  }

  // ─── Penetration & Crit Cap ──────────────────────────────────────────────────
  if (penCritCapResult) {
    items.push({
      id: 'pen-crit-cap',
      title: 'Penetration setup',
      status: penCritCapResult.likelyOverPenCap
        ? 'warn'
        : penCritCapResult.estimatedPenetration > 0
          ? 'pass'
          : 'info',
      detail: penCritCapResult.likelyOverPenCap
        ? `~${penCritCapResult.estimatedPenetration.toLocaleString()} pen from gear alone may exceed 18,200 cap with group buffs`
        : penCritCapResult.estimatedPenetration > 0
          ? `~${penCritCapResult.estimatedPenetration.toLocaleString()} pen from gear/mundus${penCritCapResult.hasLoverMundus ? ' (Lover mundus)' : ''}`
          : 'No significant pen from gear traits detected',
    });
  } else {
    items.push({
      id: 'pen-crit-cap',
      title: 'Penetration setup',
      status: 'info',
      detail: 'Pen estimation unavailable',
    });
  }

  // ─── Bar Swap Analysis ───────────────────────────────────────────────────────
  if (barSwapResult) {
    items.push({
      id: 'bar-swap',
      title: 'Bar swap cadence',
      status: barSwapResult.barCampingDetected
        ? 'warn'
        : barSwapResult.totalSwaps > 0
          ? 'pass'
          : 'fail',
      detail: barSwapResult.barCampingDetected
        ? `${barSwapResult.barCampingInstances} bar camping instance(s) detected (${(barSwapResult.longestTimeOnOneBar / 1000).toFixed(1)}s longest)`
        : barSwapResult.totalSwaps > 0
          ? `${barSwapResult.swapsPerMinute.toFixed(1)} swaps/min, avg ${(barSwapResult.averageTimeBetweenSwaps / 1000).toFixed(1)}s between swaps`
          : 'No bar swaps detected',
    });
  } else {
    items.push({
      id: 'bar-swap',
      title: 'Bar swap cadence',
      status: 'info',
      detail: 'Bar swap analysis unavailable',
    });
  }

  // ─── Ultimate Usage ──────────────────────────────────────────────────────────
  if (ultimateResult) {
    const fightDuration = ultimateResult.fightDurationSeconds;
    const hasUltimates = ultimateResult.totalUltimateCasts > 0;
    const ultNames = ultimateResult.ultimateAbilities
      .map((u) => `${u.abilityName} ×${u.castCount}`)
      .join(', ');

    items.push({
      id: 'ultimate-usage',
      title: 'Ultimate ability usage',
      status: hasUltimates ? 'pass' : fightDuration > 30 ? 'warn' : 'info',
      detail: hasUltimates
        ? `${ultimateResult.totalUltimateCasts} ult casts: ${ultNames}`
        : fightDuration > 30
          ? 'No ultimate casts detected'
          : 'Fight too short to evaluate ultimate usage',
    });
  } else {
    items.push({
      id: 'ultimate-usage',
      title: 'Ultimate ability usage',
      status: 'info',
      detail: 'Ultimate analysis unavailable',
    });
  }

  // ─── DoT Uptime ──────────────────────────────────────────────────────────────
  if (dotUptimeResult && dotUptimeResult.dotAbilities.length > 0) {
    const topDots = dotUptimeResult.dotAbilities
      .slice(0, 3)
      .map((d) => `${d.abilityName}: ${d.uptimePercentage.toFixed(0)}%`)
      .join(', ');

    items.push({
      id: 'dot-uptime',
      title: 'DoT uptime',
      status:
        dotUptimeResult.overallDotUptimePercentage >= 80
          ? 'pass'
          : dotUptimeResult.overallDotUptimePercentage >= 60
            ? 'warn'
            : 'fail',
      detail: `Overall ${dotUptimeResult.overallDotUptimePercentage.toFixed(0)}% DoT uptime. ${topDots}`,
    });

    items.push({
      id: 'damage-composition',
      title: 'Damage composition',
      status: 'info',
      detail: `DoT: ${dotUptimeResult.dotDamagePercentage.toFixed(0)}% / Direct: ${(100 - dotUptimeResult.dotDamagePercentage).toFixed(0)}%`,
    });
  } else if (dotUptimeResult) {
    items.push({
      id: 'dot-uptime',
      title: 'DoT uptime',
      status: 'info',
      detail: 'No DoT abilities detected — build may be direct-damage focused',
    });
    items.push({
      id: 'damage-composition',
      title: 'Damage composition',
      status: 'info',
      detail: '100% direct damage',
    });
  }

  // ─── Resource Sustain ────────────────────────────────────────────────────────
  if (resourceSustainResult && resourceSustainResult.sampleCount > 0) {
    const primary = resourceSustainResult.primaryResource;
    const avgPct =
      primary === 'stamina'
        ? resourceSustainResult.averageStaminaPercent
        : resourceSustainResult.averageMagickaPercent;
    const lowSeconds = resourceSustainResult.secondsBelowThreshold;

    items.push({
      id: 'resource-sustain',
      title: `${primary === 'stamina' ? 'Stamina' : 'Magicka'} sustain`,
      status: lowSeconds === 0 ? 'pass' : lowSeconds <= 5 ? 'warn' : 'fail',
      detail:
        lowSeconds === 0
          ? `Avg ${avgPct.toFixed(0)}% ${primary} — no sustain issues`
          : `Avg ${avgPct.toFixed(0)}% ${primary}, ${lowSeconds}s below 30% threshold`,
    });
  } else {
    items.push({
      id: 'resource-sustain',
      title: 'Resource sustain',
      status: 'info',
      detail: 'Resource data unavailable',
    });
  }

  return items;
}
