import { describe, expect, it } from 'vitest';
import { handleRosterConfig } from './roster-config';
import type { DiscordInteraction, DiscordInteractionOption, Env } from '../types';

const GUILD = '111111111111111111';
const USER = '222222222222222222';
const TANK = '333333333333333333';
const HEALER = '444444444444444444';
const DD = '555555555555555555';
const MANAGE_GUILD = (1n << 5n).toString();

function makeKv(): { kv: KVNamespace; store: Map<string, string> } {
  const store = new Map<string, string>();
  const kv = {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => {
      store.set(k, v);
    },
    delete: async (k: string) => {
      store.delete(k);
    },
  } as unknown as KVNamespace;
  return { kv, store };
}

function configInteraction(options: DiscordInteractionOption[]): DiscordInteraction {
  return {
    id: 'i',
    application_id: 'a',
    type: 2,
    token: 't',
    guild_id: GUILD,
    member: {
      user: { id: USER, username: 'admin', discriminator: '0' },
      roles: [],
      permissions: MANAGE_GUILD,
    },
    data: { name: 'config', options },
  };
}

const opt = (name: string, value: string | boolean): DiscordInteractionOption => ({
  name,
  type: typeof value === 'boolean' ? 5 : 8,
  value,
});

const ctx = {} as unknown as ExecutionContext;

function readPings(store: Map<string, string>): Record<string, string> | undefined {
  const raw = store.get(`guild-config:${GUILD}`);
  if (!raw) return undefined;
  return (JSON.parse(raw) as { rolePingIds?: Record<string, string> }).rolePingIds;
}

describe('handleRosterConfig — set-role-pings clear flags', () => {
  it('sets, then clears an individual ping role, then clears all', async () => {
    const { kv, store } = makeKv();
    const env = { ROSTERS: kv } as unknown as Env;

    // 1. Set all three ping roles.
    await handleRosterConfig(
      env,
      configInteraction([
        {
          name: 'set-role-pings',
          type: 1,
          options: [opt('tank-role', TANK), opt('healer-role', HEALER), opt('dd-role', DD)],
        },
      ]),
      ctx,
    );
    expect(readPings(store)).toEqual({ tank: TANK, healer: HEALER, dd: DD });

    // 2. Clear just the tank ping — healer/dd survive.
    await handleRosterConfig(
      env,
      configInteraction([{ name: 'set-role-pings', type: 1, options: [opt('clear-tank', true)] }]),
      ctx,
    );
    expect(readPings(store)).toEqual({ healer: HEALER, dd: DD });

    // 3. Clear the rest — rolePingIds is dropped so config reads as unset.
    await handleRosterConfig(
      env,
      configInteraction([
        {
          name: 'set-role-pings',
          type: 1,
          options: [opt('clear-healer', true), opt('clear-dd', true)],
        },
      ]),
      ctx,
    );
    expect(readPings(store)).toBeUndefined();
  });

  it('a clear flag wins over a same-role value in the same invocation', async () => {
    const { kv, store } = makeKv();
    const env = { ROSTERS: kv } as unknown as Env;

    await handleRosterConfig(
      env,
      configInteraction([
        {
          name: 'set-role-pings',
          type: 1,
          options: [opt('tank-role', TANK), opt('clear-tank', true)],
        },
      ]),
      ctx,
    );
    expect(readPings(store)).toBeUndefined();
  });

  it('rejects a non-admin caller', async () => {
    const { kv, store } = makeKv();
    const env = { ROSTERS: kv } as unknown as Env;
    const interaction = configInteraction([
      { name: 'set-role-pings', type: 1, options: [opt('tank-role', TANK)] },
    ]);
    interaction.member!.permissions = '0'; // no MANAGE_GUILD
    const res = await handleRosterConfig(env, interaction, ctx);
    expect(res.data?.content).toContain('Manage Server');
    expect(store.get(`guild-config:${GUILD}`)).toBeUndefined();
  });
});
