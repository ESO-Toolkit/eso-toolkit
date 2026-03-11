#!/usr/bin/env node
/**
 * setup-panel.js
 *
 * One-time script to post the ticket panel embed in #create-ticket.
 * Useful if the bot isn't deployed yet or you want to re-post the panel manually.
 *
 * Run with: node scripts/setup-panel.js
 *
 * Required environment variables:
 *   DISCORD_BOT_TOKEN    — Bot token from Discord Developer Portal
 *   PANEL_CHANNEL_ID     — Channel ID to post the panel in (default: 1480845158584025148)
 */

'use strict';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const PANEL_CHANNEL_ID = process.env.PANEL_CHANNEL_ID || '1480845158584025148';

if (!BOT_TOKEN) {
  console.error('ERROR: DISCORD_BOT_TOKEN must be set.');
  process.exit(1);
}

const API_BASE = 'https://discord.com/api/v10';

const Colors = {
  TICKET_OPEN: 0xe8a838,
};

const ButtonStyle = {
  PRIMARY: 1,
  SECONDARY: 2,
  DANGER: 4,
};

const ComponentType = {
  ACTION_ROW: 1,
  BUTTON: 2,
};

const panelPayload = {
  embeds: [
    {
      color: Colors.TICKET_OPEN,
      title: '🎫 ESO Toolkit — Support',
      description:
        'Need help with ESO Toolkit? Click the button below that best describes your request.\n\n' +
        '**🐛 Bug Report** — Something is broken or not working as expected.\n' +
        '**💡 Feature Request** — You have an idea for a new feature or improvement.\n' +
        '**💬 General Feedback** — Questions, suggestions, or anything else.',
      footer: {
        text: 'A private channel will be created for your request. Please be as detailed as possible.',
      },
      timestamp: new Date().toISOString(),
    },
  ],
  components: [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.DANGER,
          label: 'Bug Report',
          emoji: { name: '🐛' },
          custom_id: 'create_ticket:bug',
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: 'Feature Request',
          emoji: { name: '💡' },
          custom_id: 'create_ticket:feature',
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.SECONDARY,
          label: 'General Feedback',
          emoji: { name: '💬' },
          custom_id: 'create_ticket:feedback',
        },
      ],
    },
  ],
};

async function postPanel() {
  console.log(`Posting ticket panel to channel ${PANEL_CHANNEL_ID}…`);

  const res = await fetch(`${API_BASE}/channels/${PANEL_CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
    },
    body: JSON.stringify(panelPayload),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('ERROR: Failed to post panel.');
    console.error('Status:', res.status);
    console.error('Response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('✅ Ticket panel posted successfully!');
  console.log('Message ID:', data.id);
  console.log(`Channel: https://discord.com/channels/<guild_id>/${PANEL_CHANNEL_ID}/${data.id}`);
}

postPanel().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
