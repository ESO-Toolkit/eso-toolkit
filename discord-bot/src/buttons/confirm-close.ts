/**
 * Handles the "Confirm Close" button.
 * 1. Fetches the last 100 messages for the transcript.
 * 2. Posts a transcript embed to #ticket-logs.
 * 3. Deletes the ticket channel.
 * 4. Cleans up KV state.
 */

import { deleteChannel, getMessages, isStaff, sendMessage } from '../discord.js';
import { deleteTicket, getTicket } from '../kv.js';
import { Colors, InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, DiscordMessage, Env, InteractionResponse, TicketState } from '../types.js';

export async function handleConfirmCloseButton(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral('Could not determine the ticket channel.');
  }

  if (!isStaff(interaction)) {
    return ephemeral('❌ Only staff can close tickets.');
  }

  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral('This channel does not have an associated ticket.');
  }

  if (ticket.status === 'closed') {
    return ephemeral('This ticket is already closed.');
  }

  // Immediately acknowledge so Discord doesn't time out
  const closingUser = interaction.member?.user ?? interaction.user;

  // Run the heavy async work after responding
  ctx.waitUntil(closeTicket(env, ticket, channelId, closingUser?.username ?? 'Unknown'));

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: '🔒 Closing ticket — saving transcript and deleting channel…',
      flags: MessageFlags.EPHEMERAL,
    },
  };
}

async function closeTicket(
  env: Env,
  ticket: TicketState,
  channelId: string,
  closedByUsername: string,
): Promise<void> {
  try {
    // 1. Fetch up to 100 messages for the transcript
    let messages: DiscordMessage[] = [];
    try {
      messages = await getMessages(env, channelId, 100);
    } catch (err) {
      console.error('[confirm-close] failed to fetch messages:', err);
    }

    // 2. Build transcript text (last 10 non-bot messages for the embed description)
    const transcriptLines = messages
      .filter((m) => !m.author?.username?.endsWith('#0000') && m.content.trim().length > 0)
      .slice(0, 10)
      .reverse()
      .map((m) => `**${m.author?.username ?? 'Unknown'}**: ${m.content.slice(0, 200)}`);

    const transcriptText =
      transcriptLines.length > 0 ? transcriptLines.join('\n') : '_No messages recorded._';

    // 3. Calculate duration
    const openedAt = new Date(ticket.createdAt);
    const closedAt = new Date();
    const durationMs = closedAt.getTime() - openedAt.getTime();
    const durationStr = formatDuration(durationMs);

    // 4. Build and post transcript embed to #ticket-logs
    const logEmbed = {
      color: Colors.TICKET_CLOSED,
      title: `📋 Ticket #${ticket.id} Closed`,
      description: transcriptText,
      fields: [
        { name: 'Opened by', value: `<@${ticket.userId}> (${ticket.username})`, inline: true },
        { name: 'Category', value: ticket.aiRefinedCategory ?? ticket.category, inline: true },
        {
          name: 'Claimed by',
          value: ticket.claimedBy ? `<@${ticket.claimedBy}> (${ticket.claimedByUsername})` : 'Unclaimed',
          inline: true,
        },
        { name: 'Closed by', value: closedByUsername, inline: true },
        { name: 'Duration', value: durationStr, inline: true },
        ...(ticket.githubIssueUrl
          ? [{ name: 'GitHub Issue', value: `[#${ticket.githubIssueNumber}](${ticket.githubIssueUrl})`, inline: true }]
          : []),
        ...(ticket.aiSummary ? [{ name: 'AI Summary', value: ticket.aiSummary, inline: false }] : []),
      ],
      footer: {
        text: `Ticket ID: ${ticket.id} • Total messages: ${messages.length}`,
      },
      timestamp: closedAt.toISOString(),
    };

    try {
      await sendMessage(env, env.TICKET_LOGS_CHANNEL_ID, { embeds: [logEmbed] });
    } catch (err) {
      console.error('[confirm-close] failed to post transcript:', err);
    }

    // 5. Delete the ticket channel
    try {
      await deleteChannel(env, channelId);
    } catch (err) {
      console.error('[confirm-close] failed to delete channel:', err);
    }

    // 6. Clean up KV
    await deleteTicket(env, channelId);
  } catch (err) {
    console.error('[confirm-close] unexpected error during closeTicket:', err);
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push('<1m');

  return parts.join(' ');
}

function ephemeral(content: string): InteractionResponse {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL },
  };
}
