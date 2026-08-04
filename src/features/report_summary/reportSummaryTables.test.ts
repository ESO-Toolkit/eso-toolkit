import { DeathAnalysisService, type DeathAnalysisInput } from '../../services/DeathAnalysisService';

import { adaptDamageTable, adaptDeathsTable, fetchSummaryTables } from './reportSummaryTables';

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

// Mirrors the live `table(dataType: Deaths, hostilityType: Friendlies)` shape
// (report F4f2bMwWtgVKxjB9). Each entry is one friendly death; `events[]` is the
// death recap (incoming damage to the victim), verified identical to the raw
// `DamageDone` stream subset to that victim. Exercises the cases that drive A8:
// single-hit, multi-hit 50ms sum, reflect, same-timestamp AoE isolation, plus a
// friendly-NPC death and a null-killingBlow death.
const deathsPayload = {
  data: {
    entries: [
      // Single lethal hit -> A8 = 6009 (the 6740/531 hits are >50ms earlier).
      {
        name: 'Necrofeell',
        id: 6,
        type: 'Necromancer',
        timestamp: 1629865,
        fight: 11,
        overkill: 1012,
        killingBlow: { guid: 174565, name: 'Frost Bolt', type: 16 },
        events: [
          {
            timestamp: 1629865,
            type: 'damage',
            sourceID: 124,
            sourceIsFriendly: false,
            targetID: 6,
            amount: 6009,
          },
          {
            timestamp: 1629773,
            type: 'damage',
            sourceID: 124,
            sourceIsFriendly: false,
            targetID: 6,
            amount: 6740,
          },
          {
            timestamp: 1629615,
            type: 'damage',
            sourceID: 123,
            sourceIsFriendly: false,
            targetID: 6,
            amount: 531,
          },
        ],
      },
      // Two players die at the SAME timestamp from the same mechanic — each death
      // must join only its own recap (no cross-contamination). A8 = avg(21225,16523).
      {
        name: 'Just Onyx',
        id: 7,
        type: 'Templar',
        timestamp: 1714055,
        fight: 11,
        overkill: 42450,
        killingBlow: { guid: 175503, name: 'Dreadsail Ascension', type: 32 },
        events: [
          {
            timestamp: 1714053,
            type: 'damage',
            sourceID: 127,
            sourceIsFriendly: false,
            targetID: 7,
            amount: 21225,
          },
        ],
      },
      {
        name: 'Static Shock Enjoyer',
        id: 5,
        type: 'Sorcerer',
        timestamp: 1714055,
        fight: 11,
        overkill: 33046,
        killingBlow: { guid: 175503, name: 'Dreadsail Ascension', type: 32 },
        events: [
          {
            timestamp: 1714053,
            type: 'damage',
            sourceID: 127,
            sourceIsFriendly: false,
            targetID: 5,
            amount: 16523,
          },
        ],
      },
      // A friendly NPC death: counted in totalDeaths (targetIsFriendly), excluded
      // from the player table (type stays 'NPC').
      {
        name: 'Storm Atronach',
        id: 200,
        type: 'NPC',
        timestamp: 1700000,
        fight: 11,
        overkill: 0,
        killingBlow: { guid: 999, name: 'Cleave', type: 1 },
        events: [
          {
            timestamp: 1700000,
            type: 'damage',
            sourceID: 127,
            sourceIsFriendly: false,
            targetID: 200,
            amount: 5000,
          },
        ],
      },
      // Multi-hit kill: the three hits within 50ms sum -> A8 = 18075.
      {
        name: 'Kars',
        id: 1,
        type: 'Arcanist',
        timestamp: 1984329,
        fight: 13,
        overkill: 0,
        killingBlow: { guid: 170048, name: 'Slash', type: 1 },
        events: [
          {
            timestamp: 1984273,
            type: 'damage',
            sourceID: 17,
            sourceIsFriendly: false,
            targetID: 1,
            amount: 12640,
          },
          {
            timestamp: 1984251,
            type: 'damage',
            sourceID: 25,
            sourceIsFriendly: false,
            targetID: 1,
            amount: 1130,
          },
          {
            timestamp: 1984231,
            type: 'damage',
            sourceID: 17,
            sourceIsFriendly: false,
            targetID: 1,
            amount: 4305,
          },
          {
            timestamp: 1983243,
            type: 'damage',
            sourceID: 17,
            sourceIsFriendly: false,
            targetID: 1,
            amount: 4305,
          },
        ],
      },
      // Killed by a 'reflect'-type event (present in the raw DamageDone stream) -> A8 = 17976.
      {
        name: 'Offline',
        id: 9,
        type: 'Arcanist',
        timestamp: 6087076,
        fight: 55,
        overkill: 4564,
        killingBlow: { guid: 170283, name: 'Spell Wall', type: 2 },
        events: [
          {
            timestamp: 6087076,
            type: 'reflect',
            sourceID: 108,
            sourceIsFriendly: false,
            targetID: 9,
            amount: 17976,
          },
          {
            timestamp: 6086984,
            type: 'reflect',
            sourceID: 108,
            sourceIsFriendly: false,
            targetID: 9,
            amount: 4055,
          },
        ],
      },
      // Null killingBlow must not crash; abilityGameID falls back to 0.
      {
        name: 'Tentaculaire',
        id: 99,
        type: 'Templar',
        timestamp: 6480546,
        fight: 57,
        overkill: 701,
        killingBlow: null,
        events: [
          {
            timestamp: 6480546,
            type: 'damage',
            sourceID: 200,
            sourceIsFriendly: false,
            targetID: 99,
            amount: 1622,
          },
        ],
      },
    ],
  },
};

