import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscordApiError } from '../discord';
import type { Env } from '../types';
import {
  cleanupUncommittedDiscordMutation,
  finishPendingMessageCleanup,
  mintDirectRosterId,
  refreshRoster,
  resolvePublishTarget,
  summarizeRefreshResults,
} from './publish';
import type { GuildConfig, RosterMapping } from './types';

const discordMocks = vi.hoisted(() => ({
  createChannel: vi.fn(),
  deleteChannel: vi.fn(),
  deleteMessage: vi.fn(),
  editMessage: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('../discord.js', async () => {
  const actual = await vi.importActual<typeof import('../discord')>('../discord');
  return {
    ...actual,
    createChannel: discordMocks.createChannel,
    deleteChannel: discordMocks.deleteChannel,
    deleteMessage: discordMocks.deleteMessage,
    editMessage: discordMocks.editMessage,
    sendMessage: discordMocks.sendMessage,
  };
});

const mapping: RosterMapping = {
  rosterId: 'roster-1',
  guildId: 'guild-1',
  channelId: 'channel-1',
  messageId: 'message-current',
  cleanupPendingMessageIds: ['message-old-1', 'message-old-2'],
  ownerUserId: 'owner-1',
  createdAt: '2026-08-30T12:00:00.000Z',
  updatedAt: '2026-08-30T12:00:00.000Z',
};

function makeEnv() {
  const put = vi.fn().mockResolvedValue(undefined);
  return {
    env: { ROSTERS: { put } } as unknown as Env,
    put,
  };
}

async function encodeRoster(obj: unknown): Promise<string> {
  const json = JSON.stringify(obj);
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  void writer.write(new TextEncoder().encode(json));
  void writer.close();
  const compressed = new Uint8Array(await new Response(stream.readable).arrayBuffer());
  let binary = '';
  for (const byte of compressed) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeRefreshEnv(rosterData: string, config?: GuildConfig) {
  const directRosterId = 'direct-test-roster';
  const directMapping: RosterMapping = {
    ...mapping,
    rosterId: directRosterId,
  };
  const values = new Map<string, string>([
    [`roster-data:${directRosterId}`, rosterData],
    [`roster-map:${directMapping.guildId}:${directRosterId}`, JSON.stringify(directMapping)],
  ]);
  if (config) values.set(`guild-config:${directMapping.guildId}`, JSON.stringify(config));

  const get = vi.fn(async (key: string) => values.get(key) ?? null);
  const put = vi.fn(async (key: string, value: string) => {
    values.set(key, value);
  });
  const list = vi.fn(async ({ prefix = '' }: { prefix?: string }) => ({
    keys: [...values.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })),
    list_complete: true,
  }));
  const coordinatorFetch = vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    if (path === '/acquire') return Response.json({ acquired: true });
    if (path === '/renew') return Response.json({ renewed: true });
    return Response.json({ released: true });
  });
  const env = {
    ROSTERS: { get, put, delete: vi.fn(), list },
    ROSTER_COORDINATOR: {
      idFromName: vi.fn((name: string) => name),
      get: vi.fn(() => ({ fetch: coordinatorFetch })),
    },
    ROSTER_HUB_API_URL: 'https://hub.invalid',
  } as unknown as Env;

  return { directMapping, directRosterId, env, list, values };
}

const baseConfig = (overrides: Partial<GuildConfig> = {}): GuildConfig => ({
  guildId: '123456789012345678',
  namePattern: '{day-short}-{time}-{trial}',
  ...overrides,
});

describe('resolvePublishTarget', () => {
  it('creates a new channel when no default channel is configured', () => {
    expect(resolvePublishTarget(baseConfig())).toEqual({ mode: 'create' });
  });

  it('posts into the configured default channel when set to a valid snowflake', () => {
    const target = resolvePublishTarget(baseConfig({ defaultChannelId: '987654321098765432' }));
    expect(target).toEqual({ mode: 'existing', channelId: '987654321098765432' });
  });

  it('falls back to creating a channel when the default channel is not a snowflake', () => {
    expect(resolvePublishTarget(baseConfig({ defaultChannelId: 'not-an-id' }))).toEqual({
      mode: 'create',
    });
  });

  it('falls back to creating a channel when the default channel is an empty string', () => {
    expect(resolvePublishTarget(baseConfig({ defaultChannelId: '' }))).toEqual({ mode: 'create' });
  });
});

describe('mintDirectRosterId', () => {
  it('keeps the direct- prefix and a KV-key-safe, length-bounded id', () => {
    const id = mintDirectRosterId();
    expect(id.startsWith('direct-')).toBe(true);
    expect(id.length).toBeLessThanOrEqual(64);
    expect(/^[a-zA-Z0-9_-]+$/.test(id)).toBe(true);
  });

  it('mints a full 32-hex-char (128-bit) suffix with no truncation', () => {
    const suffix = mintDirectRosterId().split('-').at(-1) ?? '';
    expect(suffix).toMatch(/^[0-9a-f]{32}$/);
  });

  it('does not collide across many mints', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => mintDirectRosterId()));
    expect(ids.size).toBe(1000);
  });
});

