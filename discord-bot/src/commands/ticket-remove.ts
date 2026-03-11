/**
 * /ticket remove @user — removes a user from the current ticket channel.
 */

import { deleteChannelPermission, isStaff } from '../discord.js';
import { getTicket } from '../kv.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleTicketRemove(
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
    return ephemeral('❌ Only staff can remove users from a ticket.');
  }

  const userOption = interaction.data?.options?.find((o) => o.name === 'user');
  const targetUserId = typeof userOption?.value === 'string' ? userOption.value : null;

  if (!targetUserId) {
    return ephemeral('❌ Please specify a user to remove.');
  }

  // Prevent removing the ticket owner
  if (targetUserId === ticket.userId) {
    return ephemeral('❌ You cannot remove the ticket creator from their own ticket.');
  }

  const resolved = interaction.data?.resolved;
  const targetUser = resolved?.users?.[targetUserId];
  const targetUsername = targetUser?.username ?? `<@${targetUserId}>`;

  try {
    await deleteChannelPermission(env, channelId, targetUserId);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `✅ Removed **${targetUsername}** (<@${targetUserId}>) from the ticket.`,
      },
    };
  } catch (err) {
    console.error('[ticket-remove] failed to remove user:', err);
    return ephemeral('❌ Failed to remove the user. Check bot permissions and try again.');
  }
}

function ephemeral(content: string): InteractionResponse {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL },
  };
}
