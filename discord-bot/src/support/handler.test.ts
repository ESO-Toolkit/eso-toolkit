import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env, TicketState } from '../types';
import { supportFixture } from './contract.test';

const discord = vi.hoisted(() => ({
  getGuildChannels: vi.fn(),
  getGuildMember: vi.fn(),
  sendMessage: vi.fn(),
}));
const tickets = vi.hoisted(() => ({ createPrivateTicket: vi.fn() }));
const coordinator = vi.hoisted(() => ({ coordinate: vi.fn() }));
const kv = vi.hoisted(() => ({ getTicket: vi.fn(), putTicket: vi.fn() }));

vi.mock('../discord.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../discord.js')>();
  return { ...original, ...discord };
});
vi.mock('../tickets/service.js', () => tickets);
vi.mock('./coordinator.js', () => coordinator);
vi.mock('../kv.js', () => kv);

import { DiscordApiError } from '../discord';
import { parseSupportPayload, renderSupportReport } from './contract';
import { handleSupportSession, handleSupportTicket } from './handler';
import { mintSupportSession } from './token';

const USER_ID = '222222222222222222';
const SECRET = 'a-secure-test-secret-that-is-longer-than-32-characters';
const env = {
  DISCORD_OAUTH_CLIENT_ID: '444444444444444444',
  GUILD_ID: '111111111111111111',
  TICKET_CATEGORY_ID: '333333333333333333',
  SUPPORT_SESSION_SECRET: SECRET,
  SUPPORT_AUDIT_SECRET: `${SECRET}-audit`,
  SUPPORT_COORDINATOR: {},
} as unknown as Env;

function ticketRequest(token: string, body: unknown = { payload: supportFixture() }): Request {
  return new Request('https://worker.test/discord/support/kalpa/tickets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': '123e4567-e89b-42d3-a456-426614174000',
      'CF-Connecting-IP': '203.0.113.1',
    },
    body: JSON.stringify(body),
  });
}

async function validToken(now = Date.now()): Promise<string> {
  return (await mintSupportSession(SECRET, { id: USER_ID, username: 'Tester' }, now)).token;
}

