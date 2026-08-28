import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types';

const discord = vi.hoisted(() => ({
  createChannel: vi.fn(),
  getGuildRoles: vi.fn(),
  sendMessage: vi.fn(),
}));
const kv = vi.hoisted(() => ({ nextTicketId: vi.fn(), putTicket: vi.fn() }));

vi.mock('../discord.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../discord.js')>();
  return { ...original, ...discord };
});
vi.mock('../kv.js', () => kv);

import { Permission } from '../discord';
import { buildTicketPermissionOverwrites, createPrivateTicket } from './service';

const env = { GUILD_ID: '111111111111111111', TICKET_CATEGORY_ID: '333333333333333333' } as Env;
const userId = '222222222222222222';

beforeEach(() => {
  discord.createChannel.mockReset();
  discord.getGuildRoles.mockReset();
  discord.sendMessage.mockReset();
  kv.nextTicketId.mockReset();
  kv.putTicket.mockReset();
});

describe('private ticket ACL service', () => {
  it('denies everyone and grants access only to the authenticated user and staff roles', async () => {
    discord.getGuildRoles.mockResolvedValue([
      { id: '444444444444444444', permissions: Permission.MANAGE_CHANNELS.toString() },
      { id: '555555555555555555', permissions: '0' },
    ]);
    const overwrites = await buildTicketPermissionOverwrites(env, userId);
    expect(overwrites.map(({ id }) => id)).toEqual([env.GUILD_ID, userId, '444444444444444444']);
    expect(overwrites[0]).toMatchObject({ id: env.GUILD_ID, type: 0, deny: expect.any(String) });
    expect(overwrites[1]).toMatchObject({ id: userId, type: 1, allow: expect.any(String) });
  });

  it('fails closed before creating a channel when staff ACL discovery fails or finds no staff roles', async () => {
    discord.getGuildRoles.mockRejectedValueOnce(new Error('Discord unavailable'));
    await expect(buildTicketPermissionOverwrites(env, userId)).rejects.toThrow('Discord unavailable');
    discord.getGuildRoles.mockResolvedValueOnce([]);
    await expect(buildTicketPermissionOverwrites(env, userId)).rejects.toThrow('No staff roles');
    expect(discord.createChannel).not.toHaveBeenCalled();
  });

  it('creates exactly one private channel and records it before posting the idempotent first message', async () => {
    discord.getGuildRoles.mockResolvedValue([
      { id: '444444444444444444', permissions: Permission.MANAGE_CHANNELS.toString() },
    ]);
    kv.nextTicketId.mockResolvedValue('0042');
    discord.createChannel.mockResolvedValue({ id: '666666666666666666' });
    discord.sendMessage.mockResolvedValue({ id: '777777777777777777' });
    const onChannelCreated = vi.fn();
    const result = await createPrivateTicket(env, {
      user: { id: userId, username: 'Tester' },
      category: 'Bug',
      title: 'Kalpa: Install failed',
      description: 'It failed',
      source: 'kalpa',
      topicMarker: 'kalpa:opaque',
      messageNonce: 'idempotency-key-1234',
      initialMessage: () => ({ content: 'safe report', allowed_mentions: { parse: [], users: [userId] } }),
      onChannelCreated,
    });
    expect(discord.createChannel).toHaveBeenCalledTimes(1);
    expect(onChannelCreated).toHaveBeenCalledWith('666666666666666666', '0042');
    expect(onChannelCreated.mock.invocationCallOrder[0]).toBeLessThan(kv.putTicket.mock.invocationCallOrder[0]);
    expect(discord.sendMessage).toHaveBeenCalledWith(env, '666666666666666666', expect.objectContaining({
      nonce: 'idempotency-key-1234',
      enforce_nonce: true,
      allowed_mentions: { parse: [], users: [userId] },
    }));
    expect(result.ticket).toMatchObject({ id: '0042', userId, source: 'kalpa' });
  });
});
