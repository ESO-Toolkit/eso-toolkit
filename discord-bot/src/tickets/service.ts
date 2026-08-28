import {
  allow,
  createChannel,
  getGuildRoles,
  Permission,
  sendMessage,
  type PermissionOverwrite,
  type SendMessageOptions,
} from '../discord.js';
import { nextTicketId, putTicket } from '../kv.js';
import { ChannelType } from '../types.js';
import type { Env, TicketCategory, TicketState } from '../types.js';

const MEMBER_PERMISSIONS = allow(
  Permission.VIEW_CHANNEL,
  Permission.SEND_MESSAGES,
  Permission.READ_MESSAGE_HISTORY,
  Permission.EMBED_LINKS,
  Permission.ATTACH_FILES,
  Permission.ADD_REACTIONS,
  Permission.USE_EXTERNAL_EMOJIS,
);

export async function buildTicketPermissionOverwrites(
  env: Env,
  userId: string,
): Promise<PermissionOverwrite[]> {
  const roles = await getGuildRoles(env, env.GUILD_ID);
  const staffRoles = roles.filter((role) => {
    const permissions = BigInt(role.permissions);
    return (permissions & Permission.MANAGE_CHANNELS) === Permission.MANAGE_CHANNELS;
  });
  if (staffRoles.length === 0) {
    throw new Error('No staff roles with MANAGE_CHANNELS are available');
  }
  return [
    { id: env.GUILD_ID, type: 0, deny: allow(Permission.VIEW_CHANNEL) },
    { id: userId, type: 1, allow: MEMBER_PERMISSIONS },
    ...staffRoles.map((role) => ({ id: role.id, type: 0 as const, allow: MEMBER_PERMISSIONS })),
  ];
}

export interface CreatePrivateTicketInput {
  user: { id: string; username: string };
  category: TicketCategory;
  title: string;
  description: string;
  source: 'discord-modal' | 'kalpa';
  topicMarker?: string;
  messageNonce?: string;
  initialMessage(ticket: TicketState): SendMessageOptions;
  onChannelCreated?(channelId: string, ticketId: string): Promise<void>;
}

export async function createPrivateTicket(
  env: Env,
  input: CreatePrivateTicketInput,
): Promise<{ ticket: TicketState; messageId: string }> {
  const ticketId = await nextTicketId(env);
  const overwrites = await buildTicketPermissionOverwrites(env, input.user.id);
  const topic = [`Support ticket #${ticketId} — ${input.title}`, input.topicMarker]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 1024);
  const channel = await createChannel(
    env,
    env.GUILD_ID,
    {
      name: `ticket-${ticketId}`,
      type: ChannelType.GUILD_TEXT,
      parent_id: env.TICKET_CATEGORY_ID,
      topic,
      permission_overwrites: overwrites,
    },
    false,
  );
  await input.onChannelCreated?.(channel.id, ticketId);

  const ticket: TicketState = {
    id: ticketId,
    channelId: channel.id,
    userId: input.user.id,
    username: input.user.username,
    category: input.category,
    title: input.title,
    description: input.description,
    status: 'open',
    source: input.source,
    createdAt: new Date().toISOString(),
  };
  await putTicket(env, ticket);
  const message = await sendMessage(env, channel.id, {
    ...input.initialMessage(ticket),
    ...(input.messageNonce && { nonce: input.messageNonce, enforce_nonce: true }),
  });
  ticket.embedMessageId = message.id;
  await putTicket(env, ticket);
  return { ticket, messageId: message.id };
}
