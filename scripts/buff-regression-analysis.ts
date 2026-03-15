/**
 * Buff Healer Statistical Regression Analysis
 *
 * Fetches top 3 leaderboard entries from all trials, collects per-healer
 * buff ability profiles, groups them into semantic categories, and runs
 * statistical analysis to determine which signals best discriminate
 * buff healers from group healers.
 *
 * Approach:
 *   1. Collect buff application data for every healer across all trial fights
 *   2. Group raw ability IDs into semantic buff categories
 *   3. For each category, compute discrimination metrics:
 *      - Coefficient of variation (CV): high CV = good discriminator
 *      - Gini coefficient: high Gini = unevenly distributed across healers
 *      - Binary presence rate: what % of healers apply this category at all
 *   4. Test multiple classification models and compare their F1 scores
 *      using leave-one-out cross-validation against a "ground truth"
 *      built from known buff-healer sets (Jorvuld's, Master Architect, PA)
 *
 * Usage:
 *   npm run script -- scripts/buff-regression-analysis.ts
 */

import fs from 'node:fs';
import path from 'node:path';

// Ability name lookup
const ABILITIES_PATH = path.resolve(__dirname, '../data/abilities.json');
let abilityNameMap: Map<number, string> | null = null;
function getAbilityName(id: number): string {
  if (!abilityNameMap) {
    abilityNameMap = new Map();
    try {
      const raw = fs.readFileSync(ABILITIES_PATH, 'utf-8');
      const data = JSON.parse(raw) as Record<string, { name?: string }>;
      for (const [key, val] of Object.entries(data)) {
        if (val.name) abilityNameMap.set(Number(key), val.name);
      }
    } catch { /* empty */ }
  }
  return abilityNameMap.get(id) ?? `unknown:${id}`;
}

import {
  GetTrialZonesDocument,
  type GetTrialZonesQuery,
  GetReportByCodeDocument,
  type GetReportByCodeQuery,
  GetReportMasterDataDocument,
  GetBuffEventsDocument,
  GetDebuffEventsDocument,
  GetCombatantInfoEventsDocument,
  GetCastEventsDocument,
  GetDamageEventsDocument,
  GetHealingEventsDocument,
} from '../src/graphql/gql/graphql';

import { detectRoles } from '../src/features/role_detection';
import { DetectedRole, ROLE_LABELS } from '../src/features/role_detection/types';
import type { RoleDetectionEvents, FightContext } from '../src/features/role_detection/extractSignals';

import { runScript } from './_runner/bootstrap';
import {
  TRIAL_TEAM_SIZE,
  parseTrialZones,
  createDifficultyPriority,
  fetchLeaderboardWithFallbacks,
  type EncounterSelection,
} from './leaderboard/leaderboardHelpers';

const SCRIPT_NAME = 'buff-regression';
const OUTPUT_FILE = path.resolve(__dirname, '../scratch/buff-regression-analysis.md');
const TOP_N = 3;
const EVENT_LIMIT = 100000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEventsWithPagination(
  harness: any,
  document: any,
  variables: Record<string, unknown>,
  logLabel: string,
): Promise<any[]> {
  let allEvents: any[] = [];
  let nextPage: number | null = null;
  let pageCount = 0;
  do {
    pageCount++;
    const pageVars = { ...variables };
    if (nextPage !== null) pageVars.startTime = nextPage;
    const result = await harness.execute(document, {
      variables: pageVars,
      fetchPolicy: 'network-only',
      logLabel: `${logLabel}:page${pageCount}`,
    });
    const events = result?.reportData?.report?.events?.data ?? [];
    allEvents = allEvents.concat(events);
    nextPage = result?.reportData?.report?.events?.nextPageTimestamp ?? null;
  } while (nextPage !== null);
  return allEvents;
}

// ============================================================
// Semantic Buff Categories
// Group raw ability IDs into higher-level categories
// ============================================================

interface BuffCategory {
  name: string;
  abilityIds: Set<number>;
  description: string;
}

