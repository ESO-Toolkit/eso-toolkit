/**
 * Channel name builder from guild templates and roster context.
 *
 * Supports tokens: {day-short}, {time}, {trial}, {tag}
 * Discord channel names are lowercased and sanitized (only alphanumeric + hyphens).
 */

import type { ChannelNameContext } from './types.js';

/**
 * Build a Discord channel name from a template and context values.
 *
 * - Replaces known tokens with their context values (or empty string if absent).
 * - Sanitizes the result for Discord: lowercase, replace spaces/underscores with hyphens,
 *   strip non-alphanumeric/non-hyphen characters, collapse multiple hyphens, trim hyphens.
 * - Returns 'roster' if the result is empty after sanitization.
 */
export function buildChannelName(template: string, context: ChannelNameContext): string {
  let name = template
    .replace(/\{day-short\}/gi, context.dayShort ?? '')
    .replace(/\{time\}/gi, context.time ?? '')
    .replace(/\{trial\}/gi, context.trial ?? '')
    .replace(/\{tag\}/gi, context.tag ?? '');

  // Discord channel name rules: lowercase, a-z 0-9 hyphens only
  name = name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

  return name || 'roster';
}

/**
 * Resolve the final channel name for a roster.
 *
 * Priority:
 *   1. channelNameOverride (if provided) → sanitize and use directly.
 *   2. Guild template + context → buildChannelName().
 */
export function resolveChannelName(
  guildPattern: string,
  context: ChannelNameContext,
  channelNameOverride?: string,
): string {
  if (channelNameOverride?.trim()) {
    // Sanitize the override through buildChannelName (pass it as the literal template)
    return buildChannelName(channelNameOverride, {});
  }
  return buildChannelName(guildPattern, context);
}
