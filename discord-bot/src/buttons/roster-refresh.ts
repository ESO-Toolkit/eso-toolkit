/**
 * Roster refresh button handler.
 *
 * When a user clicks the Refresh button on a roster embed,
 * re-sync from the API and update the embed.
 */

import { sendFollowup } from '../discord.js';
import { getMappingByChannelId } from '../roster/kv.js';
import { refreshRoster } from '../roster/publish.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleRosterRefreshButton(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ Could not determine channel.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  ctx.waitUntil(
    (async () => {
      const mapping = await getMappingByChannelId(env, channelId);
      if (!mapping) {
        await sendFollowup(env, interaction.token, {
          content: '❌ No roster is linked to this channel.',
          flags: MessageFlags.EPHEMERAL,
        });
        return;
      }

      const result = await refreshRoster(env, mapping.rosterId);
      if (result.ok) {
        await sendFollowup(env, interaction.token, {
          content: '✅ Roster refreshed!',
          flags: MessageFlags.EPHEMERAL,
        });
      } else {
        await sendFollowup(env, interaction.token, {
          content: `❌ Refresh failed: ${result.error}`,
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
