import type { FightFragment, ReportFragment } from '../../../graphql/gql/graphql';

import { buildTrialChapters, findRunForFight, MIN_TRASH_SEGMENT_MS } from './buildTrialChapters';

const makeFight = (overrides: Partial<FightFragment> = {}): FightFragment =>
  ({
    id: 1,
    name: 'Boss',
    difficulty: 121,
    startTime: 0,
    endTime: 120000,
    kill: true,
    bossPercentage: 0,
    encounterID: 1,
    ...overrides,
  }) as FightFragment;

const trash = (overrides: Partial<FightFragment> = {}): FightFragment =>
  makeFight({ difficulty: null, kill: true, bossPercentage: null, name: 'Trash', ...overrides });

const rockgrove = { zone: { name: 'Rockgrove' } } as ReportFragment;

describe('buildTrialChapters', () => {
  it('returns no runs for empty input', () => {
    expect(buildTrialChapters(null, null)).toEqual([]);
    expect(buildTrialChapters([], rockgrove)).toEqual([]);
  });

  it('skips null and zero-length fights', () => {
    const runs = buildTrialChapters(
      [null, makeFight({ id: 1, name: 'Oaxiltso', startTime: 5, endTime: 5 })],
      rockgrove,
    );
    expect(runs).toEqual([]);
  });

  it('drops degenerate trash blips but never bosses', () => {
    const fights = [
      makeFight({ id: 1, name: 'Oaxiltso', startTime: 0, endTime: 60000 }),
      // A 400ms stray-add "fight" — would render as a useless "Cleared 0:00" stop.
      trash({ id: 2, startTime: 61000, endTime: 61400 }),
      trash({ id: 3, startTime: 62000, endTime: 62000 + MIN_TRASH_SEGMENT_MS }),
      // A 3s boss wipe is a real pull and must survive.
      makeFight({
        id: 4,
        name: 'Xalvakka',
        startTime: 70000,
        endTime: 73000,
        kill: false,
        bossPercentage: 80,
      }),
    ];
    const [run] = buildTrialChapters(fights, rockgrove);
    expect(run.segments.map((s) => s.fightId)).toEqual(['1', '3', '4']);
  });

  it('orders boss chapters by start time and indexes them', () => {
    const fights = [
      makeFight({ id: 3, name: 'Xalvakka', startTime: 300000, endTime: 480000 }),
      makeFight({ id: 1, name: 'Oaxiltso', startTime: 0, endTime: 180000 }),
    ];
    const [run] = buildTrialChapters(fights, rockgrove);
    expect(run.bossChapters.map((c) => c.name)).toEqual(['Oaxiltso', 'Xalvakka']);
    expect(run.bossChapters.map((c) => c.bossIndex)).toEqual([0, 1]);
  });

  it('includes trash as segments while keeping bossChapters boss-only', () => {
    const fights = [
      makeFight({ id: 1, name: 'Oaxiltso', startTime: 0, endTime: 60000 }),
      trash({ id: 2, startTime: 70000, endTime: 90000 }),
      makeFight({ id: 3, name: 'Xalvakka', startTime: 100000, endTime: 250000 }),
    ];
    const [run] = buildTrialChapters(fights, rockgrove);

    expect(run.segments.map((s) => s.kind)).toEqual(['boss', 'trash', 'boss']);
    expect(run.segments.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(run.bossChapters.map((s) => s.name)).toEqual(['Oaxiltso', 'Xalvakka']);
    // Trash segment carries no difficulty label and bossIndex -1.
    expect(run.segments[1]).toMatchObject({ kind: 'trash', bossIndex: -1, difficultyLabel: null });
  });

  it('folds trash that precedes the first boss into that run as a lead-in', () => {
    const fights = [
      trash({ id: 1, startTime: 0, endTime: 20000 }),
      makeFight({ id: 2, name: 'Oaxiltso', startTime: 30000, endTime: 90000 }),
    ];
    const [run] = buildTrialChapters(fights, rockgrove);
    expect(run.trialName).toBe('Rockgrove');
    expect(run.segments.map((s) => s.kind)).toEqual(['trash', 'boss']);
    expect(run.bossChapters).toHaveLength(1);
  });

  it('derives kill/wipe status and duration per chapter', () => {
    const fights = [
      makeFight({ id: 1, name: 'Oaxiltso', bossPercentage: 0, startTime: 0, endTime: 60000 }),
      makeFight({
        id: 2,
        name: 'Xalvakka',
        bossPercentage: 35,
        startTime: 70000,
        endTime: 250000,
      }),
    ];
    const [run] = buildTrialChapters(fights, rockgrove);
    expect(run.bossChapters[0]).toMatchObject({ isKill: true, isWipe: false, durationMs: 60000 });
    expect(run.bossChapters[1]).toMatchObject({ isKill: false, isWipe: true, bossPercentage: 35 });
  });

  it('numbers repeated pulls of the same boss within a run', () => {
    const fights = [
      makeFight({ id: 1, name: 'Xalvakka', bossPercentage: 40, startTime: 0, endTime: 60000 }),
      makeFight({ id: 2, name: 'Xalvakka', bossPercentage: 0, startTime: 70000, endTime: 200000 }),
    ];
    const [run] = buildTrialChapters(fights, rockgrove);
    expect(run.bossChapters.map((c) => c.attempt)).toEqual([1, 2]);
  });

  it('splits into separate runs when the trial changes', () => {
    const fights = [
      makeFight({ id: 1, name: 'Oaxiltso', startTime: 0, endTime: 60000 }),
      makeFight({ id: 2, name: 'Lord Falgravn', startTime: 70000, endTime: 200000 }),
    ];
    const runs = buildTrialChapters(fights, null);
    expect(runs.map((r) => r.trialName)).toEqual(['Rockgrove', "Kyne's Aegis"]);
    expect(runs[0].id).not.toBe(runs[1].id);
  });

  it('keeps a trash-only log navigable as a standalone trash run', () => {
    const fights = [
      trash({ id: 1, startTime: 0, endTime: 20000 }),
      trash({ id: 2, startTime: 30000, endTime: 50000 }),
    ];
    const runs = buildTrialChapters(fights, { zone: { name: 'Some Dungeon' } } as ReportFragment);
    expect(runs).toHaveLength(1);
    expect(runs[0].trialName).toBe('Some Dungeon');
    expect(runs[0].bossChapters).toHaveLength(0);
    expect(runs[0].segments.map((s) => s.kind)).toEqual(['trash', 'trash']);
  });
});

describe('findRunForFight', () => {
  const runs = buildTrialChapters(
    [
      makeFight({ id: 1, name: 'Oaxiltso', startTime: 0, endTime: 60000 }),
      trash({ id: 5, startTime: 65000, endTime: 95000 }),
      makeFight({ id: 2, name: 'Xalvakka', startTime: 100000, endTime: 200000 }),
    ],
    rockgrove,
  );

  it('finds a boss by segment membership and reports both indices', () => {
    const match = findRunForFight(runs, '2', null);
    expect(match?.segmentIndex).toBe(2);
    expect(match?.bossIndex).toBe(1);
  });

  it('finds a trash segment with bossIndex -1', () => {
    const match = findRunForFight(runs, '5', null);
    expect(match?.segmentIndex).toBe(1);
    expect(match?.bossIndex).toBe(-1);
  });

  it('locates the run by time span when the fight is not a known segment', () => {
    const match = findRunForFight(runs, '999', 80000);
    expect(match?.run.id).toBe(runs[0].id);
    expect(match?.segmentIndex).toBe(-1);
  });

  it('returns null when nothing matches', () => {
    expect(findRunForFight(runs, '999', 9_000_000)).toBeNull();
  });
});
