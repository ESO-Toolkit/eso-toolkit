/**
 * /ticket add @user — adds a user to the current ticket channel.
 */

import { allow, editChannelPermissions, isStaff, Permission } from '../discord.js';
import { getTicket } from '../kv.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleTicketAdd(
  env: Env,
  interaction: DiscordInteraction,
): Promise<InteractionResponse> {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral('❌ Could not determine the current channel.');
  }

  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral('❌ This command can only be used inside a ticket channel.');
  }

  if (!isStaff(interaction)) {
    return ephemeral('❌ Only staff can add users to a ticket.');
  }

  // Get the target user from the resolved data
  const userOption = interaction.data?.options?.find((o) => o.name === 'user');
  const targetUserId = typeof userOption?.value === 'string' ? userOption.value : null;

  if (!targetUserId) {
    return ephemeral('❌ Please specify a user to add.');
  }

  const resolved = interaction.data?.resolved;
  const targetUser = resolved?.users?.[targetUserId];
  const targetUsername = targetUser?.username ?? `<@${targetUserId}>`;

  try {
    await editChannelPermissions(env, channelId, targetUserId, {
      type: 1, // member
      allow: allow(
        Permission.VIEW_CHANNEL,
        Permission.SEND_MESSAGES,
        Permission.READ_MESSAGE_HISTORY,
        Permission.EMBED_LINKS,
        Permission.ATTACH_FILES,
        Permission.ADD_REACTIONS,
        Permission.USE_EXTERNAL_EMOJIS,
      ),
    });

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `✅ Added **${targetUsername}** (<@${targetUserId}>) to the ticket.`,
      },
    };
  } catch (err) {
    console.error('[ticket-add] failed to add user:', err);
    return ephemeral('❌ Failed to add the user. Check bot permissions and try again.');
  }
}

function ephemeral(content: string): InteractionResponse {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL },
  };
}
