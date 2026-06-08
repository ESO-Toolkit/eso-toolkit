import type { FightFragment, ReportFragment } from '../../graphql/gql/graphql';

import {
  buildRunEncounters,
  effectiveEncounterId,
  groupFightsIntoRuns,
  isBossFight,
  resolveFightZone,
  trialNameFromBossName,
  uncategorizedTrash,
  wasKill,
} from './fightGrouping';

// In-game zone IDs from ZONE_NAMES / zoneScaleData.
const ZONE_SUNSPIRE = 1121;
const ZONE_CLOUDREST = 1051;
const ZONE_KYNES_AEGIS = 1196;
const ZONE_DUNGEON = 999999; // not a known trial → treated as dungeon

let nextId = 1;

function makeFight(overrides: Partial<FightFragment> = {}): FightFragment {
  const id = overrides.id ?? nextId++;
  return {
    __typename: 'ReportFight',
    id,
    name: 'Boss',
    difficulty: 121,
    startTime: 0,
    endTime: 60_000,
    kill: true,
    encounterID: 21,
    originalEncounterID: null,
    bossPercentage: 0,
    gameZone: { __typename: 'GameZone', id: ZONE_SUNSPIRE, name: 'Sunspire' },
    ...overrides,
  } as FightFragment;
}

const reportData = { zone: { name: 'Sunspire' } } as ReportFragment;

describe('boss vs trash classification', () => {
  it('treats encounterID !== 0 as a boss', () => {
    expect(isBossFight(makeFight({ encounterID: 21, difficulty: null }))).toBe(true);
  });

  it('treats encounterID 0 with no difficulty as trash', () => {
    expect(isBossFight(makeFight({ encounterID: 0, difficulty: null }))).toBe(false);
  });

  it('treats a boss demoted to trash (originalEncounterID) as a boss', () => {
    expect(
      isBossFight(makeFight({ encounterID: 0, originalEncounterID: 21, difficulty: null })),
    ).toBe(true);
    expect(effectiveEncounterId(makeFight({ encounterID: 0, originalEncounterID: 21 }))).toBe(21);
  });

  it('keeps difficulty-tagged bosses even if encounterID is 0', () => {
    expect(isBossFight(makeFight({ encounterID: 0, difficulty: 122 }))).toBe(true);
  });
});

describe('kill detection', () => {
  it('uses the authoritative kill flag', () => {
    expect(wasKill(makeFight({ kill: true, bossPercentage: 100 }))).toBe(true);
    expect(wasKill(makeFight({ kill: false, bossPercentage: 0 }))).toBe(false);
  });

  it('falls back to bossPercentage when kill is null', () => {
    expect(wasKill(makeFight({ kill: null, bossPercentage: 0.5 }))).toBe(true);
    expect(wasKill(makeFight({ kill: null, bossPercentage: 40 }))).toBe(false);
  });
});

describe('trialNameFromBossName', () => {
  it('matches known bosses with instance suffixes', () => {
    expect(trialNameFromBossName('Lord Falgravn #2')).toBe("Kyne's Aegis");
    expect(trialNameFromBossName('Yolnahkriin')).toBe('Sunspire');
  });

  it('returns null for unknown bosses', () => {
    expect(trialNameFromBossName('Some Dungeon Boss')).toBeNull();
    expect(trialNameFromBossName('')).toBeNull();
  });
});

describe('resolveFightZone', () => {
  it('resolves a known trial by gameZone id', () => {
    const zone = resolveFightZone(makeFight({ gameZone: { id: ZONE_KYNES_AEGIS, name: 'x' } }));
    expect(zone.name).toBe("Kyne's Aegis");
    expect(zone.type).toBe('trial');
    expect(zone.expectedBossCount).toBe(3);
  });

  it('falls back to boss-name when gameZone is missing', () => {
    const zone = resolveFightZone(
      makeFight({ gameZone: null, name: 'Nahviintaas', encounterID: 21 }),
    );
    expect(zone.name).toBe('Sunspire');
    expect(zone.type).toBe('trial');
  });

  it('treats an unknown gameZone as a dungeon and labels it from the API name', () => {
    const zone = resolveFightZone(
      makeFight({ gameZone: { id: ZONE_DUNGEON, name: 'Fungal Grotto I' }, encounterID: 500 }),
    );
    expect(zone.type).toBe('dungeon');
    expect(zone.name).toBe('Fungal Grotto I');
    expect(zone.zoneId).toBe(ZONE_DUNGEON);
  });
});

