/**
 * Tests for rosterDiscordFormat — the pure Discord export formatter.
 *
 * Covers:
 * - groupArrow / formatPosition pure helpers
 * - generateDiscordFormat end-to-end on a sample roster:
 *   - P0 regression guard: a DPS slot with groups:['Left Stack'] renders the ⬅️ arrow
 *   - tank / healer group arrows render
 *   - a malicious player name (@everyone) is neutralized (cannot ping)
 */

import {
  createDefaultRoster,
  defaultTankSetup,
  defaultHealerSetup,
  type RaidRoster,
} from '../types/roster';

import {
  groupArrow,
  formatPosition,
  generateDiscordFormat,
} from './rosterDiscordFormat';

// Zero-width space used by escapeDiscord to break Discord mention triggers.
const ZWSP = '​';

describe('groupArrow', () => {
  it("maps a 'Left'-containing group name to the left arrow", () => {
    expect(groupArrow('Left Stack')).toBe('⬅️');
  });

  it("maps a 'Right'-containing group name to the right arrow", () => {
    expect(groupArrow('Right')).toBe('➡️');
  });

  it('is case-insensitive', () => {
    expect(groupArrow('left stack')).toBe('⬅️');
    expect(groupArrow('RIGHT STACK')).toBe('➡️');
  });

  it('returns empty string for undefined', () => {
    expect(groupArrow(undefined)).toBe('');
  });

  it('returns empty string for a non-directional group name', () => {
    expect(groupArrow('Slayer Stack 1')).toBe('');
  });
});

describe('formatPosition', () => {
  it('renders a directional position as separate bracket tokens', () => {
    // emoji is directional (👈) → "[Portal] [👈]"
    expect(formatPosition('Portal', 'left')).toBe(' [Portal] [👈]');
    expect(formatPosition('Bridge', 'right')).toBe(' [Bridge] [👉]');
    expect(formatPosition('Center', 'center')).toBe(' [Center] [👇]');
  });

  it('renders a non-directional position + playerNumber as a combined token', () => {
    // emoji is the raw playerNumber ("1") → combined "[Tomb 2a 1]"
    expect(formatPosition('Tomb 2a', '1')).toBe(' [Tomb 2a 1]');
  });

  it('renders a positionTag alone when there is no playerNumber', () => {
    expect(formatPosition('Tomb', undefined)).toBe(' [Tomb]');
  });

  it('renders a directional playerNumber alone when there is no positionTag', () => {
    expect(formatPosition(undefined, 'left')).toBe(' [👈]');
  });

  it('returns empty string when both are absent', () => {
    expect(formatPosition(undefined, undefined)).toBe('');
  });
});

describe('generateDiscordFormat', () => {
  /** Build a small but representative roster covering all three roles + a malicious name. */
  function buildSampleRoster(): RaidRoster {
    const roster = createDefaultRoster();
    roster.rosterName = 'Sample Raid';

    // Tank 1 — explicit Left group → arrow should be ⬅️ (not the MT default, but same glyph)
    roster.tanks[0] = {
      ...defaultTankSetup(1),
      playerName: 'TankPlayer',
      groups: ['Left Stack'],
    };
    // Tank 2 — explicit Right group → ➡️
    roster.tanks[1] = {
      ...defaultTankSetup(2),
      playerName: 'OffTankPlayer',
      groups: ['Right Stack'],
    };

    // Healer 1 — explicit Left group → ⬅️
    roster.healers[0] = {
      ...defaultHealerSetup(1),
      playerName: 'HealerLeft',
      groups: ['Left Stack'],
    };
    // Healer 2 — explicit Right group → ➡️
    roster.healers[1] = {
      ...defaultHealerSetup(2),
      playerName: 'HealerRight',
      groups: ['Right Stack'],
    };

    // DPS slot 1 — the P0 regression case: groups:['Left Stack'] must render ⬅️
    roster.dpsSlots[0] = {
      slotNumber: 1,
      playerName: 'LeftStackDPS',
      groups: ['Left Stack'],
    };

    // DPS slot 2 — malicious player name that must be neutralized
    roster.dpsSlots[1] = {
      slotNumber: 2,
      playerName: '@everyone',
    };

    return roster;
  }

  it('P0 regression guard: a DPS slot with groups:["Left Stack"] renders the ⬅️ arrow', () => {
    const output = generateDiscordFormat(buildSampleRoster());
    // The DPS line is `${arrow}⚔️ **#1...**`; with a Left group the arrow must precede ⚔️.
    expect(output).toContain('⬅️⚔️ **#1');
  });

  it('renders the tank group arrows', () => {
    const output = generateDiscordFormat(buildSampleRoster());
    // Tank lines are `${arrow}🛡️ **...**`
    expect(output).toContain('⬅️🛡️');
    expect(output).toContain('➡️🛡️');
  });

  it('renders the healer group arrows', () => {
    const output = generateDiscordFormat(buildSampleRoster());
    // Healer lines are `${arrow}💖 **...**`
    expect(output).toContain('⬅️💖');
    expect(output).toContain('➡️💖');
  });

  it('renders NO directional arrow when no group is set on any role', () => {
    // A default roster has no groups → tanks/healers/DPS must show the bare
    // role glyph with no positional ⬅️/➡️ default. Guards the "arrows only when
    // set in the roster builder" behavior across all three roles.
    const roster = createDefaultRoster();
    roster.tanks[0] = { ...defaultTankSetup(1), playerName: 'NoGroupTank' };
    roster.healers[0] = { ...defaultHealerSetup(1), playerName: 'NoGroupHealer' };
    roster.dpsSlots[0] = { slotNumber: 1, playerName: 'NoGroupDPS' };

    const output = generateDiscordFormat(roster);

    // Lines render with the role glyph immediately, no preceding arrow.
    expect(output).toContain('🛡️ **MT**');
    expect(output).toContain('💖 **H1**');
    expect(output).toContain('⚔️ **#1');
    // No arrow anywhere in the output for a group-less roster.
    expect(output).not.toContain('⬅️');
    expect(output).not.toContain('➡️');
  });

  it('renders NO arrow for a non-directional group name (group set, but no left/right)', () => {
    // "Slayer Stack 1" is a real group but carries no direction → no arrow.
    const roster = createDefaultRoster();
    roster.tanks[0] = {
      ...defaultTankSetup(1),
      playerName: 'StackTank',
      groups: ['Slayer Stack 1'],
    };

    const output = generateDiscordFormat(roster);

    expect(output).toContain('🛡️ **MT**');
    expect(output).not.toContain('⬅️🛡️');
    expect(output).not.toContain('➡️🛡️');
  });

  it('neutralizes a malicious @everyone player name so it cannot ping', () => {
    const output = generateDiscordFormat(buildSampleRoster());
    // The raw, pingable "@everyone" (no zero-width space after @) must NOT appear.
    expect(output).not.toContain('@everyone');
    // The neutralized form keeps the text but inserts a ZWSP after the @.
    expect(output).toContain(`@${ZWSP}everyone`);
  });

  it('includes the roster name as a bold header', () => {
    const output = generateDiscordFormat(buildSampleRoster());
    expect(output).toContain('**Sample Raid**');
  });
});
