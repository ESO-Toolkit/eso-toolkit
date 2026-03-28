/**
 * Handles modal submission from the ticket creation form.
 * Orchestrates: channel creation → AI classification → GitHub issue → embed post.
 *
 * Exported helpers (buildTicketEmbed, buildTicketActionRow) are shared by
 * the claim/close handlers to keep the embed layout consistent.
 */

import { classifyTicket } from '../ai.js';
import {
  allow,
  createChannel,
  editFollowup,
  editMessage,
  getGuildRoles,
  Permission,
  sendMessage,
} from '../discord.js';
import { createGitHubIssue } from '../github.js';
import { nextTicketId, putTicket, updateTicket } from '../kv.js';
import {
  ButtonId,
  ButtonStyle,
  ChannelType,
  Colors,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  ResponseTemplates,
} from '../types.js';
import type {
  DiscordComponent,
  DiscordEmbed,
  DiscordInteraction,
  Env,
  InteractionResponse,
  TicketCategory,
  TicketState,
} from '../types.js';
import { findInputValue } from '../utils.js';

// ── Shared embed + button builders ──────────────────────────────────────────

const PRIORITY_COLOR: Record<string, number> = {
  Critical: Colors.PRIORITY_CRITICAL,
  High: Colors.PRIORITY_HIGH,
  Medium: Colors.PRIORITY_MEDIUM,
  Low: Colors.PRIORITY_LOW,
};

const CATEGORY_EMOJI: Record<string, string> = {
  Bug: '🐛',
  Feature: '💡',
  Feedback: '💬',
};

export function buildTicketEmbed(ticket: TicketState): DiscordEmbed {
  const color =
    ticket.status === 'closed'
      ? Colors.TICKET_CLOSED
      : ticket.status === 'claimed'
        ? Colors.TICKET_CLAIMED
        : ticket.aiPriority
          ? (PRIORITY_COLOR[ticket.aiPriority] ?? Colors.TICKET_OPEN)
          : Colors.TICKET_OPEN;

  const categoryLabel = ticket.aiRefinedCategory ?? ticket.category;
  const categoryEmoji = CATEGORY_EMOJI[categoryLabel] ?? '🎫';

  const fields: DiscordEmbed['fields'] = [
    { name: 'Category', value: `${categoryEmoji} ${categoryLabel}`, inline: true },
    { name: 'Status', value: capitalise(ticket.status), inline: true },
    {
      name: 'Priority',
      value: ticket.aiPriority ?? '_Pending AI analysis…_',
      inline: true,
    },
    {
      name: 'Assigned To',
      value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : '_Unclaimed_',
      inline: true,
    },
  ];

  if (ticket.aiSummary) {
    fields.push({ name: '🤖 AI Summary', value: ticket.aiSummary, inline: false });
  }

  if (ticket.githubIssueUrl) {
    fields.push({
      name: '🐙 GitHub Issue',
      value: `[#${ticket.githubIssueNumber}](${ticket.githubIssueUrl})`,
      inline: true,
    });
  }

  // Staff notes are intentionally excluded from the embed — the ticket creator and added
  // users can view this channel, so notes must not be rendered here. Staff can review
  // notes by using the Staff Note button, which responds ephemerally.

  const openedAt = new Date(ticket.createdAt);
  const timeStr = openedAt.toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return {
    color,
    title: `🎫 Ticket #${ticket.id} — ${ticket.title}`,
    description: ticket.description,
    fields,
    footer: {
      text: `Opened by ${ticket.username} • ${timeStr}`,
    },
    timestamp: ticket.createdAt,
  };
}

