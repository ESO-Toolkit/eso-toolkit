import { describe, expect, it } from 'vitest';
import type { Env } from '../types';
import { checkKvRateLimit, checkRosterRateLimit } from './kv';

function makeKv(
  puts: Array<{ key: string; value: string; options?: KVNamespacePutOptions }> = [],
): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string, options?: KVNamespacePutOptions) => {
      store.set(key, value);
      puts.push(options === undefined ? { key, value } : { key, value, options });
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

function makeEnv(): Env {
  return { ROSTERS: makeKv() } as unknown as Env;
}

describe('checkRosterRateLimit', () => {
  it('allows up to the limit then blocks', async () => {
    const env = makeEnv();
    const results: boolean[] = [];
    for (let index = 0; index < 6; index++) {
      results.push(await checkRosterRateLimit(env, 'publish:g:u', 5, 60));
    }
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it('tracks distinct keys independently', async () => {
    const env = makeEnv();
    expect(await checkRosterRateLimit(env, 'publish:g:userA', 1, 60)).toBe(true);
    expect(await checkRosterRateLimit(env, 'publish:g:userA', 1, 60)).toBe(false);
    expect(await checkRosterRateLimit(env, 'publish:g:userB', 1, 60)).toBe(true);
  });

  it.each(['not-a-number', '4junk', '-1', '1.5', '01', 'Infinity'])(
    'repairs malformed persisted counter %s',
    async (value) => {
      const env = makeEnv();
      await env.ROSTERS.put('rl:publish:g:u', value);

      expect(await checkRosterRateLimit(env, 'publish:g:u', 1, 60)).toBe(true);
      expect(await checkRosterRateLimit(env, 'publish:g:u', 1, 60)).toBe(false);
    },
  );
});

describe('checkKvRateLimit', () => {
  it('works with any KV namespace and preserves TTL options', async () => {
    const puts: Array<{ key: string; value: string; options?: KVNamespacePutOptions }> = [];
    const kv = makeKv(puts);

    expect(await checkKvRateLimit(kv, 'ticket:user-1', 1, 300)).toBe(true);
    expect(await checkKvRateLimit(kv, 'ticket:user-1', 1, 300)).toBe(false);
    expect(puts).toEqual([
      { key: 'rl:ticket:user-1', value: '1', options: { expirationTtl: 300 } },
    ]);
  });

  it('repairs malformed counters outside the roster namespace', async () => {
    const kv = makeKv();
    await kv.put('rl:oauth:127.0.0.1', '4junk');

    expect(await checkKvRateLimit(kv, 'oauth:127.0.0.1', 1, 60)).toBe(true);
    expect(await checkKvRateLimit(kv, 'oauth:127.0.0.1', 1, 60)).toBe(false);
  });
});
