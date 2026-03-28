/**
 * Roster sign-up button handler.
 *
 * When a user clicks Tank/Healer/DD on a roster embed, this handler
 * posts a visible message indicating their interest. A future iteration
 * can update the roster data via the API.
 */

import { InteractionResponseType } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export function handleRosterSignupButton(
  _env: Env,
  interaction: DiscordInteraction,
  role: string,
): InteractionResponse {
  const username = interaction.member?.user?.username ?? 'Someone';
  const userId = interaction.member?.user?.id;

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
    },
  };
}