describe('roster publish transaction safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('journals superseded messages that Discord could not delete', async () => {
    const { env, put } = makeEnv();
    discordMocks.deleteMessage
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('transient failure'));

    const result = await finishPendingMessageCleanup(env, mapping);

    expect(result).toMatchObject({
      ok: false,
      mapping: { cleanupPendingMessageIds: ['message-old-2'] },
    });
    expect(put).toHaveBeenCalledOnce();
    expect(JSON.parse(put.mock.calls[0]![1] as string)).toMatchObject({
      cleanupPendingMessageIds: ['message-old-2'],
    });
  });

  it('treats an explicitly missing Discord message as completed cleanup', async () => {
    const { env, put } = makeEnv();
    discordMocks.deleteMessage
      .mockRejectedValueOnce(new DiscordApiError(404, 'DELETE', '/redacted', 10_008))
      .mockResolvedValueOnce(undefined);

    const result = await finishPendingMessageCleanup(env, mapping);

    expect(result.ok).toBe(true);
    expect(result.mapping.cleanupPendingMessageIds).toBeUndefined();
    expect(JSON.parse(put.mock.calls[0]![1] as string)).not.toHaveProperty(
      'cleanupPendingMessageIds',
    );
  });

  it('compensates newly posted messages when their mapping was not committed', async () => {
    const { env } = makeEnv();
    discordMocks.deleteMessage.mockResolvedValue(undefined);

    await cleanupUncommittedDiscordMutation(env, {
      ok: true,
      channelId: 'channel-1',
      messageId: 'message-new-1',
      postedMessageIds: ['message-new-1', 'message-new-2'],
    });

    expect(discordMocks.deleteMessage.mock.calls).toEqual([
      [env, 'channel-1', 'message-new-1'],
      [env, 'channel-1', 'message-new-2'],
    ]);
    expect(discordMocks.deleteChannel).not.toHaveBeenCalled();
  });

  it('compensates a newly created channel as one Discord artifact', async () => {
    const { env } = makeEnv();
    discordMocks.deleteChannel.mockResolvedValue(undefined);

    await cleanupUncommittedDiscordMutation(env, {
      ok: true,
      channelId: 'channel-new',
      messageId: 'message-new',
      createdChannel: true,
      postedMessageIds: ['message-new'],
    });

    expect(discordMocks.deleteChannel).toHaveBeenCalledWith(env, 'channel-new');
    expect(discordMocks.deleteMessage).not.toHaveBeenCalled();
  });

  it('reports a multi-guild refresh as failed when any guild fails', () => {
    expect(summarizeRefreshResults(2, ['guild-3: Discord unavailable'])).toEqual({
      ok: false,
      error: 'guild-3: Discord unavailable',
      refreshedCount: 2,
      failedCount: 1,
    });
    expect(summarizeRefreshResults(3, [])).toEqual({
      ok: true,
      error: undefined,
      refreshedCount: 3,
      failedCount: 0,
    });
  });
});

describe('direct roster refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('refreshes entirely from KV without requesting the roster Hub or rescanning mappings', async () => {
    const rosterData = await encodeRoster({ v: 3 });
    const { directRosterId, env, list } = makeRefreshEnv(rosterData);
    const hubFetch = vi.fn(() => {
      throw new Error('direct refresh must not call the roster Hub');
    });
    vi.stubGlobal('fetch', hubFetch);
    discordMocks.editMessage.mockResolvedValue({ id: 'message-current' });

    const result = await refreshRoster(env, directRosterId, 'guild-1');

    expect(result).toEqual({
      ok: true,
      error: undefined,
      refreshedCount: 1,
      failedCount: 0,
    });
    expect(hubFetch).not.toHaveBeenCalled();
    expect(list).toHaveBeenCalledOnce();
    expect(discordMocks.editMessage).toHaveBeenCalledOnce();
  });

  it('preserves configured role pings when a missing channel is recreated', async () => {
    const rosterData = await encodeRoster({ v: 3 });
    const tankRoleId = '123456789012345678';
    const { directRosterId, env, values } = makeRefreshEnv(
      rosterData,
      baseConfig({ guildId: 'guild-1', rolePingIds: { tank: tankRoleId } }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('direct refresh must not call the roster Hub');
      }),
    );
    discordMocks.editMessage.mockRejectedValue(
      new DiscordApiError(404, 'PATCH', '/redacted', 10_008),
    );
    discordMocks.sendMessage
      .mockRejectedValueOnce(new DiscordApiError(404, 'POST', '/redacted', 10_003))
      .mockResolvedValueOnce({ id: 'ping-message' })
      .mockResolvedValueOnce({ id: 'roster-message' });
    discordMocks.createChannel.mockResolvedValue({ id: 'channel-new' });

    const result = await refreshRoster(env, directRosterId, 'guild-1');

    expect(result.ok).toBe(true);
    expect(discordMocks.createChannel).toHaveBeenCalledOnce();
    expect(discordMocks.sendMessage).toHaveBeenCalledWith(env, 'channel-new', {
      content: expect.stringContaining(`<@&${tankRoleId}>`),
      allowed_mentions: { parse: [], roles: [tankRoleId] },
    });
    expect(JSON.parse(values.get(`roster-map:guild-1:${directRosterId}`) ?? '{}')).toMatchObject({
      channelId: 'channel-new',
      messageId: 'roster-message',
    });
  });
});
