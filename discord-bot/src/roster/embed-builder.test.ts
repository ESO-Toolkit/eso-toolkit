import { describe, expect, it } from 'vitest';
import { buildRosterEmbed, buildRosterActionRows } from './embed-builder';
import type { DecodedRoster, RosterSnapshot } from './types';

const mockSnapshot: RosterSnapshot = {
  id: 'test-123',
  title: 'Sunday VLC Prog',
  description: 'Weekly progression run',
  trial_id: 'vlc',
  author_name: 'TestUser',
  roster_data: '',
  tags: ['vlc', 'prog'],
  vote_count: 5,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-27T00:00:00Z',
};

const mockDecoded: DecodedRoster = {
  name: 'Sunday VLC',
  tanks: [
    { playerName: 'TankPlayer1', roleLabel: 'T1' },
    { playerName: 'TankPlayer2', roleLabel: 'T2' },
  ],
  healers: [
    { playerName: 'HealerPlayer1', roleLabel: 'H1' },
    { roleLabel: 'H2' },
  ],
  dps: [
    { playerName: 'DPS1', roleLabel: 'DD1', buildRefId: 'build-abc' },
    { playerName: 'DPS2', roleLabel: 'DD2' },
  ],
};

describe('buildRosterEmbed', () => {
  it('creates an embed with title and description', () => {
    const embed = buildRosterEmbed(mockSnapshot, mockDecoded);
    expect(embed.title).toContain('Sunday VLC Prog');
    expect(embed.description).toContain('Weekly progression run');
    expect(embed.description).toContain('vlc');
    expect(embed.description).toContain('TestUser');
  });

  it('includes role sections', () => {
    const embed = buildRosterEmbed(mockSnapshot, mockDecoded);
    const allValues = embed.fields?.map((f) => f.value).join('\n') ?? '';
    expect(allValues).toContain('Tanks');
    expect(allValues).toContain('Healers');
    expect(allValues).toContain('DPS');
    expect(allValues).toContain('TankPlayer1');
  });

  it('shows roster count', () => {
    const embed = buildRosterEmbed(mockSnapshot, mockDecoded);
    const rosterField = embed.fields?.find((f) => f.name.includes('Roster'));
    expect(rosterField?.value).toContain('5/6 filled');
  });

  it('shows tags', () => {
    const embed = buildRosterEmbed(mockSnapshot, mockDecoded);
    const tagField = embed.fields?.find((f) => f.name.includes('Tags'));
    expect(tagField?.value).toContain('vlc');
    expect(tagField?.value).toContain('prog');
  });

  it('uses the correct color', () => {
    const embed = buildRosterEmbed(mockSnapshot, mockDecoded);
    expect(embed.color).toBe(0xc8aa6e);
  });
});

describe('buildRosterActionRows', () => {
  it('creates two action rows', () => {
    const rows = buildRosterActionRows('test-123');
    expect(rows).toHaveLength(2);
  });

  it('includes sign-up buttons', () => {
    const rows = buildRosterActionRows('test-123');
    const buttons = rows[0].components ?? [];
    expect(buttons).toHaveLength(3);
    expect(buttons[0].label).toBe('Tank');
    expect(buttons[1].label).toBe('Healer');
    expect(buttons[2].label).toBe('DD');
  });

  it('includes ESO Toolkit link button', () => {
    const rows = buildRosterActionRows('test-123');
    const buttons = rows[1].components ?? [];
    const linkButton = buttons.find((b) => b.url);
    expect(linkButton?.url).toContain('/rv?id=test-123');
  });

  it('encodes roster ID in button custom_ids', () => {
    const rows = buildRosterActionRows('abc-xyz');
    const buttons = rows[0].components ?? [];
    expect(buttons[0].custom_id).toContain('abc-xyz');
  });
});
