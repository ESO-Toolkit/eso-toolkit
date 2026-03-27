/**
 * /roster publish [roster-id] [channel-name] [category]
 *
 * Publishes a roster to Discord. If a mapping exists, updates it;
 * otherwise creates a new channel and mapping.
 */

import { isStaff, sendFollowup } from '../discord.js';
import { publishRoster } from '../roster/publish.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleRosterPublish(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  if (!isStaff(interaction)) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ You need **Manage Channels** permission to publish rosters.',
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

  const options = interaction.data?.options ?? [];
  const rosterId = options.find((o) => o.name === 'roster-id')?.value as string | undefined;
  const channelName = options.find((o) => o.name === 'channel-name')?.value as string | undefined;
  const categoryId = options.find((o) => o.name === 'category')?.value as string | undefined;

  if (!rosterId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ Please provide a roster ID.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  ctx.waitUntil(
    (async () => {
      const userId = interaction.member?.user?.id ?? '';
      const result = await publishRoster(env, {
        guildId,
        rosterId,
        categoryId,
        channelNameOverride: channelName,
        ownerUserId: userId,
      });

      if (result.ok) {
        await sendFollowup(env, interaction.token, {
          content: `✅ Roster published! Channel: <#${result.channelId}>`,
          flags: MessageFlags.EPHEMERAL,
        });
      } else {
        await sendFollowup(env, interaction.token, {
          content: `❌ Failed to publish: ${result.error}`,
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
