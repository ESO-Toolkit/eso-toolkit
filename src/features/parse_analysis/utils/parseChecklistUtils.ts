import { TRIAL_DUMMY_TARGET_NAMES } from '../constants/trialDummyConstants';
import type { BuffChecklistResult } from '../types/buffChecklist';
import type { DebuffChecklistResult } from '../types/debuffChecklist';
import type { ParseChecklistItem } from '../types/parseChecklist';
import type {
  ActivePercentageResult,
  FoodDetectionResult,
  RotationAnalysisResult,
  WeaveAnalysisResult,
} from './parseAnalysisUtils';
import type { BuildIssue } from '../../../utils/detectBuildIssues';

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
    .filter((issue) => 'buffName' in issue && buffNames.has(issue.buffName))
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
    status: buildIssues
      ? missingMajorBuffs.length > 0
        ? 'fail'
        : 'pass'
      : 'info',
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
    const fightDuration = activeTimeResult?.fightDurationSeconds ?? 0;
    items.push({
      id: 'execute',
      title: 'Execute skill usage in late fight',
      status: hasExecute ? 'pass' : fightDuration > 20 ? 'warn' : 'info',
      detail: hasExecute
        ? 'Execute phase casts detected'
        : fightDuration > 20
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
    status: buildIssues
      ? missingCpPassives.length > 0
        ? 'warn'
        : 'pass'
      : 'info',
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
    status: buildIssues
      ? gearIssues > 0
        ? 'warn'
        : 'pass'
      : 'info',
    detail: buildIssues
      ? gearIssues > 0
        ? `${gearIssues} gear issues detected`
        : 'No gear quality issues found'
      : 'Build issue data unavailable',
  });

  items.push({
    id: 'potions',
    title: 'Potion uptime (Major buffs)',
    status: 'info',
    detail: 'Verify potion use every ~45s (not directly tracked)',
  });

  items.push({
    id: 'pen-crit-cap',
    title: 'Penetration and critical damage caps',
    status: 'info',
    detail: 'Confirm pen/crit caps in build planner (not directly tracked)',
  });

  return items;
}