export function buildTicketActionRows(ticket: TicketState): DiscordComponent[] {
  const closed = ticket.status === 'closed';
  const claimed = !!ticket.claimedBy;

  // Row 1: Primary actions
  const primaryRow: DiscordComponent = {
    type: ComponentType.ACTION_ROW,
    components: [
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.PRIMARY,
        label: claimed ? 'Unclaim' : 'Claim',
        emoji: { name: claimed ? '↩️' : '🙋' },
        custom_id: claimed ? ButtonId.UNCLAIM : ButtonId.CLAIM,
        disabled: closed,
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SUCCESS,
        label: 'Close',
        emoji: { name: '✅' },
        custom_id: ButtonId.CLOSE,
        disabled: closed,
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SECONDARY,
        label: 'Add User',
        emoji: { name: '➕' },
        custom_id: ButtonId.ADD_USER,
        disabled: closed,
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SECONDARY,
        label: 'Remove User',
        emoji: { name: '➖' },
        custom_id: ButtonId.REMOVE_USER,
        disabled: closed,
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SECONDARY,
        label: 'Note',
        emoji: { name: '📝' },
        custom_id: ButtonId.STAFF_NOTE,
        disabled: closed,
      },
    ],
  };

  // Row 2: Quick response templates
  const templateRow: DiscordComponent = {
    type: ComponentType.ACTION_ROW,
    components: Object.entries(ResponseTemplates).map(([key, template]) => ({
      type: ComponentType.BUTTON,
      style: ButtonStyle.SECONDARY,
      label: template.label,
      emoji: { name: template.emoji },
      custom_id: `${ButtonId.TEMPLATE_PREFIX}${key}`,
      disabled: closed,
    })),
  };

  return [primaryRow, templateRow];
}

// Legacy export for backwards compatibility
export function buildTicketActionRow(ticket: TicketState): DiscordComponent {
  const rows = buildTicketActionRows(ticket);
  return rows[0];
}

// ── Modal submission handler ─────────────────────────────────────────────────

export async function handleTicketFormModal(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<InteractionResponse> {
  // Parse category from custom_id: "ticket_form:Bug"
  const customId = interaction.data?.custom_id ?? '';
  const categoryRaw = customId.split(':')[1] as TicketCategory | undefined;
  const category: TicketCategory =
    categoryRaw && ['Bug', 'Feature', 'Feedback'].includes(categoryRaw)
      ? categoryRaw
      : 'Feedback';

  // Extract field values from modal components
  const components = interaction.data?.components ?? [];
  const title = findInputValue(components as unknown as Parameters<typeof findInputValue>[0], 'ticket_title') ?? 'Untitled';
  const description = findInputValue(components as unknown as Parameters<typeof findInputValue>[0], 'ticket_description') ?? '(no description)';

  const user = interaction.member?.user ?? interaction.user;
  if (!user) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Unable to identify the user for this interaction. Please try again.',
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  // Immediately defer — channel creation + AI + GitHub all take >3s
  ctx.waitUntil(
    processTicketCreation(env, interaction, user, category, title, description),
  );

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: MessageFlags.EPHEMERAL },
  };
}

// ── Async ticket creation pipeline ──────────────────────────────────────────

