import fs from 'node:fs';
import path from 'node:path';

import type { FightFragment, ReportFragment } from '../../graphql/gql/graphql';

import {
  buildRunEncounters,
  effectiveEncounterId,
  groupFightsIntoRuns,
  isBossFight,
  isResetPull,
  resolveFightZone,
  summarizeEncounter,
  trialNameFromBossName,
  uncategorizedTrash,
  wasKill,
} from './fightGrouping';

// In-game zone IDs from ZONE_NAMES / zoneScaleData.
const ZONE_SUNSPIRE = 1121;
const ZONE_CLOUDREST = 1051;
const ZONE_KYNES_AEGIS = 1196;
const ZONE_HRC = 636;
const ZONE_AA = 638;
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

  it('treats a fight ESO Logs demoted to trash (encounterID 0) as trash', () => {
    // Demoted fights are post-kill / instant-reset noise, not phantom attempts.
    expect(
      isBossFight(makeFight({ encounterID: 0, originalEncounterID: 21, difficulty: null })),
    ).toBe(false);
    // The original id is still recoverable for callers that need it.
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

  it('prefers the raw gameZone over the boss-name fallback (dungeon boss with a trial token)', () => {
    // "The Mage's Twin Serpent" hits several trial tokens ('the mage',
    // 'serpent', 'twins') — but the fight carries a real dungeon gameZone, and
    // the per-fight API signal must win.
    const zone = resolveFightZone(
      makeFight({
        gameZone: { id: ZONE_DUNGEON, name: 'Fungal Grotto I' },
        name: "The Mage's Twin Serpent",
        encounterID: 500,
      }),
    );
    expect(zone.type).toBe('dungeon');
    expect(zone.name).toBe('Fungal Grotto I');
    expect(zone.zoneId).toBe(ZONE_DUNGEON);
  });

  it('resolves a name-only gameZone that matches a canonical trial', () => {
    const zone = resolveFightZone(
      makeFight({ gameZone: { id: null, name: 'Sunspire' }, encounterID: 21 }),
    );
    expect(zone.type).toBe('trial');
    expect(zone.zoneId).toBe(ZONE_SUNSPIRE);
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

  it('keeps same-zone re-clears in one run by default (farm/reset logs)', () => {
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
    expect(groupFightsIntoRuns(fights, reportData)).toHaveLength(1);
  });

  it('splits re-clears into separate runs only when splitReclears is set', () => {
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
    expect(groupFightsIntoRuns(fights, reportData, { splitReclears: true })).toHaveLength(2);
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

  it('keeps no-gameZone fights with an id-keyed dungeon run of the same name', () => {
    // In a dungeon log the report-level zone name matches the dungeon, but the
    // name-keyed fallback (`name:bal sunnar`) differs from the id key
    // (`zone:1564`) — that mismatch must not split the run.
    const dungeonReport = { zone: { name: 'Bal Sunnar' } } as ReportFragment;
    const fights = [
      makeFight({
        startTime: 0,
        endTime: 60_000,
        encounterID: 71,
        gameZone: { id: 1564, name: 'Bal Sunnar' },
      }),
      makeFight({
        startTime: 61_000,
        endTime: 62_000,
        encounterID: 0,
        difficulty: null,
        gameZone: null,
        name: 'Trash',
      }),
      makeFight({
        startTime: 63_000,
        endTime: 120_000,
        encounterID: 72,
        gameZone: { id: 1564, name: 'Bal Sunnar' },
      }),
    ];
    const runs = groupFightsIntoRuns(fights, dungeonReport);
    expect(runs).toHaveLength(1);
    expect(runs[0].fights).toHaveLength(3);
    expect(runs[0].zone.zoneId).toBe(1564);
  });

  it('does not let the report-level zone fallback shatter another zone’s run (mixed log)', () => {
    // Mixed log whose report-level zone is Dreadsail Reef. Mid-dungeon trash
    // with no gameZone resolves to the report zone — that must NOT split the
    // dungeon run (previously produced DSR → Bal Sunnar → DSR → Bal Sunnar).
    const mixedReport = { zone: { name: 'Dreadsail Reef' } } as ReportFragment;
    const fights = [
      makeFight({
        startTime: 0,
        endTime: 60_000,
        encounterID: 31,
        gameZone: { id: 1344, name: 'Dreadsail Reef' },
      }),
      makeFight({
        startTime: 100_000,
        endTime: 160_000,
        encounterID: 71,
        gameZone: { id: 1564, name: 'Bal Sunnar' },
      }),
      makeFight({
        startTime: 161_000,
        endTime: 162_000,
        encounterID: 0,
        difficulty: null,
        gameZone: null,
        name: 'Trash',
      }),
      makeFight({
        startTime: 163_000,
        endTime: 220_000,
        encounterID: 72,
        gameZone: { id: 1564, name: 'Bal Sunnar' },
      }),
    ];
    const runs = groupFightsIntoRuns(fights, mixedReport);
    expect(runs).toHaveLength(2);
    expect(runs[0].zone.name).toBe('Dreadsail Reef');
    expect(runs[1].zone.name).toBe('Bal Sunnar');
    expect(runs[1].fights).toHaveLength(3);
  });

  it('upgrades a run started from the name fallback once an id-keyed fight arrives', () => {
    const dungeonReport = { zone: { name: 'Bal Sunnar' } } as ReportFragment;
    const fights = [
      makeFight({
        startTime: 0,
        endTime: 1000,
        encounterID: 0,
        difficulty: null,
        gameZone: null,
        name: 'Trash',
      }),
      makeFight({
        startTime: 2000,
        endTime: 60_000,
        encounterID: 71,
        gameZone: { id: 1564, name: 'Bal Sunnar' },
      }),
    ];
    const runs = groupFightsIntoRuns(fights, dungeonReport);
    expect(runs).toHaveLength(1);
    expect(runs[0].zone.zoneId).toBe(1564);
    expect(runs[0].zone.key).toBe('zone:1564');
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

describe('isResetPull', () => {
  it('flags a short pull that barely dented the boss as a reset', () => {
    expect(
      isResetPull(makeFight({ startTime: 0, endTime: 8_000, kill: false, bossPercentage: 99 })),
    ).toBe(true);
  });

  it('does not flag a long, deep wipe as a reset', () => {
    expect(
      isResetPull(makeFight({ startTime: 0, endTime: 120_000, kill: false, bossPercentage: 20 })),
    ).toBe(false);
  });

  it('never flags a kill as a reset', () => {
    expect(
      isResetPull(makeFight({ startTime: 0, endTime: 5_000, kill: true, bossPercentage: 0 })),
    ).toBe(false);
  });
});

describe('summarizeEncounter', () => {
  it('summarises attempts, kills, resets and best pull', () => {
    const encounter = {
      id: 'e',
      name: 'Boss',
      preTrash: [],
      postTrash: [],
      bossFights: [
        makeFight({ startTime: 0, endTime: 6_000, kill: false, bossPercentage: 99 }), // reset
        makeFight({ startTime: 0, endTime: 90_000, kill: false, bossPercentage: 40 }), // wipe
        makeFight({ startTime: 0, endTime: 90_000, kill: false, bossPercentage: 12 }), // closer wipe
        makeFight({ startTime: 0, endTime: 90_000, kill: true, bossPercentage: 0 }), // kill
      ],
    };
    const s = summarizeEncounter(encounter);
    expect(s.attempts).toBe(4);
    expect(s.resets).toBe(1);
    expect(s.realAttempts).toBe(3);
    expect(s.kills).toBe(1);
    expect(s.killed).toBe(true);
    expect(s.bestPercent).toBe(0); // killed
  });

  it('reports best pull when the boss was never killed', () => {
    const encounter = {
      id: 'e',
      name: 'Boss',
      preTrash: [],
      postTrash: [],
      bossFights: [
        makeFight({ startTime: 0, endTime: 90_000, kill: false, bossPercentage: 55 }),
        makeFight({ startTime: 0, endTime: 90_000, kill: false, bossPercentage: 18 }),
      ],
    };
    const s = summarizeEncounter(encounter);
    expect(s.killed).toBe(false);
    expect(s.bestPercent).toBe(18);
  });
});

describe('edge cases', () => {
  it('separates three distinct trials in one log, in order', () => {
    const fights = [
      makeFight({ startTime: 0, endTime: 1000, gameZone: { id: ZONE_AA, name: 'AA' } }),
      makeFight({ startTime: 2000, endTime: 3000, gameZone: { id: ZONE_HRC, name: 'HRC' } }),
      makeFight({ startTime: 4000, endTime: 5000, gameZone: { id: ZONE_SUNSPIRE, name: 'SS' } }),
    ];
    const runs = groupFightsIntoRuns(fights, reportData);
    expect(runs.map((r) => r.zone.name)).toEqual([
      'Aetherian Archive',
      'Hel Ra Citadel',
      'Sunspire',
    ]);
  });

  it('treats returning to an earlier zone (A → B → A) as three separate runs', () => {
    const fights = [
      makeFight({ startTime: 0, endTime: 1000, gameZone: { id: ZONE_SUNSPIRE, name: 'SS' } }),
      makeFight({ startTime: 2000, endTime: 3000, gameZone: { id: ZONE_CLOUDREST, name: 'CR' } }),
      makeFight({ startTime: 4000, endTime: 5000, gameZone: { id: ZONE_SUNSPIRE, name: 'SS' } }),
    ];
    const runs = groupFightsIntoRuns(fights, reportData);
    expect(runs.map((r) => r.zone.name)).toEqual(['Sunspire', 'Cloudrest', 'Sunspire']);
  });

  it('is order-independent (sorts by start time)', () => {
    const fights = [
      makeFight({
        startTime: 4000,
        endTime: 5000,
        encounterID: 22,
        gameZone: { id: ZONE_SUNSPIRE, name: 'SS' },
      }),
      makeFight({
        startTime: 0,
        endTime: 1000,
        encounterID: 21,
        gameZone: { id: ZONE_SUNSPIRE, name: 'SS' },
      }),
    ];
    const runs = groupFightsIntoRuns(fights, reportData);
    expect(runs).toHaveLength(1);
    expect(runs[0].fights.map((f) => f.startTime)).toEqual([0, 4000]);
  });

  it('classifies known arenas as arenas, not dungeons', () => {
    const zone = resolveFightZone(
      makeFight({ gameZone: { id: 1234567, name: 'Maelstrom Arena' }, encounterID: 900 }),
    );
    expect(zone.type).toBe('arena');
    expect(zone.name).toBe('Maelstrom Arena');
  });

  it('resolves a full no-gameZone (legacy) log via boss names', () => {
    const fights = [
      makeFight({
        startTime: 0,
        endTime: 1000,
        encounterID: 21,
        gameZone: null,
        name: 'Yolnahkriin',
      }),
      makeFight({
        startTime: 2000,
        endTime: 3000,
        encounterID: 23,
        gameZone: null,
        name: 'Nahviintaas',
      }),
    ];
    const runs = groupFightsIntoRuns(fights, { zone: { name: 'Sunspire' } } as ReportFragment);
    expect(runs).toHaveLength(1);
    expect(runs[0].zone.name).toBe('Sunspire');
  });

  it('returns a single bossless run for a trash-only log', () => {
    const fights = [
      makeFight({ startTime: 0, endTime: 1000, encounterID: 0, difficulty: null, name: 'Trash A' }),
      makeFight({
        startTime: 2000,
        endTime: 3000,
        encounterID: 0,
        difficulty: null,
        name: 'Trash B',
      }),
    ];
    const [run] = groupFightsIntoRuns(fights, reportData);
    const encounters = buildRunEncounters(run);
    expect(encounters).toHaveLength(0);
    expect(uncategorizedTrash(run, encounters)).toHaveLength(2);
  });

  it('returns [] for empty / null input', () => {
    expect(groupFightsIntoRuns([], reportData)).toEqual([]);
    expect(groupFightsIntoRuns(null, reportData)).toEqual([]);
    expect(groupFightsIntoRuns(undefined, reportData)).toEqual([]);
  });

  it('drops zero-duration / invalid fights', () => {
    const fights = [
      makeFight({ startTime: 1000, endTime: 1000 }), // zero duration
      makeFight({ startTime: 2000, endTime: 1500 }), // negative
      makeFight({ startTime: 0, endTime: 1000, encounterID: 21 }), // valid
    ];
    const runs = groupFightsIntoRuns(fights, reportData);
    expect(runs).toHaveLength(1);
    expect(runs[0].fights).toHaveLength(1);
  });
});

// ── End-to-end checks against real committed ESO Logs reports ──────────────
function loadSampleReport(code: string): { report: ReportFragment; fights: FightFragment[] } {
  const file = path.resolve(process.cwd(), 'public/sample-reports', code, 'report.json');
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const json = JSON.parse(raw);
  const report = (json?.reportData?.report ?? json?.data?.reportData?.report) as ReportFragment;
  const fights = ((report as unknown as { fights?: FightFragment[] })?.fights ??
    []) as FightFragment[];
  return { report, fights };
}

describe('integration: real sample reports', () => {
  it('DSR reset farm → one Dreadsail Reef run with grouped, multi-kill encounters', () => {
    const { report, fights } = loadSampleReport('F4f2bMwWtgVKxjB9');
    const runs = groupFightsIntoRuns(fights, report);

    // 57 fights of the same group resetting the trial all stay in ONE run.
    expect(runs).toHaveLength(1);
    expect(runs[0].zone.name).toBe('Dreadsail Reef');
    expect(runs[0].zone.type).toBe('trial');

    const encounters = buildRunEncounters(runs[0]);
    const lylanar = encounters.find((e) => e.name.includes('Lylanar'));
    expect(lylanar).toBeDefined();
    const s = summarizeEncounter(lylanar!);
    expect(s.attempts).toBeGreaterThanOrEqual(5); // farmed many times
    expect(s.kills).toBeGreaterThanOrEqual(2); // killed on multiple resets
    expect(s.killed).toBe(true);

    // Demoted (encounterID 0) post-kill fights must not appear as boss attempts.
    expect(lylanar!.bossFights.every((f) => (f.encounterID ?? 0) !== 0)).toBe(true);
  });

  it('VSE progression → one run; 30+ Yaseyla attempts incl. resets, eventual kill', () => {
    const { report, fights } = loadSampleReport('YArFDbq7BdhwL691');
    const runs = groupFightsIntoRuns(fights, report);

    expect(runs).toHaveLength(1);
    expect(runs[0].zone.name).toBe("Sanity's Edge");

    const encounters = buildRunEncounters(runs[0]);
    const yaseyla = encounters.find((e) => e.name.includes('Yaseyla'));
    expect(yaseyla).toBeDefined();
    const s = summarizeEncounter(yaseyla!);
    expect(s.attempts).toBeGreaterThan(30); // long prog boss
    expect(s.resets).toBeGreaterThan(0); // quick re-pulls detected
    expect(s.realAttempts).toBeLessThan(s.attempts);
    expect(s.killed).toBe(true);
  });
});
