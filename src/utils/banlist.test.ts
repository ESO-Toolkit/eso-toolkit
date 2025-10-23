jest.mock('./envUtils', () => ({
  getEnvVar: jest.fn(),
}));

import { checkUserBan, clearBanlistCache, DEFAULT_BAN_REASON } from './banlist';
import { getEnvVar } from './envUtils';

type MockResponse = Partial<Response> & {
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

const createJsonResponse = (data: unknown): Response =>
  ({
    ok: true,
    json: async () => data,
  }) as MockResponse as Response;

const createTextResponse = (data: string): Response =>
  ({
    ok: true,
    text: async () => data,
  }) as MockResponse as Response;

const originalFetch = globalThis.fetch;
const mockGetEnvVar = getEnvVar as jest.MockedFunction<typeof getEnvVar>;

describe('banlist utility', () => {
  beforeEach(() => {
    mockGetEnvVar.mockReset();
    clearBanlistCache();
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn();
  });

  afterAll(() => {
    if (originalFetch) {
      (globalThis as unknown as { fetch: typeof originalFetch }).fetch = originalFetch;
    } else {
      delete (globalThis as { fetch?: typeof fetch }).fetch;
    }
  });

  it('returns not banned when gist id is missing', async () => {
    mockGetEnvVar.mockReturnValue(undefined);
    const mockFetch = globalThis.fetch as jest.Mock;

    const result = await checkUserBan({ id: 42, name: 'Test User' });

    expect(result.isBanned).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('matches users by numeric id', async () => {
    mockGetEnvVar.mockReturnValue('gist-id');
    const mockFetch = globalThis.fetch as jest.Mock;

    mockFetch.mockResolvedValueOnce(
      createJsonResponse({
        files: {
          'banlist.json': {
            filename: 'banlist.json',
            raw_url: 'https://gist.githubusercontent.com/example/raw/banlist.json',
            truncated: false,
            content: JSON.stringify({
              bannedUsers: [{ id: 12345, reason: 'Manual ban' }, { name: 'otherUser' }],
            }),
          },
        },
      }),
    );

    const result = await checkUserBan({ id: 12345, name: 'Allowed' });

    expect(result).toEqual({ isBanned: true, reason: 'Manual ban' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('matches users by display name strings and caches the result', async () => {
    mockGetEnvVar.mockReturnValue('gist-id');
    const mockFetch = globalThis.fetch as jest.Mock;

    mockFetch.mockResolvedValueOnce(
      createJsonResponse({
        files: {
          'entries.json': {
            filename: 'entries.json',
            raw_url: 'https://gist.githubusercontent.com/example/raw/entries.json',
            truncated: false,
            content: JSON.stringify(['@testuser']),
          },
        },
      }),
    );

    const first = await checkUserBan({
      id: 88,
      name: 'TestUser',
      naDisplayName: '@TestUser',
    });

    expect(first.isBanned).toBe(true);
    expect(first.reason).toBe(DEFAULT_BAN_REASON);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const second = await checkUserBan({ id: 99, euDisplayName: '@testuser' });
    expect(second.isBanned).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fetches raw content when gist file is truncated', async () => {
    mockGetEnvVar.mockReturnValue('gist-id');
    const mockFetch = globalThis.fetch as jest.Mock;

    mockFetch
      .mockResolvedValueOnce(
        createJsonResponse({
          files: {
            'banlist.json': {
              filename: 'banlist.json',
              raw_url: 'https://gist.githubusercontent.com/example/raw/banlist.json',
              truncated: true,
            },
          },
        }),
      )
      .mockResolvedValueOnce(createTextResponse(JSON.stringify([{ name: 'blocked' }])));

    const result = await checkUserBan({ name: 'blocked' });

    expect(result.isBanned).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns not banned when no entries match', async () => {
    mockGetEnvVar.mockReturnValue('gist-id');
    const mockFetch = globalThis.fetch as jest.Mock;

    mockFetch.mockResolvedValueOnce(
      createJsonResponse({
        files: {
          'banlist.json': {
            filename: 'banlist.json',
            raw_url: 'https://gist.githubusercontent.com/example/raw/banlist.json',
            truncated: false,
            content: JSON.stringify({ bannedUsers: [{ id: 999 }] }),
          },
        },
      }),
    );

    const result = await checkUserBan({ id: 1, name: 'SafeUser' });

    expect(result.isBanned).toBe(false);
  });
});
