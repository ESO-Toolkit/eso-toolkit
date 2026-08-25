import {
  MAX_PARSE_LIMIT,
  MAX_PARSE_OFFSET,
  listDpsParses,
  parseParseId,
  pruneDpsParses,
  purgeBlockedDpsParses,
  recordSyncResult,
  toParseId,
  upsertDpsParses,
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
      // Carried on the statement so batch() can attribute its members back to
      // their prepare() calls in issue order.
      const statement = {
        bind(...bindings: unknown[]) {
          call.bindings = bindings;
          return statement;
        },
        __call: call,
        all: async () => ({ results: rows }),
        first: async () => ({ total }),
        run: async () => ({}),
      };
      return statement;
    },
    // Statements are captured at prepare() time in issue order, so a batch's
    // members are already in `calls` — batch itself needs no extra bookkeeping.
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

// ─── Upsert / prune integrity ────────────────────────────────────────────────

/** Minimal valid insert row; only the columns the upsert guard reads matter. */
function insertRow(overrides: Record<string, unknown> = {}): Parameters<typeof upsertDpsParses>[1][number] {
  return {
    encounter_id: 60,
    difficulty: 122,
    zone_id: 38,
    trial_id: 'LC',
    encounter_name: 'Xoryn',
    hard_mode_level: null,
    partition: 29,
    character_key: 'abc123def4567890',
    character_name: 'Someone',
    eso_class: 'Sorcerer',
    spec_name: 'StaminaDPS',
    race: null,
    server_region: 'na',
    server_name: null,
    guild_name: null,
    report_code: 'RepOrt123',
    fight_id: 7,
    rank: 1,
    amount: 50_000,
    duration_ms: 600_000,
    log_start_ms: null,
    log_date: null,
    bracket_data: null,
    set1_id: null,
    set2_id: null,
    monster_id: null,
    mythic_id: null,
    arena_set_id: null,
    mundus_id: null,
    food_ability_id: null,
    signature_hash: 'deadbeefdeadbeef',
    build_json: '{}',
    combatant_json: '{}',
    signature_version: 2,
    ...overrides,
  } as Parameters<typeof upsertDpsParses>[1][number];
}

describe('upsertDpsParses', () => {
  // THE critical regression pin: with a strict `excluded.amount >` guard an
  // identical re-sync skipped DO UPDATE entirely, `updated_at` froze at the
  // first-seen timestamp, and the stale DELETE purged still-ranked rows after
  // 60 days. The guard must let equal amounts through so the rewrite refreshes
  // updated_at (ingested_at is not in the DO UPDATE column list, so first-seen
  // semantics are preserved).
  it('re-syncs identical data so a row survives the 60-day prune', async () => {
    const { db, calls } = createFakeD1();
    await upsertDpsParses(db, [insertRow()]);

    const upsert = calls[0];
    expect(upsert.sql).toContain('ON CONFLICT');
    // `>=`, not `>`: equal amounts must reach the DO UPDATE branch.
    expect(upsert.sql).toContain('excluded.amount >= dps_parses.amount');
    // The DO UPDATE itself stamps updated_at unconditionally...
    expect(upsert.sql).toContain("updated_at = datetime('now')");
    // ...and never touches ingested_at.
    expect(upsert.sql).not.toContain('ingested_at =');

    // End-to-end shape of the pin: re-ingesting the SAME row twice issues two
    // identical statements, both of which satisfy the WHERE guard — so after
    // "60 days" of identical nightly re-syncs, no prune can eat the row.
    const first = await upsertDpsParses(db, [insertRow()]);
    expect(first).toBe(1);
    expect(calls.filter((c) => c.sql.includes('ON CONFLICT'))).toHaveLength(2);
  });
});

describe('pruneDpsParses', () => {
  it('scopes the stale DELETE to the same encounter and difficulty as the top-N prune', async () => {
    const { db, calls } = createFakeD1();
    await pruneDpsParses(db, 60, 122, 200);

    // batch members are appended after prepare-time capture, in issue order.
    const deletes = calls.filter((c) => c.sql.includes('DELETE FROM dps_parses'));
    expect(deletes).toHaveLength(2);

    const [topN, stale] = deletes;
    expect(topN.bindings.slice(0, 2)).toEqual([60, 122]);

    // The stale sweep was originally GLOBAL (`WHERE updated_at < ...` only),
    // letting one encounter's prune pass delete aged rows from every other
    // encounter's leaderboard. It must be scoped identically to the top-N cut.
    expect(stale.sql).toContain('encounter_id = ?1');
    expect(stale.sql).toContain('difficulty = ?2');
    expect(stale.sql).toContain("updated_at < datetime('now', ?3)");
    expect(stale.bindings).toEqual([60, 122, '-60 days']);
  });

  it('keeps ingested_at untouched by both DELETE statements', async () => {
    const { db, calls } = createFakeD1();
    await pruneDpsParses(db, 60, 122, 200);
    calls
      .filter((c) => c.sql.includes('DELETE FROM dps_parses'))
      .forEach((c) => expect(c.sql).not.toContain('ingested_at'));
  });
});

describe('purgeBlockedDpsParses', () => {
  it('is a no-op for an empty blocklist', async () => {
    const { db, calls } = createFakeD1();
    await purgeBlockedDpsParses(db, new Set());
    expect(calls).toHaveLength(0);
  });

  it('deletes every blocked key via IN (...) lists', async () => {
    const { db, calls } = createFakeD1();
    const keys = new Set(['aaa', 'bbb', 'ccc']);
    await purgeBlockedDpsParses(db, keys);

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain('DELETE FROM dps_parses WHERE character_key IN (?, ?, ?)');
    expect(calls[0].bindings).toEqual(['aaa', 'bbb', 'ccc']);
  });

  it('chunks large blocklists across D1 parameter limits', async () => {
    const { db, calls } = createFakeD1();
    const keys = new Set(Array.from({ length: 95 }, (_, i) => `key${i}`));
    await purgeBlockedDpsParses(db, keys);

    expect(calls.length).toBeGreaterThan(1);
    expect(calls[0].sql.match(/\?/g)?.length).toBeLessThanOrEqual(90);
    // No key lost between chunks.
    const bound = calls.flatMap((c) => c.bindings);
    expect(new Set(bound)).toEqual(keys);
  });
});

describe('recordSyncResult', () => {
  const baseState = {
    encounterId: 60,
    difficulty: 122,
    encounterName: 'Xoryn',
    zoneId: 38,
    lastPage: 1,
    error: '',
    rowsIngested: 100,
    emptyStreak: 0,
  };

  // An errored encounter must NOT look freshly synced, or it drops out of the
  // stalest-first queue for a full rotation and its outage goes unseen.
  it('preserves last_synced_at when status is error', async () => {
    const { db, calls } = createFakeD1();
    await recordSyncResult(db, { ...baseState, status: 'error' });

    expect(calls[0].sql).toMatch(
      /CASE WHEN excluded\.last_status = 'error'\s+THEN dps_parse_sync_state\.last_synced_at/,
    );
  });

  it('stamps last_synced_at normally for ok/empty runs', async () => {
    for (const status of ['ok', 'empty']) {
      const { db, calls } = createFakeD1();
      await recordSyncResult(db, { ...baseState, status });
      // The CASE's ELSE branch is the normal fresh-stamp path.
      expect(calls[0].sql).toContain('ELSE excluded.last_synced_at END');
    }
  });
});
