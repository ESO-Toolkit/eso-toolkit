import { beforeEach, describe, expect, it } from 'vitest';
import { SupportCoordinator } from './coordinator';

class MemoryStorage {
  readonly values = new Map<string, unknown>();
  alarm: number | null = null;

  async transaction<T>(callback: (txn: MemoryStorage) => Promise<T>): Promise<T> {
    return callback(this);
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined;
  }

  async put(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
  }

  async delete(keys: string | string[]): Promise<boolean | number> {
    if (Array.isArray(keys)) {
      let count = 0;
      for (const key of keys) if (this.values.delete(key)) count++;
      return count;
    }
    return this.values.delete(keys);
  }

  async list<T>(): Promise<Map<string, T>> {
    return this.values as Map<string, T>;
  }

  async getAlarm(): Promise<number | null> {
    return this.alarm;
  }

  async setAlarm(value: number): Promise<void> {
    this.alarm = value;
  }
}

const call = async (
  coordinator: SupportCoordinator,
  path: string,
  body: Record<string, unknown>,
) => {
  const response = await coordinator.fetch(
    new Request(`https://coordinator${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  return response.json() as Promise<Record<string, unknown>>;
};

describe('SupportCoordinator atomic rate limiting and idempotency', () => {
  let storage: MemoryStorage;
  let coordinator: SupportCoordinator;

  beforeEach(() => {
    storage = new MemoryStorage();
    coordinator = new SupportCoordinator({ storage } as unknown as DurableObjectState);
  });

  it('returns the same completed ticket for duplicate submissions without consuming another ticket slot', async () => {
    const input = {
      operationId: 'scoped-operation-a',
      userHash: 'user-a',
      ipHash: 'ip-a',
      requestId: 'request-a',
      now: 1_000_000,
    };
    expect((await call(coordinator, '/begin', input)).kind).toBe('start');
    await call(coordinator, '/channel', { ...input, channelId: 'channel-a', ticketId: '0042' });
    await call(coordinator, '/complete', input);
    const duplicate = await call(coordinator, '/begin', {
      ...input,
      requestId: 'request-b',
      now: 1_001_000,
    });
    expect(duplicate).toMatchObject({
      kind: 'duplicate',
      record: { status: 'complete', channelId: 'channel-a', ticketId: '0042' },
    });
    expect(storage.values.get('user:user-a:0')).toBe(1);
    expect(storage.values.get('attempt-user:user-a:0')).toBe(1);
  });

  it('rejects reuse of a scoped operation identifier by another authenticated user', async () => {
    const base = {
      operationId: 'scoped-operation-a',
      ipHash: 'ip-a',
      requestId: 'a',
      now: 1_000_000,
    };
    await call(coordinator, '/begin', { ...base, userHash: 'user-a' });
    expect(await call(coordinator, '/begin', { ...base, userHash: 'user-b' })).toMatchObject({
      kind: 'conflict',
    });
  });

  it('enforces per-user and per-IP ticket limits atomically', async () => {
    for (let index = 0; index < 3; index++) {
      expect(
        (
          await call(coordinator, '/begin', {
            operationId: `operation-user-${index}`,
            userHash: 'user-a',
            ipHash: 'ip-a',
            requestId: `${index}`,
            now: 1_000_000,
          })
        ).kind,
      ).toBe('start');
    }
    expect(
      (
        await call(coordinator, '/begin', {
          operationId: 'operation-user-4',
          userHash: 'user-a',
          ipHash: 'ip-a',
          requestId: '4',
          now: 1_000_000,
        })
      ).kind,
    ).toBe('rate_limited');

    for (let index = 0; index < 7; index++) {
      await call(coordinator, '/begin', {
        operationId: `operation-ip-${index}`,
        userHash: `other-${index}`,
        ipHash: 'ip-a',
        requestId: `ip-${index}`,
        now: 1_000_000,
      });
    }
    expect(
      (
        await call(coordinator, '/begin', {
          operationId: 'operation-ip-final',
          userHash: 'other-final',
          ipHash: 'ip-a',
          requestId: 'ip-final',
          now: 1_000_000,
        })
      ).kind,
    ).toBe('rate_limited');
  });

  it('allows a safe retry after a pre-channel failure but keeps a post-channel failure recoverable', async () => {
    const input = {
      operationId: 'retry-operation-a',
      userHash: 'user-a',
      ipHash: 'ip-a',
      requestId: 'request-a',
      now: 1_000_000,
    };
    await call(coordinator, '/begin', input);
    await call(coordinator, '/fail', { ...input, errorCode: 'DISCORD_UNAVAILABLE' });
    const retry = { ...input, requestId: 'request-b', now: 1_001_000 };
    expect(await call(coordinator, '/begin', retry)).toMatchObject({
      kind: 'start',
      recovery: true,
    });
    await call(coordinator, '/channel', {
      ...retry,
      now: 1_002_000,
      channelId: 'channel-a',
      ticketId: '0042',
    });
    await call(coordinator, '/fail', {
      ...retry,
      now: 1_003_000,
      errorCode: 'DISCORD_UNAVAILABLE',
    });
    expect(
      await call(coordinator, '/begin', {
        ...input,
        requestId: 'request-c',
        now: 1_303_000,
      }),
    ).toMatchObject({
      kind: 'start',
      recovery: true,
      record: { status: 'channel', channelId: 'channel-a', requestId: 'request-c' },
    });
  });

  it('keeps a fresh pending lease but safely re-leases it after five minutes', async () => {
    const input = {
      operationId: 'pending-operation-a',
      userHash: 'user-a',
      ipHash: 'ip-a',
      requestId: 'request-a',
      now: 1_000_000,
    };
    expect((await call(coordinator, '/begin', input)).kind).toBe('start');
    expect(await call(coordinator, '/begin', { ...input, now: 1_299_999 })).toMatchObject({
      kind: 'duplicate',
      record: { status: 'pending' },
    });
    const recovered = await call(coordinator, '/begin', {
      ...input,
      requestId: 'request-b',
      now: 1_300_000,
    });
    expect(recovered).toMatchObject({
      kind: 'start',
      recovery: true,
      record: { status: 'pending', requestId: 'request-b' },
    });
    expect(
      await call(coordinator, '/channel', {
        ...input,
        channelId: 'old-channel',
        ticketId: '0041',
        now: 1_300_001,
      }),
    ).toEqual({ updated: false });
  });

  it('keeps the active request lease after a channel is recorded', async () => {
    const input = {
      operationId: 'channel-operation-a',
      userHash: 'user-a',
      ipHash: 'ip-a',
      requestId: 'request-a',
      now: 1_000_000,
    };
    expect((await call(coordinator, '/begin', input)).kind).toBe('start');
    expect(
      await call(coordinator, '/channel', {
        ...input,
        channelId: 'channel-a',
        ticketId: '0042',
      }),
    ).toEqual({ updated: true });

    expect(
      await call(coordinator, '/begin', {
        ...input,
        requestId: 'request-b',
        now: 1_001_000,
      }),
    ).toMatchObject({
      kind: 'duplicate',
      record: { status: 'channel', requestId: 'request-a', channelId: 'channel-a' },
    });
    expect(await call(coordinator, '/complete', { ...input, now: 1_001_001 })).toEqual({
      updated: true,
    });
  });

  it('does not consume attempt capacity for duplicate status polls', async () => {
    const input = {
      operationId: 'duplicate-operation-a',
      userHash: 'user-a',
      ipHash: 'ip-a',
      requestId: 'request-a',
      now: 1_000_000,
    };
    expect((await call(coordinator, '/begin', input)).kind).toBe('start');
    for (let index = 1; index < 100; index++) {
      expect(
        (await call(coordinator, '/begin', { ...input, requestId: `request-${index}` })).kind,
      ).toBe('duplicate');
    }
    expect((await call(coordinator, '/begin', input)).kind).toBe('duplicate');
    expect(storage.values.get('attempt-user:user-a:0')).toBe(1);
    expect(storage.values.get('attempt-ip:ip-a:0')).toBe(1);
  });

  it('limits unauthenticated session minting attempts by source IP', async () => {
    for (let index = 0; index < 20; index++) {
      expect(
        (await call(coordinator, '/session-rate', { ipHash: 'ip-a', now: 1_000_000 })).allowed,
      ).toBe(true);
    }
    expect(
      (await call(coordinator, '/session-rate', { ipHash: 'ip-a', now: 1_000_000 })).allowed,
    ).toBe(false);
  });
});
