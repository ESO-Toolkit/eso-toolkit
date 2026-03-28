/**
 * Handles the "Staff Note" button on a ticket embed.
 * Shows a modal to add internal notes visible to staff.
 */

import { editMessage, isStaff } from '../discord.js';
import { getTicket, updateTicket } from '../kv.js';
import { buildTicketEmbed, buildTicketActionRows } from '../modals/ticket-form.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  ModalId,
  TextInputStyle,
} from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';
import { ephemeral, findInputValue } from '../utils.js';

export function handleStaffNoteButton(_env: Env, interaction: DiscordInteraction): InteractionResponse {
  if (!isStaff(interaction)) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: '❌ Only staff can add notes to tickets.', flags: MessageFlags.EPHEMERAL },
    };
  }

  return {
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: ModalId.STAFF_NOTE,
      title: 'Staff Notes',
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              custom_id: 'note_content',
              label: 'Internal Notes (staff only)',
              style: TextInputStyle.PARAGRAPH,
              placeholder: 'Add notes about this ticket that only staff can see...',
              required: false,
              max_length: 1000,
            },
          ],
        },
      ],
    },
  };
}

export async function handleStaffNoteModal(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral('Could not determine the channel for this ticket.');
  }

  if (!isStaff(interaction)) {
    return ephemeral('❌ Only staff can add notes to tickets.');
  }

  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral('This channel does not have an associated ticket.');
  }

  // Extract note content from modal
  const components = interaction.data?.components ?? [];
  const noteContent = findInputValue(components as unknown as Parameters<typeof findInputValue>[0], 'note_content') ?? '';

  const staffUser = interaction.member?.user ?? interaction.user;

  // Build the note with timestamp and author
  const timestamp = new Date().toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });

  let newNotes = ticket.staffNotes || '';
  if (noteContent.trim()) {
    newNotes = `${newNotes}\n[${timestamp}] **${staffUser?.username ?? 'Staff'}**: ${noteContent}`.trim();
  }

  // Update ticket state
  const updated = await updateTicket(env, channelId, {
    staffNotes: newNotes || undefined,
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
          console.error('[staff-note] failed to edit embed:', err);
        }
      })(),
    );
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: noteContent.trim()
        ? '📝 Staff note added successfully.'
        : '📝 Staff notes cleared.',
      flags: MessageFlags.EPHEMERAL,
    },
  };
}

