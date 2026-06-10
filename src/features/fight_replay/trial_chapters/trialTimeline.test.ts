import type { TrialChapter } from './types';
import {
  buildTrialTimeline,
  entryForFight,
  globalToLocal,
  localToGlobal,
  nextEntryAfter,
} from './trialTimeline';

const seg = (overrides: Partial<TrialChapter>): TrialChapter => ({
  fightId: '1',
  fightNumericId: 1,
  name: 'Seg',
  kind: 'boss',
  trialName: 'Rockgrove',
  difficulty: 121,
  difficultyLabel: 'Veteran',
  isKill: true,
  isWipe: false,
  bossPercentage: 0,
  startTime: 0,
  endTime: 0,
  durationMs: 0,
  index: 0,
  bossIndex: 0,
  attempt: 1,
  ...overrides,
});

const segments: TrialChapter[] = [
  seg({ fightId: 'a', name: 'Oaxiltso', kind: 'boss', durationMs: 60000, index: 0, bossIndex: 0 }),
  seg({ fightId: 't', name: 'Trash', kind: 'trash', durationMs: 20000, index: 1, bossIndex: -1 }),
  seg({ fightId: 'b', name: 'Xalvakka', kind: 'boss', durationMs: 100000, index: 2, bossIndex: 1 }),
];

describe('buildTrialTimeline', () => {
  it('concatenates segment durations into one gapless axis', () => {
    const tl = buildTrialTimeline(segments, true);
    expect(tl.totalDurationMs).toBe(180000);
    expect(tl.entries.map((e) => [e.globalStart, e.globalEnd])).toEqual([
      [0, 60000],
      [60000, 80000],
      [80000, 180000],
    ]);
    expect(tl.entries[2].startFraction).toBeCloseTo(80000 / 180000);
  });

  it('drops trash when includeTrash is false', () => {
    const tl = buildTrialTimeline(segments, false);
    expect(tl.entries.map((e) => e.chapter.name)).toEqual(['Oaxiltso', 'Xalvakka']);
    expect(tl.totalDurationMs).toBe(160000);
    expect(tl.entries.map((e) => [e.globalStart, e.globalEnd])).toEqual([
      [0, 60000],
      [60000, 160000],
    ]);
  });

  it('handles an empty run', () => {
    const tl = buildTrialTimeline([], true);
    expect(tl.entries).toEqual([]);
    expect(tl.totalDurationMs).toBe(0);
    expect(globalToLocal(tl, 0)).toBeNull();
  });
});

describe('nextEntryAfter', () => {
  // Real start times so the off-timeline fallback has something to anchor on.
  const timed: TrialChapter[] = [
    seg({ fightId: 'a', name: 'Oaxiltso', startTime: 1000, durationMs: 60000 }),
    seg({ fightId: 't', name: 'Trash', kind: 'trash', startTime: 70000, durationMs: 20000 }),
    seg({ fightId: 'b', name: 'Xalvakka', startTime: 100000, durationMs: 100000 }),
  ];

  it('returns the following entry for a fight on the timeline', () => {
    const tl = buildTrialTimeline(timed, true);
    expect(nextEntryAfter(tl, 'a', 1000)?.chapter.fightId).toBe('t');
  });

  it('returns null at the end of the run', () => {
    const tl = buildTrialTimeline(timed, true);
    expect(nextEntryAfter(tl, 'b', 100000)).toBeNull();
  });

  it('falls back by start time for a fight EXCLUDED from the timeline', () => {
    // Trash excluded: the current trash fight isn't an entry, but auto-advance
    // must still flow into the next boss instead of dead-stopping.
    const tl = buildTrialTimeline(timed, false);
    expect(nextEntryAfter(tl, 't', 70000)?.chapter.fightId).toBe('b');
  });

  it('falls back for an unknown fight id between entries', () => {
    const tl = buildTrialTimeline(timed, true);
    // e.g. a sub-threshold trash blip at 65s that buildTrialChapters filtered out.
    expect(nextEntryAfter(tl, 'zz', 65000)?.chapter.fightId).toBe('t');
  });
});

describe('globalToLocal', () => {
  const tl = buildTrialTimeline(segments, true);

  it('maps a global time into the right segment + local offset', () => {
    expect(globalToLocal(tl, 0)).toMatchObject({ entryIndex: 0, localMs: 0 });
    expect(globalToLocal(tl, 70000)).toMatchObject({ entryIndex: 1, localMs: 10000 });
    expect(globalToLocal(tl, 120000)).toMatchObject({ entryIndex: 2, localMs: 40000 });
  });

  it('clamps below zero and past the end', () => {
    expect(globalToLocal(tl, -5000)).toMatchObject({ entryIndex: 0, localMs: 0 });
    const end = globalToLocal(tl, 999999);
    expect(end).toMatchObject({ entryIndex: 2 });
    expect(end?.localMs).toBe(100000);
  });

  it('resolves an exact boundary to the later segment', () => {
    expect(globalToLocal(tl, 60000)).toMatchObject({ entryIndex: 1, localMs: 0 });
    expect(globalToLocal(tl, 80000)).toMatchObject({ entryIndex: 2, localMs: 0 });
  });
});

describe('localToGlobal', () => {
  const tl = buildTrialTimeline(segments, true);

  it('converts a fight-local time to global trial time', () => {
    expect(localToGlobal(tl, 'a', 30000)).toBe(30000);
    expect(localToGlobal(tl, 't', 5000)).toBe(65000);
    expect(localToGlobal(tl, 'b', 40000)).toBe(120000);
  });

  it('clamps local time to the segment duration', () => {
    expect(localToGlobal(tl, 'a', 999999)).toBe(60000);
  });

  it('returns null for a fight not on the timeline', () => {
    const bossOnly = buildTrialTimeline(segments, false);
    expect(localToGlobal(bossOnly, 't', 1000)).toBeNull();
  });
});

describe('entryForFight', () => {
  const tl = buildTrialTimeline(segments, true);

  it('finds the entry + index for a fight', () => {
    expect(entryForFight(tl, 'b')?.index).toBe(2);
  });

  it('returns null for unknown or undefined ids', () => {
    expect(entryForFight(tl, 'zzz')).toBeNull();
    expect(entryForFight(tl, undefined)).toBeNull();
  });
});
