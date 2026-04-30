/**
 * KV storage helpers for ticket state.
 *
 * Key schema:
 *   ticket:{channelId}  → JSON TicketState
 *   ticket-counter      → string number (auto-increment)
 */

import type { Env, TicketState } from './types.js';

const COUNTER_KEY = 'ticket-counter';

/**
 * Read the current counter (best-effort), increment it, and return a collision-resistant ID.
 * KV is eventually consistent so concurrent Workers may read the same counter value;
 * the timestamp+random suffix provides actual uniqueness while the counter gives a
 * human-friendly prefix for display purposes.
 */
export async function nextTicketId(env: Env): Promise<string> {
  const raw = await env.TICKETS.get(COUNTER_KEY);
  let current = 0;
  if (raw !== null) {
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      current = parsed;
    }
  }
  const next = current + 1;
  await env.TICKETS.put(COUNTER_KEY, String(next));

  const counterPart = String(next).padStart(4, '0');
  const timestampPart = Date.now().toString(36);
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const randomPart = randomArray[0].toString(36);

  return `${counterPart}-${timestampPart}-${randomPart}`;
}

/** Persist a ticket state object. */
export async function putTicket(env: Env, ticket: TicketState): Promise<void> {
  await env.TICKETS.put(`ticket:${ticket.channelId}`, JSON.stringify(ticket));
}

/** Retrieve a ticket state by Discord channel ID. Returns null if not found. */
export async function getTicket(env: Env, channelId: string): Promise<TicketState | null> {
  const raw = await env.TICKETS.get(`ticket:${channelId}`);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as TicketState;
  } catch {
    console.error(`[kv] failed to parse ticket for channel ${channelId}`);
    return null;
  }
}

/** Delete a ticket state after it has been closed and archived. */
export async function deleteTicket(env: Env, channelId: string): Promise<void> {
  await env.TICKETS.delete(`ticket:${channelId}`);
}

// Allows explicit `undefined` to delete optional fields from a ticket.
type TicketPatch = { [K in keyof TicketState]?: TicketState[K] | undefined };

/** Update fields on an existing ticket. Merges partial data; undefined values delete the field. */
export async function updateTicket(
  env: Env,
  channelId: string,
  patch: TicketPatch,
): Promise<TicketState | null> {
  const existing = await getTicket(env, channelId);
  if (!existing) return null;
  const updated: TicketState = { ...existing };
  for (const [key, value] of Object.entries(patch) as [keyof TicketState, unknown][]) {
    if (value === undefined) {
      delete updated[key];
    } else {
      (updated as unknown as Record<string, unknown>)[key] = value;
    }
  }
  await putTicket(env, updated);
  return updated;
}
