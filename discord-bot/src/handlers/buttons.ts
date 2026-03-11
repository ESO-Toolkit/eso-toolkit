/**
 * Button interaction router.
 * Dispatches MESSAGE_COMPONENT interactions to the correct handler.
 */

import { handleAddUserButton } from '../buttons/add-user.js';
import { handleClaimButton } from '../buttons/claim.js';
import { handleCloseButton } from '../buttons/close.js';
import { handleConfirmCloseButton } from '../buttons/confirm-close.js';
import { handleCreateTicketButton } from '../buttons/create-ticket.js';
import { handleRemoveUserButton } from '../buttons/remove-user.js';
import { handleStaffNoteButton } from '../buttons/staff-note.js';
import { handleTemplateButton } from '../buttons/template-response.js';
import { handleUnclaimButton } from '../buttons/unclaim.js';
import { ButtonId, InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleButton(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const customId = interaction.data?.custom_id ?? '';

  // Panel buttons: create_ticket:bug | create_ticket:feature | create_ticket:feedback
  if (
    customId === ButtonId.CREATE_BUG ||
    customId === ButtonId.CREATE_FEATURE ||
    customId === ButtonId.CREATE_FEEDBACK
  ) {
    return handleCreateTicketButton(env, interaction);
  }

  // Template response buttons: ticket_template:acknowledged etc.
  if (customId.startsWith(ButtonId.TEMPLATE_PREFIX)) {
    const templateKey = customId.slice(ButtonId.TEMPLATE_PREFIX.length);
    return handleTemplateButton(env, interaction, templateKey);
  }

  switch (customId) {
    case ButtonId.CLAIM:
      return handleClaimButton(env, interaction, ctx);

    case ButtonId.UNCLAIM:
      return handleUnclaimButton(env, interaction, ctx);

    case ButtonId.CLOSE:
      return handleCloseButton(env, interaction);

    case ButtonId.CONFIRM_CLOSE:
      return handleConfirmCloseButton(env, interaction, ctx);

    case ButtonId.ADD_USER:
      return handleAddUserButton(env);

    case ButtonId.REMOVE_USER:
      return handleRemoveUserButton(env);

    case ButtonId.STAFF_NOTE:
      return handleStaffNoteButton(env, interaction);

    default:
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `❌ Unknown button: \`${customId}\``,
          flags: MessageFlags.EPHEMERAL,
        },
      };
  }
}
