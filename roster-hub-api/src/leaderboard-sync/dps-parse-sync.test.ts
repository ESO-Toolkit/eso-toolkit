import { selectTargets, syncDpsParses } from './dps-parse-sync';
import {
  fetchCharacterRankings,
  fetchRateLimitData,
  fetchTrialZones,
  getClientToken,
  type ZoneData,
} from './esologs-client';
import {
  getBlockedCharacterKeys,
  getSyncState,
  listStaleSyncTargets,
  pruneDpsParses,
  purgeBlockedDpsParses,
  recordSyncResult,
  upsertDpsParses,
} from '../db/dps-parse-queries';
import type { Env } from '../types';

jest.mock('./esologs-client', () => ({
  getClientToken: jest.fn(),
  fetchRateLimitData: jest.fn(),
  fetchTrialZones: jest.fn(),
  fetchCharacterRankings: jest.fn(),
}));

// The whole query layer is faked: these tests pin the ORCHESTRATION contract
// (what gets fetched, what gets written, what gets recorded), while the SQL
// shape those writes produce is pinned in ../db/dps-parse-queries.test.ts.
jest.mock('../db/dps-parse-queries', () => ({
  getBlockedCharacterKeys: jest.fn().mockResolvedValue(new Set()),
  getSyncState: jest.fn().mockResolvedValue(null),
  listStaleSyncTargets: jest.fn().mockResolvedValue([]),
  pruneDpsParses: jest.fn().mockResolvedValue(undefined),
  purgeBlockedDpsParses: jest.fn().mockResolvedValue(undefined),
  recordSyncResult: jest.fn().mockResolvedValue(undefined),
  upsertDpsParses: jest.fn().mockResolvedValue(0),
}));

const mockedFetchRankings = fetchCharacterRankings as jest.Mock;
const mockedFetchZones = fetchTrialZones as jest.Mock;
const mockedGetToken = getClientToken as jest.Mock;
const mockedRateLimit = fetchRateLimitData as jest.Mock;
const mockedListStale = listStaleSyncTargets as jest.Mock;

const env = { DB: {} } as unknown as Env;

const ZONES: ZoneData[] = [
  {
    id: 38,
    name: 'Lucent Citadel',
    encounters: [
      { id: 60, name: 'Xoryn' },
      { id: 57, name: 'Orphic' },
      { id: 58, name: 'Trash Gauntlet' }, // filtered as unranked
    ],
    difficulties: [{ id: 122, name: 'Veteran', sizes: [12] }],
    // Deliberately TWO partitions: the LATEST (last) one must win everywhere.
    partitions: [
      { id: 12, name: 'Old patch' },
      { id: 29, name: 'Current patch' },
    ],
  },
];

/** A gate-passing characterRankings page (real gear, positive DPS, full fight). */
function rankingsPage(): Record<string, unknown> {
  return {
    page: 1,
    hasMorePages: false,
    count: 1,
    rankings: [
      {
        name: 'Someone',
        class: 'Sorcerer',
        spec: 'StaminaDPS',
        amount: 50_000,
        duration: 600_000,
        startTime: 1_700_000_000_000,
        report: { code: 'abc123', fightID: 7 },
        server: { name: 'NA Megaserver', region: 'na' },
        gear: Array.from({ length: 14 }, (_, i) => ({ id: 100 + i, setID: '900' })),
        talents: Array.from({ length: 12 }, (_, i) => ({ id: 1000 + i })),
        sets: [{ id: 900, name: 'Some Set' }],
      },
    ],
  };
}

function makeTarget(encounterId: number, encounterName: string) {
  return {
    encounterId,
    encounterName,
    zoneId: 38,
    zoneName: 'Lucent Citadel',
    trialId: 'LC',
    difficulty: 122,
    difficultyName: 'Veteran',
    partitionId: 29,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetToken.mockResolvedValue('token');
  mockedRateLimit.mockResolvedValue(null);
  mockedFetchZones.mockResolvedValue(ZONES);
  mockedFetchRankings.mockResolvedValue(rankingsPage());
  // clearAllMocks does NOT clear implementations set inside a test body —
  // without this re-seed, a test's custom sync-state leaks into later tests.
  (getSyncState as jest.Mock).mockResolvedValue(null);
});

