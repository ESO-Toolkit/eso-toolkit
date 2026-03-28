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
    description: 'View and share raid rosters from ESO Toolkit',
    default_member_permissions: null,
    options: [
      {
        type: 1, // SUB_COMMAND
        name: 'view',
        description: 'Post a roster as formatted text in this channel',
        options: [
          {
            type: 3, // STRING
            name: 'id',
            description: 'Roster ID or URL (from esotk.com/rosters/<id>)',
            required: true,
          },
        ],
      },
      {
        type: 1, // SUB_COMMAND
        name: 'config',
        description: 'Set which channel receives roster posts from the web app (Admin only)',
        options: [
          {
            type: 7, // CHANNEL
            name: 'channel',
            description: 'The channel where rosters will be posted',
            required: true,
          },
          {
            type: 8, // ROLE
            name: 'role',
            description: 'Role required to post rosters (leave empty = everyone)',
            required: false,
          },
        ],
      },
      {
        type: 1, // SUB_COMMAND
        name: 'remove',
        description: 'Disable roster posting for this server (Admin only)',
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
