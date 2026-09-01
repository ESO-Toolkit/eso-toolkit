import { describe, expect, it } from 'vitest';
import {
  buildRosterText,
  splitMessages,
  buildRosterActionRows,
  buildRolePingLine,
  escapeDiscord,
} from './embed-builder';
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

  it('appends the arena weapon to the gear line', () => {
    const withArena: DecodedRoster = {
      ...mockDecoded,
      tanks: [{ ...mockDecoded.tanks[0], arenaWeapon: "Maelstrom's Frost Staff" }],
    };
    const text = buildRosterText(mockSnapshot, withArena);
    expect(text).toContain("GEAR: `Turning Tide` `Claw of Yolnahkriin` `Maelstrom's Frost Staff`");
  });

  it('still renders a gear line for an arena weapon with no sets', () => {
    const arenaOnly: DecodedRoster = {
      ...mockDecoded,
      tanks: [{ playerName: 'TankPlayer1', roleLabel: 'MT', arenaWeapon: "Maelstrom's Bow" }],
    };
    expect(buildRosterText(mockSnapshot, arenaOnly)).toContain("GEAR: `Maelstrom's Bow`");
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
    expect(text).toContain('@\u200BTankPlayer1');
    expect(text).toContain('@\u200BDPS1');
    expect(text).not.toContain('@TankPlayer1');
  });
});

