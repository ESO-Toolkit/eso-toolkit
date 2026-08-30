import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiscordApiError, editFollowup, getGuildMember, sendFollowup } from './discord';
import type { Env } from './types';

const env = { DISCORD_BOT_TOKEN: 'test-token' } as Env;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Discord REST diagnostics', () => {
  it('does not expose Discord resource IDs in rate-limit logs or errors', async () => {
    const guildId = '111111111111111111';
    const userId = '222222222222222222';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('', {
          status: 429,
          headers: { 'Retry-After': '0' },
        }),
      ),
    );

    const error = await getGuildMember(env, guildId, userId).catch((caught: unknown) => caught);
    const logged = warn.mock.calls.flat().join(' ');

    expect(error).toBeInstanceOf(DiscordApiError);
    expect(String(error)).not.toContain(guildId);
    expect(String(error)).not.toContain(userId);
    expect(logged).not.toContain(guildId);
    expect(logged).not.toContain(userId);
    expect(logged).toContain('[discord] rate limited on GET');
  });
});

describe('interaction followups', () => {
  it('names the missing binding instead of calling /webhooks/undefined', async () => {
    // Callers only log followup failures, so an unset binding would otherwise
    // reach Discord as a 404 and read as an outage rather than a config error.
    const noAppId = { DISCORD_BOT_TOKEN: 'token' } as unknown as Env;
    await expect(sendFollowup(noAppId, 'interaction-token', { content: 'hi' })).rejects.toThrow(
      'DISCORD_BOT_APPLICATION_ID is not configured',
    );
    await expect(
      editFollowup(noAppId, 'interaction-token', '1', { content: 'hi' }),
    ).rejects.toThrow('DISCORD_BOT_APPLICATION_ID is not configured');
  });
});
