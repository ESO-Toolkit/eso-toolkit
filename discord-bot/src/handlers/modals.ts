/**
 * Modal submission router.
 * Dispatches MODAL_SUBMIT interactions to the correct handler.
 */

import { handleStaffNoteModal } from '../buttons/staff-note.js';
import { handleAddUserModal, handleRemoveUserModal } from '../modals/user-management.js';
import { handleTicketFormModal } from '../modals/ticket-form.js';
import { InteractionResponseType, MessageFlags, ModalId } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleModal(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const customId = interaction.data?.custom_id ?? '';

  // Ticket form modals have a category suffix: ticket_form:Bug
  if (customId.startsWith(ModalId.TICKET_FORM)) {
    return handleTicketFormModal(env, interaction, ctx);
  }

  // Staff note modal
  if (customId === ModalId.STAFF_NOTE) {
    return handleStaffNoteModal(env, interaction, ctx);
  }

  // Add user modal
  if (customId === ModalId.ADD_USER) {
    return handleAddUserModal(env, interaction);
  }

  // Remove user modal (reuses ADD_USER ID with :remove suffix)
  if (customId === `${ModalId.ADD_USER}:remove`) {
    return handleRemoveUserModal(env, interaction);
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `❌ Unknown modal: \`${customId}\``,
      flags: MessageFlags.EPHEMERAL,
    },
  };
}
