#!/usr/bin/env node
/**
 * register-commands.js
 *
 * One-time script to register the /ticket slash command with Discord.
 * Run with: node scripts/register-commands.js
 *
 * Required environment variables:
 *   DISCORD_BOT_TOKEN      — Bot token from Discord Developer Portal
 *   DISCORD_APPLICATION_ID — Application (Client) ID
 *   DISCORD_GUILD_ID       — (optional) Register as guild command for instant propagation
 *                            Omit to register globally (takes up to 1 hour to propagate)
 */

'use strict';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID || null;

if (!BOT_TOKEN || !APPLICATION_ID) {
  console.error('ERROR: DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID must be set.');
  process.exit(1);
}

const API_BASE = 'https://discord.com/api/v10';

// Register as guild command (instant) if GUILD_ID is set, otherwise global
const endpoint = GUILD_ID
  ? `${API_BASE}/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`
  : `${API_BASE}/applications/${APPLICATION_ID}/commands`;

const commands = [
  {
    name: 'ticket',
    description: 'Manage support tickets',
    default_member_permissions: null, // available to everyone; handlers enforce permissions
    options: [
      {
        type: 1, // SUB_COMMAND
        name: 'setup',
        description: 'Post the ticket panel in #create-ticket (Admin only)',
      },
      {
        type: 1,
        name: 'close',
        description: 'Close the current ticket channel',
        options: [
          {
            type: 3, // STRING
            name: 'reason',
            description: 'Optional reason for closing',
            required: false,
          },
        ],
      },
      {
        type: 1,
        name: 'add',
        description: 'Add a user to the current ticket',
        options: [
          {
            type: 6, // USER
            name: 'user',
            description: 'The user to add',
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: 'remove',
        description: 'Remove a user from the current ticket',
        options: [
          {
            type: 6,
            name: 'user',
            description: 'The user to remove',
            required: true,
          },
        ],
      },
    ],
  },
  {
    name: 'roster',
    description: 'Manage ESO Toolkit roster → Discord integration',
    default_member_permissions: null,
    options: [
      {
        type: 1, // SUB_COMMAND
        name: 'link',
        description: 'Link an ESO Toolkit roster to this server',
        options: [
          {
            type: 3, // STRING
            name: 'roster',
            description: 'Roster URL or ID (e.g. https://esohelpers.com/roster-hub/ABC123)',
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: 'publish',
        description: 'Publish a roster to a new Discord channel',
        options: [
          {
            type: 3,
            name: 'roster-id',
            description: 'ESO Toolkit roster ID',
            required: true,
          },
          {
            type: 3,
            name: 'channel-name',
            description: 'Override channel name (optional)',
            required: false,
          },
          {
            type: 7, // CHANNEL
            name: 'category',
            description: 'Category to create the channel in (optional)',
            required: false,
          },
        ],
      },
      {
        type: 1,
        name: 'refresh',
        description: 'Re-sync the roster in this channel from ESO Toolkit',
      },
      {
        type: 2, // SUB_COMMAND_GROUP
        name: 'config',
        description: 'Configure roster settings for this server',
        options: [
          {
            type: 1,
            name: 'set-name-pattern',
            description: 'Set the channel naming template',
            options: [
              {
                type: 3,
                name: 'pattern',
                description: 'Template: {day-short}, {day-full}, {time}, {tag}, {label}',
                required: true,
              },
            ],
          },
          {
            type: 1,
            name: 'set-default-category',
            description: 'Set the default category for roster channels',
            options: [
              {
                type: 7, // CHANNEL
                name: 'category',
                description: 'Category channel',
                required: true,
              },
            ],
          },
          {
            type: 1,
            name: 'set-role-pings',
            description: 'Set Discord roles for sign-up pings',
            options: [
              {
                type: 8, // ROLE
                name: 'tank-role',
                description: 'Tank role to ping',
                required: false,
              },
              {
                type: 8,
                name: 'healer-role',
                description: 'Healer role to ping',
                required: false,
              },
              {
                type: 8,
                name: 'dd-role',
                description: 'DD role to ping',
                required: false,
              },
            ],
          },
        ],
      },
    ],
  },
];

async function registerCommands() {
  console.log(`Registering commands to: ${endpoint}`);

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
    },
    body: JSON.stringify(commands),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('ERROR: Failed to register commands.');
    console.error('Status:', res.status);
    console.error('Response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('✅ Commands registered successfully!');
  console.log(
    'Registered:',
    data.map((c) => `/${c.name}`).join(', '),
  );

  if (!GUILD_ID) {
    console.log(
      '\nNote: Global commands can take up to 1 hour to propagate to all servers.',
    );
    console.log(
      'For instant propagation during development, set DISCORD_GUILD_ID and re-run.',
    );
  }
}

registerCommands().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
