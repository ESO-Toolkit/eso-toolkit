/**
 * /roster refresh
 *
 * Re-syncs the roster in the current channel from the API.
 * Looks up the mapping by the current channel ID.
 */

import { hasRosterPermission } from '../auth.js';
import { sendFollowup } from '../discord.js';
import { listMappingsForGuild, getGuildConfig, getDefaultGuildConfig } from '../roster/kv.js';
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
      // A channel may host more than one roster (when a default posting channel
      // is configured), so refresh every roster mapped to this channel.
      const mappings = (await listMappingsForGuild(env, guildId)).filter(
        (m) => m.channelId === channelId,
      );
      if (mappings.length === 0) {
        await sendFollowup(env, interaction.token, {
          content: '❌ No roster is linked to this channel. Use `/roster link` first.',
          flags: MessageFlags.EPHEMERAL,
        });
        return;
      }

      let okCount = 0;
      let lastError: string | undefined;
      for (const mapping of mappings) {
        const result = await refreshRoster(env, mapping.rosterId, guildId);
        if (result.ok) okCount++;
        else lastError = result.error;
      }

      if (okCount > 0) {
        const suffix = mappings.length > 1 ? ` (${okCount}/${mappings.length})` : '';
        await sendFollowup(env, interaction.token, {
          content: `✅ Roster refreshed from ESO Toolkit!${suffix}`,
          flags: MessageFlags.EPHEMERAL,
        });
      } else {
        await sendFollowup(env, interaction.token, {
          content: `❌ Refresh failed: ${lastError ?? 'Unknown error'}`,
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
