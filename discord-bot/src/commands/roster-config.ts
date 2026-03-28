/**
 * /roster config #channel @role — Configure roster posting for this server.
 *
 * Admin-only command. Defers immediately, then stores the guild config
 * in the roster-hub-api as a background task.
 */

import { isStaff, sendFollowup } from '../discord.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleRosterConfig(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  if (!isStaff(interaction)) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ Only server admins can configure roster posting.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  const options = interaction.data?.options ?? [];
  const channelId = options.find((o) => o.name === 'channel')?.value as string | undefined;
  const roleId = options.find((o) => o.name === 'role')?.value as string | undefined;

  if (!channelId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ Please specify a channel: `/roster config #channel`',
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

  // Defer immediately so Discord doesn't timeout
  ctx.waitUntil(doConfig(env, interaction.token, guildId, channelId, roleId, interaction.member?.user?.id));

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {},
  };
}

async function doConfig(
  env: Env,
  interactionToken: string,
  guildId: string,
  channelId: string,
  roleId: string | undefined,
  userId: string | undefined,
): Promise<void> {
  let guildName = 'Unknown Server';
  let guildIcon: string | null = null;

  try {
    const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
      },
    });
    if (guildRes.ok) {
      const guild = (await guildRes.json()) as { name: string; icon: string | null };
      guildName = guild.name;
      guildIcon = guild.icon;
    }
  } catch { /* proceed with default name */ }

  try {
    const res = await fetch(`${env.ROSTER_HUB_API_URL}/discord/guild-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': env.INTERNAL_API_KEY,
        'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
      },
      body: JSON.stringify({
        guild_id: guildId,
        guild_name: guildName,
        guild_icon: guildIcon,
        roster_channel_id: channelId,
        allowed_role_ids: roleId ? [roleId] : [],
        configured_by: userId ?? 'unknown',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      await sendFollowup(env, interactionToken, {
        content: `❌ Failed to save config: ${text}`,
      });
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await sendFollowup(env, interactionToken, {
      content: `❌ Error saving config: ${message}`,
    });
    return;
  }

  const rolePart = roleId ? ` with role <@&${roleId}>` : ' (all members)';
  await sendFollowup(env, interactionToken, {
    content: `✅ Roster posting configured!\n\n📌 **Channel:** <#${channelId}>\n👥 **Who can post:**${rolePart}\n\nUsers can now publish rosters from [ESO Toolkit](https://esotk.com) and post them to this server.`,
  });
}

export async function handleRosterRemove(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  if (!isStaff(interaction)) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ Only server admins can remove roster config.',
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

  ctx.waitUntil(doRemove(env, interaction.token, guildId));

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {},
  };
}

async function doRemove(
  env: Env,
  interactionToken: string,
  guildId: string,
): Promise<void> {
  try {
    await fetch(`${env.ROSTER_HUB_API_URL}/discord/guild-config/${guildId}`, {
      method: 'DELETE',
      headers: {
        'X-Internal-Key': env.INTERNAL_API_KEY,
        'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
      },
    });
  } catch { /* ignore */ }

  await sendFollowup(env, interactionToken, {
    content: '✅ Roster posting has been disabled for this server.',
  });
}
