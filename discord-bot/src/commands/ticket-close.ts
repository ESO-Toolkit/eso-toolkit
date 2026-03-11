/**
 * /ticket close [reason] — closes the current ticket channel.
 * Can be used by staff in a ticket channel as an alternative to the Close button.
 */

import { getMessages, isStaff, sendMessage, deleteChannel } from '../discord.js';
import { deleteTicket, getTicket } from '../kv.js';
import { Colors, InteractionResponseType, MessageFlags } from '../types.js';
import type { DiscordInteraction, DiscordMessage, Env, InteractionResponse } from '../types.js';

export async function handleTicketClose(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral('❌ Could not determine the current channel.');
  }

  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral('❌ This command can only be used inside a ticket channel.');
  }

  if (ticket.status === 'closed') {
    return ephemeral('❌ This ticket is already closed.');
  }

  if (!isStaff(interaction)) {
    return ephemeral('❌ Only staff can close tickets.');
  }

  // Extract optional reason option
  const reasonOption = interaction.data?.options?.find((o) => o.name === 'reason');
  const reason = typeof reasonOption?.value === 'string' ? reasonOption.value : 'No reason given';

  const closingUser = interaction.member?.user ?? interaction.user;
  const closedByUsername = closingUser?.username ?? 'Unknown';

  ctx.waitUntil(closeTicketWorkflow(env, channelId, ticket.id, reason, closedByUsername));

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: MessageFlags.EPHEMERAL },
  };
}

async function closeTicketWorkflow(
  env: Env,
  channelId: string,
  ticketId: string,
  reason: string,
  closedByUsername: string,
): Promise<void> {
  const ticket = await getTicket(env, channelId);
  if (!ticket) return;

  // Fetch transcript messages
  let messages: DiscordMessage[] = [];
  try {
    messages = await getMessages(env, channelId, 100);
  } catch (err) {
    console.error('[ticket-close] failed to fetch messages:', err);
  }

  const transcriptLines = messages
    .filter((m) => !m.author?.username?.endsWith('#0000') && m.content.trim().length > 0)
    .slice(0, 10)
    .reverse()
    .map((m) => `**${m.author?.username ?? 'Unknown'}**: ${m.content.slice(0, 200)}`);

  const transcriptText =
    transcriptLines.length > 0 ? transcriptLines.join('\n') : '_No messages recorded._';

  const openedAt = new Date(ticket.createdAt);
  const closedAt = new Date();
  const durationMs = closedAt.getTime() - openedAt.getTime();
  const durationStr = formatDuration(durationMs);

  // Post to #ticket-logs
  try {
    await sendMessage(env, env.TICKET_LOGS_CHANNEL_ID, {
      embeds: [
        {
          color: Colors.TICKET_CLOSED,
          title: `📋 Ticket #${ticketId} Closed`,
          description: transcriptText,
          fields: [
            { name: 'Opened by', value: `<@${ticket.userId}> (${ticket.username})`, inline: true },
            { name: 'Category', value: ticket.aiRefinedCategory ?? ticket.category, inline: true },
            {
              name: 'Claimed by',
              value: ticket.claimedBy
                ? `<@${ticket.claimedBy}> (${ticket.claimedByUsername})`
                : 'Unclaimed',
              inline: true,
            },
            { name: 'Closed by', value: closedByUsername, inline: true },
            { name: 'Reason', value: reason, inline: true },
            { name: 'Duration', value: durationStr, inline: true },
            ...(ticket.githubIssueUrl
              ? [
                  {
                    name: 'GitHub Issue',
                    value: `[#${ticket.githubIssueNumber}](${ticket.githubIssueUrl})`,
                    inline: true,
                  },
                ]
              : []),
            ...(ticket.aiSummary
              ? [{ name: 'AI Summary', value: ticket.aiSummary, inline: false }]
              : []),
          ],
          footer: { text: `Ticket ID: ${ticketId} • Total messages: ${messages.length}` },
          timestamp: closedAt.toISOString(),
        },
      ],
    });
  } catch (err) {
    console.error('[ticket-close] failed to post transcript:', err);
  }

  // Delete channel and clean up
  try {
    await deleteChannel(env, channelId);
  } catch (err) {
    console.error('[ticket-close] failed to delete channel:', err);
  }

  await deleteTicket(env, channelId);
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
