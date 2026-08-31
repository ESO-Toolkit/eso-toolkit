import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscordApiError } from '../discord';
import type { Env } from '../types';
import {
  cleanupUncommittedDiscordMutation,
  finishPendingMessageCleanup,
  mintDirectRosterId,
  resolvePublishTarget,
  summarizeRefreshResults,
} from './publish';
import type { GuildConfig, RosterMapping } from './types';

const discordMocks = vi.hoisted(() => ({
  deleteChannel: vi.fn(),
  deleteMessage: vi.fn(),
}));

vi.mock('../discord.js', async () => {
  const actual = await vi.importActual<typeof import('../discord')>('../discord');
  return {
    ...actual,
    deleteChannel: discordMocks.deleteChannel,
    deleteMessage: discordMocks.deleteMessage,
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