describe('groupFightsIntoRuns', () => {
  it('groups one trial into a single run', () => {
    const fights = [
      makeFight({
        startTime: 0,
        endTime: 1000,
        encounterID: 21,
        gameZone: { id: ZONE_SUNSPIRE, name: 'Sunspire' },
      }),
      makeFight({
        startTime: 2000,
        endTime: 3000,
        encounterID: 22,
        gameZone: { id: ZONE_SUNSPIRE, name: 'Sunspire' },
      }),
    ];
    const runs = groupFightsIntoRuns(fights, reportData);
    expect(runs).toHaveLength(1);
    expect(runs[0].zone.name).toBe('Sunspire');
    expect(runs[0].fights).toHaveLength(2);
  });

  it('separates a log that mixes two different trials', () => {
    const fights = [
      makeFight({ startTime: 0, endTime: 1000, gameZone: { id: ZONE_SUNSPIRE, name: 'Sunspire' } }),
      makeFight({
        startTime: 2000,
        endTime: 3000,
        gameZone: { id: ZONE_CLOUDREST, name: 'Cloudrest' },
      }),
    ];
    const runs = groupFightsIntoRuns(fights, reportData);
    expect(runs).toHaveLength(2);
    expect(runs.map((r) => r.zone.name)).toEqual(['Sunspire', 'Cloudrest']);
  });

  it('separates a trial followed by a dungeon', () => {
    const fights = [
      makeFight({ startTime: 0, endTime: 1000, gameZone: { id: ZONE_SUNSPIRE, name: 'Sunspire' } }),
      makeFight({
        startTime: 2000,
        endTime: 3000,
        encounterID: 500,
        gameZone: { id: ZONE_DUNGEON, name: 'Fungal Grotto I' },
      }),
    ];
    const runs = groupFightsIntoRuns(fights, reportData);
    expect(runs).toHaveLength(2);
    expect(runs[1].zone.type).toBe('dungeon');
  });

  it('starts a new run when a killed boss is re-cleared in the same zone', () => {
    const fights = [
      makeFight({
        startTime: 0,
        endTime: 1000,
        encounterID: 21,
        kill: true,
        gameZone: { id: ZONE_SUNSPIRE, name: 'Sunspire' },
      }),
      makeFight({
        startTime: 2000,
        endTime: 3000,
        encounterID: 21,
        kill: true,
        gameZone: { id: ZONE_SUNSPIRE, name: 'Sunspire' },
      }),
    ];
    const runs = groupFightsIntoRuns(fights, reportData);
    expect(runs).toHaveLength(2);
  });

  it('keeps multiple wipe attempts on the same boss in one run', () => {
    const fights = [
      makeFight({ startTime: 0, endTime: 1000, encounterID: 21, kill: false, bossPercentage: 30 }),
      makeFight({
        startTime: 2000,
        endTime: 3000,
        encounterID: 21,
        kill: false,
        bossPercentage: 10,
      }),
      makeFight({ startTime: 4000, endTime: 5000, encounterID: 21, kill: true, bossPercentage: 0 }),
    ];
    const runs = groupFightsIntoRuns(fights, reportData);
    expect(runs).toHaveLength(1);
    expect(runs[0].fights).toHaveLength(3);
  });

  it('attaches inter-zone trash (no gameZone) to the current run without splitting', () => {
    const fights = [
      makeFight({
        startTime: 0,
        endTime: 1000,
        encounterID: 21,
        gameZone: { id: ZONE_SUNSPIRE, name: 'Sunspire' },
      }),
      makeFight({
        startTime: 1500,
        endTime: 1800,
        encounterID: 0,
        difficulty: null,
        gameZone: null,
        name: 'Trash',
      }),
      makeFight({
        startTime: 2000,
        endTime: 3000,
        encounterID: 22,
        gameZone: { id: ZONE_SUNSPIRE, name: 'Sunspire' },
      }),
    ];
    const runs = groupFightsIntoRuns(fights, reportData);
    expect(runs).toHaveLength(1);
    expect(runs[0].fights).toHaveLength(3);
  });
});

describe('buildRunEncounters', () => {
  it('groups attempts of the same boss by encounterID and associates trash', () => {
    const fights = [
      makeFight({
        startTime: 0,
        endTime: 1000,
        encounterID: 0,
        difficulty: null,
        name: 'Pre Trash',
      }),
      makeFight({ startTime: 1000, endTime: 2000, encounterID: 21, kill: false, name: 'Boss A' }),
      makeFight({ startTime: 2000, endTime: 3000, encounterID: 21, kill: true, name: 'Boss A' }),
      makeFight({
        startTime: 3000,
        endTime: 3500,
        encounterID: 0,
        difficulty: null,
        name: 'Mid Trash',
      }),
      makeFight({ startTime: 4000, endTime: 5000, encounterID: 22, kill: true, name: 'Boss B' }),
    ];
    const [run] = groupFightsIntoRuns(fights, reportData);
    const encounters = buildRunEncounters(run);
    expect(encounters).toHaveLength(2);
    expect(encounters[0].bossFights).toHaveLength(2); // two attempts on Boss A
    expect(encounters[0].preTrash).toHaveLength(1);
    expect(uncategorizedTrash(run, encounters)).toHaveLength(0);
  });
});
