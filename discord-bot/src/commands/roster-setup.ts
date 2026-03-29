/**
 * /roster setup — Getting-started guide for server admins.
 *
 * Shows a checklist of steps to configure the bot for roster publishing.
 * Checks current config state and marks completed steps with checkmarks.
 */

import { isAdmin } from '../discord.js';
import { getGuildConfig } from '../roster/kv.js';
import { InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';

export async function handleRosterSetup(
  env: Env,
  interaction: DiscordInteraction,
): Promise<InteractionResponse> {
  if (!isAdmin(interaction)) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❌ You need **Manage Server** permission to view setup instructions.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  const guildId = interaction.guild_id;
  if (!guildId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'This command can only be used in a server.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  const config = await getGuildConfig(env, guildId);

  // Check what's configured
  const hasRoles = config?.allowedRoleIds && config.allowedRoleIds.length > 0;
  const hasCategory = !!config?.defaultCategoryId;
  const hasNamePattern =
    !!config?.namePattern && config.namePattern !== '{day-short}-{time}-{trial}-{tag}';
  const pings = config?.rolePingIds;
  const hasRolePings = !!(pings?.tank || pings?.healer || pings?.dd);

  const check = (done: boolean | undefined) => (done ? '\u2705' : '\u2B1C');

  const lines = [
    '# ESO Toolkit Bot Setup',
    '',
    'Follow these steps to configure roster publishing for your server:',
    '',
    `${check(hasRoles)} **Step 1 — Set allowed roles** *(required)*`,
    'Choose which roles can publish/refresh rosters. Without this, only Manage Server admins can publish.',
    '```',
    '/roster config set-role @YourRaidLeaderRole',
    '/roster config add-role @AnotherRole',
    '```',
    '',
    `${check(hasCategory)} **Step 2 — Set default category** *(recommended)*`,
    'New roster channels will be created under this category.',
    '```',
    '/roster config set-default-category #your-category',
    '```',
    '',
    `${check(hasRolePings)} **Step 3 — Set role pings** *(optional)*`,
    'Automatically ping roles when a roster needs tanks, healers, or DDs.',
    '```',
    '/roster config set-role-pings tank-role:@Tanks healer-role:@Healers dd-role:@DDs',
    '```',
    '',
    `${check(hasNamePattern)} **Step 4 — Customize channel names** *(optional)*`,
    'Set a template for auto-generated channel names.',
    'Tokens: `{day-short}`, `{day-full}`, `{time}`, `{trial}`, `{tag}`, `{label}`',
    '```',
    '/roster config set-name-pattern {day-short}-{time}-{trial}-{tag}',
    '```',
    '',
    '---',
    '**Publishing rosters:**',
    '- From Discord: `/roster publish <roster-id>`',
    '- From the web: [esotk.com](https://esotk.com) Roster Builder or Roster Hub → Publish to Discord',
    '',
    'Run `/roster config list` to see your current configuration.',
  ];

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: lines.join('\n'),
      flags: MessageFlags.EPHEMERAL,
    },
  };
}
