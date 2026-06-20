import { describe, expect, it } from 'vitest';
import { acquirePublishLock, checkRosterRateLimit, releasePublishLock } from './kv';
import type { Env } from '../types';

/** Minimal in-memory KV stub — get/put/delete used by the helpers under test. */
function makeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
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

describe('publish lock — fencing token', () => {
  it('acquire returns a token, a second acquire is blocked until release', async () => {
    const env = makeEnv();
    const token = await acquirePublishLock(env, 'g', 'r');
    expect(token).toBeTruthy();
    // Held — a second acquire fails.
    expect(await acquirePublishLock(env, 'g', 'r')).toBeNull();
    // Release with the correct token frees it.
    await releasePublishLock(env, 'g', 'r', token as string);
    expect(await acquirePublishLock(env, 'g', 'r')).toBeTruthy();
  });

  it('release with a stale token does not delete the current owner lock', async () => {
    const env = makeEnv();
    const first = await acquirePublishLock(env, 'g', 'r');
    // Simulate the first lock expiring and a second caller acquiring it.
    await releasePublishLock(env, 'g', 'r', first as string); // first owner releases normally...
    const second = await acquirePublishLock(env, 'g', 'r');
    expect(second).toBeTruthy();
    // ...the first owner's (stale) release must NOT free the second owner's lock.
    await releasePublishLock(env, 'g', 'r', first as string);
    expect(await acquirePublishLock(env, 'g', 'r')).toBeNull();
    // The real owner can still release it.
    await releasePublishLock(env, 'g', 'r', second as string);
    expect(await acquirePublishLock(env, 'g', 'r')).toBeTruthy();
  });
});
