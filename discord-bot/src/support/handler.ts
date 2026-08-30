import { DiscordApiError, getGuildChannels, getGuildMember, sendMessage } from '../discord.js';
import { getTicket, putTicket } from '../kv.js';
import { buildTicketActionRows } from '../modals/ticket-form.js';
import { createPrivateTicket } from '../tickets/service.js';
import type { Env, TicketState } from '../types.js';
import {
  parseSupportPayload,
  renderSupportReport,
  sha256Hex,
  SupportValidationError,
  supportTicketMetadata,
  type SupportTicketPayload,
} from './contract.js';
import { coordinate } from './coordinator.js';
import { auditHash, mintSupportSession, verifySupportSession } from './token.js';

const DISCORD_API = 'https://discord.com/api/v10';
const BODY_LIMIT = 8_192;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{32,128}$/;
const DISCORD_SNOWFLAKE = /^\d{17,20}$/;

type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'NOT_A_MEMBER'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'
  | 'IDEMPOTENCY_CONFLICT'
  | 'REPORT_MISMATCH'
  | 'DISCORD_UNAVAILABLE'
  | 'TICKET_RECOVERING'
  | 'INTERNAL_ERROR';

function response(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function failure(
  requestId: string,
  code: ErrorCode,
  message: string,
  status: number,
  retryable = false,
): Response {
  return response({ error: { code, message, retryable }, requestId }, status);
}

function bearer(request: Request): string | null {
  const value = request.headers.get('Authorization');
  if (!value?.startsWith('Bearer ')) return null;
  const token = value.slice(7);
  return token.length > 0 && token.length <= 2_048 ? token : null;
}

async function requestBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > BODY_LIMIT) throw new SupportValidationError('The request is too large');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > BODY_LIMIT) {
    throw new SupportValidationError('The request is too large');
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new SupportValidationError('The request is not valid JSON');
  }
}

async function callerIpHash(request: Request, env: Env): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  return auditHash(env.SUPPORT_AUDIT_SECRET, `ip:${ip}`);
}

async function logAudit(
  env: Env,
  event: string,
  requestId: string,
  userId?: string,
  code?: string,
): Promise<void> {
  try {
    const user = userId ? await auditHash(env.SUPPORT_AUDIT_SECRET, `user:${userId}`) : undefined;
    console.log(JSON.stringify({ event, requestId, ...(user && { user }), ...(code && { code }) }));
  } catch {
    console.error(JSON.stringify({ event: 'support_audit_failed', requestId }));
  }
}

async function updateCoordination(
  env: Env,
  path: '/channel' | '/complete' | '/fail',
  body: Record<string, unknown>,
): Promise<void> {
  const result = await coordinate(env.SUPPORT_COORDINATOR, path, body);
  if (result.updated !== true) throw new Error(`Support coordinator rejected ${path}`);
}

async function failStartedCoordination(
  env: Env,
  requestId: string,
  coordinated: Record<string, unknown>,
  operationId: string,
  userHash: string,
  errorCode: ErrorCode,
): Promise<void> {
  if (coordinated.kind !== 'start') return;
  try {
    await updateCoordination(env, '/fail', {
      operationId,
      userHash,
      requestId,
      errorCode,
      now: Date.now(),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'support_internal_error',
        requestId,
        stage: 'coordinator-fail',
        type: error instanceof Error ? error.name : 'unknown',
      }),
    );
  }
}

