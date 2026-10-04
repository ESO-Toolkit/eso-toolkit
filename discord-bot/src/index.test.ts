import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index';
import type { Env } from './types';

const guildId = '111111111111111111';
const channelId = '222222222222222222';

function setup(channels: unknown[], permissions = '32') {
  const put = vi.fn().mockResolvedValue(undefined);
  const env = {
    DISCORD_BOT_TOKEN: 'test',
    ROSTERS: {
      get: vi.fn(async () =>
        JSON.stringify({ guildId, namePattern: 'test', allowedRoleIds: ['333333333333333333'] }),
      ),
      put,
    },
  } as unknown as Env;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      const path = new URL(String(url)).pathname;
      if (path.endsWith('/users/@me')) return Response.json({ id: '444444444444444444' });
      if (path.endsWith('/users/@me/guilds')) return Response.json([{ id: guildId, permissions }]);
      if (path.includes('/members/')) return Response.json({ roles: [] });
      if (path.endsWith(`/guilds/${guildId}/channels`)) return Response.json(channels);
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  const configure = (body: unknown) =>
    worker.fetch(
      new Request(`https://bot.invalid/discord/guild/${guildId}/config`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      env,
      {} as ExecutionContext,
    );
  return { configure, put };
}

afterEach(() => vi.unstubAllGlobals());

describe('guild configuration destination authorization', () => {
  it.each(['foreign', 'deleted', 'wrong-type'])(
    'rejects a %s destination before saving configuration',
    async (scenario) => {
      const { configure, put } = setup(
        scenario === 'deleted'
          ? []
          : [
              {
                id: channelId,
                guild_id: scenario === 'foreign' ? '555555555555555555' : guildId,
                type: scenario === 'wrong-type' ? 4 : 0,
              },
            ],
      );
      const response = await configure({ defaultChannelId: channelId });
      expect(response.status).toBe(400);
      expect(put).not.toHaveBeenCalled();
    },
  );

  it('allows a manager without the configured publishing role to save a channel belonging to the server', async () => {
    const { configure, put } = setup([{ id: channelId, guild_id: guildId, type: 0 }]);
    expect((await configure({ defaultChannelId: channelId })).status).toBe(200);
    expect(put).toHaveBeenCalledOnce();
    expect(JSON.parse(put.mock.calls[0]![1])).toMatchObject({ defaultChannelId: channelId });
  });

  it('rejects a foreign category', async () => {
    const { configure, put } = setup([{ id: channelId, guild_id: '555555555555555555', type: 4 }]);
    expect((await configure({ defaultCategoryId: channelId })).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('allows clearing a stale destination', async () => {
    const { configure, put } = setup([]);
    expect((await configure({ defaultChannelId: '' })).status).toBe(200);
    expect(put).toHaveBeenCalledOnce();
  });
});
