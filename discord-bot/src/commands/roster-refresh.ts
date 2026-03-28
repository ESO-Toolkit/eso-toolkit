/**
 * /roster refresh
 *
 * Re-syncs the roster in the current channel from the API.
 * Looks up the mapping by the current channel ID.
 */

import { hasRosterPermission } from '../auth.js';
import { sendFollowup } from '../discord.js';
import { getMappingByChannelId, getGuildConfig, getDefaultGuildConfig } from '../roster/kv.js';
import { refreshRoster } from '../roster/publish.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleRosterRefresh(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
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

  const config = (await getGuildConfig(env, guildId)) ?? getDefaultGuildConfig(guildId);
  if (!hasRosterPermission(interaction, config.allowedRoleIds)) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ You do not have permission to refresh rosters.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

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
          content: '❌ No roster is linked to this channel. Use `/roster link` first.',
          flags: MessageFlags.EPHEMERAL,
        });
        return;
      }

      const result = await refreshRoster(env, mapping.rosterId);
      if (result.ok) {
        await sendFollowup(env, interaction.token, {
          content: '✅ Roster refreshed from ESO Toolkit!',
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
