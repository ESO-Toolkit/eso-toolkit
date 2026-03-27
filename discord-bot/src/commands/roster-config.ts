/**
 * /roster config — guild-level configuration subcommands.
 *
 * Subcommands:
 *   set-name-pattern  — Set the channel naming template
 *   set-default-category — Set the default category for new roster channels
 *   set-role-pings — Set Discord role IDs for tank/healer/DD sign-up pings
 */

import { isStaff } from '../discord.js';
import { getGuildConfig, getDefaultGuildConfig, upsertGuildConfig } from '../roster/kv.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, DiscordInteractionOption, Env, InteractionResponse } from '../types.js';

export async function handleRosterConfig(
  env: Env,
  interaction: DiscordInteraction,
  _ctx: ExecutionContext,
): Promise<InteractionResponse> {
  if (!isStaff(interaction)) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ You need **Manage Channels** permission to configure roster settings.',
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
  const sub = options[0];
  if (!sub) {
    return showCurrentConfig(env, guildId);
  }

  switch (sub.name) {
    case 'set-name-pattern':
      return handleSetNamePattern(env, guildId, sub.options ?? []);

    case 'set-default-category':
      return handleSetDefaultCategory(env, guildId, sub.options ?? []);

    case 'set-role-pings':
      return handleSetRolePings(env, guildId, sub.options ?? []);

    default:
      return showCurrentConfig(env, guildId);
  }
}

async function showCurrentConfig(env: Env, guildId: string): Promise<InteractionResponse> {
  const config = (await getGuildConfig(env, guildId)) ?? getDefaultGuildConfig(guildId);
  const category = config.defaultCategoryId
    ? `<#${config.defaultCategoryId}>`
    : '*Not set*';
  const pings = config.rolePingIds
    ? [
        config.rolePingIds.tank ? `Tank: <@&${config.rolePingIds.tank}>` : null,
        config.rolePingIds.healer ? `Healer: <@&${config.rolePingIds.healer}>` : null,
        config.rolePingIds.dd ? `DD: <@&${config.rolePingIds.dd}>` : null,
      ]
        .filter(Boolean)
        .join('\n') || '*Not set*'
    : '*Not set*';

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: [
        '**📜 Roster Config**',
        `**Name Pattern:** \`${config.namePattern}\``,
        `**Default Category:** ${category}`,
        `**Role Pings:**\n${pings}`,
      ].join('\n'),
      flags: MessageFlags.EPHEMERAL,
    },
  };
}

async function handleSetNamePattern(
  env: Env,
  guildId: string,
  options: DiscordInteractionOption[],
): Promise<InteractionResponse> {
  const pattern = options.find((o) => o.name === 'pattern')?.value as string | undefined;
  if (!pattern) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ Please provide a pattern. Tokens: `{day-short}`, `{day-full}`, `{time}`, `{tag}`, `{label}`',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  const config = (await getGuildConfig(env, guildId)) ?? getDefaultGuildConfig(guildId);
  config.namePattern = pattern;
  await upsertGuildConfig(env, config);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `✅ Channel name pattern set to: \`${pattern}\``,
      flags: MessageFlags.EPHEMERAL,
    },
  };
}

async function handleSetDefaultCategory(
  env: Env,
  guildId: string,
  options: DiscordInteractionOption[],
): Promise<InteractionResponse> {
  const categoryId = options.find((o) => o.name === 'category')?.value as string | undefined;
  if (!categoryId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ Please provide a category channel ID.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  const config = (await getGuildConfig(env, guildId)) ?? getDefaultGuildConfig(guildId);
  config.defaultCategoryId = categoryId;
  await upsertGuildConfig(env, config);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `✅ Default category set to: <#${categoryId}>`,
      flags: MessageFlags.EPHEMERAL,
    },
  };
}

async function handleSetRolePings(
  env: Env,
  guildId: string,
  options: DiscordInteractionOption[],
): Promise<InteractionResponse> {
  const tank = options.find((o) => o.name === 'tank-role')?.value as string | undefined;
  const healer = options.find((o) => o.name === 'healer-role')?.value as string | undefined;
  const dd = options.find((o) => o.name === 'dd-role')?.value as string | undefined;

  const config = (await getGuildConfig(env, guildId)) ?? getDefaultGuildConfig(guildId);
  config.rolePingIds = {
    ...config.rolePingIds,
    ...(tank !== undefined ? { tank } : {}),
    ...(healer !== undefined ? { healer } : {}),
    ...(dd !== undefined ? { dd } : {}),
  };
  await upsertGuildConfig(env, config);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: '✅ Role pings updated.',
      flags: MessageFlags.EPHEMERAL,
    },
  };
}
