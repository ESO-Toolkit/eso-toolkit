import fs from 'node:fs';
import path from 'node:path';

import type { FightFragment, ReportFragment } from '../../graphql/gql/graphql';

import { buildRunEncounters, groupFightsIntoRuns, type RunEncounter } from './fightGrouping';
import { determineRunDifficulty, getTrialHMType, isHmCapableBoss } from './runDifficulty';

let nextId = 1;
function bossFight(overrides: Partial<FightFragment> = {}): FightFragment {
  return {
    __typename: 'ReportFight',
    id: overrides.id ?? nextId++,
    name: 'Boss',
    difficulty: 122,
    startTime: 0,
    endTime: 60_000,
    kill: true,
    encounterID: 100,
    originalEncounterID: null,
    bossPercentage: 0,
    gameZone: null,
    ...overrides,
  } as FightFragment;
}

function enc(name: string, fights: FightFragment[]): RunEncounter {
  return { id: name, name, bossFights: fights, preTrash: [], postTrash: [] };
}

describe('isHmCapableBoss', () => {
  it('excludes mini-bosses that have no Hard Mode', () => {
    expect(isHmCapableBoss('Spiral Descender')).toBe(false);
    expect(isHmCapableBoss('Bow Breaker')).toBe(false);
    expect(isHmCapableBoss('Sail Ripper')).toBe(false);
    expect(isHmCapableBoss('Haj Mota')).toBe(false);
    expect(isHmCapableBoss('Basks-In-Snakes')).toBe(false);
  });

  it('treats real bosses as HM-capable', () => {
    expect(isHmCapableBoss('Tideborn Taleria')).toBe(true);
    expect(isHmCapableBoss('Exarchanic Yaseyla')).toBe(true);
    expect(isHmCapableBoss('Lord Falgravn')).toBe(true);
  });
});

describe('getTrialHMType', () => {
  it('classifies trials', () => {
    expect(getTrialHMType('Dreadsail Reef')).toBe('per-boss');
    expect(getTrialHMType('Cloudrest')).toBe('special');
    expect(getTrialHMType('Asylum Sanctorium')).toBe('special');
    expect(getTrialHMType('Aetherian Archive')).toBe('final-boss-only');
  });
});

describe('determineRunDifficulty', () => {
  it('labels Veteran HM when mains are HM and only minis are Veteran (DSR shape)', () => {
    const encounters = [
      enc('Lylanar and Turlassil', [bossFight({ difficulty: 122, kill: true })]),
      enc('Bow Breaker', [bossFight({ difficulty: 121, kill: true })]), // mini, no HM
      enc('Reef Guardian', [bossFight({ difficulty: 122, kill: true })]),
      enc('Tideborn Taleria', [bossFight({ difficulty: 122, kill: true })]),
    ];
    // Minis must NOT downgrade this to "Partial Veteran HM".
    expect(determineRunDifficulty(encounters, 'Dreadsail Reef')).toEqual({
      difficulty: 122,
      label: 'Veteran HM',
    });
  });

  it('judges HM on the kill, ignoring lower-difficulty wipes', () => {
    const encounters = [
      enc('Exarchanic Yaseyla', [bossFight({ difficulty: 122, kill: true })]),
      enc('Archwizard Twelvane and Chimera', [
        bossFight({ difficulty: 121, kill: false, bossPercentage: 40 }), // vet wipe
        bossFight({ difficulty: 122, kill: true }), // HM kill
      ]),
      enc('Ansuul the Tormentor', [bossFight({ difficulty: 122, kill: true })]),
      enc('Spiral Descender', [bossFight({ difficulty: 121, kill: true })]), // mini
    ];
    expect(determineRunDifficulty(encounters, "Sanity's Edge").label).toBe('Veteran HM');
  });

  it('reports Partial Veteran HM when an HM-capable boss was only done on Veteran', () => {
    const encounters = [
      enc('Lylanar and Turlassil', [bossFight({ difficulty: 122, kill: true })]),
      enc('Reef Guardian', [bossFight({ difficulty: 121, kill: true })]), // main on vet
      enc('Tideborn Taleria', [bossFight({ difficulty: 122, kill: true })]),
    ];
    expect(determineRunDifficulty(encounters, 'Dreadsail Reef').label).toBe('Partial Veteran HM');
  });

  it('uses +N codes for Cloudrest/Asylum from the final-boss kill', () => {
    const encounters = [enc("Z'Maja", [bossFight({ difficulty: 124, kill: true })])];
    expect(determineRunDifficulty(encounters, 'Cloudrest')).toEqual({
      difficulty: 124,
      label: 'Veteran HM +2',
    });
  });

  it('returns a null label for a bossless (trash-only) run', () => {
    const encounters = [enc('Trash', [])];
    expect(determineRunDifficulty(encounters, 'Dreadsail Reef').label).toBeNull();
  });

  it('labels a Normal-mode trial (code ≤ 120) as Normal, not Veteran', () => {
    const perBoss = [enc('Tideborn Taleria', [bossFight({ difficulty: 120, kill: true })])];
    expect(determineRunDifficulty(perBoss, 'Dreadsail Reef').label).toBe('Normal');

    const finalBossOnly = [enc('The Mage', [bossFight({ difficulty: 120, kill: true })])];
    expect(determineRunDifficulty(finalBossOnly, 'Aetherian Archive').label).toBe('Normal');

    const special = [enc("Z'Maja", [bossFight({ difficulty: 120, kill: true })])];
    expect(determineRunDifficulty(special, 'Cloudrest').label).toBe('Normal');
  });
});

// End-to-end: the two real reports should both read as Veteran HM (mains on HM,
// minis on Veteran) — NOT "Partial Veteran HM".
function loadSampleReport(code: string): { report: ReportFragment; fights: FightFragment[] } {
  const file = path.resolve(process.cwd(), 'public/sample-reports', code, 'report.json');
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const json = JSON.parse(raw);
  const report = (json?.reportData?.report ?? json?.data?.reportData?.report) as ReportFragment;
  const fights = ((report as unknown as { fights?: FightFragment[] })?.fights ??
    []) as FightFragment[];
  return { report, fights };
}

describe('integration: real-log difficulty', () => {
  it('DSR farm reads as Veteran HM (mini Bow Breaker does not make it Partial)', () => {
    const { report, fights } = loadSampleReport('F4f2bMwWtgVKxjB9');
    const [run] = groupFightsIntoRuns(fights, report);
    expect(determineRunDifficulty(buildRunEncounters(run), run.zone.name).label).toBe('Veteran HM');
  });

  it('VSE progression reads as Veteran HM (mini Spiral Descender excluded)', () => {
    const { report, fights } = loadSampleReport('YArFDbq7BdhwL691');
    const [run] = groupFightsIntoRuns(fights, report);
    expect(determineRunDifficulty(buildRunEncounters(run), run.zone.name).label).toBe('Veteran HM');
  });
});
