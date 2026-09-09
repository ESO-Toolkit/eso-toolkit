import process from 'node:process';

import {
  createIndexedPlayerEventOutput,
  createLegacyRepeatedFilterPlayerEventIndex,
  createPlayerEventBenchmarkFixture,
  createPlayerEventIndexDigest,
  PLAYER_EVENT_BENCHMARK_SCALES,
  toComparablePlayerEventIndex,
  type PlayerEventBenchmarkFixture,
  type PlayerEventIndexComparableOutput,
} from '../../src/features/report_details/insights/benchmarks/playersPanelEventIndexBenchmark';

interface MemorySnapshot {
  heapUsedBytes: number;
  heapTotalBytes: number;
  rssBytes: number;
}

interface Measurement {
  wallMilliseconds: number;
  cpuUserMilliseconds: number;
  cpuSystemMilliseconds: number;
  fixtureMemory: MemorySnapshot;
  resultMemory: MemorySnapshot;
  retainedHeapBytes: number;
  digest: string;
  inspectedEvents: number;
}

interface BenchmarkResult {
  eventCount: number;
  playerCount: number;
  legacy: Measurement;
  indexed: Measurement;
  equivalent: boolean;
}

const collectGarbage = (): void => {
  if (typeof global.gc === 'function') {
    global.gc();
  }
};

const snapshotMemory = (): MemorySnapshot => {
  const memory = process.memoryUsage();
  return {
    heapUsedBytes: memory.heapUsed,
    heapTotalBytes: memory.heapTotal,
    rssBytes: memory.rss,
  };
};

const measure = (
  createOutput: (fixture: PlayerEventBenchmarkFixture) => PlayerEventIndexComparableOutput,
  eventCount: number,
  playerCount: number,
): Measurement => {
  collectGarbage();
  const fixture = createPlayerEventBenchmarkFixture(eventCount, playerCount);
  collectGarbage();
  const fixtureMemory = snapshotMemory();
  const cpuStart = process.cpuUsage();
  const wallStart = performance.now();
  const output = createOutput(fixture);
  const wallMilliseconds = performance.now() - wallStart;
  const cpu = process.cpuUsage(cpuStart);
  const digest = createPlayerEventIndexDigest(output);
  collectGarbage();
  const resultMemory = snapshotMemory();

  return {
    wallMilliseconds,
    cpuUserMilliseconds: cpu.user / 1_000,
    cpuSystemMilliseconds: cpu.system / 1_000,
    fixtureMemory,
    resultMemory,
    retainedHeapBytes: resultMemory.heapUsedBytes - fixtureMemory.heapUsedBytes,
    digest,
    inspectedEvents: output.inspectedEvents,
  };
};

const runBenchmark = (eventCount: number, playerCount: number): BenchmarkResult => {
  // Prime the module and JIT outside the recorded samples.
  const warmupFixture = createPlayerEventBenchmarkFixture(1_000, Math.min(playerCount, 4));
  createLegacyRepeatedFilterPlayerEventIndex(warmupFixture);
  createIndexedPlayerEventOutput(warmupFixture);
  collectGarbage();

  const legacy = measure(createLegacyRepeatedFilterPlayerEventIndex, eventCount, playerCount);
  const indexed = measure(createIndexedPlayerEventOutput, eventCount, playerCount);

  const equivalenceFixture = createPlayerEventBenchmarkFixture(eventCount, playerCount);
  const equivalent =
    JSON.stringify(
      toComparablePlayerEventIndex(createLegacyRepeatedFilterPlayerEventIndex(equivalenceFixture)),
    ) ===
    JSON.stringify(
      toComparablePlayerEventIndex(createIndexedPlayerEventOutput(equivalenceFixture)),
    );

  if (!equivalent || legacy.digest !== indexed.digest) {
    throw new Error(
      `Benchmark outputs diverged for ${eventCount} events and ${playerCount} players.`,
    );
  }

  return { eventCount, playerCount, legacy, indexed, equivalent };
};

const toMiB = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(2);

const printResult = (result: BenchmarkResult): void => {
  const speedup = result.legacy.wallMilliseconds / result.indexed.wallMilliseconds;
  console.log(
    [
      `${result.eventCount.toLocaleString()} events / ${result.playerCount} players`,
      `legacy ${result.legacy.wallMilliseconds.toFixed(2)} ms wall, ${result.legacy.cpuUserMilliseconds.toFixed(2)} ms user CPU, ${toMiB(result.legacy.retainedHeapBytes)} MiB retained`,
      `indexed ${result.indexed.wallMilliseconds.toFixed(2)} ms wall, ${result.indexed.cpuUserMilliseconds.toFixed(2)} ms user CPU, ${toMiB(result.indexed.retainedHeapBytes)} MiB retained`,
      `${speedup.toFixed(2)}x wall speedup; digest ${result.indexed.digest}; equivalent=${result.equivalent}`,
    ].join('\n  '),
  );
};

const results = PLAYER_EVENT_BENCHMARK_SCALES.map(({ eventCount, playerCount }) =>
  runBenchmark(eventCount, playerCount),
);

for (const result of results) {
  printResult(result);
}

console.log(JSON.stringify({ benchmark: 'players-panel-event-index', results }, null, 2));
