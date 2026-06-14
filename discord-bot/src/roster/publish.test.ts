import { describe, expect, it } from 'vitest';
import { resolvePublishTarget } from './publish';
import type { GuildConfig } from './types';

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