beforeEach(() => {
  vi.clearAllMocks();
  discord.getGuildMember.mockResolvedValue({ roles: [] });
  discord.getGuildChannels.mockResolvedValue([]);
  kv.getTicket.mockResolvedValue(null);
  coordinator.coordinate.mockImplementation(async (_namespace: unknown, path: string) => {
    if (path === '/session-rate') return { allowed: true };
    if (path === '/begin') return { kind: 'start', record: { status: 'pending' } };
    return { updated: true };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Kalpa support HTTP handlers', () => {
  it('mints a support session only from a Discord bearer identity with verified guild membership', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            application: { id: env.DISCORD_OAUTH_CLIENT_ID },
            scopes: ['identify', 'guilds'],
            user: { id: USER_ID, username: 'Tester' },
          }),
          { status: 200 },
        ),
      ),
    );
    const response = await handleSupportSession(
      new Request('https://worker.test/session', {
        method: 'POST',
        headers: { Authorization: 'Bearer oauth-token', 'CF-Connecting-IP': '203.0.113.1' },
      }),
      env,
    );
    expect(response.status).toBe(200);
    expect(discord.getGuildMember).toHaveBeenCalledWith(env, env.GUILD_ID, USER_ID);
    const body = (await response.json()) as { token: string };
    expect(body.token).toBeTruthy();
  });

  it('rejects an OAuth token issued to another Discord application', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            application: { id: '999999999999999999' },
            scopes: ['identify', 'guilds'],
            user: { id: USER_ID, username: 'Tester' },
          }),
          { status: 200 },
        ),
      ),
    );
    const response = await handleSupportSession(
      new Request('https://worker.test/session', {
        method: 'POST',
        headers: { Authorization: 'Bearer oauth-token' },
      }),
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'AUTH_EXPIRED' } });
    expect(discord.getGuildMember).not.toHaveBeenCalled();
  });

  it('fails closed when the configured Discord application ID is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            scopes: ['identify', 'guilds'],
            user: { id: USER_ID, username: 'Tester' },
          }),
          { status: 200 },
        ),
      ),
    );
    const response = await handleSupportSession(
      new Request('https://worker.test/session', {
        method: 'POST',
        headers: { Authorization: 'Bearer oauth-token' },
      }),
      { ...env, DISCORD_OAUTH_CLIENT_ID: undefined } as unknown as Env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'AUTH_EXPIRED' } });
    expect(discord.getGuildMember).not.toHaveBeenCalled();
  });

  it('requires the complete identify and guilds OAuth scope contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            application: { id: env.DISCORD_OAUTH_CLIENT_ID },
            scopes: ['identify'],
            user: { id: USER_ID, username: 'Tester' },
          }),
          { status: 200 },
        ),
      ),
    );
    const response = await handleSupportSession(
      new Request('https://worker.test/session', {
        method: 'POST',
        headers: { Authorization: 'Bearer oauth-token' },
      }),
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'AUTH_EXPIRED' } });
    expect(discord.getGuildMember).not.toHaveBeenCalled();
  });

  it('rejects a Discord user who is not a current guild member', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            application: { id: env.DISCORD_OAUTH_CLIENT_ID },
            scopes: ['identify', 'guilds'],
            user: { id: USER_ID, username: 'Tester' },
          }),
          { status: 200 },
        ),
      ),
    );
    discord.getGuildMember.mockRejectedValue(new DiscordApiError(404, 'GET', '/member'));
    const response = await handleSupportSession(
      new Request('https://worker.test/session', {
        method: 'POST',
        headers: { Authorization: 'Bearer oauth-token' },
      }),
      env,
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'NOT_A_MEMBER' } });
  });

  it('rejects expired authentication before parsing or creating a ticket', async () => {
    const token = await validToken(Date.now() - 601_000);
    const response = await handleSupportTicket(ticketRequest(token), env);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'AUTH_EXPIRED' } });
    expect(tickets.createPrivateTicket).not.toHaveBeenCalled();
  });

  it('applies ticket attempt limits before calling the Discord membership API', async () => {
    coordinator.coordinate.mockImplementation(async (_namespace: unknown, path: string) =>
      path === '/begin' ? { kind: 'rate_limited' } : { updated: true },
    );
    const response = await handleSupportTicket(ticketRequest(await validToken()), env);
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } });
    expect(discord.getGuildMember).not.toHaveBeenCalled();
    expect(tickets.createPrivateTicket).not.toHaveBeenCalled();
  });

  it('marks a fresh reservation failed when current guild membership cannot be verified', async () => {
    discord.getGuildMember.mockRejectedValue(new DiscordApiError(404, 'GET', '/member'));
    const response = await handleSupportTicket(ticketRequest(await validToken()), env);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'NOT_A_MEMBER' } });
    expect(coordinator.coordinate).toHaveBeenCalledWith(
      env.SUPPORT_COORDINATOR,
      '/fail',
      expect.objectContaining({
        operationId: expect.stringMatching(/^[A-Za-z0-9_-]{20}$/),
        errorCode: 'NOT_A_MEMBER',
      }),
    );
    expect(tickets.createPrivateTicket).not.toHaveBeenCalled();
  });

  it('creates a private ticket for the authenticated member and returns confirmed Discord access', async () => {
    const ticket: TicketState = {
      id: '0042',
      channelId: '666666666666666666',
      userId: USER_ID,
      username: 'Tester',
      category: 'Bug',
      title: 'Kalpa: Install failed',
      description: 'It failed',
      status: 'open',
      source: 'kalpa',
      createdAt: new Date().toISOString(),
      embedMessageId: '777777777777777777',
    };
    tickets.createPrivateTicket.mockResolvedValue({ ticket, messageId: ticket.embedMessageId });
    const response = await handleSupportTicket(ticketRequest(await validToken()), env);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      status: 'created',
      ticketId: '0042',
      channelId: ticket.channelId,
      duplicate: false,
    });
    expect(tickets.createPrivateTicket).toHaveBeenCalledWith(
      env,
      expect.objectContaining({
        user: { id: USER_ID, username: 'Tester' },
        source: 'kalpa',
        messageNonce: expect.stringMatching(/^[A-Za-z0-9_-]{20}$/),
      }),
    );
    expect(coordinator.coordinate).toHaveBeenCalledWith(
      env.SUPPORT_COORDINATOR,
      '/begin',
      expect.objectContaining({ operationId: expect.stringMatching(/^[A-Za-z0-9_-]{20}$/) }),
    );
    expect(coordinator.coordinate).not.toHaveBeenCalledWith(
      env.SUPPORT_COORDINATOR,
      expect.anything(),
      expect.objectContaining({ idempotencyKey: '123e4567-e89b-42d3-a456-426614174000' }),
    );
  });

  it('gives staff the same controls on the report message without altering the report', async () => {
    const ticket: TicketState = {
      id: '0006-mtf4xj8k-u1ep8z',
      channelId: '666666666666666666',
      userId: USER_ID,
      username: 'Tester',
      category: 'Bug',
      title: 'Kalpa: Install failed',
      description: 'It failed',
      status: 'open',
      source: 'kalpa',
      createdAt: new Date().toISOString(),
      embedMessageId: '777777777777777777',
    };
    tickets.createPrivateTicket.mockResolvedValue({ ticket, messageId: ticket.embedMessageId });
    await handleSupportTicket(ticketRequest(await validToken()), env);

    const { initialMessage } = tickets.createPrivateTicket.mock.calls[0][1];
    const message = initialMessage(ticket);

    // The report is the message content, so the controls have to ride on the
    // same message. Without them a Kalpa ticket has no Close button at all.
    const ids = message.components
      .flatMap((row: { components?: { custom_id: string }[] }) => row.components ?? [])
      .map((component: { custom_id: string }) => component.custom_id);
    expect(ids).toContain('ticket_close');
    expect(ids).toContain('ticket_claim');

    expect(message.content).toBe(renderSupportReport(parseSupportPayload(supportFixture())));
    expect(message.allowed_mentions).toEqual({ parse: [] });
    expect(message.embeds).toBeUndefined();
  });

  it('returns the completed ticket for a duplicate submission without creating another channel', async () => {
    coordinator.coordinate.mockImplementation(async (_namespace: unknown, path: string) =>
      path === '/begin'
        ? {
            kind: 'duplicate',
            record: { status: 'complete', channelId: '666666666666666666', ticketId: '0042' },
          }
        : { updated: true },
    );
    const response = await handleSupportTicket(ticketRequest(await validToken()), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'created',
      duplicate: true,
      ticketId: '0042',
    });
    expect(tickets.createPrivateTicket).not.toHaveBeenCalled();
  });

  it('finishes a leased recovery from the recorded channel without creating a duplicate', async () => {
    coordinator.coordinate.mockImplementation(async (_namespace: unknown, path: string) =>
      path === '/begin'
        ? {
            kind: 'start',
            recovery: true,
            record: {
              status: 'channel',
              channelId: '666666666666666666',
              ticketId: '0042',
            },
          }
        : { updated: true },
    );
    discord.sendMessage.mockResolvedValue({ id: '777777777777777777' });

    const response = await handleSupportTicket(ticketRequest(await validToken()), env);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'created',
      duplicate: true,
      ticketId: '0042',
      channelId: '666666666666666666',
    });
    expect(kv.putTicket).toHaveBeenCalled();
    expect(discord.sendMessage).toHaveBeenCalledTimes(1);
    expect(discord.getGuildChannels).not.toHaveBeenCalled();
    expect(tickets.createPrivateTicket).not.toHaveBeenCalled();
  });

  it('reports Discord failure without claiming success and records a retryable failed attempt', async () => {
    tickets.createPrivateTicket.mockRejectedValue(new Error('Discord unavailable'));
    const response = await handleSupportTicket(ticketRequest(await validToken()), env);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: 'DISCORD_UNAVAILABLE', retryable: true },
    });
    expect(coordinator.coordinate).toHaveBeenCalledWith(
      env.SUPPORT_COORDINATOR,
      '/fail',
      expect.objectContaining({
        operationId: expect.stringMatching(/^[A-Za-z0-9_-]{20}$/),
        errorCode: 'DISCORD_UNAVAILABLE',
      }),
    );
  });

  it('rejects a client-supplied Discord identity and raw diagnostic fields', async () => {
    const response = await handleSupportTicket(
      ticketRequest(await validToken(), {
        payload: supportFixture(),
        discordUserId: '999999999999999999',
      }),
      env,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    expect(tickets.createPrivateTicket).not.toHaveBeenCalled();
  });
});