describe('escapeDiscord', () => {
  it('neutralizes mentions and channel references', () => {
    expect(escapeDiscord('@everyone @here <@123> <@&123> <#123>')).toBe(
      '@\u200Beveryone @\u200Bhere <\u200B@\u200B123\\> <\u200B@\u200B&123\\> <\u200B\\#123\\>',
    );
  });

  it('escapes masked links and markdown delimiters', () => {
    expect(escapeDiscord('[click](https://evil.test) **bold** `code` ||secret||')).toBe(
      '\\[click\\]\\(https://evil.test\\) \\*\\*bold\\*\\* \\`code\\` \\|\\|secret\\|\\|',
    );
  });

  it('escapes list markers at the start of each line', () => {
    expect(escapeDiscord('- item\n+ item\n1. item')).toBe('\\- item\n\\+ item\n1\\. item');
  });

  it('protects untrusted values through the complete roster rendering path', () => {
    const payload = '[click](https://evil.test) @everyone <@&100000000000000001>';
    const snapshot = { ...mockSnapshot, title: payload };
    const roster: DecodedRoster = {
      name: payload,
      tanks: [
        {
          roleLabel: payload,
          playerName: payload,
          sets: [payload],
          ultimate: payload,
          positionTag: payload,
          playerNumber: payload,
          roleNotes: payload,
          labels: [payload],
          notes: payload,
          skillLines: { line1: payload, line2: payload, line3: payload, isFlex: false },
        },
      ],
      healers: [
        {
          roleLabel: payload,
          healerBuff: payload,
          championPoint: payload,
          notes: payload,
        },
      ],
      dps: [
        {
          slotNumber: 1,
          jailDDType: 'Custom',
          customDescription: payload,
          arenaWeapon: payload,
          ultimate: payload,
          notes: payload,
        },
      ],
      notes: payload,
    };

    const text = buildRosterText(snapshot, roster);
    expect(text).not.toContain('[click](https://evil.test)');
    expect(text).not.toMatch(/@(everyone|here)|<@!?&?\d+>|<#\d+>/);
    expect(text).toContain('\\[click\\]\\(https://evil.test\\)');
    expect(text).toContain('@\u200Beveryone');
    expect(text).toContain('<\u200B@\u200B&100000000000000001\\>');
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

  it('hard-wraps a single over-limit line without dropping content', () => {
    const longLine = 'A'.repeat(4500);
    const chunks = splitMessages(`before\n${longLine}\nafter`);

    expect(chunks).toEqual([
      'before',
      longLine.slice(0, 2000),
      longLine.slice(2000, 4000),
      longLine.slice(4000),
      'after',
    ]);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(2000);
    }
  });

  it('keeps an escaped markdown token together across a hard-wrap boundary', () => {
    const text = `${'A'.repeat(1999)}\\> not a quote`;
    const chunks = splitMessages(text);

    expect(chunks.join('')).toBe(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(1999);
    expect(chunks[1]).toBe('\\> not a quote');
  });

  it('keeps UTF-16 surrogate pairs together across a hard-wrap boundary', () => {
    const text = `${'A'.repeat(1999)}😀rest`;
    const chunks = splitMessages(text);

    expect(chunks.join('')).toBe(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(1999);
    expect(chunks[1]).toBe('😀rest');
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

  it('does not truncate over-limit roster IDs in custom_ids', () => {
    const longRosterId = 'r'.repeat(120);
    const rows = buildRosterActionRows(longRosterId);
    const signupButtons = rows[0].components ?? [];
    const actionButtons = rows[1].components ?? [];
    const refreshButton = actionButtons.find((button) =>
      button.custom_id?.startsWith('roster_refresh'),
    );

    expect(signupButtons.map((button) => button.custom_id)).toEqual([
      'roster_signup:tank',
      'roster_signup:healer',
      'roster_signup:dd',
    ]);
    expect(refreshButton?.custom_id).toBe('roster_refresh');
  });
});

describe('buildRolePingLine', () => {
  const TANK = '100000000000000001';
  const HEALER = '100000000000000002';
  const DD = '100000000000000003';

  it('returns null when no ping config is provided', () => {
    expect(buildRolePingLine(mockDecoded, undefined)).toBeNull();
  });

  it('returns null when config has no usable role IDs', () => {
    expect(buildRolePingLine(mockDecoded, {})).toBeNull();
  });

  it('pings configured roles that are present in the roster', () => {
    const result = buildRolePingLine(mockDecoded, { tank: TANK, healer: HEALER, dd: DD });
    expect(result).not.toBeNull();
    expect(result?.roleIds).toEqual([TANK, HEALER, DD]);
    expect(result?.content).toContain(`<@&${TANK}>`);
    expect(result?.content).toContain(`<@&${HEALER}>`);
    expect(result?.content).toContain(`<@&${DD}>`);
  });

  it('skips role types that are absent from the roster', () => {
    const tanksOnly: DecodedRoster = { tanks: mockDecoded.tanks, healers: [], dps: [] };
    const result = buildRolePingLine(tanksOnly, { tank: TANK, healer: HEALER, dd: DD });
    expect(result?.roleIds).toEqual([TANK]);
    expect(result?.content).not.toContain(`<@&${HEALER}>`);
  });

  it('pings based on composition even when slots are unfilled (blank roster)', () => {
    // The encoder only stores filled slots, so a "seeking signups" roster has
    // empty arrays but a full composition — pings must still fire.
    const blank: DecodedRoster = {
      composition: { tanks: 2, healers: 2, dps: 8 },
      tanks: [],
      healers: [],
      dps: [],
    };
    const result = buildRolePingLine(blank, { tank: TANK, healer: HEALER, dd: DD });
    expect(result?.roleIds).toEqual([TANK, HEALER, DD]);
  });

  it('honors a composition that excludes a role (e.g. no healers)', () => {
    const noHealers: DecodedRoster = {
      composition: { tanks: 2, healers: 0, dps: 8 },
      tanks: [],
      healers: [],
      dps: [],
    };
    const result = buildRolePingLine(noHealers, { tank: TANK, healer: HEALER, dd: DD });
    expect(result?.roleIds).toEqual([TANK, DD]);
  });

  it('de-duplicates when the same role is configured for multiple types', () => {
    const result = buildRolePingLine(mockDecoded, { tank: TANK, healer: TANK, dd: DD });
    expect(result?.roleIds).toEqual([TANK, DD]);
  });

  it('ignores malformed (non-snowflake) role IDs', () => {
    const result = buildRolePingLine(mockDecoded, { tank: '@everyone', healer: HEALER, dd: 'abc' });
    expect(result?.roleIds).toEqual([HEALER]);
  });

  it('returns null when configured roles map to empty role sections', () => {
    const empty: DecodedRoster = { tanks: [], healers: [], dps: mockDecoded.dps };
    expect(buildRolePingLine(empty, { tank: TANK, healer: HEALER })).toBeNull();
  });
});
