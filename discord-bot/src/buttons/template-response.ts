/**
 * Handles template response buttons.
 * Posts a pre-written response to the ticket channel.
 * When "Acknowledged" is clicked, also syncs with GitHub Issues.
 */

import { isStaff, sendMessage } from '../discord.js';
import {
  addGitHubIssueComment,
  addGitHubIssueLabel,
  createGitHubDiscussionOnAcknowledge,
} from '../github.js';
import { getTicket, updateTicket } from '../kv.js';
import { InteractionResponseType, MessageFlags, ResponseTemplates } from '../types.js';
import type { DiscordInteraction, Env, InteractionResponse } from '../types.js';
import { ephemeral } from '../utils.js';

export async function handleTemplateButton(
  env: Env,
  interaction: DiscordInteraction,
  templateKey: string,
): Promise<InteractionResponse> {
  const channelId = interaction.channel_id;
  if (!channelId) {
    return ephemeral('Could not determine the channel for this ticket.');
  }

  if (!isStaff(interaction)) {
    return ephemeral('❌ Only staff can send template responses.');
  }

  const ticket = await getTicket(env, channelId);
  if (!ticket) {
    return ephemeral('This channel does not have an associated ticket.');
  }

  if (ticket.status === 'closed') {
    return ephemeral('This ticket has been closed.');
  }

  const template = ResponseTemplates[templateKey];
  if (!template) {
    return ephemeral(`Unknown template: ${templateKey}`);
  }

  const staffUser = interaction.member?.user ?? interaction.user;
  const staffName = staffUser?.username ?? 'Staff';

  // Post the template message to the channel (visible to everyone)
  try {
    await sendMessage(env, channelId, {
      content: `${template.emoji} **${template.label}**\n\n${template.message}\n\n_— <@${staffUser?.id}>_`,
    });
  } catch (err) {
    console.error('[template] failed to send message:', err);
    return ephemeral('Failed to send the response. Please try again.');
  }

  // GitHub integration for "Acknowledged"
  let githubNote = '';
  if (templateKey === 'acknowledged') {
    githubNote = await syncAcknowledgedToGitHub(env, channelId, staffName);
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `✅ Posted "${template.label}" response.${githubNote}`,
      flags: MessageFlags.EPHEMERAL,
    },
  };
}

/**
 * Syncs the "Acknowledged" action to GitHub:
 * - Bug with existing issue → add label + comment
 * - Feature/Feedback → create a new GitHub discussion
 * Returns a short status string to append to the ephemeral reply.
 */
async function syncAcknowledgedToGitHub(
  env: Env,
  channelId: string,
  staffName: string,
): Promise<string> {
  if (!env.GITHUB_TOKEN) return '';

  const ticket = await getTicket(env, channelId);
  if (!ticket) return '';

  // Bug with existing GitHub issue — label + comment
  if (ticket.githubIssueNumber) {
    try {
      await Promise.all([
        addGitHubIssueLabel(env, ticket.githubIssueNumber, ['acknowledged']),
        addGitHubIssueComment(
          env,
          ticket.githubIssueNumber,
          `✅ **Acknowledged** by staff member **${staffName}** via Discord ticket #${ticket.id}.`,
        ),
      ]);
      return `\n🔗 Updated [GitHub #${ticket.githubIssueNumber}](${ticket.githubIssueUrl}) with acknowledged label.`;
    } catch (err) {
      console.error('[template] failed to sync acknowledged to GitHub:', err);
      return '\n⚠️ GitHub sync failed — please update the issue manually.';
    }
  }

  // Feature or Feedback — create a GitHub Discussion (not an Issue)
  if (ticket.category === 'Feature' || ticket.category === 'Feedback') {
    try {
      const discussion = await createGitHubDiscussionOnAcknowledge(
        env,
        ticket.id,
        ticket.category,
        ticket.title,
        ticket.description,
        ticket.username,
        ticket.userId,
        staffName,
      );
      if (discussion) {
        await updateTicket(env, channelId, {
          githubIssueNumber: discussion.number,
          githubIssueUrl: discussion.html_url,
        });
        return `\n💬 Added to GitHub Discussions: [#${discussion.number}](${discussion.html_url}).`;
      }
    } catch (err) {
      console.error('[template] failed to sync discussion to GitHub:', err);
      return '\n⚠️ GitHub Discussion sync failed — please create it manually.';
    }
  }

  return '';
}

