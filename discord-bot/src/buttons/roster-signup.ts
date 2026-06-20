/**
 * Roster sign-up button handler (v0 stub).
 *
 * When a user clicks Tank/Healer/DD on a roster embed, this handler
 * posts a visible chat message indicating their interest. It does NOT
 * persist a sign-up or update the roster data — a future iteration will
 * write back to the API. Until then, a raid lead must manually confirm
 * slots.
 */

import { checkRosterRateLimit } from '../roster/kv.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleRosterSignupButton(
  env: Env,
  interaction: DiscordInteraction,
  role: string,
): Promise<InteractionResponse> {
  const username = interaction.member?.user?.username ?? 'Someone';
  const userId = interaction.member?.user?.id;

  // Each click posts a public message, so throttle per user to prevent a
  // signup-button click loop from flooding the channel. Ephemeral nudge when
  // exceeded so the spammer (not the channel) sees the limit.
  const guildId = interaction.guild_id;
  if (guildId && userId) {
    const allowed = await checkRosterRateLimit(env, `signup:${guildId}:${userId}`, 5, 60);
    if (!allowed) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "⏳ You're signing up too quickly. Please wait a minute and try again.",
          flags: MessageFlags.EPHEMERAL,
        },
      };
    }
  }

  const roleEmoji: Record<string, string> = {
    tank: '🛡️',
    healer: '💚',
    dd: '⚔️',
  };

  const emoji = roleEmoji[role] ?? '📜';
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `${emoji} **${username}** is interested in **${roleName}**!${userId ? ` (<@${userId}>)` : ''}\n-# *A raid lead will confirm your slot.*`,
      allowed_mentions: { parse: [], users: userId ? [userId] : [] },
    },
  };
}
