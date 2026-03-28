/**
 * /roster config #channel @role — Configure roster posting for this server.
 *
 * Admin-only command. Stores the guild config in the roster-hub-api
 * so users can post rosters to this server from the web app.
 */

import { isStaff } from '../discord.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleRosterConfig(
  env: Env,
  interaction: DiscordInteraction,
  _ctx: ExecutionContext,
): Promise<InteractionResponse> {
  // Admin check
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
  const channelOption = options.find((o) => o.name === 'channel');
  const roleOption = options.find((o) => o.name === 'role');

  const channelId = channelOption?.value as string | undefined;
  const roleId = roleOption?.value as string | undefined;

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

  // Fetch guild info for the name
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

  // Store config via roster-hub-api
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
        configured_by: interaction.member?.user?.id ?? 'unknown',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `❌ Failed to save config: ${text}`,
          flags: MessageFlags.EPHEMERAL,
        },
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `❌ Error saving config: ${message}`,
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  const rolePart = roleId ? ` with role <@&${roleId}>` : ' (all members)';
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `✅ Roster posting configured!\n\n📌 **Channel:** <#${channelId}>\n👥 **Who can post:**${rolePart}\n\nUsers can now publish rosters from [ESO Toolkit](https://esohelpers.com) and post them to this server.`,
    },
  };
}

export async function handleRosterRemove(
  env: Env,
  interaction: DiscordInteraction,
  _ctx: ExecutionContext,
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

  try {
    await fetch(`${env.ROSTER_HUB_API_URL}/discord/guild-config/${guildId}`, {
      method: 'DELETE',
      headers: {
        'X-Internal-Key': env.INTERNAL_API_KEY,
        'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
      },
    });
  } catch { /* ignore */ }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: '✅ Roster posting has been disabled for this server.',
    },
  };
}
