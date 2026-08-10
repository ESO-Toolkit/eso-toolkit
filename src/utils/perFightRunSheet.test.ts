import { createDefaultRoster } from '../types/roster';
import type { EncounterOverrides } from '../types/trial-encounters';

import { buildSlotRows, summarizeFight } from './perFightRunSheet';

// Real resolving set IDs (verified in SET_DISPLAY_NAMES):
const LUCENT_ECHOES = 768;
const PEARLESCENT_WARD = 648;
const POWERFUL_ASSAULT = 180;
const SPELL_POWER_CURE = 185;
const RELEQUEN = 389;
const SLIMECRAW = 270;

describe('perFightRunSheet helpers', () => {
  const roster = createDefaultRoster(); // 2 tanks, 2 healers, 8 dps

  it('returns no rows for undefined overrides', () => {
    expect(buildSlotRows(roster, undefined)).toEqual([]);
    expect(summarizeFight(roster, undefined)).toEqual({
      slotCount: 0,
      teaserSets: [],
      hasMoreSets: false,
    });
  });

  it('orders rows tanks → healers → dps and labels MT/OT/H1/H2/D1…', () => {
    const overrides: EncounterOverrides = {
      slots: {
        'dps:2': { set1: RELEQUEN },
        'tank:0': { set1: PEARLESCENT_WARD, ultimate: 'Aggressive Horn' },
        'healer:1': { set1: SPELL_POWER_CURE },
        'tank:1': { set1: POWERFUL_ASSAULT },
        'healer:0': { set1: LUCENT_ECHOES },
      },
    };
    const rows = buildSlotRows(roster, overrides);
    expect(rows.map((r) => r.label)).toEqual(['MT', 'OT', 'H1', 'H2', 'D3']);
    expect(rows[0].sets).toContain('Pearlescent Ward');
    expect(rows[0].ultimate).toBe('Aggressive Horn');
  });

  it('resolves player names from the base roster slots when assigned', () => {
    const named = createDefaultRoster();
    named.tanks[0].playerName = 'Vael';
    named.healers[1].playerName = 'Liora';
    // dps base slots intentionally left unnamed (common for set-only rosters)
    const overrides: EncounterOverrides = {
      slots: {
        'tank:0': { set1: PEARLESCENT_WARD },
        'healer:1': { set1: SPELL_POWER_CURE },
        'dps:0': { set1: RELEQUEN },
      },
    };
    const rows = buildSlotRows(named, overrides);
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.playerName]));
    expect(byLabel.MT).toBe('Vael');
    expect(byLabel.H2).toBe('Liora');
    expect(byLabel.D1).toBeUndefined();
  });

  it('carries the per-slot note through to the row', () => {
    const overrides: EncounterOverrides = {
      slots: {
        'tank:0': { set1: PEARLESCENT_WARD, notes: 'Taunt swap at 50%.' },
      },
    };
    const [row] = buildSlotRows(roster, overrides);
    expect(row.notes).toBe('Taunt swap at 50%.');
  });

  it('sorts dps slots numerically, not lexically', () => {
    const overrides: EncounterOverrides = {
      slots: {
        'dps:10': { set1: RELEQUEN },
        'dps:2': { set1: SLIMECRAW },
        'dps:1': { set1: POWERFUL_ASSAULT },
      },
    };
    const rows = buildSlotRows(roster, overrides);
    expect(rows.map((r) => r.label)).toEqual(['D2', 'D3', 'D11']);
  });

  it('drops slots with no set, ultimate, or note', () => {
    const overrides: EncounterOverrides = {
      slots: {
        'tank:0': {}, // empty → dropped
        'tank:1': { ultimate: 'Aggressive Horn' }, // ult only → kept
        'healer:0': { notes: 'swap on add phase' }, // note only → kept
      },
    };
    const rows = buildSlotRows(roster, overrides);
    expect(rows.map((r) => r.label)).toEqual(['OT', 'H1']);
  });

  it('resolves set1 + set2 + monsterSet in order', () => {
    const overrides: EncounterOverrides = {
      slots: {
        'tank:0': { set1: PEARLESCENT_WARD, set2: POWERFUL_ASSAULT, monsterSet: SLIMECRAW },
      },
    };
    const [row] = buildSlotRows(roster, overrides);
    expect(row.sets).toEqual(['Pearlescent Ward', 'Powerful Assault', 'Slimecraw']);
  });

  it('summarizes populated slot count and a de-duplicated teaser', () => {
    const overrides: EncounterOverrides = {
      slots: {
        'tank:0': { set1: PEARLESCENT_WARD },
        'tank:1': { set1: PEARLESCENT_WARD }, // duplicate set name
        'healer:0': { set1: SPELL_POWER_CURE },
        'healer:1': { set1: LUCENT_ECHOES },
        'dps:0': { set1: RELEQUEN },
      },
    };
    const summary = summarizeFight(roster, overrides);
    expect(summary.slotCount).toBe(5);
    // Distinct sets: Pearlescent Ward, Spell Power Cure, Lucent Echoes, Relequen → 4
    expect(summary.teaserSets).toEqual(['Pearlescent Ward', 'Spell Power Cure', 'Lucent Echoes']);
    expect(summary.hasMoreSets).toBe(true);
  });

  it('reports hasMoreSets=false when distinct sets fit the teaser', () => {
    const overrides: EncounterOverrides = {
      slots: {
        'tank:0': { set1: PEARLESCENT_WARD },
        'healer:0': { set1: SPELL_POWER_CURE },
      },
    };
    const summary = summarizeFight(roster, overrides);
    expect(summary.teaserSets).toEqual(['Pearlescent Ward', 'Spell Power Cure']);
    expect(summary.hasMoreSets).toBe(false);
  });
});