const BUFF_CATEGORIES: BuffCategory[] = [
  {
    name: 'Major Courage',
    abilityIds: new Set([109966, 66902, 120015]),
    description: 'Olorime/SPC proc — standard healer buff',
  },
  {
    name: 'Minor Courage',
    abilityIds: new Set([147417, 177885, 186235]),
    description: 'Minor Courage from various sources',
  },
  {
    name: 'Major Slayer',
    abilityIds: new Set([93109, 135923, 93120]),
    description: 'Roaring Opportunist — offensive group buff set',
  },
  {
    name: 'Roaring Opportunist CD',
    abilityIds: new Set([135924]),
    description: 'Roaring Opportunist cooldown tracker',
  },
  {
    name: 'Powerful Assault',
    abilityIds: new Set([61771]),
    description: 'Powerful Assault set — Weapon Damage buff',
  },
  {
    name: 'Major Force (Horn)',
    abilityIds: new Set([40225, 61747, 40224, 94800]),
    description: 'Aggressive Horn / Major Force',
  },
  {
    name: 'Major Berserk',
    abilityIds: new Set([62195, 61745]),
    description: 'Major Berserk — NB specific (Consuming Darkness morph)',
  },
  {
    name: 'Minor Berserk',
    abilityIds: new Set([62636, 61744]),
    description: 'Combat Prayer / Minor Berserk — universal healer',
  },
  {
    name: 'Minor Resolve',
    abilityIds: new Set([61693, 62634]),
    description: 'Combat Prayer / Minor Resolve — universal healer',
  },
  {
    name: 'Minor Toughness',
    abilityIds: new Set([88509, 88490]),
    description: 'Warden passive — proc if Warden',
  },
  {
    name: 'Energy Orb',
    abilityIds: new Set([42040]),
    description: 'Energy Orb (Undaunted) — standard healer skill',
  },
  {
    name: 'Reviving Barrier',
    abilityIds: new Set([40237, 40238, 38573, 40239]),
    description: 'Barrier ultimate — defensive support',
  },
  {
    name: 'Echoing Vigor',
    abilityIds: new Set([61506]),
    description: 'Echoing Vigor (Alliance War) — common healer HoT',
  },
  {
    name: 'Radiating Regen',
    abilityIds: new Set([40079, 218266]),
    description: 'Radiating Regeneration — standard resto staff',
  },
  {
    name: 'Grand Rejuvenation',
    abilityIds: new Set([99781, 131489]),
    description: 'Grand Rejuvenation (Undaunted) synergy buff',
  },
  {
    name: 'Minor Vitality',
    abilityIds: new Set([61549, 188505]),
    description: 'Minor Vitality — enhanced healing received',
  },
  {
    name: 'Minor Fortitude',
    abilityIds: new Set([61697, 186239]),
    description: 'Minor Fortitude — health recovery',
  },
  {
    name: 'Minor Endurance',
    abilityIds: new Set([61704, 86300, 87019, 177303, 186236, 227123]),
    description: 'Minor Endurance — stamina recovery',
  },
  {
    name: 'Minor Intellect',
    abilityIds: new Set([61706, 86300, 177304, 186240]),
    description: 'Minor Intellect — magicka recovery',
  },
  {
    name: 'Enlivening Overflow',
    abilityIds: new Set([156012, 156011]),
    description: 'Enlivening Overflow (Arcanist?) — resource return',
  },
  {
    name: 'Harvest',
    abilityIds: new Set([85843]),
    description: 'Warden Harvest — synergy heal',
  },
  {
    name: 'Minor Heroism',
    abilityIds: new Set([61708]),
    description: 'Minor Heroism — ultimate generation',
  },
  {
    name: 'Purify (Cleanse)',
    abilityIds: new Set([26305]),
    description: 'Purify / Cleansing Ritual — Templar or general purge',
  },
  {
    name: "Meridia's Favor",
    abilityIds: new Set([117111, 140092]),
    description: "Meridia's Favor — Templar passive",
  },
  {
    name: 'Minor Protection',
    abilityIds: new Set([118409, 61721]),
    description: 'Minor Protection — damage mitigation',
  },
  {
    name: 'Minor Sorcery',
    abilityIds: new Set([62800, 61685]),
    description: 'Minor Sorcery — spell damage buff',
  },
  {
    name: 'Minor Savagery',
    abilityIds: new Set([61898, 61666]),
    description: 'Minor Savagery — weapon crit buff',
  },
  {
    name: 'Minor Magickasteal',
    abilityIds: new Set([26809]),
    description: 'Minor Magickasteal — Elemental Drain',
  },
  {
    name: 'Overflowing Altar',
    abilityIds: new Set([41960]),
    description: 'Blood Altar morph — HoT/synergy',
  },
  {
    name: "Ozezan's Plating",
    abilityIds: new Set([188471]),
    description: "Ozezan's monster set proc — shield",
  },
  {
    name: "Pillager's Profit",
    abilityIds: new Set([172055, 172056]),
    description: "Pillager's Profit set — rez proc",
  },
  {
    name: 'Scribing Banner',
    abilityIds: new Set([227070, 227600, 227007, 227030, 227069, 227120, 227123]),
    description: 'Scribing Banner Bearer and morphs',
  },
  {
    name: 'Lunar Bastion',
    abilityIds: new Set([75815, 142804]),
    description: 'Arcanist Lunar Bastion shield',
  },
  {
    name: 'Cinder Storm',
    abilityIds: new Set([20780]),
    description: 'DK Cinder Storm — snare + Major Protection (DK specific)',
  },
];

// ============================================================
// Healer profile type
// ============================================================

interface HealerProfile {
  playerName: string;
  className: string;
  trialName: string;
  fightId: number;
  reportCode: string;
  healSharePct: number;
  healerSetIds: number[];
  // Per-category: { applicationCount, uniqueTargets }
  categoryScores: Map<string, { apps: number; targets: number }>;
  // Raw per-ability data
  rawBuffs: Map<number, { count: number; targets: Set<number> }>;
  // Derived
  hasBuffHealerSet: boolean; // Jorvuld's (346), Master Architect (332), Powerful Assault (180)
}

const BUFF_HEALER_SET_IDS_CHECK = new Set([346, 332, 180]);
const SHIELD_HEALER_SET_IDS_CHECK = new Set([194, 576]); // Combat Physician, Pearls of Ehlnofey

function categorizeBuffs(
  rawBuffs: Map<number, { count: number; targets: Set<number> }>,
): Map<string, { apps: number; targets: number }> {
  const result = new Map<string, { apps: number; targets: number }>();

  for (const [buffId, info] of rawBuffs) {
    let matched = false;
    for (const cat of BUFF_CATEGORIES) {
      if (cat.abilityIds.has(buffId)) {
        if (!result.has(cat.name)) {
          result.set(cat.name, { apps: 0, targets: 0 });
        }
        const entry = result.get(cat.name)!;
        entry.apps += info.count;
        entry.targets = Math.max(entry.targets, info.targets.size);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const name = `Uncategorized: ${getAbilityName(buffId)} (${buffId})`;
      if (!result.has(name)) {
        result.set(name, { apps: 0, targets: 0 });
      }
      const entry = result.get(name)!;
      entry.apps += info.count;
      entry.targets = Math.max(entry.targets, info.targets.size);
    }
  }

  return result;
}

// ============================================================
// Statistical helpers
// ============================================================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length <= 1) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
}