export async function handleSupportSession(request: Request, env: Env): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (request.method !== 'POST')
    return failure(requestId, 'INVALID_REQUEST', 'Method not allowed.', 405);
  const token = bearer(request);
  if (!token) return failure(requestId, 'AUTH_REQUIRED', 'Sign in with Discord to continue.', 401);

  try {
    const ipHash = await callerIpHash(request, env);
    const limited = await coordinate(env.SUPPORT_COORDINATOR, '/session-rate', {
      ipHash,
      now: Date.now(),
    });
    if (limited.allowed !== true) {
      await logAudit(env, 'support_session_denied', requestId, undefined, 'RATE_LIMITED');
      return failure(
        requestId,
        'RATE_LIMITED',
        'Too many attempts. Please wait and try again.',
        429,
        true,
      );
    }

    const meResponse = await fetch(`${DISCORD_API}/oauth2/@me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (meResponse.status === 401 || meResponse.status === 403) {
      return failure(
        requestId,
        'AUTH_EXPIRED',
        'Your Discord sign-in expired. Please sign in again.',
        401,
      );
    }
    if (!meResponse.ok) {
      return failure(
        requestId,
        'DISCORD_UNAVAILABLE',
        'Discord could not verify your sign-in.',
        503,
        true,
      );
    }
    const oauthIdentity = (await meResponse.json()) as {
      application?: { id?: string };
      scopes?: unknown;
      user?: { id?: string; username?: string };
    };
    const me = oauthIdentity.user;
    if (
      !DISCORD_SNOWFLAKE.test(env.DISCORD_OAUTH_CLIENT_ID) ||
      oauthIdentity.application?.id !== env.DISCORD_OAUTH_CLIENT_ID ||
      !Array.isArray(oauthIdentity.scopes) ||
      !oauthIdentity.scopes.includes('identify') ||
      !oauthIdentity.scopes.includes('guilds') ||
      !me?.id ||
      !DISCORD_SNOWFLAKE.test(me.id) ||
      !me.username
    )
      return failure(requestId, 'AUTH_EXPIRED', 'Discord returned an invalid identity.', 401);

    try {
      await getGuildMember(env, env.GUILD_ID, me.id);
    } catch (error) {
      if (error instanceof DiscordApiError && error.status === 404) {
        await logAudit(env, 'support_session_denied', requestId, me.id, 'NOT_A_MEMBER');
        return failure(
          requestId,
          'NOT_A_MEMBER',
          'Join the ESO Toolkit Discord server before creating a ticket.',
          403,
        );
      }
      return failure(
        requestId,
        'DISCORD_UNAVAILABLE',
        'Discord could not verify server membership.',
        503,
        true,
      );
    }

    const session = await mintSupportSession(env.SUPPORT_SESSION_SECRET, {
      id: me.id,
      username: me.username,
    });
    await logAudit(env, 'support_session_created', requestId, me.id);
    return response({ ...session, requestId });
  } catch (error) {
    await logAudit(env, 'support_session_failed', requestId, undefined, 'INTERNAL_ERROR');
    console.error(
      JSON.stringify({
        event: 'support_internal_error',
        requestId,
        stage: 'session',
        type: error instanceof Error ? error.name : 'unknown',
      }),
    );
    return failure(
      requestId,
      'INTERNAL_ERROR',
      'Support sign-in could not be completed.',
      500,
      true,
    );
  }
}

async function finishExistingChannel(
  env: Env,
  payload: SupportTicketPayload,
  report: string,
  user: { id: string; username: string },
  channelId: string,
  ticketId: string,
  nonce: string,
): Promise<TicketState> {
  const existing = await getTicket(env, channelId);
  if (existing && (existing.userId !== user.id || existing.source !== 'kalpa')) {
    throw new Error('Recovered ticket ownership did not match');
  }
  if (existing?.embedMessageId) return existing;
  const metadata = supportTicketMetadata(payload);
  const ticket: TicketState = existing ?? {
    id: ticketId,
    channelId,
    userId: user.id,
    username: user.username,
    category: metadata.category,
    title: metadata.title,
    description: payload.description,
    status: 'open',
    source: 'kalpa',
    createdAt: new Date().toISOString(),
  };
  await putTicket(env, ticket);
  const message = await sendMessage(env, channelId, {
    content: report,
    components: buildTicketActionRows(ticket),
    allowed_mentions: { parse: [] },
    nonce,
    enforce_nonce: true,
    flags: 1 << 2,
  });
  ticket.embedMessageId = message.id;
  await putTicket(env, ticket);
  return ticket;
}

export async function handleSupportTicket(request: Request, env: Env): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (request.method !== 'POST')
    return failure(requestId, 'INVALID_REQUEST', 'Method not allowed.', 405);
  const token = bearer(request);
  const idempotencyKey = request.headers.get('Idempotency-Key') ?? '';
  if (!token)
    return failure(requestId, 'AUTH_REQUIRED', 'Your secure support session is missing.', 401);
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return failure(requestId, 'INVALID_REQUEST', 'The request identifier is invalid.', 400);
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return failure(requestId, 'INVALID_REQUEST', 'Content-Type must be application/json.', 415);
  }

  const claims = await verifySupportSession(env.SUPPORT_SESSION_SECRET, token);
  if (!claims)
    return failure(
      requestId,
      'AUTH_EXPIRED',
      'Your secure support session expired. Sign in again.',
      401,
    );

  let payload: SupportTicketPayload;
  let report: string;
  try {
    const body = await requestBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new SupportValidationError('The request body is invalid');
    }
    const keys = Object.keys(body);
    if (keys.length !== 1 || keys[0] !== 'payload') {
      throw new SupportValidationError('The request body contains unsupported fields');
    }
    payload = parseSupportPayload((body as { payload?: unknown }).payload);
    report = renderSupportReport(payload);
  } catch (error) {
    const message =
      error instanceof SupportValidationError ? error.message : 'The report is invalid';
    return failure(requestId, 'INVALID_REQUEST', message, 400);
  }

  // Report fidelity. Kalpa sends the SHA-256 of the report text it rendered and
  // the user reviewed; this re-renders from the validated payload and compares.
  // A mismatch means Kalpa's redaction/rendering rules and this Worker's copy of
  // them have drifted, so the message about to be posted is not the message the
  // user consented to — refuse before `/begin`, which is where side effects and
  // idempotency state start.
  //
  // This is NOT an integrity control. The hash travels in the same URL fragment
  // as the payload, so a hostile client simply recomputes it; it can only ever
  // detect drift between our own three implementations. Nothing else here may be
  // relaxed on the strength of it — the payload is still fully re-validated and
  // re-rendered server-side, exactly as it was before this check existed.
  if (payload.reportSha256 !== undefined && payload.reportSha256 !== (await sha256Hex(report))) {
    await logAudit(env, 'support_ticket_denied', requestId, claims.sub, 'REPORT_MISMATCH');
    return failure(
      requestId,
      'REPORT_MISMATCH',
      'This report does not match what Kalpa showed you, so nothing was created. Copy it and use the manual ticket desk.',
      400,
    );
  }

  let userHash: string;
  let operationId: string;
  let coordinated: Record<string, unknown>;
  try {
    const [resolvedUserHash, ipHash, resolvedOperationId] = await Promise.all([
      auditHash(env.SUPPORT_AUDIT_SECRET, `user:${claims.sub}`),
      callerIpHash(request, env),
      auditHash(env.SUPPORT_AUDIT_SECRET, `idem:${claims.sub}:${idempotencyKey}`),
    ]);
    userHash = resolvedUserHash;
    operationId = resolvedOperationId;
    coordinated = await coordinate(env.SUPPORT_COORDINATOR, '/begin', {
      operationId,
      userHash,
      ipHash,
      requestId,
      now: Date.now(),
    });
  } catch (error) {
    await logAudit(env, 'support_ticket_failed', requestId, claims.sub, 'INTERNAL_ERROR');
    console.error(
      JSON.stringify({
        event: 'support_internal_error',
        requestId,
        stage: 'coordinator-begin',
        type: error instanceof Error ? error.name : 'unknown',
      }),
    );
    return failure(
      requestId,
      'INTERNAL_ERROR',
      'Support ticket creation could not be started. Your report is still available.',
      500,
      true,
    );
  }
  if (coordinated.kind === 'conflict') {
    return failure(
      requestId,
      'IDEMPOTENCY_CONFLICT',
      'This request identifier belongs to another session.',
      409,
    );
  }
  if (coordinated.kind === 'rate_limited') {
    await logAudit(env, 'support_ticket_denied', requestId, claims.sub, 'RATE_LIMITED');
    return failure(
      requestId,
      'RATE_LIMITED',
      'You have reached the support ticket limit. Please wait before trying again.',
      429,
      true,
    );
  }

  try {
    await getGuildMember(env, env.GUILD_ID, claims.sub);
  } catch (error) {
    if (error instanceof DiscordApiError && error.status === 404) {
      await failStartedCoordination(
        env,
        requestId,
        coordinated,
        operationId,
        userHash,
        'NOT_A_MEMBER',
      );
      await logAudit(env, 'support_ticket_denied', requestId, claims.sub, 'NOT_A_MEMBER');
      return failure(
        requestId,
        'NOT_A_MEMBER',
        'This Discord account is no longer a server member.',
        403,
      );
    }
    await failStartedCoordination(
      env,
      requestId,
      coordinated,
      operationId,
      userHash,
      'DISCORD_UNAVAILABLE',
    );
    return failure(
      requestId,
      'DISCORD_UNAVAILABLE',
      'Discord could not verify server membership.',
      503,
      true,
    );
  }

  const record = coordinated.record as
    { status?: string; channelId?: string; ticketId?: string } | undefined;
  if (
    coordinated.kind === 'duplicate' &&
    record?.status === 'complete' &&
    record.channelId &&
    record.ticketId
  ) {
    return response({
      status: 'created',
      ticketId: record.ticketId,
      channelId: record.channelId,
      channelUrl: `https://discord.com/channels/${env.GUILD_ID}/${record.channelId}`,
      duplicate: true,
      requestId,
    });
  }

  try {
    if (record?.channelId && record.ticketId) {
      const ticket = await finishExistingChannel(
        env,
        payload,
        report,
        { id: claims.sub, username: claims.username },
        record.channelId,
        record.ticketId,
        operationId,
      );
      await updateCoordination(env, '/complete', {
        operationId,
        userHash,
        requestId,
        now: Date.now(),
      });
      await logAudit(env, 'support_ticket_recovered', requestId, claims.sub);
      return response({
        status: 'created',
        ticketId: ticket.id,
        channelId: ticket.channelId,
        channelUrl: `https://discord.com/channels/${env.GUILD_ID}/${ticket.channelId}`,
        duplicate: true,
        requestId,
      });
    }
    if (coordinated.kind === 'duplicate') {
      return failure(
        requestId,
        'TICKET_RECOVERING',
        'Your ticket request is still being processed. Try again shortly.',
        409,
        true,
      );
    }

    const marker = `kalpa:${operationId}`;
    const matchingChannel =
      coordinated.recovery === true
        ? (await getGuildChannels(env, env.GUILD_ID)).find(
            (channel) =>
              channel.parent_id === env.TICKET_CATEGORY_ID && channel.topic?.includes(marker),
          )
        : undefined;
    if (matchingChannel) {
      const ticketId = matchingChannel.topic?.match(/Support ticket #([^ ]+)/)?.[1];
      if (!ticketId) throw new Error('Recovered support channel has no ticket ID');
      await updateCoordination(env, '/channel', {
        operationId,
        userHash,
        requestId,
        channelId: matchingChannel.id,
        ticketId,
        now: Date.now(),
      });
      const ticket = await finishExistingChannel(
        env,
        payload,
        report,
        { id: claims.sub, username: claims.username },
        matchingChannel.id,
        ticketId,
        operationId,
      );
      await updateCoordination(env, '/complete', {
        operationId,
        userHash,
        requestId,
        now: Date.now(),
      });
      await logAudit(env, 'support_ticket_reconciled', requestId, claims.sub);
      return response({
        status: 'created',
        ticketId: ticket.id,
        channelId: ticket.channelId,
        channelUrl: `https://discord.com/channels/${env.GUILD_ID}/${ticket.channelId}`,
        duplicate: true,
        requestId,
      });
    }

    const metadata = supportTicketMetadata(payload);
    const { ticket } = await createPrivateTicket(env, {
      user: { id: claims.sub, username: claims.username },
      category: metadata.category,
      title: metadata.title,
      description: payload.description,
      source: 'kalpa',
      topicMarker: marker,
      messageNonce: operationId,
      initialMessage: (ticket) => ({
        content: report,
        components: buildTicketActionRows(ticket),
        allowed_mentions: { parse: [] },
        flags: 1 << 2,
      }),
      onChannelCreated: async (channelId, ticketId) => {
        await updateCoordination(env, '/channel', {
          operationId,
          userHash,
          requestId,
          channelId,
          ticketId,
          now: Date.now(),
        });
      },
    });
    await updateCoordination(env, '/complete', {
      operationId,
      userHash,
      requestId,
      now: Date.now(),
    });
    await logAudit(env, 'support_ticket_created', requestId, claims.sub);
    return response(
      {
        status: 'created',
        ticketId: ticket.id,
        channelId: ticket.channelId,
        channelUrl: `https://discord.com/channels/${env.GUILD_ID}/${ticket.channelId}`,
        duplicate: false,
        requestId,
      },
      201,
    );
  } catch (error) {
    try {
      await updateCoordination(env, '/fail', {
        operationId,
        userHash,
        requestId,
        errorCode: 'DISCORD_UNAVAILABLE',
        now: Date.now(),
      });
    } catch (coordinationError) {
      console.error(
        JSON.stringify({
          event: 'support_internal_error',
          requestId,
          stage: 'coordinator-fail',
          type: coordinationError instanceof Error ? coordinationError.name : 'unknown',
        }),
      );
    }
    await logAudit(env, 'support_ticket_failed', requestId, claims.sub, 'DISCORD_UNAVAILABLE');
    console.error(
      JSON.stringify({
        event: 'support_internal_error',
        requestId,
        stage: 'ticket',
        type: error instanceof Error ? error.name : 'unknown',
      }),
    );
    return failure(
      requestId,
      'DISCORD_UNAVAILABLE',
      'Discord could not finish creating the ticket. Your report is still available.',
      503,
      true,
    );
  }
}
