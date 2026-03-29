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

describe('buildRosterText', () => {
  it('includes title and meta info', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('**Sunday VLC Prog**');
    expect(text).toContain('vlc');
    expect(text).toContain('TestUser');
  });

  it('includes role sections with separators', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('🛡️ **Tanks**');
    expect(text).toContain('💚 **Healers**');
    expect(text).toContain('⚔️ **DPS**');
    expect(text).toContain('TankPlayer1');
    expect(text).toContain('▬▬▬▬▬');
  });

  it('shows roster count', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('5/6 filled');
  });

  it('shows tags', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('`vlc`');
    expect(text).toContain('`prog`');
  });

  it('includes build links for slots with buildRefId', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('[Build](https://esotk.com/builds/build-abc)');
  });

  it('includes description', () => {
    const text = buildRosterText(mockSnapshot, mockDecoded);
    expect(text).toContain('Weekly progression run');
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
    const text = line.repeat(25); // 25 * 101 = 2525 chars
    const chunks = splitMessages(text.trimEnd());
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
