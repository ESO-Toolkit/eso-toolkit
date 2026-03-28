/**
 * Handles modals for adding/removing users from tickets.
 */

import { addChannelPermission, isStaff, removeChannelPermission } from '../discord.js';
import { getTicket } from '../kv.js';
import { InteractionResponseType } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';
import { ephemeral, findInputValue } from '../utils.js';

export async function handleAddUserModal(
  env: Env,
  interaction: DiscordInteraction,
): Promise<InteractionResponse> {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral('Could not determine the channel for this ticket.');
  }

  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral('This channel does not have an associated ticket.');
  }

  if (!isStaff(interaction)) {
    return ephemeral('❌ Only staff can add users to a ticket.');
  }

  // Extract user input from modal
  const components = interaction.data?.components ?? [];
  const userInput = findInputValue(components as unknown as Parameters<typeof findInputValue>[0], 'user_input')?.trim();

  if (!userInput) {
    return ephemeral('Please provide a user ID or mention.');
  }

  // Parse user ID from input (could be raw ID or @mention)
  let userId = userInput;
  const mentionMatch = userInput.match(/<@!?(\d+)>/);
  if (mentionMatch) {
    userId = mentionMatch[1];
  } else if (!/^\d{17,20}$/.test(userId)) {
    return ephemeral('Invalid user ID format. Please use a numeric ID or @mention.');
  }

  // Add user to channel
  try {
    await addChannelPermission(env, channelId, userId, {
      VIEW_CHANNEL: true,
      SEND_MESSAGES: true,
      READ_MESSAGE_HISTORY: true,
      EMBED_LINKS: true,
      ATTACH_FILES: true,
      ADD_REACTIONS: true,
      USE_EXTERNAL_EMOJIS: true,
    });
  } catch (err) {
    console.error('[add-user] failed to add permission:', err);
    return ephemeral('Failed to add user to the ticket. Please check the user ID and try again.');
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `➕ Added <@${userId}> to this ticket.`,
    },
  };
}

export async function handleRemoveUserModal(
  env: Env,
  interaction: DiscordInteraction,
): Promise<InteractionResponse> {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral('Could not determine the channel for this ticket.');
  }

  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral('This channel does not have an associated ticket.');
  }

  if (!isStaff(interaction)) {
    return ephemeral('❌ Only staff can remove users from a ticket.');
  }

  // Extract user input from modal
  const components = interaction.data?.components ?? [];
  const userInput = findInputValue(components as unknown as Parameters<typeof findInputValue>[0], 'user_input')?.trim();

  if (!userInput) {
    return ephemeral('Please provide a user ID or mention.');
  }

  // Parse user ID from input
  let userId = userInput;
  const mentionMatch = userInput.match(/<@!?(\d+)>/);
  if (mentionMatch) {
    userId = mentionMatch[1];
  } else if (!/^\d{17,20}$/.test(userId)) {
    return ephemeral('Invalid user ID format. Please use a numeric ID or @mention.');
  }

  // Prevent removing the ticket creator
  if (userId === ticket.userId) {
    return ephemeral('Cannot remove the ticket creator from their own ticket.');
  }

  // Remove user from channel
  try {
    await removeChannelPermission(env, channelId, userId);
  } catch (err) {
    console.error('[remove-user] failed to remove permission:', err);
    return ephemeral('Failed to remove user from the ticket. Please check the user ID and try again.');
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `➖ Removed <@${userId}> from this ticket.`,
    },
  };
}

