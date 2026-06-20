import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyHttpCaller } from './auth';
import type { Env } from './types';

const GUILD = '111111111111111111';
const USER = '222222222222222222';
const PUBLISH_ROLE = '333333333333333333';

// Permission bitfields: MANAGE_GUILD = 1 << 5; SEND_MESSAGES = 1 << 11.
const WITH_MANAGE = (1n << 5n).toString();
const NO_MANAGE = (1n << 11n).toString();

function makeKv(seed: Record<string, string> = {}): KVNamespace {
  const store = new Map<string, string>(Object.entries(seed));
  return {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => {
      store.set(k, v);
    },
  } as unknown as KVNamespace;
}

function makeEnv(config: object): Env {
  return {
    ROSTERS: makeKv({ [`guild-config:${GUILD}`]: JSON.stringify(config) }),
    DISCORD_BOT_TOKEN: 'bot-token',
  } as unknown as Env;
}

function mockFetch(opts: { memberRoles?: string[]; guildPerms?: string }) {
  return vi.fn(async (url: string | URL) => {
    const u = url.toString();
    if (u.endsWith('/users/@me')) {
      return new Response(JSON.stringify({ id: USER }), { status: 200 });
    }
    if (u.endsWith('/users/@me/guilds')) {
      return new Response(
        JSON.stringify([{ id: GUILD, permissions: opts.guildPerms ?? NO_MANAGE }]),
        {
          status: 200,
        },
      );
    }
    if (u.includes(`/guilds/${GUILD}/members/`)) {
      return new Response(JSON.stringify({ roles: opts.memberRoles ?? [] }), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('verifyHttpCaller — requireManageGuild gate', () => {
  it('admins-only actions reject a publish-role holder who lacks MANAGE_GUILD', async () => {
    const env = makeEnv({ guildId: GUILD, namePattern: 'x', allowedRoleIds: [PUBLISH_ROLE] });
    vi.stubGlobal('fetch', mockFetch({ memberRoles: [PUBLISH_ROLE], guildPerms: NO_MANAGE }));

    // Publish tier: the configured role grants access via role overlap.
    const publishTier = await verifyHttpCaller(env, GUILD, 'Bearer tok');
    expect(publishTier.authorized).toBe(true);

    // Admin tier: the SAME caller must be rejected — the role overlap shortcut
    // is skipped and MANAGE_GUILD is required. This is the privilege-escalation
    // guard for config writes.
    const adminTier = await verifyHttpCaller(env, GUILD, 'Bearer tok', {
      requireManageGuild: true,
    });
    expect(adminTier.authorized).toBe(false);
  });

  it('admin actions succeed when the caller actually has MANAGE_GUILD', async () => {
    const env = makeEnv({ guildId: GUILD, namePattern: 'x', allowedRoleIds: [PUBLISH_ROLE] });
    vi.stubGlobal('fetch', mockFetch({ memberRoles: [PUBLISH_ROLE], guildPerms: WITH_MANAGE }));

    const adminTier = await verifyHttpCaller(env, GUILD, 'Bearer tok', {
      requireManageGuild: true,
    });
    expect(adminTier.authorized).toBe(true);
    expect(adminTier.userId).toBe(USER);
  });

  it('rejects a missing/invalid Authorization header', async () => {
    const env = makeEnv({ guildId: GUILD, namePattern: 'x' });
    const res = await verifyHttpCaller(env, GUILD, null, { requireManageGuild: true });
    expect(res.authorized).toBe(false);
  });
});
