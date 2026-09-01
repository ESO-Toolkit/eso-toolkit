jest.mock('./auth', () => ({
  clientIpFromHeaders: jest.fn(() => '127.0.0.1'),
  validateToken: jest.fn(async () => ({ id: 'user-1', name: 'Test User' })),
}));

jest.mock('./db/queries', () => {
  const actual = jest.requireActual<typeof import('./db/queries')>('./db/queries');
  return {
    ...actual,
    checkRosterCreateRateLimit: jest.fn(async () => true),
    createRoster: jest.fn(async () => undefined),
    getRosterById: jest.fn(),
    listRosters: jest.fn(),
  };
});

import { checkRosterCreateRateLimit, createRoster, getRosterById, listRosters } from './db/queries';
import type { Env } from './types';

import worker, { getCacheTier, notifyDiscordSync } from './index';

const mockedCheckRosterCreateRateLimit = jest.mocked(checkRosterCreateRateLimit);
const mockedCreateRoster = jest.mocked(createRoster);
const mockedGetRosterById = jest.mocked(getRosterById);
const mockedListRosters = jest.mocked(listRosters);

function createEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    AI: {} as Ai,
    ALLOWED_ORIGINS: 'https://app.example',
    IMGBB_API_KEY: 'image-key',
    ESOLOGS_CLIENT_ID: 'client-id',
    ESOLOGS_CLIENT_SECRET: 'client-secret',
    ...overrides,
  };
}

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil: jest.fn(),
    passThroughOnException: jest.fn(),
    props: {},
  } as unknown as ExecutionContext;
}

describe('roster cache consistency', () => {
  const cacheMatch = jest.fn(async () =>
    Promise.resolve(
      new Response(JSON.stringify({ rosters: [{ id: 'stale' }] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  const cacheDelete = jest.fn(async () => true);
  const cachePut = jest.fn(async () => undefined);

  beforeAll(() => {
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: {
        default: {
          delete: cacheDelete,
          match: cacheMatch,
          put: cachePut,
        },
      },
    });
  });

  beforeEach(() => {
    mockedCheckRosterCreateRateLimit.mockResolvedValue(true);
    mockedCreateRoster.mockResolvedValue(undefined);
    mockedGetRosterById.mockResolvedValue({ id: 'new-roster' } as never);
    mockedListRosters.mockResolvedValue([{ id: 'new-roster' }] as never);
  });

  it('bypasses stale edge entries and invalidates the collection after a successful create', async () => {
    expect(getCacheTier('/rosters')).toBeNull();
    expect(getCacheTier('/rosters/new-roster')).toBeNull();
    expect(getCacheTier('/rosters/new-roster/comments')).toBeNull();

    const env = createEnv();
    const executionContext = createExecutionContext();
    const createResponse = await worker.fetch(
      new Request('https://api.example/rosters', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer owner-token',
          'Content-Type': 'application/json',
          Origin: 'https://app.example',
        },
        body: JSON.stringify({
          title: 'Fresh roster',
          trial_id: 'vss',
          roster_data: 'YWJj',
        }),
      }),
      env,
      executionContext,
    );

    expect(createResponse.status).toBe(201);
    expect(mockedCreateRoster).toHaveBeenCalledTimes(1);
    const deletedUrls = cacheDelete.mock.calls.map(([request]) => (request as Request).url);
    expect(deletedUrls).toContain(
      'https://cache.internal/rest/rosters&_origin=https%3A%2F%2Fapp.example',
    );
    expect(deletedUrls).toContain('https://cache.internal/rest/rosters&_origin=_none');

    cacheMatch.mockClear();
    const readResponse = await worker.fetch(
      new Request('https://api.example/rosters'),
      env,
      executionContext,
    );

    expect(readResponse.status).toBe(200);
    expect(await readResponse.json()).toMatchObject({ rosters: [{ id: 'new-roster' }] });
    expect(mockedListRosters).toHaveBeenCalledTimes(1);
    expect(cacheMatch).not.toHaveBeenCalled();
    expect(readResponse.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('Discord roster sync', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('surfaces missing webhook configuration without making a request', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(notifyDiscordSync(createEnv(), 'roster-1')).resolves.toBe(false);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      '[discord-sync] disabled: missing DISCORD_BOT_URL, DISCORD_WEBHOOK_SECRET',
    );
  });

  it('authenticates webhook requests and reports a non-2xx response as failure', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('unavailable', { status: 503, statusText: 'Unavailable' }));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      notifyDiscordSync(
        createEnv({
          DISCORD_BOT_URL: 'https://discord-bot.example',
          DISCORD_WEBHOOK_SECRET: 'shared-secret',
        }),
        'roster-1',
      ),
    ).resolves.toBe(false);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://discord-bot.example/discord/roster/refresh',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer shared-secret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rosterId: 'roster-1' }),
      }),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      '[discord-sync] refresh rejected for roster roster-1: 503 Unavailable',
    );
  });
});
