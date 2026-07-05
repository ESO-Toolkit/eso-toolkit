import { ChampionPointAbilityId } from '@/types/champion-points';

import {
  buildCompanionCritEvidence,
  critEvidenceFromSnapshot,
} from '../esotkCompanionCritEvidence';
import type { MatchableReport } from '../esotkCompanionMatcher';
import type { CompanionSnapshot } from '../esotkCompanionParser';

const REPORT_START_MS = 1_749_384_000_000;
const REPORT_START_S = REPORT_START_MS / 1000;

const report: MatchableReport = {
  startTime: REPORT_START_MS,
  endTime: REPORT_START_MS + 60 * 60 * 1000,
  actors: [{ id: 1, name: 'Casts-A-Lot', server: 'NA' }],
};

function snap(slotted: Record<number, number>, names?: Record<number, string>): CompanionSnapshot {
  return {
    ts: REPORT_START_S + 60,
    char: 'Casts-A-Lot',
    server: 'NA',
    championPoints: {
      total: 3600,
      disciplines: {},
      slotted,
      ...(names ? { names } : {}),
    },
  };
}

describe('critEvidenceFromSnapshot', () => {
  it('detects Fighting Finesse by champion-skill id', () => {
    expect(critEvidenceFromSnapshot(snap({ 5: ChampionPointAbilityId.FightingFinesse }))).toEqual({
      fightingFinesseSlotted: true,
      backstabberSlotted: false,
    });
  });

  it('detects Backstabber by champion-skill id', () => {
    expect(critEvidenceFromSnapshot(snap({ 6: ChampionPointAbilityId.Backstabber }))).toEqual({
      fightingFinesseSlotted: false,
      backstabberSlotted: true,
    });
  });

  it('falls back to captured localized star names when ids are unrecognized', () => {
    expect(
      critEvidenceFromSnapshot(
        snap({ 5: 999901, 6: 999902 }, { 999901: 'Fighting Finesse', 999902: 'Backstabber' }),
      ),
    ).toEqual({ fightingFinesseSlotted: true, backstabberSlotted: true });
  });

  it('returns false flags when neither star is slotted', () => {
    expect(critEvidenceFromSnapshot(snap({ 5: ChampionPointAbilityId.DeadlyAim }))).toEqual({
      fightingFinesseSlotted: false,
      backstabberSlotted: false,
    });
  });

  it('returns undefined when no slotted data was captured (assume-active fallback)', () => {
    expect(
      critEvidenceFromSnapshot({
        ts: 1,
        char: 'X',
        championPoints: { disciplines: {}, slotted: {} },
      }),
    ).toBeUndefined();
    expect(critEvidenceFromSnapshot({ ts: 1, char: 'X' })).toBeUndefined();
  });
});

describe('buildCompanionCritEvidence', () => {
  it('keys evidence by the matched numeric actor id', () => {
    expect(
      buildCompanionCritEvidence([snap({ 5: ChampionPointAbilityId.FightingFinesse })], report),
    ).toEqual({ 1: { fightingFinesseSlotted: true, backstabberSlotted: false } });
  });

  it('omits actors with no matched snapshot', () => {
    const anon: MatchableReport = { ...report, actors: [{ id: 9, name: 'Nobody' }] };
    expect(
      buildCompanionCritEvidence([snap({ 5: ChampionPointAbilityId.FightingFinesse })], anon),
    ).toEqual({});
  });

  it('returns {} for empty snapshots or empty actors', () => {
    expect(buildCompanionCritEvidence([], report)).toEqual({});
    expect(
      buildCompanionCritEvidence([snap({ 5: ChampionPointAbilityId.FightingFinesse })], {
        ...report,
        actors: [],
      }),
    ).toEqual({});
  });

  it('produces a plain Record of booleans (structured-clone safe for the worker)', () => {
    const out = buildCompanionCritEvidence(
      [snap({ 5: ChampionPointAbilityId.FightingFinesse, 6: ChampionPointAbilityId.Backstabber })],
      report,
    );
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });
});