const FIGHTS = [
  { id: 11, name: 'Tideborn Taleria', start: 1600000, end: 1750000 },
  { id: 13, name: 'Reef Guardian', start: 1950000, end: 2000000 },
  { id: 55, name: 'Lylanar', start: 6080000, end: 6100000 },
  { id: 57, name: 'Bow Breaker', start: 6470000, end: 6490000 },
];

/** Feed an adapted deaths payload through the (unchanged) analysis service. */
function analyze(payload: Parameters<typeof adaptDeathsTable>[0]) {
  const deaths = adaptDeathsTable(payload);
  const input: DeathAnalysisInput[] = FIGHTS.map((f) => ({
    deathEvents: deaths.deathEventsByFight.get(f.id) ?? [],
    damageEvents: deaths.recapDamageByFight.get(f.id) ?? [],
    resurrectEvents: [],
    fightId: f.id,
    fightName: f.name,
    fightStartTime: f.start,
    fightEndTime: f.end,
    actors: deaths.tableActors,
    abilities: deaths.tableAbilities,
    kill: true,
    isBoss: true,
  }));
  return { deaths, analysis: DeathAnalysisService.analyzeReportDeaths(input) };
}

describe('adaptDeathsTable', () => {
  it('synthesizes per-fight death + recap-damage inputs and normalizes actor/ability records', () => {
    const deaths = adaptDeathsTable(deathsPayload);

    // One death entry each, dropped to nothing malformed.
    expect(deaths.deathCount).toBe(7);
    // Fight 11 has four deaths (incl. the NPC); fight 13/55/57 one each.
    expect(deaths.deathEventsByFight.get(11)).toHaveLength(4);
    expect(deaths.deathEventsByFight.get(13)).toHaveLength(1);

    // Player class -> 'Player'; friendly NPC stays 'NPC'.
    expect(deaths.tableActors[6].type).toBe('Player');
    expect(deaths.tableActors[200].type).toBe('NPC');
    expect(deaths.tableActors[6].name).toBe('Necrofeell');

    // killingBlow.type is the damage-type bitmask used by the category chip.
    expect(deaths.tableAbilities[174565]).toMatchObject({ name: 'Frost Bolt', type: 16 });
    // Null killingBlow -> abilityGameID 0 with an "Unknown" placeholder name.
    expect(deaths.tableAbilities[0].name).toMatch(/Unknown Ability \(0\)/);

    // Synthesized death events carry overkill=0 (the raw stream has no amount),
    // and the killing ability id comes from killingBlow.guid.
    const f11 = deaths.deathEventsByFight.get(11)!;
    expect(f11.every((d) => d.amount === 0)).toBe(true);
    expect(f11.find((d) => d.targetID === 6)!.abilityGameID).toBe(174565);
  });

  it('reproduces the raw-event A8 killing-blow hit sizes exactly', () => {
    const { analysis } = analyze(deathsPayload);

    const a8 = (mechanicId: number) =>
      analysis.mechanicDeaths.find((m) => m.mechanicId === mechanicId)?.averageKillingBlowHitSize;

    // Single lethal hit.
    expect(a8(174565)).toBe(6009);
    // Multi-hit within 50ms: 12640 + 1130 + 4305.
    expect(a8(170048)).toBe(18075);
    // Reflect-type killing blow.
    expect(a8(170283)).toBe(17976);
    // Two same-timestamp deaths from one mechanic each join only their own recap.
    expect(a8(175503)).toBe((21225 + 16523) / 2);
    // Null-killingBlow death lands under id 0 and still computes its own hit size.
    expect(a8(0)).toBe(1622);
  });

  it('counts friendly deaths (incl. NPCs) in totalDeaths but only players in the player table', () => {
    const { analysis } = analyze(deathsPayload);

    // All 7 friendly-target deaths count; the player table excludes the NPC.
    expect(analysis.totalDeaths).toBe(7);
    expect(analysis.playerDeaths.map((p) => p.playerId).sort()).toEqual(
      ['1', '5', '6', '7', '9', '99'].sort(),
    );
  });

  it('keeps the overkill sub-text at 0 (raw deaths carry no amount) — no high-damage pattern', () => {
    const { analysis } = analyze(deathsPayload);

    expect(analysis.mechanicDeaths.every((m) => m.averageKillingBlowDamage === 0)).toBe(true);
    // The HIGH_DAMAGE_ABILITY pattern keys off averageKillingBlowDamage (>50k); with
    // it pinned at 0 the table path can never emit one (parity with the raw path).
    expect(analysis.deathPatterns.some((p) => p.type === 'HIGH_DAMAGE_ABILITY')).toBe(false);
  });

  it('drops malformed entries instead of throwing', () => {
    const result = adaptDeathsTable({
      data: {
        entries: [
          { id: 'not-a-number', fight: 1, timestamp: 1, killingBlow: { guid: 1 } },
          { id: 5, fight: 11, timestamp: 1714055, killingBlow: { guid: 175503 }, events: [] },
          null,
        ],
      },
    } as unknown as Parameters<typeof adaptDeathsTable>[0]);

    expect(result.deathCount).toBe(1);
    expect(result.deathEventsByFight.get(11)).toHaveLength(1);
  });

  it('returns an empty, non-throwing result for a missing/empty payload', () => {
    const empty = adaptDeathsTable({});
    expect(empty.deathCount).toBe(0);
    expect(empty.deathEventsByFight.size).toBe(0);
    expect(empty.tableActors).toEqual({});
  });
});

