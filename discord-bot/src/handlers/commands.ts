/**
 * Slash command router.
 * Dispatches APPLICATION_COMMAND interactions to the correct handler.
 */

import { handleRosterConfig } from '../commands/roster-config.js';
import { handleRosterLink } from '../commands/roster-link.js';
import { handleRosterPublish } from '../commands/roster-publish.js';
import { handleRosterRefresh } from '../commands/roster-refresh.js';
import { handleRosterSetup } from '../commands/roster-setup.js';
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

  switch (name) {
    case 'ticket':
      return routeTicketCommand(env, interaction, ctx);

    case 'roster':
      return routeRosterCommand(env, interaction, ctx);

    default:
      return unknownCommand(name ?? '');
  }
}

// ── Ticket subcommands ──────────────────────────────────────────────────────

function routeTicketCommand(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const subOptions = interaction.data?.options ?? [];
  const sub = subOptions[0];
  const subName = sub?.name;

  switch (subName) {
    case 'setup':
      return handleTicketSetup(env, interaction, ctx);

    case 'close':
      return handleTicketClose(env, interaction, ctx);

    case 'add':
      if (!sub) return Promise.resolve(unknownCommand('ticket add'));
      return handleTicketAdd(env, withSubOptions(interaction, sub));

    case 'remove':
      if (!sub) return Promise.resolve(unknownCommand('ticket remove'));
      return handleTicketRemove(env, withSubOptions(interaction, sub));

    default:
      return Promise.resolve(unknownCommand(`ticket ${subName ?? '(none)'}`));
  }
}

// ── Roster subcommands ──────────────────────────────────────────────────────

function routeRosterCommand(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const subOptions = interaction.data?.options ?? [];
  const sub = subOptions[0];
  const subName = sub?.name;

  // Re-map sub-options for the handler
  const withSub = sub ? withSubOptions(interaction, sub) : interaction;

  switch (subName) {
    case 'link':
      return handleRosterLink(env, withSub, ctx);

    case 'publish':
      return handleRosterPublish(env, withSub, ctx);

    case 'refresh':
      return handleRosterRefresh(env, withSub, ctx);

    case 'config':
      return handleRosterConfig(env, withSub, ctx);

    case 'setup':
      return handleRosterSetup(env, withSub);

    default:
      return Promise.resolve(unknownCommand(`roster ${subName ?? '(none)'}`));
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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
