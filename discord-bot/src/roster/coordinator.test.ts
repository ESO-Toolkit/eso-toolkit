import { beforeEach, describe, expect, it } from 'vitest';
import { LOCK_LEASE_MS, RosterCoordinator } from './coordinator';

class MemoryStorage {
  readonly values = new Map<string, unknown>();
  alarm: number | null = null;
  private transactionTail: Promise<void> = Promise.resolve();

  async transaction<T>(callback: (txn: MemoryStorage) => Promise<T>): Promise<T> {
    const previous = this.transactionTail;
    let complete: () => void = () => undefined;
    this.transactionTail = new Promise<void>((resolve) => {
      complete = resolve;
    });
    await previous;
    try {
      return await callback(this);
    } finally {
      complete();
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined;
  }

  async put(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.values.delete(key);
  }

  async setAlarm(value: number): Promise<void> {
    this.alarm = value;
  }
}

async function call(
  coordinator: RosterCoordinator,
  path: '/acquire' | '/renew' | '/release',
  token: string,
  now: number,
): Promise<Record<string, unknown>> {
  const response = await coordinator.fetch(
    new Request(`https://coordinator${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, now }),
    }),
  );
  return response.json() as Promise<Record<string, unknown>>;
}

describe('RosterCoordinator', () => {
  let storage: MemoryStorage;
  let coordinator: RosterCoordinator;

  beforeEach(() => {
    storage = new MemoryStorage();
    coordinator = new RosterCoordinator({ storage } as unknown as DurableObjectState);
  });

  it('admits exactly one simultaneous contender', async () => {
    const results = await Promise.all([
      call(coordinator, '/acquire', 'token-a', 1_000),
      call(coordinator, '/acquire', 'token-b', 1_000),
    ]);

    expect(results.filter((result) => result.acquired === true)).toHaveLength(1);
    expect(results.filter((result) => result.acquired === false)).toHaveLength(1);
  });

  it('only lets the current owner renew or release a live lease', async () => {
    expect(await call(coordinator, '/acquire', 'owner', 1_000)).toEqual({ acquired: true });
    expect(await call(coordinator, '/renew', 'stale', 2_000)).toEqual({ renewed: false });
    expect(await call(coordinator, '/release', 'stale', 2_000)).toEqual({ released: false });
    expect(await call(coordinator, '/renew', 'owner', 2_000)).toEqual({ renewed: true });
    expect(storage.alarm).toBe(2_000 + LOCK_LEASE_MS);
    expect(await call(coordinator, '/release', 'owner', 2_001)).toEqual({ released: true });
  });

  it('allows a new owner after expiry and rejects the expired owner', async () => {
    expect(await call(coordinator, '/acquire', 'first', 1_000)).toEqual({ acquired: true });
    const expiredAt = 1_000 + LOCK_LEASE_MS;

    expect(await call(coordinator, '/renew', 'first', expiredAt)).toEqual({ renewed: false });
    expect(await call(coordinator, '/acquire', 'second', expiredAt)).toEqual({ acquired: true });
    expect(await call(coordinator, '/release', 'first', expiredAt + 1)).toEqual({
      released: false,
    });
    expect(await call(coordinator, '/renew', 'second', expiredAt + 1)).toEqual({ renewed: true });
  });
});