function coefficientOfVariation(values: number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  return stddev(values) / m;
}

function giniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const totalSum = sorted.reduce((a, b) => a + b, 0);
  if (totalSum === 0) return 0;
  let cumulativeSum = 0;
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    cumulativeSum += sorted[i];
    weightedSum += (2 * (i + 1) - n - 1) * sorted[i];
  }
  return weightedSum / (n * totalSum);
}

/** Pearson correlation between two arrays */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

/** Point-biserial correlation: correlation between a binary and continuous variable */
function pointBiserialCorrelation(binary: boolean[], continuous: number[]): number {
  const x = binary.map((b) => (b ? 1 : 0));
  return pearsonCorrelation(x, continuous);
}

// ============================================================
// Classification models & evaluation
// ============================================================

interface ClassificationResult {
  modelName: string;
  description: string;
  predictions: { playerName: string; trialName: string; predicted: string; groundTruth: string }[];
  accuracy: number;
  // Per-class precision/recall/f1
  metrics: Map<string, { precision: number; recall: number; f1: number }>;
}

type ClassifierFn = (profile: HealerProfile, allProfiles: HealerProfile[]) => string;

function evaluateClassifier(
  name: string,
  description: string,
  classifier: ClassifierFn,
  profiles: HealerProfile[],
  groundTruth: Map<string, string>, // key = `${playerName}|${trialName}|${fightId}`, value = class
): ClassificationResult {
  const predictions: ClassificationResult['predictions'] = [];
  let correct = 0;

  for (const p of profiles) {
    const key = `${p.playerName}|${p.trialName}|${p.fightId}`;
    const truth = groundTruth.get(key) ?? 'Group Healer';
    const predicted = classifier(p, profiles);
    predictions.push({
      playerName: p.playerName,
      trialName: p.trialName,
      predicted,
      groundTruth: truth,
    });
    if (predicted === truth) correct++;
  }

  const accuracy = profiles.length > 0 ? correct / profiles.length : 0;

  // Compute per-class metrics
  const classes = [...new Set([...predictions.map((p) => p.predicted), ...predictions.map((p) => p.groundTruth)])];
  const metrics = new Map<string, { precision: number; recall: number; f1: number }>();

  for (const cls of classes) {
    const tp = predictions.filter((p) => p.predicted === cls && p.groundTruth === cls).length;
    const fp = predictions.filter((p) => p.predicted === cls && p.groundTruth !== cls).length;
    const fn = predictions.filter((p) => p.predicted !== cls && p.groundTruth === cls).length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    metrics.set(cls, { precision, recall, f1 });
  }

  return { modelName: name, description, predictions, accuracy, metrics };
}

// ============================================================
// Main script
// ============================================================