describe('selectTargets', () => {
  // THE regression pin for empty-streak handling: the code filtered skipped
  // targets out entirely, so a boss past EMPTY_STREAK_LIMIT could NEVER recover
  // even when a new patch gave it rankings — despite the comment promising it
  // was "dropped to the back".
  it('demotes high-empty-streak targets to the back instead of removing them', async () => {
    mockedListStale.mockResolvedValue([
      { encounter_id: 60, difficulty: 122, empty_streak: 5 }, // over the limit
      { encounter_id: 57, difficulty: 122, empty_streak: 0 },
    ]);

    const targets = [makeTarget(60, 'Xoryn'), makeTarget(57, 'Orphic')];
    const picked = await selectTargets(env, targets, {});

    // All targets survive...
    expect(picked.map((t) => t.encounterId)).toEqual([57, 60]);
    // ...with the streaked one LAST rather than absent.
    expect(picked.at(-1)?.encounterId).toBe(60);
  });

  it('still prioritises never-synced targets ahead of ranked-back ones', async () => {
    mockedListStale.mockResolvedValue([
      { encounter_id: 60, difficulty: 122, empty_streak: 5 },
      { encounter_id: 57, difficulty: 122, empty_streak: 0 },
    ]);

    const targets = [makeTarget(60, 'Xoryn'), makeTarget(99, 'Brand New Boss')];
    const picked = await selectTargets(env, targets, {});

    expect(picked.map((t) => t.encounterId)).toEqual([99, 60]);
  });
});

