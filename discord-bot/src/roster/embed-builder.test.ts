import { describe, expect, it } from 'vitest';
import { buildRosterText, splitMessages, buildRosterActionRows } from './embed-builder';
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
    {
      playerName: 'TankPlayer1',
      roleLabel: 'MT',
      sets: ['Turning Tide', 'Claw of Yolnahkriin'],
      ultimate: 'Aggressive Warhorn',
      groupName: 'left',
    },
    {
      playerName: 'TankPlayer2',
      roleLabel: 'OT',
      sets: ['Saxhleel Champion'],
      groupName: 'right',
      positionTag: 'Portal',
      playerNumber: 'right',
    },
  ],
  healers: [
    {
      playerName: 'HealerPlayer1',
      roleLabel: 'H1',
      healerBuff: 'Enlivening Overflow',
      skillLines: { line1: 'Restoring Light', line2: 'Green Balance', isFlex: false },
    },
    { roleLabel: 'H2', labels: ['kite'] },
  ],
  dps: [
    {
      playerName: 'DPS1',
      roleLabel: 'DD1',
      slotNumber: 1,
      buildRefId: 'build-abc',
      jailDDType: 'Banner',
    },
    {
      playerName: 'DPS2',
      slotNumber: 2,
      sets: ['Pillar of Nirn', 'Deadly Strike'],
      notes: 'Bring vMA bow',
    },
  ],
  notes: 'Be online 10 min early',
};

describe('buildRosterText', () => {
  it('includes title', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('**Sunday VLC Prog**');
  });

  it('uses group arrows for tanks', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('⬅️🛡️ **MT**:');
    expect(text).toContain('➡️🛡️ **OT**:');
  });

  it('formats gear as GEAR: `Set` lines', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('GEAR: `Turning Tide` `Claw of Yolnahkriin`');
  });

  it('formats ultimates in brackets', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('[Aggressive Warhorn]');
  });

  it('formats position tags', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('[Portal] [👉]');
  });

  it('formats healer buffs and skill lines', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('[Enlivening Overflow]');
    expect(text).toContain('LINES: `Restoring Light` `Green Balance`');
  });

  it('formats labels in brackets', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('[kite]');
  });

  it('formats DPS with slot numbers and jail types', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('⚔️ **#1 [Banner]**:');
  });

  it('formats DPS notes in italics', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('*Bring vMA bow*');
  });

  it('includes general notes', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('**General Notes:**');
    expect(text).toContain('Be online 10 min early');
  });

  it('uses separators between role sections', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('▬▬▬▬▬');
  });

  it('includes player names with @', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('@TankPlayer1');
    expect(text).toContain('@DPS1');
  });
});

describe('splitMessages', () => {
  it('returns single chunk for short text', () => {
    const chunks = splitMessages('Hello world');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('Hello world');
  });

  it('splits long text on line boundaries', () => {
    const line = 'A'.repeat(100) + '\n';
    const text = line.repeat(25).trimEnd();
    const chunks = splitMessages(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(2000);
    }
  });

  it('preserves all content after splitting', () => {
    const lines = Array.from({ length: 30 }, (_, i) => `Line ${i}: ${'x'.repeat(80)}`);
    const text = lines.join('\n');
    const chunks = splitMessages(text);
    const rejoined = chunks.join('\n');
    expect(rejoined).toBe(text);
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
