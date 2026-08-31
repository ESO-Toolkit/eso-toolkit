interface LockRecord {
  token: string;
  expiresAt: number;
}

interface LockInput {
  token: string;
  now: number;
}

const LOCK_KEY = 'lock';
export const LOCK_LEASE_MS = 5 * 60 * 1000;

/**
 * Serializes all Discord mutations for one guild+roster operation key.
 * Each operation key is routed to its own Durable Object instance.
 */
export class RosterCoordinator implements DurableObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const input = (await request.json()) as LockInput;
    if (!input.token || !Number.isFinite(input.now)) {
      return Response.json({ error: 'invalid_request' }, { status: 400 });
    }

    if (path === '/acquire') return this.acquire(input);
    if (path === '/renew') return this.renew(input);
    if (path === '/release') return this.release(input);
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  async alarm(): Promise<void> {
    const record = await this.state.storage.get<LockRecord>(LOCK_KEY);
    if (!record) return;
    const now = Date.now();
    if (record.expiresAt <= now) {
      await this.state.storage.delete(LOCK_KEY);
    } else {
      await this.state.storage.setAlarm(record.expiresAt);
    }
  }

  private async acquire(input: LockInput): Promise<Response> {
    const acquired = await this.state.storage.transaction(async (txn) => {
      const current = await txn.get<LockRecord>(LOCK_KEY);
      if (current && current.expiresAt > input.now) return false;
      const next: LockRecord = { token: input.token, expiresAt: input.now + LOCK_LEASE_MS };
      await txn.put(LOCK_KEY, next);
      return true;
    });
    if (acquired) await this.state.storage.setAlarm(input.now + LOCK_LEASE_MS);
    return Response.json({ acquired });
  }

  private async renew(input: LockInput): Promise<Response> {
    const renewed = await this.state.storage.transaction(async (txn) => {
      const current = await txn.get<LockRecord>(LOCK_KEY);
      if (!current || current.token !== input.token || current.expiresAt <= input.now) return false;
      await txn.put(LOCK_KEY, { token: input.token, expiresAt: input.now + LOCK_LEASE_MS });
      return true;
    });
    if (renewed) await this.state.storage.setAlarm(input.now + LOCK_LEASE_MS);
    return Response.json({ renewed });
  }

  private async release(input: LockInput): Promise<Response> {
    const released = await this.state.storage.transaction(async (txn) => {
      const current = await txn.get<LockRecord>(LOCK_KEY);
      if (!current || current.token !== input.token) return false;
      await txn.delete(LOCK_KEY);
      return true;
    });
    return Response.json({ released });
  }
}

export async function coordinateRosterLock(
  namespace: DurableObjectNamespace,
  operationKey: string,
  path: '/acquire' | '/renew' | '/release',
  token: string,
): Promise<Record<string, unknown>> {
  const stub = namespace.get(namespace.idFromName(operationKey));
  const response = await stub.fetch(`https://roster-coordinator${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, now: Date.now() }),
  });
  if (!response.ok) throw new Error(`Roster coordinator failed: ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}
