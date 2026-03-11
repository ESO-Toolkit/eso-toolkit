/**
 * Handles the "Unclaim" button on a ticket embed.
 * Releases the ticket claim so another staff member can claim it.
 */

import { editMessage, Permission } from '../discord.js';
import { getTicket, updateTicket } from '../kv.js';
import { buildTicketEmbed, buildTicketActionRows } from '../modals/ticket-form.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleUnclaimButton(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral('Could not determine the channel for this ticket.');
  }

  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral('This channel does not have an associated ticket.');
  }

  if (ticket.status === 'closed') {
    return ephemeral('This ticket has been closed.');
  }

  const unclaimingUser = interaction.member?.user ?? interaction.user;
  if (!unclaimingUser) {
    return ephemeral('Could not determine your user identity.');
  }

  // Only the claimer or someone with manage channels can unclaim
  if (ticket.claimedBy !== unclaimingUser.id) {
    // Check if user has manage channels permission
    const hasPerms = interaction.member?.permissions
      ? (BigInt(interaction.member.permissions) & Permission.MANAGE_CHANNELS) === Permission.MANAGE_CHANNELS
      : false;
    if (!hasPerms) {
      return ephemeral('Only the person who claimed this ticket or a moderator can unclaim it.');
    }
  }

  // Update ticket state
  const updated = await updateTicket(env, channelId, {
    status: 'open',
    claimedBy: undefined,
    claimedByUsername: undefined,
    claimedAt: undefined,
  });

  if (!updated) {
    return ephemeral('Failed to update the ticket. Please try again.');
  }

  // Edit the original embed in the background
  if (ticket.embedMessageId) {
    ctx.waitUntil(
      (async () => {
        try {
          const rows = buildTicketActionRows(updated);
          await editMessage(env, channelId, ticket.embedMessageId!, {
            embeds: [buildTicketEmbed(updated)],
            components: rows,
          });
        } catch (err) {
          console.error('[unclaim] failed to edit embed:', err);
        }
      })(),
    );
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `↩️ <@${unclaimingUser.id}> has released their claim on this ticket.`,
    },
  };
}

function ephemeral(content: string): InteractionResponse {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL },
  };
}
