import type { FightFragment, ReportFragment } from '../graphql/gql/graphql';

import {
  getDifficultyLabel,
  getFightOutcome,
  getTrialNameFromBoss,
  isFalsePositiveWipe,
} from './trialClassification';

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

const makeReport = (zoneName?: string): ReportFragment =>
  ({ zone: zoneName ? { name: zoneName } : null }) as ReportFragment;

describe('getTrialNameFromBoss', () => {
  it('resolves a trial from a known boss name (boss wins over zone)', () => {
    expect(getTrialNameFromBoss('Xalvakka', makeReport('Some Other Zone'))).toBe('Rockgrove');
    expect(getTrialNameFromBoss('Ansuul the Tormentor', null)).toBe("Sanity's Edge");
  });

  it('is case-insensitive and matches partial names', () => {
    expect(getTrialNameFromBoss('LORD FALGRAVN', null)).toBe("Kyne's Aegis");
  });

  it('falls back to the zone name when the boss is unknown', () => {
    expect(getTrialNameFromBoss('Random Trash Mob', makeReport('Dreadsail Reef'))).toBe(
      'Dreadsail Reef',
    );
  });

  it('falls back to "Unknown Trial" when nothing matches', () => {
    expect(getTrialNameFromBoss('Random Trash Mob', null)).toBe('Unknown Trial');
  });
});

describe('getDifficultyLabel', () => {
  it('labels normal / veteran / veteran HM for standard trials', () => {
    expect(getDifficultyLabel(0, 'Rockgrove')).toBe('Normal');
    expect(getDifficultyLabel(121, 'Rockgrove')).toBe('Veteran');
    expect(getDifficultyLabel(122, 'Rockgrove')).toBe('Veteran HM');
  });

  it('uses the +1/+2/+3 ladder for Cloudrest and Asylum', () => {
    expect(getDifficultyLabel(123, 'Cloudrest')).toBe('Veteran +1');
    expect(getDifficultyLabel(125, 'Asylum Sanctorium')).toBe('Veteran +3');
  });
});

describe('isFalsePositiveWipe', () => {
  it('flags an exact-100% short fight as a false positive', () => {
    expect(
      isFalsePositiveWipe(makeFight({ bossPercentage: 100, startTime: 0, endTime: 30000 })),
    ).toBe(true);
  });

  it('does not flag a genuine wipe with meaningful damage done', () => {
    expect(isFalsePositiveWipe(makeFight({ bossPercentage: 45, endTime: 200000 }))).toBe(false);
  });
});

describe('getFightOutcome', () => {
  it('marks a boss kill when boss health is <= 1%', () => {
    const outcome = getFightOutcome(makeFight({ bossPercentage: 0.5 }));
    expect(outcome).toMatchObject({ isBoss: true, isKill: true, isWipe: false });
  });

  it('marks a boss wipe when boss health remains', () => {
    const outcome = getFightOutcome(makeFight({ bossPercentage: 60, endTime: 200000 }));
    expect(outcome).toMatchObject({ isBoss: true, isKill: false, isWipe: true });
    expect(outcome.bossPercentage).toBe(60);
  });

  it('reclassifies a false-positive wipe as a kill', () => {
    const outcome = getFightOutcome(
      makeFight({ bossPercentage: 100, startTime: 0, endTime: 30000 }),
    );
    expect(outcome).toMatchObject({ isKill: true, isWipe: false, isFalsePositiveWipe: true });
  });

  it('treats trash (no difficulty) via the kill flag', () => {
    expect(getFightOutcome(makeFight({ difficulty: null, kill: true }))).toMatchObject({
      isBoss: false,
      isKill: true,
      isWipe: false,
      bossPercentage: null,
    });
    expect(getFightOutcome(makeFight({ difficulty: null, kill: false }))).toMatchObject({
      isBoss: false,
      isKill: false,
      isWipe: true,
    });
  });
});