async function processTicketCreation(
  env: Env,
  interaction: DiscordInteraction,
  user: { id: string; username: string },
  category: TicketCategory,
  title: string,
  description: string,
): Promise<void> {
  try {
    // 1. Assign ticket ID
    const ticketId = await nextTicketId(env);

    // 2. Determine permission overwrites
    const overwrites = await buildPermissionOverwrites(env, user.id);

    // 3. Create the private channel
    const channelName = `ticket-${ticketId}`;
    const channel = await createChannel(env, env.GUILD_ID, {
      name: channelName,
      type: ChannelType.GUILD_TEXT,
      parent_id: env.TICKET_CATEGORY_ID,
      topic: `Support ticket #${ticketId} — ${title}`,
      permission_overwrites: overwrites,
    });

    // 4. Save initial ticket state
    const now = new Date().toISOString();
    const ticket: TicketState = {
      id: ticketId,
      channelId: channel.id,
      userId: user.id,
      username: user.username,
      category,
      title,
      description,
      status: 'open',
      createdAt: now,
    };
    await putTicket(env, ticket);

    // 5. Post initial embed (before AI/GitHub so user sees channel fast)
    const embed = buildTicketEmbed(ticket);
    const actionRows = buildTicketActionRows(ticket);
    const embedMsg = await sendMessage(env, channel.id, {
      content: `<@${user.id}> Your ticket has been created. Staff will be with you shortly.`,
      embeds: [embed],
      components: actionRows,
    });

    // Save embed message ID for later edits
    ticket.embedMessageId = embedMsg.id;
    await putTicket(env, ticket);

    // 6. Run AI classification + GitHub issue in parallel
    const [aiResult, githubIssue] = await Promise.allSettled([
      classifyTicket(env, category, title, description),
      category === 'Bug'
        ? createGitHubIssue(env, ticketId, title, description, user.username, user.id, undefined)
        : Promise.resolve(null),
    ]);

    const ai = aiResult.status === 'fulfilled' ? aiResult.value : null;
    const github = githubIssue.status === 'fulfilled' ? githubIssue.value : null;

    // 7. Update KV with AI + GitHub data (only include defined values)
    const aiPatch = {
      ...(ai?.priority !== undefined && { aiPriority: ai.priority }),
      ...(ai?.summary !== undefined && { aiSummary: ai.summary }),
      ...(ai?.refined_category !== undefined && { aiRefinedCategory: ai.refined_category }),
      ...(github?.number !== undefined && { githubIssueNumber: github.number }),
      ...(github?.html_url !== undefined && { githubIssueUrl: github.html_url }),
    };
    const updatedTicket = await updateTicket(env, channel.id, aiPatch);

    // 8. Edit the embed with enriched data
    if (updatedTicket) {
      await editMessage(env, channel.id, embedMsg.id, {
        content: `<@${user.id}> Your ticket has been created. Staff will be with you shortly.`,
        embeds: [buildTicketEmbed(updatedTicket)],
        components: buildTicketActionRows(updatedTicket),
      });
    }

    // 9. Update the ephemeral deferred reply
    await editFollowup(env, interaction.token, '@original', {
      content: `✅ Your ticket **#${ticketId}** has been created: <#${channel.id}>`,
    });
  } catch (err) {
    console.error('[ticket-form] processTicketCreation error:', err);
    try {
      await editFollowup(env, interaction.token, '@original', {
        content: '❌ Something went wrong creating your ticket. Please try again or contact a staff member.',
      });
    } catch (followupErr) {
      console.error('[ticket-form] failed to send error followup:', followupErr);
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds channel permission overwrites:
 * - Deny @everyone
 * - Allow ticket creator
 * - Allow any role with MANAGE_CHANNELS permission (staff)
 */
async function buildPermissionOverwrites(
  env: Env,
  userId: string,
): Promise<
  { id: string; type: 0 | 1; allow?: string; deny?: string }[]
> {
  const memberPerms = allow(
    Permission.VIEW_CHANNEL,
    Permission.SEND_MESSAGES,
    Permission.READ_MESSAGE_HISTORY,
    Permission.EMBED_LINKS,
    Permission.ATTACH_FILES,
    Permission.ADD_REACTIONS,
    Permission.USE_EXTERNAL_EMOJIS,
  );

  const overwrites: { id: string; type: 0 | 1; allow?: string; deny?: string }[] = [
    // Deny @everyone (role id = guild id)
    { id: env.GUILD_ID, type: 0, deny: allow(Permission.VIEW_CHANNEL) },
    // Allow ticket creator
    { id: userId, type: 1, allow: memberPerms },
  ];

  // Allow roles that have MANAGE_CHANNELS (staff/mods)
  try {
    const roles = await getGuildRoles(env, env.GUILD_ID);
    for (const role of roles) {
      const perms = BigInt(role.permissions);
      if ((perms & Permission.MANAGE_CHANNELS) === Permission.MANAGE_CHANNELS) {
        overwrites.push({ id: role.id, type: 0, allow: memberPerms });
      }
    }
  } catch (err) {
    console.error('[ticket-form] failed to fetch guild roles:', err);
  }

  return overwrites;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