describe('syncDpsParses', () => {
  // Real partition values: -1 was hardcoded into every row, so the upsert's
  // `excluded.partition >` supersede guard could never distinguish patch
  // generations and the API was queried without a pinned partition.
  it('threads the zone latest partition into the API call and the stored rows', async () => {
    const results = await syncDpsParses(env, { encounterId: 60 });
    expect(results[0].status).toBe('ok');

    expect(mockedFetchRankings).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({ encounterId: 60, partition: 29 }),
    );

    const [, rows] = (upsertDpsParses as jest.Mock).mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0].partition).toBe(29);
  });

  it('purges blocklisted characters once per run', async () => {
    const blocked = new Set(['blockedkey1']);
    (getBlockedCharacterKeys as jest.Mock).mockResolvedValue(blocked);

    await syncDpsParses(env, { encounterId: 60 });

    expect(purgeBlockedDpsParses).toHaveBeenCalledWith(env.DB, blocked);
  });

  // An errored encounter must neither reset its empty streak nor look freshly
  // synced — recordSyncResult preserves last_synced_at for 'error' (pinned at
  // the SQL level in dps-parse-queries.test.ts); here we pin that the CALLER
  // carries the prior streak through instead of zeroing it.
  it('preserves the empty streak when an encounter errors', async () => {
    mockedFetchRankings.mockRejectedValue(new Error('upstream 500'));
    (getSyncState as jest.Mock).mockResolvedValue({
      encounter_id: 60,
      difficulty: 122,
      empty_streak: 4,
    });

    const results = await syncDpsParses(env, { encounterId: 60 });
    expect(results[0].status).toBe('error');
    expect(results[0].detail).toContain('upstream 500');

    expect(recordSyncResult as jest.Mock).toHaveBeenCalledWith(
      env.DB,
      expect.objectContaining({ status: 'error', emptyStreak: 4 }),
    );
    // A failed pass never ingested anything, so nothing was written or pruned.
    expect(upsertDpsParses as jest.Mock).not.toHaveBeenCalled();
    expect(pruneDpsParses as jest.Mock).not.toHaveBeenCalled();
  });

  // THE regression pin for the Codex P1 review finding: pruning used to run
  // only when rows were ingested, so an encounter whose rankings dried up was
  // never subjected to the scoped stale DELETE and its stored rows lived on
  // indefinitely. Empty syncs must prune too.
  it('prunes even when a successful sync returns no rows', async () => {
    mockedFetchRankings.mockResolvedValue({
      page: 1,
      hasMorePages: false,
      count: 0,
      rankings: [],
    });

    const results = await syncDpsParses(env, { encounterId: 60 });
    expect(results[0].status).toBe('empty');

    expect(upsertDpsParses as jest.Mock).not.toHaveBeenCalled();
    expect(pruneDpsParses as jest.Mock).toHaveBeenCalledWith(env.DB, 60, 122, 400, 60, 40);
  });

  /**
   * THE regression pin for per-class starvation. A global top-N is winner-take-all:
   * on a Necromancer/Arcanist meta the live board held 201 rows with Dragonknight
   * on 5 and Sorcerer on 4, both below the frontend's clustering minimum. The
   * ingest must ask for one board PER CLASS so every class gets a real top-N.
   */
  it('fetches one ranking board per class', async () => {
    await syncDpsParses(env, { encounterId: 60 });

    const requested = mockedFetchRankings.mock.calls.map(([, params]) => params.className);
    expect(requested).toEqual([
      'Arcanist',
      'DragonKnight',
      'Necromancer',
      'Nightblade',
      'Sorcerer',
      'Templar',
      'Warden',
    ]);
  });

  /**
   * `className` is an unvalidated String upstream, so a rejected value returns the
   * UNFILTERED global board rather than an error. Without this guard we would
   * store seven copies of the same top parses and the starvation would survive
   * the fix while looking like it had been applied.
   */
  it('drops entries that do not belong to the class board they came from', async () => {
    mockedFetchRankings.mockResolvedValue(rankingsPage()); // always Sorcerer

    const results = await syncDpsParses(env, { encounterId: 60 });

    const [, rows] = (upsertDpsParses as jest.Mock).mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0].eso_class).toBe('Sorcerer');
    expect(results[0].detail).toMatch(/failed the class filter/);
  });

  /**
   * Splitting one fetch into seven multiplied the chance a target hits a
   * transient upstream error. Losing the whole boss because one class board
   * blipped would be a regression — the six that succeeded must still land.
   */
  it('keeps the boards that succeeded when one class board fails', async () => {
    mockedFetchRankings.mockImplementation((_token: string, params: { className: string }) => {
      if (params.className === 'Necromancer') return Promise.reject(new Error('upstream 503'));
      const page = rankingsPage();
      (page.rankings as Array<Record<string, unknown>>)[0].class = params.className;
      (page.rankings as Array<Record<string, unknown>>)[0].name = `Player ${params.className}`;
      return Promise.resolve(page);
    });

    const results = await syncDpsParses(env, { encounterId: 60 });

    expect(results[0].status).toBe('ok');
    expect(results[0].detail).toMatch(/1\/7 class boards failed/);
    const [, rows] = (upsertDpsParses as jest.Mock).mock.calls[0];
    expect(rows).toHaveLength(6);
    expect(rows.map((row: { eso_class: string }) => row.eso_class)).not.toContain('Necromancer');
  });

  /** A total wipeout is an outage, not a boss without rankings — and must retry. */
  it('records an error, with the cause, when every class board fails', async () => {
    mockedFetchRankings.mockRejectedValue(new Error('upstream 500'));

    const results = await syncDpsParses(env, { encounterId: 60 });

    expect(results[0].status).toBe('error');
    expect(results[0].detail).toContain('upstream 500');
    expect(upsertDpsParses as jest.Mock).not.toHaveBeenCalled();
  });

  /**
   * The table's PK is (encounter_id, difficulty, character_key). Two statements
   * writing the same PK inside one db.batch() resolve last-writer-wins, so the
   * same character surfacing on two boards must collapse before the upsert.
   */
  it('collapses one character appearing on two class boards into a single row', async () => {
    mockedFetchRankings.mockImplementation((_token: string, params: { className: string }) => {
      const page = rankingsPage();
      // Same name+region => same character_key, but labelled as whichever board
      // asked, so both survive the class-match guard.
      (page.rankings as Array<Record<string, unknown>>)[0].class = params.className;
      return Promise.resolve(page);
    });

    await syncDpsParses(env, { encounterId: 60 });

    const [, rows] = (upsertDpsParses as jest.Mock).mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(new Set(rows.map((row: { character_key: string }) => row.character_key)).size).toBe(1);
  });
});
