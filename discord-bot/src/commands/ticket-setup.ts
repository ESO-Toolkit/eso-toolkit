/**
 * /ticket setup — admin-only command.
 * Posts the ticket panel embed with 3 action buttons in #create-ticket.
 */

import { editFollowup, Permission, sendMessage } from '../discord.js';
import {
  ButtonId,
  ButtonStyle,
  Colors,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';
import { ephemeral } from '../utils.js';

export async function handleTicketSetup(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  // Check admin permissions
  const permsStr = interaction.member?.permissions;
  if (!permsStr) {
    return ephemeral('❌ Could not verify your permissions.');
  }

  const perms = BigInt(permsStr);
  const isAdmin = (perms & Permission.ADMINISTRATOR) === Permission.ADMINISTRATOR;
  if (!isAdmin) {
    return ephemeral('❌ You need the **Administrator** permission to run this command.');
  }

  ctx.waitUntil(postPanel(env, interaction));

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: MessageFlags.EPHEMERAL },
  };
}

async function postPanel(env: Env, interaction: DiscordInteraction): Promise<void> {
  try {
    await sendMessage(env, env.PANEL_CHANNEL_ID, {
      embeds: [
        {
          color: Colors.TICKET_OPEN,
          title: '🎫 ESO Toolkit — Support',
          description:
            'Need help with ESO Toolkit? Click the button below that best describes your request.\n\n' +
            '**🐛 Bug Report** — Something is broken or not working as expected.\n' +
            '**💡 Feature Request** — You have an idea for a new feature or improvement.\n' +
            '**💬 General Feedback** — Questions, suggestions, or anything else.',
          footer: {
            text: 'A private channel will be created for your request. Please be as detailed as possible.',
          },
          timestamp: new Date().toISOString(),
        },
      ],
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.DANGER,
              label: 'Bug Report',
              emoji: { name: '🐛' },
              custom_id: ButtonId.CREATE_BUG,
            },
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.PRIMARY,
              label: 'Feature Request',
              emoji: { name: '💡' },
              custom_id: ButtonId.CREATE_FEATURE,
            },
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.SECONDARY,
              label: 'General Feedback',
              emoji: { name: '💬' },
              custom_id: ButtonId.CREATE_FEEDBACK,
            },
          ],
        },
      ],
    });

    // Edit the deferred ephemeral reply
    await editFollowup(env, interaction.token, '@original', {
      content: `✅ Ticket panel posted in <#${env.PANEL_CHANNEL_ID}>.`,
    });
  } catch (err) {
    console.error('[ticket-setup] failed to post panel:', err);
    try {
      await editFollowup(env, interaction.token, '@original', {
        content: '❌ Failed to post the panel. Check bot permissions in the channel.',
      });
    } catch {}
  }
}

