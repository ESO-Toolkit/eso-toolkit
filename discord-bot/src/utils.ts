/**
 * Shared utility functions used across the Discord bot handlers.
 */

import { InteractionResponseType, MessageFlags } from './types.js';
import type { InteractionResponse } from './types.js';

/** Build an ephemeral (private) response message. */
export function ephemeral(content: string): InteractionResponse {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL },
  };
}

/** Extract a text input value from modal interaction components by custom_id. */
export function findInputValue(
  rows: { type: number; components?: { type: number; custom_id?: string; value?: string }[] }[],
  customId: string,
): string | undefined {
  for (const row of rows) {
    for (const comp of row.components ?? []) {
      if (comp.custom_id === customId) return comp.value;
    }
  }
  return undefined;
}

/** Format a millisecond duration as a human-readable string (e.g. "2d 5h 30m"). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push('<1m');
  return parts.join(' ');
}
