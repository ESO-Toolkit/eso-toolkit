/**
 * Handles the "Claim 🙋" button on a ticket embed.
 * Assigns the ticket to the staff member who clicked, updates the embed.
 */

import { editMessage } from '../discord.js';
import { getTicket, updateTicket } from '../kv.js';
import { buildTicketEmbed, buildTicketActionRows } from '../modals/ticket-form.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleClaimButton(
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
    return ephemeral('This ticket has already been closed.');
  }

  const claimingUser = interaction.member?.user ?? interaction.user;
  if (!claimingUser) {
    return ephemeral('Could not determine your user identity.');
  }

  if (ticket.claimedBy === claimingUser.id) {
    return ephemeral('You have already claimed this ticket.');
  }

  // Update ticket state
  const updated = await updateTicket(env, channelId, {
    status: 'claimed',
    claimedBy: claimingUser.id,
    claimedByUsername: claimingUser.username,
  });

  if (!updated) {
    return ephemeral('Failed to update the ticket. Please try again.');
  }

  // Edit the original embed in the background
  if (ticket.embedMessageId) {
    ctx.waitUntil(
      (async () => {
        try {
          await editMessage(env, channelId, ticket.embedMessageId!, {
            embeds: [buildTicketEmbed(updated)],
            components: buildTicketActionRows(updated),
          });
        } catch (err) {
          console.error('[claim] failed to edit embed:', err);
        }
      })(),
    );
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `✅ <@${claimingUser.id}> has claimed this ticket.`,
    },
  };
}

function ephemeral(content: string): InteractionResponse {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL },
  };
}