describe('fetchSummaryTables', () => {
  const makeClient = (damage: unknown, deaths: unknown): { query: jest.Mock } => ({
    query: jest.fn().mockResolvedValue({
      reportData: { report: { damage, deaths } },
    }),
  });

  it('aggregates both the damage leaderboard and the death analysis inputs', async () => {
    const client = makeClient(damagePayload, deathsPayload);
    const result = await fetchSummaryTables({
      reportCode: 'abc',

      client: client as any,
      fightIds: [11, 13, 55, 57],
      totalActiveDuration: 10_000,
    });

    expect(result.damage.totalDamage).toBe(1000);
    expect(result.damage.playerBreakdown).toHaveLength(2);
    expect(result.deaths?.deathCount).toBe(7);

    // fightIDs (not a time range) scopes the aggregation to the summary's fights.
    expect(client.query.mock.calls[0][0].variables).toMatchObject({
      code: 'abc',
      fightIDs: [11, 13, 55, 57],
    });
  });

  it('tolerates stringified JSON scalars on both tables', async () => {
    const client = makeClient(JSON.stringify(damagePayload), JSON.stringify(deathsPayload));
    const result = await fetchSummaryTables({
      reportCode: 'abc',

      client: client as any,
      fightIds: [11],
      totalActiveDuration: 10_000,
    });
    expect(result.damage.totalDamage).toBe(1000);
    expect(result.deaths?.deathCount).toBe(7);
  });

  it('returns deaths=null when the deaths alias is absent', async () => {
    const client = makeClient(damagePayload, null);
    const result = await fetchSummaryTables({
      reportCode: 'abc',

      client: client as any,
      fightIds: [1],
      totalActiveDuration: 10_000,
    });
    expect(result.damage.totalDamage).toBe(1000);
    expect(result.deaths).toBeNull();
  });

  it('returns deaths=null for an unparseable deaths scalar (so the hook can fall back, not show false Flawless)', async () => {
    const fetchWith = async (deaths: unknown) => {
      const client = makeClient(damagePayload, deaths);
      return fetchSummaryTables({
        reportCode: 'abc',

        client: client as any,
        fightIds: [1],
        totalActiveDuration: 10_000,
      });
    };

    // Empty string -> JSON.parse throws -> {} ; object missing data.entries.
    expect((await fetchWith('')).deaths).toBeNull();
    expect((await fetchWith('{ truncated')).deaths).toBeNull();
    expect((await fetchWith({ foo: 'bar' })).deaths).toBeNull();
    // A genuine zero-death report sends an empty entries ARRAY -> stays non-null
    // (deathCount 0) so it still correctly renders the flawless state.
    expect((await fetchWith({ data: { entries: [] } })).deaths?.deathCount).toBe(0);
  });
});
