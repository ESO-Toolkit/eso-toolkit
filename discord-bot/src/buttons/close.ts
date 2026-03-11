/**
 * Handles the "Close 🔒" button on a ticket embed.
 * Responds with an ephemeral confirmation prompt.
 */

import { isStaff } from '../discord.js';
import { ButtonId, ButtonStyle, ComponentType, InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export function handleCloseButton(
  _env: Env,
  interaction: DiscordInteraction,
): InteractionResponse {
  if (!isStaff(interaction)) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: '❌ Only staff can close tickets.', flags: MessageFlags.EPHEMERAL },
    };
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content:
        '⚠️ Are you sure you want to close this ticket? This will save a transcript and delete the channel.',
      flags: MessageFlags.EPHEMERAL,
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.DANGER,
              label: 'Yes, close it',
              emoji: { name: '🔒' },
              custom_id: ButtonId.CONFIRM_CLOSE,
            },
          ],
        },
      ],
    },
  };
}
