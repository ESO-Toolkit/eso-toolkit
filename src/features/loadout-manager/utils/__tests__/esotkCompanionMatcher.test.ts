import type { CompanionSnapshot } from '../esotkCompanionParser';
import { matchCompanionSnapshots, type MatchableReport } from '../esotkCompanionMatcher';

function snap(
  partial: Partial<CompanionSnapshot> & { ts: number; char: string },
): CompanionSnapshot {
  return { ...partial };
}

// Report starts at a round UNIX ms; snapshots use UNIX seconds.
const REPORT_START_MS = 1_749_384_000_000;
const REPORT_START_S = REPORT_START_MS / 1000;

const report: MatchableReport = {
  startTime: REPORT_START_MS,
  endTime: REPORT_START_MS + 60 * 60 * 1000, // 1h
  // ESO Logs actors carry region-tagged servers like "PC-NA" — a different vocabulary
  // from the addon's "NA Megaserver", which is exactly what the region match must bridge.
  actors: [
    { id: 1, name: 'Casts-A-Lot', server: 'PC-NA' },
    { id: 2, name: 'Tanky-Mctankface', server: 'PC-NA' },
  ],
  fights: [
    { id: 'f1', startTime: 0, endTime: 5 * 60 * 1000, zoneId: 1196 },
    { id: 'f2', startTime: 30 * 60 * 1000, endTime: 35 * 60 * 1000, zoneId: 1196 },
  ],
};

describe('matchCompanionSnapshots', () => {
  it('matches an actor to an in-window snapshot across server vocabularies (NA Megaserver ↔ PC-NA)', () => {
    const s = snap({ ts: REPORT_START_S + 60, char: 'Casts-A-Lot', server: 'NA Megaserver' });
    const { matches } = matchCompanionSnapshots([s], report);
    expect(matches.get(1)?.snapshot).toBe(s);
    expect(matches.get(1)?.distanceMs).toBe(0);
  });

  it('attaches the nearest fight', () => {
    // snapshot taken ~just after fight f2's window
    const s = snap({ ts: REPORT_START_S + 33 * 60, char: 'Casts-A-Lot', server: 'NA' });
    const { matches } = matchCompanionSnapshots([s], report);
    expect(matches.get(1)?.fightId).toBe('f2');
  });

  it('is case-insensitive and tolerates a leading @', () => {
    const s = snap({ ts: REPORT_START_S + 60, char: '@casts-a-lot' });
    const { matches } = matchCompanionSnapshots([s], report);
    expect(matches.get(1)?.snapshot).toBe(s);
  });

  it('picks the closest snapshot when several match', () => {
    const near = snap({ ts: REPORT_START_S + 31 * 60, char: 'Casts-A-Lot' });
    const far = snap({ ts: REPORT_START_S + 2 * 60, char: 'Casts-A-Lot' });
    const { matches } = matchCompanionSnapshots([far, near], report);
    expect(matches.get(1)?.distanceMs).toBe(0);
    expect(matches.get(1)?.snapshot).toBe(near);
  });

  it('rejects a provable region conflict (EU Megaserver ↔ PC-NA)', () => {
    const s = snap({ ts: REPORT_START_S + 60, char: 'Casts-A-Lot', server: 'EU Megaserver' });
    const { matches, unmatched } = matchCompanionSnapshots([s], report);
    expect(matches.has(1)).toBe(false);
    expect(unmatched).toContain(s);
  });

  it('classifies region from either vocabulary, case-insensitively', () => {
    const s = snap({ ts: REPORT_START_S + 60, char: 'Casts-A-Lot', server: 'na megaserver' });
    const { matches } = matchCompanionSnapshots([s], report);
    expect(matches.get(1)?.snapshot).toBe(s);
  });

  it('falls through to name + time when the snapshot server is unclassifiable', () => {
    // e.g. "PTS" or an empty/unknown world — never reject on this alone.
    const s = snap({ ts: REPORT_START_S + 60, char: 'Casts-A-Lot', server: 'PTS' });
    const { matches } = matchCompanionSnapshots([s], report);
    expect(matches.get(1)?.snapshot).toBe(s);
  });

  it('uses the target fight to select the correct combat-end snapshot', () => {
    const firstFight = snap({
      ts: REPORT_START_S + 5 * 60 + 2,
      char: 'Casts-A-Lot',
      server: 'NA',
    });
    const secondFight = snap({
      ts: REPORT_START_S + 35 * 60 + 2,
      char: 'Casts-A-Lot',
      server: 'NA',
    });

    const { matches } = matchCompanionSnapshots([firstFight, secondFight], report, {
      targetFightId: 'f2',
    });

    expect(matches.get(1)?.snapshot).toBe(secondFight);
    expect(matches.get(1)?.fightId).toBe('f2');
  });

  it('rejects snapshots whose zone disagrees with the target fight', () => {
    const s = snap({
      ts: REPORT_START_S + 60,
      char: 'Casts-A-Lot',
      server: 'NA',
      zoneId: 9999,
    });

    const { matches, unmatched } = matchCompanionSnapshots([s], report, {
      targetFightId: 'f1',
    });

    expect(matches.has(1)).toBe(false);
    expect(unmatched).toContain(s);
  });

  it('rejects snapshots outside the report window (beyond slop)', () => {
    const s = snap({ ts: REPORT_START_S + 24 * 60 * 60, char: 'Casts-A-Lot' }); // a day later
    const { matches, unmatched } = matchCompanionSnapshots([s], report);
    expect(matches.has(1)).toBe(false);
    expect(unmatched).toContain(s);
  });

  it('returns unmatched snapshots (e.g. anonymised report names)', () => {
    const anonReport: MatchableReport = { ...report, actors: [{ id: 9, name: 'Random 1' }] };
    const s = snap({ ts: REPORT_START_S + 60, char: 'Casts-A-Lot' });
    const { matches, unmatched } = matchCompanionSnapshots([s], anonReport);
    expect(matches.size).toBe(0);
    expect(unmatched).toEqual([s]);
  });
});
