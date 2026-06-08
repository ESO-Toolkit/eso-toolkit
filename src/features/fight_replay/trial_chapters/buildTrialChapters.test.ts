import type { FightFragment, ReportFragment } from '../../../graphql/gql/graphql';

import { buildTrialChapters, findRunForFight } from './buildTrialChapters';

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

const rockgrove = { zone: { name: 'Rockgrove' } } as ReportFragment;

describe('buildTrialChapters', () => {
  it('returns no runs for empty input', () => {
    expect(buildTrialChapters(null, null)).toEqual([]);
    expect(buildTrialChapters([], rockgrove)).toEqual([]);
  });

  it('keeps only boss fights (drops trash) and orders them by start time', () => {
    const fights = [
      makeFight({ id: 3, name: 'Xalvakka', startTime: 300000, endTime: 480000 }),
      makeFight({ id: 2, name: 'Trash', difficulty: null, startTime: 200000, endTime: 250000 }),
      makeFight({ id: 1, name: 'Oaxiltso', startTime: 0, endTime: 180000 }),
    ];

    const runs = buildTrialChapters(fights, rockgrove);

    expect(runs).toHaveLength(1);
    expect(runs[0].trialName).toBe('Rockgrove');
    expect(runs[0].chapters.map((c) => c.name)).toEqual(['Oaxiltso', 'Xalvakka']);
    expect(runs[0].chapters.map((c) => c.index)).toEqual([0, 1]);
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

    expect(run.chapters[0]).toMatchObject({
      fightId: '1',
      isKill: true,
      isWipe: false,
      durationMs: 60000,
    });
    expect(run.chapters[1]).toMatchObject({
      fightId: '2',
      isKill: false,
      isWipe: true,
      bossPercentage: 35,
    });
  });

  it('numbers repeated pulls of the same boss within a run', () => {
    const fights = [
      makeFight({ id: 1, name: 'Xalvakka', bossPercentage: 40, startTime: 0, endTime: 60000 }),
      makeFight({ id: 2, name: 'Xalvakka', bossPercentage: 0, startTime: 70000, endTime: 200000 }),
    ];

    const [run] = buildTrialChapters(fights, rockgrove);

    expect(run.chapters.map((c) => c.attempt)).toEqual([1, 2]);
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
});

describe('findRunForFight', () => {
  const runs = buildTrialChapters(
    [
      makeFight({ id: 1, name: 'Oaxiltso', startTime: 0, endTime: 60000 }),
      makeFight({ id: 2, name: 'Xalvakka', startTime: 100000, endTime: 200000 }),
    ],
    rockgrove,
  );

  it('finds the run and index by chapter membership', () => {
    expect(findRunForFight(runs, '2', null)).toMatchObject({ index: 1 });
  });

  it('locates the run by time span when the fight is not a boss chapter', () => {
    // Trash fight at 80s falls within the run's boss window → index -1.
    const match = findRunForFight(runs, '999', 80000);
    expect(match?.run.id).toBe(runs[0].id);
    expect(match?.index).toBe(-1);
  });

  it('returns null when nothing matches', () => {
    expect(findRunForFight(runs, '999', 9_000_000)).toBeNull();
  });
});
