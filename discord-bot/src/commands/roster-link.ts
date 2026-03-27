/**
 * /roster link <roster-url-or-id>
 *
 * Links an ESO Toolkit roster to the current guild.
 * Creates/updates the mapping and optionally publishes to a channel.
 */

import { isStaff } from '../discord.js';
import { publishRoster } from '../roster/publish.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

/** Extract a roster ID from a URL or raw ID string. */
function parseRosterId(input: string): string | null {
  // Try URL format: https://esohelpers.com/roster-hub/ABC123
  const urlMatch = input.match(/\/roster-hub\/([A-Za-z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];

  // Raw ID: alphanumeric + hyphens/underscores
  if (/^[A-Za-z0-9_-]{3,}$/.test(input)) return input;

  return null;
}

export async function handleRosterLink(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  if (!isStaff(interaction)) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ You need **Manage Channels** permission to link rosters.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  const guildId = interaction.guild_id;
  if (!guildId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ This command can only be used in a server.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  const rosterInput = interaction.data?.options?.find((o) => o.name === 'roster')?.value;
  if (!rosterInput || typeof rosterInput !== 'string') {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ Please provide a roster URL or ID.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  const rosterId = parseRosterId(rosterInput);
  if (!rosterId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ Invalid roster URL or ID. Example: `https://esohelpers.com/roster-hub/ABC123` or `ABC123`',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  // Defer the response since publish involves multiple API calls
  ctx.waitUntil(
    (async () => {
      const userId = interaction.member?.user?.id ?? '';
      const result = await publishRoster(env, {
        guildId,
        rosterId,
        ownerUserId: userId,
      });

      const { sendFollowup } = await import('../discord.js');
      if (result.ok) {
        await sendFollowup(env, interaction.token, {
          content: `✅ Roster linked and published! Channel: <#${result.channelId}>`,
          flags: MessageFlags.EPHEMERAL,
        });
      } else {
        await sendFollowup(env, interaction.token, {
          content: `❌ Failed to link roster: ${result.error}`,
          flags: MessageFlags.EPHEMERAL,
        });
      }
    })(),
  );

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: MessageFlags.EPHEMERAL },
  };
}
