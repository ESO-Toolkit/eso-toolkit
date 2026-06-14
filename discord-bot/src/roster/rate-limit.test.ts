import { describe, expect, it } from 'vitest';
import { checkRosterRateLimit } from './kv';
import type { Env } from '../types';

/** Minimal in-memory KV stub — only the get/put used by the rate limiter. */
function makeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
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
    for (let i = 0; i < 6; i++) {
      results.push(await checkRosterRateLimit(env, 'publish:g:u', 5, 60));
    }
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it('tracks distinct keys independently', async () => {
    const env = makeEnv();
    expect(await checkRosterRateLimit(env, 'publish:g:userA', 1, 60)).toBe(true);
    expect(await checkRosterRateLimit(env, 'publish:g:userA', 1, 60)).toBe(false);
    // Different user key is unaffected
    expect(await checkRosterRateLimit(env, 'publish:g:userB', 1, 60)).toBe(true);
  });
});
