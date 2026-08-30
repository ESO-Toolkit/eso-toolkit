import { describe, expect, it } from 'vitest';

import { ButtonId } from '../types';
import type { TicketState } from '../types';
import { buildTicketActionRows, buildTicketMessageUpdate } from './ticket-form';

function ticket(overrides: Partial<TicketState> = {}): TicketState {
  return {
    id: '0006-mtf4xj8k-u1ep8z',
    channelId: '666666666666666666',
    userId: '222222222222222222',
    username: 'Tester',
    category: 'Bug',
    title: 'Kalpa: Install failed',
    description: 'It failed',
    status: 'open',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('ticket control message updates', () => {
  it('offers staff the close control on every ticket source', () => {
    for (const source of ['discord-modal', 'kalpa'] as const) {
      const ids = buildTicketActionRows(ticket({ source }))
        .flatMap((row) => row.components ?? [])
        .map((component) => component.custom_id);
      expect(ids).toContain(ButtonId.CLOSE);
      expect(ids).toContain(ButtonId.CLAIM);
    }
  });

  it('re-renders the summary embed for a ticket opened from the Discord modal', () => {
    const update = buildTicketMessageUpdate(ticket({ source: 'discord-modal' }));
    expect(update.embeds).toHaveLength(1);
    expect(update.components).toHaveLength(2);
  });

  it('never attaches a summary embed to a Kalpa report message', () => {
    // The Kalpa control message carries the report the user reviewed in the app
    // as its content. An embed here would render a summary alongside a report
    // that is required to be exactly what the user approved.
    const update = buildTicketMessageUpdate(ticket({ source: 'kalpa' }));
    expect(update.embeds).toBeUndefined();
    expect(update.content).toBeUndefined();
    expect(update.components).toHaveLength(2);
  });

  it('disables every control once the ticket is closed', () => {
    const disabled = buildTicketActionRows(ticket({ source: 'kalpa', status: 'closed' }))
      .flatMap((row) => row.components ?? [])
      .map((component) => component.disabled);
    expect(disabled.every(Boolean)).toBe(true);
  });
});
