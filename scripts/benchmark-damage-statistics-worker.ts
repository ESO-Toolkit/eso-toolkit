/**
 * Opt-in damage-statistics calculation-core benchmark.
 *
 * Run calculation-core evidence for all required sizes with:
 *   npm run script -- scripts/benchmark-damage-statistics-worker.ts
 *
 * Include the production worker and entry-chunk budget check after a build:
 *   npm run build && npm run script -- scripts/benchmark-damage-statistics-worker.ts --require-build
 *
 * This intentionally is not a Jest test: timings are evidence, not a flaky
 * pass/fail gate. It measures the clone-safe calculation registered by
 * SharedWorker without worker startup, transport, or structured-clone costs.
 * The browser performance suite separately measures the real worker boundary.
 */
import { performance } from 'node:perf_hooks';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

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
const MAX_EAGER_CHUNK_BYTES = 600 * 1024;
const MAX_WORKER_CHUNK_BYTES = 600 * 1024;

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

interface BundleChunkEvidence {
  name: string;
  rawBytes: number;
  gzipBytes: number;
}

interface BundleEvidence {
  entryChunk: BundleChunkEvidence;
  workerChunks: BundleChunkEvidence[];
  totalJavaScriptBytes: number;
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

function toChunkEvidence(name: string, assetsDirectory: string): BundleChunkEvidence {
  const filePath = join(assetsDirectory, name);
  return {
    name,
    rawBytes: statSync(filePath).size,
    gzipBytes: gzipSync(readFileSync(filePath), { level: 9 }).length,
  };
}

function collectBundleEvidence(required: boolean): BundleEvidence | null {
  const assetsDirectory = join(process.cwd(), 'build', 'assets');
  try {
    const files = readdirSync(assetsDirectory).filter(
      (file) => file.endsWith('.js') && !file.endsWith('.map'),
    );
    const chunks = files.map((file) => toChunkEvidence(file, assetsDirectory));
    const entryChunk = chunks.find((chunk) => /^index-[\w-]+\.js$/.test(chunk.name));
    const workerChunks = chunks.filter((chunk) =>
      /(?:sharedworker|workerpool|worker-)/i.test(chunk.name),
    );

    if (!entryChunk || workerChunks.length === 0) {
      throw new Error(
        'Expected the production entry and damage-statistics worker chunks in build/assets.',
      );
    }

    if (entryChunk.rawBytes > MAX_EAGER_CHUNK_BYTES) {
      throw new Error(
        `Entry chunk ${entryChunk.name} exceeds the ${MAX_EAGER_CHUNK_BYTES}-byte budget.`,
      );
    }
    if (workerChunks.some((chunk) => chunk.rawBytes > MAX_WORKER_CHUNK_BYTES)) {
      throw new Error(`A worker chunk exceeds the ${MAX_WORKER_CHUNK_BYTES}-byte budget.`);
    }

    return {
      entryChunk,
      workerChunks,
      totalJavaScriptBytes: chunks.reduce((total, chunk) => total + chunk.rawBytes, 0),
    };
  } catch (error) {
    if (!required && (error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

const results = EVENT_COUNTS.map(runBenchmark);
const bundle = collectBundleEvidence(process.argv.includes('--require-build'));
console.log(
  JSON.stringify({
    schemaVersion: 1,
    benchmark: 'damage-statistics-calculation-core',
    fixture: 'four-player, selected-target damage events',
    eventCounts: EVENT_COUNTS,
    budgets: {
      eagerChunkBytes: MAX_EAGER_CHUNK_BYTES,
      workerChunkBytes: MAX_WORKER_CHUNK_BYTES,
    },
    bundle,
    results,
  }),
);

if (results.some((result) => !result.correct)) {
  process.exitCode = 1;
}
