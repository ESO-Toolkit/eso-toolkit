import { getDiscordBotApiUrl } from '@/features/auth/discord-auth';

import type { SupportTicketPayload } from './support-draft';

const SUPPORT_GUILD_ID = '1375703719995244686';

export type SupportErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'NOT_A_MEMBER'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'
  | 'IDEMPOTENCY_CONFLICT'
  | 'DISCORD_UNAVAILABLE'
  | 'ORIGIN_NOT_ALLOWED'
  | 'TICKET_RECOVERING'
  | 'INTERNAL_ERROR';

export class SupportApiError extends Error {
  constructor(
    public readonly code: SupportErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'SupportApiError';
  }
}

interface ErrorBody {
  error?: { code?: SupportErrorCode; message?: string; retryable?: boolean };
  requestId?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & ErrorBody;
  if (!response.ok) {
    throw new SupportApiError(
      body.error?.code ?? 'INTERNAL_ERROR',
      body.error?.message ?? 'Support is temporarily unavailable.',
      body.error?.retryable ?? response.status >= 500,
      body.requestId,
    );
  }
  return body;
}

export async function createSupportSession(
  discordToken: string,
): Promise<{ token: string; expiresAt: string }> {
  const response = await fetch(`${getDiscordBotApiUrl()}/discord/support/kalpa/session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${discordToken}` },
  });
  return parseResponse(response);
}

export interface CreatedTicket {
  status: 'created';
  channelId: string;
  channelUrl: string;
  ticketId: string;
}

/**
 * Ticket IDs are `<counter>-<base36 timestamp>-<base36 random>`, produced by
 * `nextTicketId` in the bot's KV module. This was previously a digits-only
 * pattern, which rejected every real ticket the service has ever issued and
 * reported a successfully created ticket as a failure.
 */
const TICKET_ID = /^\d{4,}-[0-9a-z]{1,16}-[0-9a-z]{1,16}$/;

export function parseCreatedTicket(value: unknown): CreatedTicket | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  if (
    result.status !== 'created' ||
    typeof result.ticketId !== 'string' ||
    !TICKET_ID.test(result.ticketId) ||
    typeof result.channelId !== 'string' ||
    !/^\d{17,20}$/.test(result.channelId) ||
    result.channelUrl !== `https://discord.com/channels/${SUPPORT_GUILD_ID}/${result.channelId}`
  ) {
    return null;
  }
  return {
    status: 'created',
    ticketId: result.ticketId,
    channelId: result.channelId,
    channelUrl: result.channelUrl,
  };
}

export async function createKalpaTicket(
  supportToken: string,
  idempotencyKey: string,
  payload: SupportTicketPayload,
): Promise<CreatedTicket> {
  const response = await fetch(`${getDiscordBotApiUrl()}/discord/support/kalpa/tickets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supportToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ payload }),
  });
  const result = await parseResponse<unknown>(response);
  const ticket = parseCreatedTicket(result);
  if (!ticket) {
    throw new SupportApiError(
      'INTERNAL_ERROR',
      'Support returned an invalid ticket confirmation. Your report is still available.',
      true,
    );
  }
  return ticket;
}
