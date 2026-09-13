/**
 * Opt-in damage-statistics worker benchmark.
 *
 * Run all required sizes with:
 *   npm run script -- scripts/benchmark-damage-statistics-worker.ts
 *
 * This intentionally is not a Jest test: timings are evidence, not a flaky
 * pass/fail gate. It invokes the clone-safe calculation registered by
 * SharedWorker using the same payload shape sent across the worker boundary.
 */
import { performance } from 'node:perf_hooks';

import type { FightFragment } from '../src/graphql/gql/graphql';
import type { DamageEvent, Resources } from '../src/types/combatlogEvents';
import {
  calculateDamageStatistics,
  type DamageStatisticsCalculationTask,
} from '../src/workers/calculations/CalculateDamageStatistics';

const EVENT_COUNTS = [10_000, 100_000, 500_000] as const;
const PLAYER_IDS = [101, 102, 103, 104] as const;
const TARGET_ID = 999;
const EXCLUDED_TARGET_ID = 998;
const DAMAGE_AMOUNT = 100;

const EMPTY_RESOURCES: Resources = {
  hitPoints: 0,
  maxHitPoints: 0,
  magicka: 0,
  maxMagicka: 0,
  stamina: 0,
  maxStamina: 0,
  ultimate: 0,
  maxUltimate: 0,
  werewolf: 0,
  maxWerewolf: 0,
  absorb: 0,
  championPoints: 0,
  x: 0,
  y: 0,
  facing: 0,
};

interface BenchmarkResult {
  eventCount: number;
  wallTimeMs: number;
  cpuTimeMs: number;
  heapDeltaBytes: number;
  heapUsedBytes: number;
  expectedDamage: number;
  actualDamage: number;
  expectedEventCount: number;
  actualEventCount: number;
  correct: boolean;
  hasNaN: boolean;
}

const FIGHT: FightFragment = {
  __typename: 'ReportFight',
  id: 1,
  startTime: 0,
  endTime: 3_000_000,
  difficulty: 1,
  encounterID: 1,
  name: 'Damage statistics benchmark',
  friendlyPlayers: [],
  enemyPlayers: [],
  bossPercentage: null,
};

function createTask(eventCount: number): DamageStatisticsCalculationTask {
  const damageEventsByPlayer: Record<string, DamageEvent[]> = Object.fromEntries(
    PLAYER_IDS.map((playerId) => [playerId, []]),
  );

  for (let index = 0; index < eventCount; index += 1) {
    const playerId = PLAYER_IDS[index % PLAYER_IDS.length];
    // One in five events targets a different enemy, exercising selected-target
    // filtering without changing the input's exact event count.
    const targetID = index % 5 === 0 ? EXCLUDED_TARGET_ID : TARGET_ID;
    damageEventsByPlayer[playerId].push({
      timestamp: index * 5,
      type: 'damage',
      sourceID: playerId,
      sourceIsFriendly: true,
      targetID,
      targetIsFriendly: false,
      abilityGameID: 1_000 + (index % 20),
      fight: FIGHT.id,
      hitType: index % 2 === 0 ? 2 : 1,
      amount: DAMAGE_AMOUNT,
      castTrackID: index,
      sourceResources: EMPTY_RESOURCES,
      targetResources: EMPTY_RESOURCES,
    });
  }

  return {
    fight: FIGHT,
    damageEventsByPlayer,
    selectedTargetIds: [TARGET_ID],
  };
}

function sumNumbers(value: unknown): number {
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) return value.reduce((total, entry) => total + sumNumbers(entry), 0);
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((total, entry) => total + sumNumbers(entry), 0);
  }
  return 0;
}

function containsNaN(value: unknown): boolean {
  if (typeof value === 'number') return Number.isNaN(value);
  if (Array.isArray(value)) return value.some(containsNaN);
  if (value && typeof value === 'object') return Object.values(value).some(containsNaN);
  return false;
}

function runBenchmark(eventCount: number): BenchmarkResult {
  const task = createTask(eventCount);
  const expectedEventCount = eventCount - Math.ceil(eventCount / 5);
  const expectedDamage = expectedEventCount * DAMAGE_AMOUNT;
  const heapBeforeBytes = process.memoryUsage().heapUsed;
  const cpuBefore = process.cpuUsage();
  const wallBefore = performance.now();

  const result = calculateDamageStatistics(task);

  const wallTimeMs = performance.now() - wallBefore;
  const cpuUsage = process.cpuUsage(cpuBefore);
  const actualDamage = sumNumbers(result.damageByPlayer);
  const actualEventCount = sumNumbers(result.damageEventsBySource);
  const hasNaN = containsNaN(result);
  const correct =
    actualDamage === expectedDamage && actualEventCount === expectedEventCount && !hasNaN;

  return {
    eventCount,
    wallTimeMs: Number(wallTimeMs.toFixed(3)),
    cpuTimeMs: Number(((cpuUsage.user + cpuUsage.system) / 1000).toFixed(3)),
    heapDeltaBytes: process.memoryUsage().heapUsed - heapBeforeBytes,
    heapUsedBytes: process.memoryUsage().heapUsed,
    expectedDamage,
    actualDamage,
    expectedEventCount,
    actualEventCount,
    correct,
    hasNaN,
  };
}

const results = EVENT_COUNTS.map(runBenchmark);
console.log(JSON.stringify({ benchmark: 'damage-statistics-worker-calculation', results }));

if (results.some((result) => !result.correct)) {
  process.exitCode = 1;
}
