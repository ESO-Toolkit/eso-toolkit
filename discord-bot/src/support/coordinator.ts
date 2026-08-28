interface TicketRecord {
  status: 'pending' | 'channel' | 'complete' | 'failed';
  userHash: string;
  requestId: string;
  createdAt: number;
  updatedAt: number;
  channelId?: string;
  ticketId?: string;
  errorCode?: string;
}

interface BeginInput {
  operationId: string;
  userHash: string;
  ipHash: string;
  requestId: string;
  now: number;
}

const TICKET_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export class SupportCoordinator implements DurableObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const body = (await request.json()) as Record<string, unknown>;
    if (path === '/session-rate') return this.sessionRate(body);
    if (path === '/begin') return this.begin(body as unknown as BeginInput);
    if (path === '/channel') return this.update(body, 'channel');
    if (path === '/complete') return this.update(body, 'complete');
    if (path === '/fail') return this.update(body, 'failed');
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const entries = await this.state.storage.list<TicketRecord | number>();
    const expired: string[] = [];
    for (const [key, value] of entries) {
      if (key.startsWith('ticket:')) {
        if (typeof value !== 'number' && value.updatedAt < now - TICKET_RETENTION_MS) {
          expired.push(key);
        }
        continue;
      }
      const window = Number(key.slice(key.lastIndexOf(':') + 1));
      if (Number.isFinite(window)) {
        const windowMs = key.startsWith('session:') ? 600_000 : 3_600_000;
        if ((window + 2) * windowMs < now) expired.push(key);
      }
    }
    if (expired.length > 0) await this.state.storage.delete(expired);
    await this.state.storage.setAlarm(now + CLEANUP_INTERVAL_MS);
  }

  private async scheduleCleanup(now: number): Promise<void> {
    if ((await this.state.storage.getAlarm()) === null) {
      await this.state.storage.setAlarm(now + CLEANUP_INTERVAL_MS);
    }
  }

  private async sessionRate(body: Record<string, unknown>): Promise<Response> {
    const ipHash = String(body.ipHash ?? '');
    const now = Number(body.now);
    const window = Math.floor(now / 600_000);
    const key = `session:${ipHash}:${window}`;
    const allowed = await this.state.storage.transaction(async (txn) => {
      const count = (await txn.get<number>(key)) ?? 0;
      if (count >= 20) return false;
      await txn.put(key, count + 1);
      return true;
    });
    await this.scheduleCleanup(now);
    return Response.json({ allowed });
  }

  private async begin(input: BeginInput): Promise<Response> {
    const result = await this.state.storage.transaction(async (txn) => {
      const userWindow = Math.floor(input.now / 3_600_000);
      const attemptUserKey = `attempt-user:${input.userHash}:${userWindow}`;
      const attemptIpKey = `attempt-ip:${input.ipHash}:${userWindow}`;
      const attemptUserCount = (await txn.get<number>(attemptUserKey)) ?? 0;
      const attemptIpCount = (await txn.get<number>(attemptIpKey)) ?? 0;
      if (attemptUserCount >= 20 || attemptIpCount >= 60) return { kind: 'rate_limited' };
      await txn.put(attemptUserKey, attemptUserCount + 1);
      await txn.put(attemptIpKey, attemptIpCount + 1);

      const key = `ticket:${input.operationId}`;
      const existing = await txn.get<TicketRecord>(key);
      if (existing) {
        if (existing.userHash !== input.userHash) return { kind: 'conflict' };
        if (existing.status === 'failed' && !existing.channelId) {
          const retried = { ...existing, status: 'pending' as const, updatedAt: input.now };
          await txn.put(key, retried);
          return { kind: 'start', recovery: true, record: retried };
        }
        return { kind: 'duplicate', record: existing };
      }
      const userKey = `user:${input.userHash}:${userWindow}`;
      const ipKey = `ticket-ip:${input.ipHash}:${userWindow}`;
      const userCount = (await txn.get<number>(userKey)) ?? 0;
      const ipCount = (await txn.get<number>(ipKey)) ?? 0;
      if (userCount >= 3 || ipCount >= 10) return { kind: 'rate_limited' };
      const record: TicketRecord = {
        status: 'pending',
        userHash: input.userHash,
        requestId: input.requestId,
        createdAt: input.now,
        updatedAt: input.now,
      };
      await txn.put(key, record);
      await txn.put(userKey, userCount + 1);
      await txn.put(ipKey, ipCount + 1);
      return { kind: 'start', record };
    });
    await this.scheduleCleanup(input.now);
    return Response.json(result);
  }

  private async update(
    body: Record<string, unknown>,
    status: TicketRecord['status'],
  ): Promise<Response> {
    const operationId = String(body.operationId ?? '');
    const userHash = String(body.userHash ?? '');
    const result = await this.state.storage.transaction(async (txn) => {
      const key = `ticket:${operationId}`;
      const existing = await txn.get<TicketRecord>(key);
      if (!existing || existing.userHash !== userHash) return false;
      const next: TicketRecord = {
        ...existing,
        status,
        updatedAt: Number(body.now),
        ...(typeof body.channelId === 'string' && { channelId: body.channelId }),
        ...(typeof body.ticketId === 'string' && { ticketId: body.ticketId }),
        ...(typeof body.errorCode === 'string' && { errorCode: body.errorCode }),
      };
      if (status === 'failed' && existing.channelId) next.status = 'channel';
      await txn.put(key, next);
      return true;
    });
    return Response.json({ updated: result });
  }
}

export async function coordinate<T extends Record<string, unknown>>(
  namespace: DurableObjectNamespace,
  path: string,
  body: T,
): Promise<Record<string, unknown>> {
  const stub = namespace.get(namespace.idFromName('kalpa-support'));
  const response = await stub.fetch(`https://coordinator${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Support coordinator failed: ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}
