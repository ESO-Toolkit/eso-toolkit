/**
 * Roster refresh button handler.
 *
 * When a user clicks the Refresh button on a roster embed,
 * re-sync from the API and update the embed.
 */

import { hasRosterPermission } from '../auth.js';
import { sendFollowup } from '../discord.js';
import {
  listMappingsForGuild,
  getGuildConfig,
  getDefaultGuildConfig,
  checkRosterRateLimit,
} from '../roster/kv.js';
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

  const userId = interaction.member?.user?.id ?? 'unknown';
  const allowed = await checkRosterRateLimit(env, `refresh:${guildId}:${userId}`, 10, 60);
  if (!allowed) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "⏳ You're refreshing too quickly. Please wait a minute and try again.",
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  // The button encodes its own roster ID (roster_refresh:<rosterId>), so refresh
  // that exact roster even when several rosters share one channel. Older buttons
  // (or those whose ID was too long to fit the custom_id) carry none — for those
  // we refresh every roster mapped to this channel, which also covers a default
  // channel hosting several rosters.
  const customId = interaction.data?.custom_id ?? '';
  const prefix = `${RosterButtonId.REFRESH}:`;
  const encodedRosterId = customId.startsWith(prefix) ? customId.slice(prefix.length) : '';

  ctx.waitUntil(
    (async () => {
      let rosterIds: string[];
      if (encodedRosterId) {
        rosterIds = [encodedRosterId];
      } else {
        rosterIds = (await listMappingsForGuild(env, guildId))
          .filter((m) => m.channelId === channelId)
          .map((m) => m.rosterId);
        if (rosterIds.length === 0) {
          await sendFollowup(env, interaction.token, {
            content: '❌ No roster is linked to this channel.',
            flags: MessageFlags.EPHEMERAL,
          });
          return;
        }
      }

      let okCount = 0;
      let lastError: string | undefined;
      for (const rid of rosterIds) {
        const result = await refreshRoster(env, rid, guildId);
        if (result.ok && (result.refreshedCount ?? 0) > 0) okCount++;
        else if (!result.ok) lastError = result.error;
      }

      if (okCount > 0) {
        const suffix = rosterIds.length > 1 ? ` (${okCount}/${rosterIds.length})` : '';
        await sendFollowup(env, interaction.token, {
          content: `✅ Roster refreshed!${suffix}`,
          flags: MessageFlags.EPHEMERAL,
        });
      } else if (lastError) {
        await sendFollowup(env, interaction.token, {
          content: `❌ Refresh failed: ${lastError}`,
          flags: MessageFlags.EPHEMERAL,
        });
      } else {
        // ok but nothing refreshed → no live post for this roster in this server
        // (mapping removed/expired). Don't claim success.
        await sendFollowup(env, interaction.token, {
          content:
            "⚠️ Couldn't find this roster's post to refresh — it may have been removed. Try re-publishing it.",
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
