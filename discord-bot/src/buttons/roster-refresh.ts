/**
 * Roster refresh button handler.
 *
 * When a user clicks the Refresh button on a roster embed,
 * re-sync from the API and update the embed.
 */

import { hasRosterPermission } from '../auth.js';
import { sendFollowup } from '../discord.js';
import { getMappingByChannelId, getGuildConfig, getDefaultGuildConfig } from '../roster/kv.js';
import { refreshRoster } from '../roster/publish.js';
import { InteractionResponseType, MessageFlags, RosterButtonId } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleRosterRefreshButton(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const guildId = interaction.guild_id;
  if (!guildId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ This can only be used in a server.',
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

  // The button encodes its own roster ID (roster_refresh:<rosterId>), so refresh
  // that exact roster even when several rosters share one channel. Fall back to
  // the channel→roster lookup for any older buttons without an encoded ID.
  const customId = interaction.data?.custom_id ?? '';
  const prefix = `${RosterButtonId.REFRESH}:`;
  const encodedRosterId = customId.startsWith(prefix) ? customId.slice(prefix.length) : '';

  ctx.waitUntil(
    (async () => {
      let rosterId = encodedRosterId;
      if (!rosterId) {
        const mapping = await getMappingByChannelId(env, channelId);
        if (!mapping) {
          await sendFollowup(env, interaction.token, {
            content: '❌ No roster is linked to this channel.',
            flags: MessageFlags.EPHEMERAL,
          });
          return;
        }
        rosterId = mapping.rosterId;
      }

      const result = await refreshRoster(env, rosterId, guildId);
      if (result.ok && (result.refreshedCount ?? 0) > 0) {
        await sendFollowup(env, interaction.token, {
          content: '✅ Roster refreshed!',
          flags: MessageFlags.EPHEMERAL,
        });
      } else if (result.ok) {
        // ok but nothing refreshed → this roster has no live post in this server
        // (mapping removed/expired). Don't claim success.
        await sendFollowup(env, interaction.token, {
          content:
            "⚠️ Couldn't find this roster's post to refresh — it may have been removed. Try re-publishing it.",
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
