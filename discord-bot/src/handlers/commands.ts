/**
 * Slash command router.
 * Dispatches APPLICATION_COMMAND interactions to the correct handler.
 */

import { handleRosterConfig, handleRosterRemove } from '../commands/roster-config.js';
import { handleRosterView } from '../commands/roster-view.js';
import { handleTicketAdd } from '../commands/ticket-add.js';
import { handleTicketClose } from '../commands/ticket-close.js';
import { handleTicketRemove } from '../commands/ticket-remove.js';
import { handleTicketSetup } from '../commands/ticket-setup.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, DiscordInteractionOption, Env, InteractionResponse } from '../types.js';

export async function handleCommand(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const name = interaction.data?.name;

  if (name === 'roster') {
    const sub = interaction.data?.options?.[0];
    switch (sub?.name) {
      case 'view':
        return handleRosterView(env, withSubOptions(interaction, sub), ctx);
      case 'config':
        return handleRosterConfig(env, withSubOptions(interaction, sub), ctx);
      case 'remove':
        return handleRosterRemove(env, interaction, ctx);
      default:
        return unknownCommand(`roster ${sub?.name ?? '(none)'}`);
    }
  }

  if (name !== 'ticket') {
    return unknownCommand(name ?? '');
  }

  // Find the subcommand
  const subOptions = interaction.data?.options ?? [];
  const sub = subOptions[0];
  const subName = sub?.name;

  switch (subName) {
    case 'setup':
      return handleTicketSetup(env, interaction, ctx);

    case 'close':
      return handleTicketClose(env, interaction, ctx);

    case 'add':
      // Drill into sub-options for the user option
      if (!sub) return unknownCommand('ticket add');
      return handleTicketAdd(env, withSubOptions(interaction, sub));

    case 'remove':
      if (!sub) return unknownCommand('ticket remove');
      return handleTicketRemove(env, withSubOptions(interaction, sub));

    default:
      return unknownCommand(`ticket ${subName ?? '(none)'}`);
  }
}

/** Re-map sub-command options onto the top-level interaction data for cleaner handler code. */
function withSubOptions(
  interaction: DiscordInteraction,
  sub: DiscordInteractionOption,
): DiscordInteraction {
  const data = interaction.data ?? {};
  return {
    ...interaction,
    data: {
      ...data,
      options: sub.options ?? [],
    },
  };
}

function unknownCommand(name: string): InteractionResponse {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `❌ Unknown command: \`${name}\``,
      flags: MessageFlags.EPHEMERAL,
    },
  };
}