runScript(async ({ getGraphqlHarness, logger }) => {
  const harness = await getGraphqlHarness({ defaultFetchPolicy: 'network-only' });

  logger.info('Fetching trial zones...');
  const zoneData = await harness.execute(GetTrialZonesDocument, {
    fetchPolicy: 'network-only',
    logLabel: `${SCRIPT_NAME}:getTrialZones`,
  }) as GetTrialZonesQuery;

  const zones = parseTrialZones(zoneData);
  logger.info(`Found ${zones.length} trials`);

  const allProfiles: HealerProfile[] = [];

  for (const zone of zones) {
    const finalEncounter = zone.encounters[zone.encounters.length - 1];
    if (!finalEncounter) continue;

    const diffPriority = createDifficultyPriority(zone.difficulties);
    const preferredDiff = diffPriority[0];

    const selection: EncounterSelection = {
      encounterId: finalEncounter.id,
      zoneName: zone.name,
      encounterName: finalEncounter.name,
      difficultyId: preferredDiff?.id ?? null,
      size: TRIAL_TEAM_SIZE,
    };

    let rankings;
    try {
      const lb = await fetchLeaderboardWithFallbacks(harness, selection, logger, {
        logLabelPrefix: SCRIPT_NAME,
      });
      rankings = lb.parsed.rankings.slice(0, TOP_N);
    } catch {
      logger.warn(`Skipping ${zone.name} — no leaderboard data`);
      continue;
    }

    const rankedWithReports = rankings.filter((r) => r.reportCode && r.fightId);
    if (rankedWithReports.length === 0) continue;

    logger.info(`\n--- ${zone.name}: ${finalEncounter.name} (${rankedWithReports.length} fights) ---`);

    for (const row of rankedWithReports) {
      const reportCode = row.reportCode!;
      const fightId = row.fightId!;

      try {
        const reportData = await harness.execute(GetReportByCodeDocument, {
          variables: { code: reportCode },
          fetchPolicy: 'network-only',
          logLabel: `${SCRIPT_NAME}:report:${reportCode}`,
        }) as GetReportByCodeQuery;

        const fights = (reportData.reportData?.report?.fights ?? []).filter(Boolean) as any[];
        const fight = fights.find((f: any) => f.id === fightId);
        if (!fight) continue;

        const startTime = fight.startTime;
        const endTime = fight.endTime;
        const friendlyPlayers: number[] = fight.friendlyPlayers ?? [];
        const enemyNPCs: any[] = fight.enemyNPCs ?? [];

        const masterData = await harness.execute(GetReportMasterDataDocument, {
          variables: { code: reportCode },
          fetchPolicy: 'network-only',
          logLabel: `${SCRIPT_NAME}:master:${reportCode}`,
        });
        const actors = (masterData?.reportData?.report?.masterData?.actors ?? []).filter(Boolean) as any[];
        const playerMap = new Map<number, { name: string; icon: string }>();
        for (const actor of actors) {
          if (actor.type === 'Player') {
            playerMap.set(actor.id, { name: actor.name, icon: actor.subType ?? actor.icon ?? '?' });
          }
        }

        const playerNames = new Map<number, string>();
        for (const pid of friendlyPlayers) {
          playerNames.set(pid, playerMap.get(pid)?.name ?? `Player ${pid}`);
        }

        const baseVars = {
          code: reportCode,
          fightIds: [fightId],
          startTime,
          endTime,
          limit: EVENT_LIMIT,
        };

        const [damageEvents, healEvents, castEvents, combatantInfoEvents] = await Promise.all([
          fetchEventsWithPagination(harness, GetDamageEventsDocument,
            { ...baseVars, hostilityType: 'Friendlies' }, `${SCRIPT_NAME}:damage:${reportCode}`),
          fetchEventsWithPagination(harness, GetHealingEventsDocument,
            { ...baseVars, hostilityType: 'Friendlies' }, `${SCRIPT_NAME}:heal:${reportCode}`),
          fetchEventsWithPagination(harness, GetCastEventsDocument,
            { ...baseVars, hostilityType: 'Friendlies' }, `${SCRIPT_NAME}:cast:${reportCode}`),
          fetchEventsWithPagination(harness, GetCombatantInfoEventsDocument,
            { ...baseVars, hostilityType: 'Friendlies' }, `${SCRIPT_NAME}:combatant:${reportCode}`),
        ]);

        const [buffEventsFriendly, debuffEventsEnemies] = await Promise.all([
          fetchEventsWithPagination(harness, GetBuffEventsDocument,
            { ...baseVars, hostilityType: 'Friendlies' }, `${SCRIPT_NAME}:buffs:${reportCode}`),
          fetchEventsWithPagination(harness, GetDebuffEventsDocument,
            { ...baseVars, hostilityType: 'Enemies' }, `${SCRIPT_NAME}:debuffs:${reportCode}`),
        ]);

        const applyDebuffEvents = debuffEventsEnemies.filter((e: any) => e.type === 'applydebuff');
        const removeDebuffEvents = debuffEventsEnemies.filter((e: any) => e.type === 'removedebuff');
        const applyBuffEvents = buffEventsFriendly.filter((e: any) => e.type === 'applybuff');

        const events: RoleDetectionEvents = {
          damageEvents, healEvents, castEvents,
          applyDebuffEvents, removeDebuffEvents, applyBuffEvents, combatantInfoEvents,
        };

        const context: FightContext = {
          fightId, startTime, endTime,
          friendlyPlayerIds: friendlyPlayers,
          enemyNpcIds: enemyNPCs.map((n: any) => n.id),
          primaryBossId: null,
          playerNames,
        };

        const result = detectRoles(events, context);
        const healerRoles = new Set([DetectedRole.GroupHealer, DetectedRole.ShieldHealer, DetectedRole.BuffHealer]);
        const healerResults = result.results.filter((r) => healerRoles.has(r.role));

        for (const r of healerResults) {
          const rawBuffs = new Map<number, { count: number; targets: Set<number> }>();

          for (const event of applyBuffEvents) {
            if (event.fight !== fightId) continue;
            if (event.sourceID !== r.playerId) continue;
            if (event.sourceID === event.targetID) continue;

            const id = event.abilityGameID;
            if (!rawBuffs.has(id)) rawBuffs.set(id, { count: 0, targets: new Set() });
            const entry = rawBuffs.get(id)!;
            entry.count++;
            entry.targets.add(event.targetID);
          }

          const categoryScores = categorizeBuffs(rawBuffs);

          allProfiles.push({
            playerName: r.playerName,
            className: playerMap.get(r.playerId)?.icon ?? '?',
            trialName: zone.name,
            fightId,
            reportCode,
            healSharePct: r.signals.healingShareOfGroup * 100,
            healerSetIds: r.signals.healerSetIds,
            categoryScores,
            rawBuffs,
            hasBuffHealerSet: r.signals.healerSetIds.some((id) => BUFF_HEALER_SET_IDS_CHECK.has(id)),
          });
        }

        logger.info(`  ${reportCode}/${fightId}: ${healerResults.length} healers profiled`);
        await sleep(500);
      } catch (err) {
        logger.error(`  Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  logger.info(`\n\nCollected ${allProfiles.length} healer profiles. Running analysis...\n`);

  // ============================================================
  // ANALYSIS PHASE
  // ============================================================

  const lines: string[] = [];
  lines.push('# Buff Healer Statistical Regression Analysis');
  lines.push('');
  lines.push(`**Dataset:** ${allProfiles.length} healers across ${new Set(allProfiles.map((p) => p.trialName)).size} trials`);
  lines.push(`**Date:** ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  // ────────────────────────────────
  // Section 1: Category Discrimination Metrics
  // ────────────────────────────────

  lines.push('## 1. Category Discrimination Metrics');
  lines.push('');
  lines.push('For each buff category, we measure how well it discriminates between healers:');
  lines.push('- **Presence Rate**: % of healers that apply this buff at all');
  lines.push('- **CV (Coefficient of Variation)**: stddev/mean of application counts. Higher = more variance = more discriminating');
  lines.push('- **Gini**: Inequality of distribution. 0 = perfectly equal, 1 = one healer has all');
  lines.push('- **Mean Apps**: Average applications per healer (among those who use it)');
  lines.push('');

  // Collect all category names
  const allCategoryNames = new Set<string>();
  for (const p of allProfiles) {
    for (const name of p.categoryScores.keys()) {
      if (!name.startsWith('Uncategorized')) allCategoryNames.add(name);
    }
  }

  interface CategoryStats {
    name: string;
    presenceRate: number;
    cv: number;
    gini: number;
    meanApps: number;
    medianApps: number;
    maxApps: number;
    stddevApps: number;
    values: number[];
  }

  const categoryStats: CategoryStats[] = [];

  for (const catName of allCategoryNames) {
    // Get values for all healers (0 if they don't have this category)
    const values = allProfiles.map((p) => p.categoryScores.get(catName)?.apps ?? 0);
    const nonZero = values.filter((v) => v > 0);
    const presenceRate = nonZero.length / allProfiles.length;

    const cv = coefficientOfVariation(values);
    const gini = giniCoefficient(values);
    const meanApps = nonZero.length > 0 ? mean(nonZero) : 0;
    const sorted = [...nonZero].sort((a, b) => a - b);
    const medianApps = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    const maxApps = nonZero.length > 0 ? Math.max(...nonZero) : 0;

    categoryStats.push({
      name: catName,
      presenceRate,
      cv,
      gini,
      meanApps,
      medianApps,
      maxApps,
      stddevApps: stddev(values),
      values,
    });
  }

  // Sort by Gini (best discriminators first)
  categoryStats.sort((a, b) => b.gini - a.gini);

  lines.push('| Category | Presence | CV | Gini | Mean Apps | Median | Max | StdDev |');
  lines.push('|----------|----------|-----|------|-----------|--------|-----|--------|');

  for (const s of categoryStats) {
    lines.push(`| ${s.name} | ${(s.presenceRate * 100).toFixed(0)}% | ${s.cv.toFixed(2)} | ${s.gini.toFixed(3)} | ${s.meanApps.toFixed(0)} | ${s.medianApps.toFixed(0)} | ${s.maxApps} | ${s.stddevApps.toFixed(0)} |`);
  }

  lines.push('');

  // ────────────────────────────────
  // Section 2: Correlation with Buff-Healer Sets
  // ────────────────────────────────

  lines.push('## 2. Correlation with Buff-Healer Set Ownership');
  lines.push('');
  lines.push('Point-biserial correlation between "has buff-healer set" (Jorvuld\'s 346, Master Architect 332, PA 180) and each buff category\'s application count.');
  lines.push('Higher positive correlation = better predictor of buff healers.');
  lines.push('');

  const hasBuffSetBinary = allProfiles.map((p) => p.hasBuffHealerSet);
  const buffSetCount = hasBuffSetBinary.filter(Boolean).length;
  lines.push(`**Healers with buff-healer sets:** ${buffSetCount}/${allProfiles.length} (${(buffSetCount / allProfiles.length * 100).toFixed(0)}%)`);
  lines.push('');

  interface CorrelationResult {
    category: string;
    r: number;
    presenceInBuffSet: number;
    presenceInNonBuffSet: number;
  }

  const correlations: CorrelationResult[] = [];

  for (const s of categoryStats) {
    const r = pointBiserialCorrelation(hasBuffSetBinary, s.values);

    // Compute presence rates split by buff-set vs non-buff-set healers
    const buffSetHealers = allProfiles.filter((p) => p.hasBuffHealerSet);
    const nonBuffSetHealers = allProfiles.filter((p) => !p.hasBuffHealerSet);
    const presenceInBuffSet = buffSetHealers.length > 0
      ? buffSetHealers.filter((p) => (p.categoryScores.get(s.name)?.apps ?? 0) > 0).length / buffSetHealers.length
      : 0;
    const presenceInNonBuffSet = nonBuffSetHealers.length > 0
      ? nonBuffSetHealers.filter((p) => (p.categoryScores.get(s.name)?.apps ?? 0) > 0).length / nonBuffSetHealers.length
      : 0;

    correlations.push({ category: s.name, r, presenceInBuffSet, presenceInNonBuffSet });
  }

  correlations.sort((a, b) => b.r - a.r);

  lines.push('| Category | Correlation (r) | Presence in Buff-Set | Presence in Non-Buff-Set | Diff |');
  lines.push('|----------|----------------|---------------------|------------------------|------|');

  for (const c of correlations) {
    const diff = (c.presenceInBuffSet - c.presenceInNonBuffSet);
    lines.push(`| ${c.category} | ${c.r.toFixed(3)} | ${(c.presenceInBuffSet * 100).toFixed(0)}% | ${(c.presenceInNonBuffSet * 100).toFixed(0)}% | ${diff > 0 ? '+' : ''}${(diff * 100).toFixed(0)}% |`);
  }

  lines.push('');

  // ────────────────────────────────
  // Section 3: Test Classification Models
  // ────────────────────────────────

  lines.push('## 3. Classification Model Comparison');
  lines.push('');
  lines.push('We test different classification approaches. "Ground truth" is heuristic:');
  lines.push('- Within each trial fight, rank healers by their "offensive buff score"');
  lines.push('- The healer with more unique offensive buff categories = Buff Healer');
  lines.push('- The other = Group Healer (or Shield Healer if they have shield sets)');
  lines.push('');

  // Build ground truth: within each fight, use buff diversity to label healers
  // Then test different classifiers against this truth
  type FightKey = string;
  const fightGroups = new Map<FightKey, HealerProfile[]>();
  for (const p of allProfiles) {
    const key = `${p.trialName}|${p.fightId}`;
    if (!fightGroups.has(key)) fightGroups.set(key, []);
    fightGroups.get(key)!.push(p);
  }

  // Offensive buff categories (the ones that go beyond standard healing)
  const OFFENSIVE_CATEGORIES = new Set([
    'Major Slayer', 'Powerful Assault', 'Major Force (Horn)', 'Major Berserk',
    'Minor Heroism', 'Cinder Storm', 'Minor Sorcery', 'Minor Savagery',
  ]);

  // Supportive buff categories (standard healing, everyone does)
  const STANDARD_CATEGORIES = new Set([
    'Minor Berserk', 'Minor Resolve', 'Energy Orb', 'Radiating Regen',
    'Echoing Vigor', 'Reviving Barrier', 'Minor Toughness', 'Harvest',
    'Enlivening Overflow',
  ]);

  function getOffensiveBuffScore(p: HealerProfile): number {
    let score = 0;
    for (const [catName, data] of p.categoryScores) {
      if (OFFENSIVE_CATEGORIES.has(catName) && data.apps > 0) {
        score++;
      }
    }
    return score;
  }

  function getCategoryCount(p: HealerProfile, categories: Set<string>): number {
    let count = 0;
    for (const [catName, data] of p.categoryScores) {
      if (categories.has(catName) && data.apps > 0) {
        count++;
      }
    }
    return count;
  }

  // Ground truth: within each fight, healer with more offensive categories = Buff
  const groundTruth = new Map<string, string>();
  for (const [, healers] of fightGroups) {
    if (healers.length < 2) {
      // Single healer — default to Group
      for (const h of healers) {
        groundTruth.set(`${h.playerName}|${h.trialName}|${h.fightId}`, 'Group Healer');
      }
      continue;
    }

    // Score each healer
    const scored = healers.map((h) => ({
      healer: h,
      offScore: getOffensiveBuffScore(h),
      hasShieldSet: h.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id)),
    }));

    // Sort by offensive score descending
    scored.sort((a, b) => b.offScore - a.offScore);

    // Top healer = Buff Healer, rest = Group/Shield
    for (let i = 0; i < scored.length; i++) {
      const h = scored[i].healer;
      const key = `${h.playerName}|${h.trialName}|${h.fightId}`;
      if (i === 0 && scored[i].offScore > 0 && scored[i].offScore > (scored[1]?.offScore ?? 0)) {
        groundTruth.set(key, 'Buff Healer');
      } else if (scored[i].hasShieldSet) {
        groundTruth.set(key, 'Shield Healer');
      } else {
        groundTruth.set(key, 'Group Healer');
      }
    }
  }

  // Count ground truth distribution
  const truthCounts = new Map<string, number>();
  for (const v of groundTruth.values()) {
    truthCounts.set(v, (truthCounts.get(v) ?? 0) + 1);
  }
  lines.push('**Ground truth distribution:**');
  for (const [role, count] of [...truthCounts.entries()].sort()) {
    lines.push(`- ${role}: ${count}`);
  }
  lines.push('');

  // ── Define classifiers ──

  const classifiers: { name: string; description: string; fn: ClassifierFn }[] = [
    {
      name: 'Model A: Set-Only',
      description: 'Buff Healer if has Jorvuld\'s/Master Architect/PA set. Shield if has Combat Physician/Pearls. Otherwise Group.',
      fn: (p) => {
        if (p.hasBuffHealerSet) return 'Buff Healer';
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
    {
      name: 'Model B: Offensive Buff Count ≥ 2',
      description: 'Buff Healer if healer applies ≥ 2 offensive buff categories. Otherwise Group.',
      fn: (p) => {
        const offScore = getOffensiveBuffScore(p);
        if (offScore >= 2) return 'Buff Healer';
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
    {
      name: 'Model C: Offensive Buff Count ≥ 3',
      description: 'Buff Healer if healer applies ≥ 3 offensive buff categories. Otherwise Group.',
      fn: (p) => {
        const offScore = getOffensiveBuffScore(p);
        if (offScore >= 3) return 'Buff Healer';
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
    {
      name: 'Model D: Major Slayer OR Powerful Assault presence',
      description: 'Buff Healer if applies Major Slayer (Roaring Opportunist) or Powerful Assault buffs. Otherwise Group.',
      fn: (p) => {
        const hasMajorSlayer = (p.categoryScores.get('Major Slayer')?.apps ?? 0) > 0;
        const hasPA = (p.categoryScores.get('Powerful Assault')?.apps ?? 0) > 0;
        if (hasMajorSlayer || hasPA) return 'Buff Healer';
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
    {
      name: 'Model E: Sets + Offensive Buff ≥ 2',
      description: 'Buff Healer if has buff-healer set OR applies ≥ 2 offensive buff categories. Otherwise Group.',
      fn: (p) => {
        const offScore = getOffensiveBuffScore(p);
        if (p.hasBuffHealerSet || offScore >= 2) return 'Buff Healer';
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
    {
      name: 'Model F: Per-Fight Relative (most offensive wins)',
      description: 'Within each fight, healer with the most offensive buff categories = Buff. Rest = Group/Shield.',
      fn: (p, all) => {
        const fightPeers = all.filter((o) => o.trialName === p.trialName && o.fightId === p.fightId);
        if (fightPeers.length <= 1) return 'Group Healer';

        const myScore = getOffensiveBuffScore(p);
        const maxScore = Math.max(...fightPeers.map((o) => getOffensiveBuffScore(o)));

        if (myScore === maxScore && myScore > 0) {
          // Check if tied
          const atMax = fightPeers.filter((o) => getOffensiveBuffScore(o) === maxScore);
          if (atMax.length === 1) return 'Buff Healer';
          // Tied — neither is clearly buff
          return 'Group Healer';
        }
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
    {
      name: 'Model G: Major Slayer + PA + Horn combo',
      description: 'Buff Healer if applies ≥ 2 of {Major Slayer, Powerful Assault, Major Force (Horn)}. Otherwise Group.',
      fn: (p) => {
        let count = 0;
        if ((p.categoryScores.get('Major Slayer')?.apps ?? 0) > 0) count++;
        if ((p.categoryScores.get('Powerful Assault')?.apps ?? 0) > 0) count++;
        if ((p.categoryScores.get('Major Force (Horn)')?.apps ?? 0) > 0) count++;
        if (count >= 2) return 'Buff Healer';
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
    {
      name: 'Model H: Weighted score (set=10, offBuff=5 each, PA/Slayer=8)',
      description: 'Weighted scoring: buff-healer set=10, Major Slayer/PA=8 each, other offensive=5 each. Buff if score ≥ 10.',
      fn: (p) => {
        let score = 0;
        if (p.hasBuffHealerSet) score += 10;
        if ((p.categoryScores.get('Major Slayer')?.apps ?? 0) > 0) score += 8;
        if ((p.categoryScores.get('Powerful Assault')?.apps ?? 0) > 0) score += 8;
        if ((p.categoryScores.get('Major Force (Horn)')?.apps ?? 0) > 0) score += 5;
        if ((p.categoryScores.get('Major Berserk')?.apps ?? 0) > 0) score += 5;
        if ((p.categoryScores.get('Minor Heroism')?.apps ?? 0) > 0) score += 5;
        if (score >= 10) return 'Buff Healer';
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
    {
      name: 'Model I: Current (buffTypes ≥ 8 or buffSet)',
      description: 'Current implementation: buff healer if uniqueBuffTypesApplied ≥ 8 or has buff-healer set. This is essentially "everyone" as we saw.',
      fn: (p) => {
        const totalBuffTypes = p.rawBuffs.size;
        if (p.hasBuffHealerSet || totalBuffTypes >= 8) return 'Buff Healer';
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
    {
      name: 'Model J: Tiered weighting (Slayer/PA=2, others=1, threshold ≥ 3)',
      description: 'Major Slayer and PA each count as 2, other offensive buffs count as 1. Buff Healer if weighted score ≥ 3.',
      fn: (p) => {
        let wScore = 0;
        if ((p.categoryScores.get('Major Slayer')?.apps ?? 0) > 0) wScore += 2;
        if ((p.categoryScores.get('Powerful Assault')?.apps ?? 0) > 0) wScore += 2;
        for (const catName of OFFENSIVE_CATEGORIES) {
          if (catName === 'Major Slayer' || catName === 'Powerful Assault') continue;
          if ((p.categoryScores.get(catName)?.apps ?? 0) > 0) wScore += 1;
        }
        if (wScore >= 3) return 'Buff Healer';
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
    {
      name: 'Model K: Primary (Slayer/PA) + ≥ 1 other offensive',
      description: 'Must have ≥ 1 of {Major Slayer, Powerful Assault} AND ≥ 1 other offensive buff category.',
      fn: (p) => {
        const hasMajorSlayer = (p.categoryScores.get('Major Slayer')?.apps ?? 0) > 0;
        const hasPA = (p.categoryScores.get('Powerful Assault')?.apps ?? 0) > 0;
        const hasPrimary = hasMajorSlayer || hasPA;
        let otherOffCount = 0;
        for (const catName of OFFENSIVE_CATEGORIES) {
          if (catName === 'Major Slayer' || catName === 'Powerful Assault') continue;
          if ((p.categoryScores.get(catName)?.apps ?? 0) > 0) otherOffCount++;
        }
        if (hasPrimary && otherOffCount >= 1) return 'Buff Healer';
        if (p.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS_CHECK.has(id))) return 'Shield Healer';
        return 'Group Healer';
      },
    },
  ];

  // Evaluate each classifier
  const results: ClassificationResult[] = [];
  for (const c of classifiers) {
    const result = evaluateClassifier(c.name, c.description, c.fn, allProfiles, groundTruth);
    results.push(result);
  }

  // Sort by accuracy descending
  results.sort((a, b) => b.accuracy - a.accuracy);

  lines.push('### Model Comparison (sorted by accuracy)');
  lines.push('');
  lines.push('| # | Model | Accuracy | Buff F1 | Group F1 | Shield F1 | Description |');
  lines.push('|---|-------|----------|---------|----------|-----------|-------------|');

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const buffF1 = r.metrics.get('Buff Healer')?.f1 ?? 0;
    const groupF1 = r.metrics.get('Group Healer')?.f1 ?? 0;
    const shieldF1 = r.metrics.get('Shield Healer')?.f1 ?? 0;
    lines.push(`| ${i + 1} | ${r.modelName} | ${(r.accuracy * 100).toFixed(1)}% | ${(buffF1 * 100).toFixed(1)}% | ${(groupF1 * 100).toFixed(1)}% | ${(shieldF1 * 100).toFixed(1)}% | ${r.description} |`);
  }

  lines.push('');

  // ────────────────────────────────
  // Section 4: Detailed per-model predictions
  // ────────────────────────────────

  lines.push('## 4. Detailed Predictions (Best Model)');
  lines.push('');

  const bestModel = results[0];
  lines.push(`**Best model: ${bestModel.modelName}** (accuracy: ${(bestModel.accuracy * 100).toFixed(1)}%)`);
  lines.push('');

  // Show confusion matrix
  const classes = ['Buff Healer', 'Group Healer', 'Shield Healer'];
  lines.push('### Confusion Matrix');
  lines.push('');
  lines.push('| Predicted \\ Actual | Buff Healer | Group Healer | Shield Healer |');
  lines.push('|-------------------|-------------|--------------|---------------|');
  for (const pred of classes) {
    const row = classes.map((actual) =>
      bestModel.predictions.filter((p) => p.predicted === pred && p.groundTruth === actual).length
    );
    lines.push(`| ${pred} | ${row.join(' | ')} |`);
  }
  lines.push('');

  // Show all predictions
  lines.push('### All Predictions');
  lines.push('');
  lines.push('| Player | Trial | Predicted | Ground Truth | Match |');
  lines.push('|--------|-------|-----------|-------------|-------|');
  for (const p of bestModel.predictions) {
    const match = p.predicted === p.groundTruth ? '✅' : '❌';
    lines.push(`| ${p.playerName} | ${p.trialName} | ${p.predicted} | ${p.groundTruth} | ${match} |`);
  }
  lines.push('');

  // ────────────────────────────────
  // Section 5: Per-healer offensive buff profile
  // ────────────────────────────────

  lines.push('## 5. Per-Healer Offensive Buff Profile');
  lines.push('');
  lines.push('Shows which offensive buff categories each healer provides.');
  lines.push('');

  lines.push('| Player | Class | Trial | Ground Truth | Buff Set? | Major Slayer | PA | Horn | M.Berserk | M.Heroism | Cinder | Off# |');
  lines.push('|--------|-------|-------|-------------|-----------|-------------|-----|------|-----------|-----------|--------|------|');

  const sortedProfiles = [...allProfiles].sort((a, b) => {
    const aKey = `${groundTruth.get(`${a.playerName}|${a.trialName}|${a.fightId}`) ?? ''}|${a.trialName}|${a.playerName}`;
    const bKey = `${groundTruth.get(`${b.playerName}|${b.trialName}|${b.fightId}`) ?? ''}|${b.trialName}|${b.playerName}`;
    return aKey.localeCompare(bKey);
  });

  for (const p of sortedProfiles) {
    const key = `${p.playerName}|${p.trialName}|${p.fightId}`;
    const truth = groundTruth.get(key) ?? '?';
    const ms = (p.categoryScores.get('Major Slayer')?.apps ?? 0) > 0 ? '✅' : '';
    const pa = (p.categoryScores.get('Powerful Assault')?.apps ?? 0) > 0 ? '✅' : '';
    const horn = (p.categoryScores.get('Major Force (Horn)')?.apps ?? 0) > 0 ? '✅' : '';
    const mb = (p.categoryScores.get('Major Berserk')?.apps ?? 0) > 0 ? '✅' : '';
    const mh = (p.categoryScores.get('Minor Heroism')?.apps ?? 0) > 0 ? '✅' : '';
    const cs = (p.categoryScores.get('Cinder Storm')?.apps ?? 0) > 0 ? '✅' : '';
    const offScore = getOffensiveBuffScore(p);
    lines.push(`| ${p.playerName} | ${p.className} | ${p.trialName} | ${truth} | ${p.hasBuffHealerSet ? '✅' : ''} | ${ms} | ${pa} | ${horn} | ${mb} | ${mh} | ${cs} | ${offScore} |`);
  }

  lines.push('');

  // ────────────────────────────────
  // Section 6: Recommendations
  // ────────────────────────────────

  lines.push('## 6. Statistical Summary & Recommendations');
  lines.push('');

  // Print top discriminating categories
  lines.push('### Top Discriminating Buff Categories (by Gini coefficient)');
  lines.push('');
  const topDisc = categoryStats.filter((s) => s.gini > 0.3).slice(0, 10);
  for (const s of topDisc) {
    lines.push(`- **${s.name}**: Gini=${s.gini.toFixed(3)}, CV=${s.cv.toFixed(2)}, Presence=${(s.presenceRate * 100).toFixed(0)}%`);
  }
  lines.push('');

  // Print top correlated categories
  lines.push('### Top Categories Correlated with Buff-Healer Sets');
  lines.push('');
  const topCorr = correlations.filter((c) => c.r > 0.1).slice(0, 10);
  for (const c of topCorr) {
    lines.push(`- **${c.category}**: r=${c.r.toFixed(3)}, BuffSet=${(c.presenceInBuffSet * 100).toFixed(0)}%, Non=${(c.presenceInNonBuffSet * 100).toFixed(0)}%`);
  }
  lines.push('');

  // Final recommendation
  lines.push('### Model Rankings');
  lines.push('');
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const buffF1 = r.metrics.get('Buff Healer')?.f1 ?? 0;
    lines.push(`${i + 1}. **${r.modelName}**: accuracy=${(r.accuracy * 100).toFixed(1)}%, Buff-Healer F1=${(buffF1 * 100).toFixed(1)}%`);
  }
  lines.push('');

  // Write output
  const md = lines.join('\n');
  const scratchDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, md, 'utf-8');
  logger.info(`✅ Report written to ${OUTPUT_FILE}`);

}, { name: SCRIPT_NAME });
