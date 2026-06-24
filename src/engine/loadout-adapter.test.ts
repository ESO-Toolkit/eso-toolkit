/**
 * Loadout → engine adapter (Section B4b). Proves a LoadoutSetup can drive the pure
 * stat engine with neutral character defaults (gear-derived) and that supplied
 * context flows through.
 */

import type { LoadoutSetup } from '@features/loadout-manager/types/loadout.types';

import { loadoutSetupToEngineInputs } from './loadout-adapter';
import { calculateBuildStats } from './stat-engine';

const loadout = (over: Partial<LoadoutSetup> = {}): LoadoutSetup => ({
  name: 'Test',
  disabled: false,
  condition: {},
  skills: { 0: {}, 1: {} },
  cp: {},
  food: {},
  gear: {},
  ...over,
});

describe('loadoutSetupToEngineInputs', () => {
  it('defaults unknown character fields to neutral values', () => {
    const { setup, build } = loadoutSetupToEngineInputs(loadout());
    expect(build.esoClass).toBe('any-class');
    expect(build.classSkillLines).toEqual([null, null, null]);
    expect(build.races).toEqual([]);
    expect(build.gameMode).toBe('pve');
    expect(setup.attributes).toEqual({ magicka: 0, health: 0, stamina: 0 });
    expect(setup.mundusStone).toBe('');
  });

  it('carries gear and food through unchanged', () => {
    const gear = { 2: { id: '1', weight: 'heavy' as const } };
    const { setup } = loadoutSetupToEngineInputs(loadout({ gear, food: { id: 42 } }));
    expect(setup.gear).toBe(gear);
    expect(setup.consumables.food).toEqual({ id: 42 });
  });

  it('applies supplied character context', () => {
    const { setup, build } = loadoutSetupToEngineInputs(loadout(), {
      esoClass: 'necromancer',
      classSkillLines: ['class.bone-tyrant', null, null],
      races: ['imperial'],
      mundusStone: 'lord',
      healthAttributes: 64,
    });
    expect(build.esoClass).toBe('necromancer');
    expect(build.classSkillLines[0]).toBe('class.bone-tyrant');
    expect(build.races).toEqual(['imperial']);
    expect(setup.mundusStone).toBe('lord');
    expect(setup.attributes.health).toBe(64);
  });

  it('produces engine inputs the stat engine can consume end-to-end', () => {
    const gear = {
      0: { id: '1', weight: 'light' as const, trait: 'sharpened' },
      2: { id: '2', weight: 'light' as const },
    };
    const { setup, build } = loadoutSetupToEngineInputs(loadout({ gear }));
    const stats = calculateBuildStats(setup, build);
    expect(stats.penetration.total).toBeGreaterThan(0); // light armor + default Breach buffs
    expect(stats.health.total).toBe(16000); // no character context → base pool only
    expect(stats.ehp.total).toBeGreaterThanOrEqual(stats.health.total);
  });
});
