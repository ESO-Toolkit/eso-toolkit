import {
  MAX_PARSE_LIMIT,
  MAX_PARSE_OFFSET,
  listDpsParses,
  parseParseId,
  toParseId,
} from './dps-parse-queries';

/**
 * Minimal D1 stand-in that records the SQL and bindings each call produces.
 *
 * This asserts the query BUILDER — which WHERE conditions are emitted, and that
 * limits are clamped. Exercising real SQL would need miniflare; the branch logic
 * is what regresses, and this covers it without a second toolchain.
 */
interface Captured {
  sql: string;
  bindings: unknown[];
}

function createFakeD1(rows: unknown[] = [], total = 0): { db: D1Database; calls: Captured[] } {
  const calls: Captured[] = [];

  const db = {
    prepare(sql: string) {
      const call: Captured = { sql, bindings: [] };
      calls.push(call);
      const statement = {
        bind(...bindings: unknown[]) {
          call.bindings = bindings;
          return statement;
        },
        all: async () => ({ results: rows }),
        first: async () => ({ total }),
        run: async () => ({}),
      };
      return statement;
    },
    batch: async () => [],
  } as unknown as D1Database;

  return { db, calls };
}

/** The SELECT (not the COUNT) is the one whose LIMIT/OFFSET we care about. */
function selectCall(calls: Captured[]): Captured {
  const call = calls.find((c) => c.sql.includes('SELECT * FROM dps_parses'));
  if (!call) throw new Error('no select statement captured');
  return call;
}

describe('parse ids', () => {
  const row = { encounter_id: 60, difficulty: 122, character_key: 'abc123def4567890' };

  it('round-trips', () => {
    expect(parseParseId(toParseId(row))).toEqual({
      encounterId: 60,
      difficulty: 122,
      characterKey: 'abc123def4567890',
    });
  });

  it('handles the negative difficulty sentinel', () => {
    const id = toParseId({ ...row, difficulty: -1 });
    expect(parseParseId(id)?.difficulty).toBe(-1);
  });

  it('rejects malformed ids instead of guessing', () => {
    expect(parseParseId('nonsense')).toBeNull();
    expect(parseParseId('60-122')).toBeNull();
    expect(parseParseId('60-122-NOTHEX')).toBeNull();
    expect(parseParseId('')).toBeNull();
  });
});

describe('listDpsParses', () => {
  it('filters by encounter and difficulty', async () => {
    const { db, calls } = createFakeD1();
    await listDpsParses(db, { encounterId: 60, difficulty: 122 });

    const call = selectCall(calls);
    expect(call.sql).toContain('encounter_id = ?');
    expect(call.sql).toContain('difficulty = ?');
    expect(call.bindings.slice(0, 2)).toEqual([60, 122]);
  });

  it('filters by class alone for the per-class tab', async () => {
    const { db, calls } = createFakeD1();
    await listDpsParses(db, { esoClass: 'Arcanist' });

    const call = selectCall(calls);
    expect(call.sql).toContain('eso_class = ?');
    expect(call.sql).not.toContain('encounter_id = ?');
    expect(call.bindings[0]).toBe('Arcanist');
  });

  // Difficulty alone is meaningless — it must not silently become the only filter.
  it('ignores difficulty when no encounter is given', async () => {
    const { db, calls } = createFakeD1();
    await listDpsParses(db, { esoClass: 'Warden', difficulty: 122 });

    expect(selectCall(calls).sql).not.toContain('difficulty = ?');
  });

  it('combines encounter and class filters', async () => {
    const { db, calls } = createFakeD1();
    await listDpsParses(db, { encounterId: 60, esoClass: 'Sorcerer' });

    const call = selectCall(calls);
    expect(call.sql).toContain('encounter_id = ?');
    expect(call.sql).toContain('eso_class = ?');
  });

  it('supports the signature filter for "who else runs this build"', async () => {
    const { db, calls } = createFakeD1();
    await listDpsParses(db, { encounterId: 60, signatureHash: 'deadbeefdeadbeef' });

    expect(selectCall(calls).sql).toContain('signature_hash = ?');
  });

  it('clamps limit and offset so no request can scan the table', async () => {
    const { db, calls } = createFakeD1();
    await listDpsParses(db, { encounterId: 60, limit: 100_000, offset: 999_999 });

    const bindings = selectCall(calls).bindings;
    expect(bindings.slice(-2)).toEqual([MAX_PARSE_LIMIT, MAX_PARSE_OFFSET]);
  });

  it('floors limit and offset at sane minimums', async () => {
    const { db, calls } = createFakeD1();
    await listDpsParses(db, { encounterId: 60, limit: -5, offset: -20 });

    const bindings = selectCall(calls).bindings;
    expect(bindings.slice(-2)).toEqual([1, 0]);
  });

  it('sorts by amount by default and by recency on request', async () => {
    const byAmount = createFakeD1();
    await listDpsParses(byAmount.db, { encounterId: 60 });
    expect(selectCall(byAmount.calls).sql).toContain('ORDER BY amount DESC');

    const byRecent = createFakeD1();
    await listDpsParses(byRecent.db, { encounterId: 60, sort: 'recent' });
    expect(selectCall(byRecent.calls).sql).toContain('ORDER BY updated_at DESC');
  });

  it('never exposes combatant_json or the dedupe key', async () => {
    const row = {
      encounter_id: 60,
      difficulty: 122,
      character_key: 'abc123def4567890',
      character_name: 'Someone',
      report_code: 'RepOrt123',
      fight_id: 7,
      amount: 120_000,
      build_json: '{"v":1}',
      combatant_json: '{"gear":[]}',
      signature_version: 1,
      evidence_enriched: 0,
    };
    const { db } = createFakeD1([row], 1);

    const { parses } = await listDpsParses(db, { encounterId: 60 });
    const [parse] = parses;

    expect(parse).not.toHaveProperty('combatant_json');
    expect(parse).not.toHaveProperty('character_key');
    expect(parse).not.toHaveProperty('build_json');
    expect(parse.build).toEqual({ v: 1 });
    expect(parse.character_label).toBe('Someone');
    // Attribution back to the source log is required, not optional.
    expect(parse.source_url).toBe('https://www.esologs.com/reports/RepOrt123#fight=7');
  });

  it('serves a row with a corrupt signature rather than failing the page', async () => {
    const { db } = createFakeD1(
      [
        {
          encounter_id: 60,
          difficulty: 122,
          character_key: 'k',
          character_name: 'X',
          report_code: 'c',
          fight_id: 1,
          amount: 1,
          build_json: 'not json',
          combatant_json: null,
          signature_version: 1,
          evidence_enriched: 0,
        },
      ],
      1,
    );

    const { parses } = await listDpsParses(db, { encounterId: 60 });
    expect(parses).toHaveLength(1);
    expect(parses[0].build).toBeNull();
  });
});
