import { buildCompanionBuildsForReport } from '../esotkCompanionReportAdapter';
import { PVE_PENETRATION_CAP } from '../esotkCompanionCoaching';
import type { MatchableReport } from '../esotkCompanionMatcher';
import type { CompanionSnapshot } from '../esotkCompanionParser';

const REPORT_START_MS = 1_749_384_000_000;
const REPORT_START_S = REPORT_START_MS / 1000;

const report: MatchableReport = {
  startTime: REPORT_START_MS,
  endTime: REPORT_START_MS + 60 * 60 * 1000,
  actors: [
    { id: 1, name: 'Casts-A-Lot', server: 'NA' },
    { id: 2, name: 'Tanky', server: 'NA' },
  ],
  fights: [
    { id: 'f1', startTime: 0, endTime: 5 * 60 * 1000 },
    { id: 'f2', startTime: 30 * 60 * 1000, endTime: 35 * 60 * 1000 },
  ],
};

const snapshot: CompanionSnapshot = {
  ts: REPORT_START_S + 60,
  char: 'Casts-A-Lot',
  server: 'NA',
  championPoints: {
    total: 3600,
    disciplines: { 1: { id: 1, skills: { 25: 50 } } },
    slotted: { 5: 25 },
  },
  stats: { physicalPen: PVE_PENETRATION_CAP + 3200 },
};

describe('buildCompanionBuildsForReport', () => {
  it('produces render-ready props for the matched player only', () => {
    const builds = buildCompanionBuildsForReport([snapshot], report);
    expect(builds.size).toBe(1);
    expect(builds.has(1)).toBe(true);
    expect(builds.has(2)).toBe(false); // no snapshot for Tanky
  });

  it('builds the champion-point view-model and coaching from the snapshot', () => {
    const build = buildCompanionBuildsForReport([snapshot], report).get(1)!;
    expect(build.championPoints!.total).toBe(3600);
    expect(build.championPoints!.allocated[0].name).toBe('Deadly Aim');
    expect(build.coaching.find((i) => i.id === 'penetration')!.severity).toBe('warn');
    expect(build.fightId).toBe('f1');
    expect(build.snapshot).toBe(snapshot);
  });

  it('passes coaching options through (assumed group pen)', () => {
    const selfPenSnap: CompanionSnapshot = {
      ts: REPORT_START_S + 60,
      char: 'Casts-A-Lot',
      stats: { physicalPen: 7200 },
    };
    const build = buildCompanionBuildsForReport([selfPenSnap], report, {
      coaching: { assumedGroupPen: 11030 },
    }).get(1)!;
    // 7200 + 11030 ≈ on cap → good
    expect(build.coaching.find((i) => i.id === 'penetration')!.severity).toBe('good');
  });

  it('passes the target fight through to snapshot matching', () => {
    const firstFightSnapshot: CompanionSnapshot = {
      ts: REPORT_START_S + 5 * 60 + 2,
      char: 'Casts-A-Lot',
      server: 'NA',
      stats: { physicalPen: 5000 },
    };
    const secondFightSnapshot: CompanionSnapshot = {
      ts: REPORT_START_S + 35 * 60 + 2,
      char: 'Casts-A-Lot',
      server: 'NA',
      stats: { physicalPen: PVE_PENETRATION_CAP },
    };

    const build = buildCompanionBuildsForReport([firstFightSnapshot, secondFightSnapshot], report, {
      targetFightId: 'f2',
    }).get(1)!;

    expect(build.snapshot).toBe(secondFightSnapshot);
    expect(build.fightId).toBe('f2');
  });

  it('returns an empty map when nothing matches', () => {
    expect(buildCompanionBuildsForReport([], report).size).toBe(0);
    const anon: MatchableReport = { ...report, actors: [{ id: 9, name: 'Random 1' }] };
    expect(buildCompanionBuildsForReport([snapshot], anon).size).toBe(0);
  });
});
