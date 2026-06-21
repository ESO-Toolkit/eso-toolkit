import type { EsoLogsClient } from '../../esologsClient';

import { adaptDamageTable, fetchSummaryDamageTotals } from './reportSummaryTables';

// Mirrors the live `table(dataType: DamageDone)` shape (report F4f2bMwWtgVKxjB9):
// two players plus a friendly NPC and a pet that must be filtered out.
const damagePayload = {
  data: {
    entries: [
      { name: 'Healer', id: 2, type: 'Templar', total: 400 },
      { name: 'DPS', id: 1, type: 'Necromancer', total: 600 },
      { name: 'Dreadsail Deadeye', id: 38, type: 'NPC', total: 999 },
      { name: 'Skeletal Mage', id: 99, type: 'Pet', total: 999 },
    ],
  },
};

describe('adaptDamageTable', () => {
  it('keeps players only, sorted by damage, with totals/DPS/percentages', () => {
    // 1000 player-outgoing damage over a 10s active window -> 100 DPS.
    const result = adaptDamageTable(damagePayload, 10_000);

    expect(result.totalDamage).toBe(1000);
    expect(result.dps).toBeCloseTo(100);

    // NPC (id 38) and Pet (id 99) are excluded; players sorted desc by damage.
    expect(result.playerBreakdown.map((p) => p.playerName)).toEqual(['DPS', 'Healer']);

    const [dps, healer] = result.playerBreakdown;
    expect(dps.totalDamage).toBe(600);
    expect(dps.damagePercentage).toBe(60);
    expect(dps.dps).toBeCloseTo(60);
    expect(dps.playerId).toBe('1');
    expect(healer.damagePercentage).toBe(40);
  });

  it('returns an empty, non-throwing result for a missing/empty payload', () => {
    expect(adaptDamageTable({}, 10_000)).toEqual({
      totalDamage: 0,
      dps: 0,
      playerBreakdown: [],
    });
    expect(adaptDamageTable({ data: { entries: [] } }, 0).dps).toBe(0);
  });
});

describe('fetchSummaryDamageTotals', () => {
  const makeClient = (damage: unknown): EsoLogsClient =>
    ({
      query: jest.fn().mockResolvedValue({
        reportData: { report: { damage } },
      }),
    }) as unknown as EsoLogsClient;

  it('aggregates a parsed JSON table payload', async () => {
    const client = makeClient(damagePayload);
    const result = await fetchSummaryDamageTotals({
      reportCode: 'abc',
      client,
      fightIds: [1, 2, 3],
      totalActiveDuration: 10_000,
    });

    expect(result.totalDamage).toBe(1000);
    expect(result.playerBreakdown).toHaveLength(2);
    // fightIDs (not a time range) scopes the aggregation to the summary's fights.
    expect((client.query as jest.Mock).mock.calls[0][0].variables).toMatchObject({
      code: 'abc',
      fightIDs: [1, 2, 3],
    });
  });

  it('tolerates a stringified JSON scalar', async () => {
    const client = makeClient(JSON.stringify(damagePayload));
    const result = await fetchSummaryDamageTotals({
      reportCode: 'abc',
      client,
      fightIds: [1],
      totalActiveDuration: 10_000,
    });
    expect(result.totalDamage).toBe(1000);
    expect(result.playerBreakdown).toHaveLength(2);
  });

  it('does not throw on a null payload', async () => {
    const client = makeClient(null);
    const result = await fetchSummaryDamageTotals({
      reportCode: 'abc',
      client,
      fightIds: [1],
      totalActiveDuration: 10_000,
    });
    expect(result).toEqual({ totalDamage: 0, dps: 0, playerBreakdown: [] });
  });
});
