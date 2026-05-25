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
import { handleRosterRefreshButton } from '../buttons/roster-refresh.js';
import { handleRosterSignupButton } from '../buttons/roster-signup.js';
import { handleStaffNoteButton } from '../buttons/staff-note.js';
import { handleTemplateButton } from '../buttons/template-response.js';
import { handleUnclaimButton } from '../buttons/unclaim.js';
import { ButtonId, InteractionResponseType, MessageFlags, RosterButtonId } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleButton(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const customId = interaction.data?.custom_id ?? '';

  // ── Ticket buttons ──────────────────────────────────────────────────────

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

  // ── Roster buttons ──────────────────────────────────────────────────────

  // Sign-up buttons: roster_signup:tank:<rosterId>, roster_signup:healer:<rosterId>, etc.
  if (customId.startsWith(RosterButtonId.SIGNUP_PREFIX)) {
    const parts = customId.slice(RosterButtonId.SIGNUP_PREFIX.length).split(':');
    const role = parts[0]; // tank, healer, dd
    return handleRosterSignupButton(env, interaction, role);
  }

  // Refresh button: roster_refresh:<rosterId>
  if (customId.startsWith(`${RosterButtonId.REFRESH}:`)) {
    return handleRosterRefreshButton(env, interaction, ctx);
  }

  // ── Ticket action buttons ───────────────────────────────────────────────

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
      return handleAddUserButton(env, interaction);

    case ButtonId.REMOVE_USER:
      return handleRemoveUserButton(env, interaction);

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
