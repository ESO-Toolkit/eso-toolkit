/**
 * Health / Effective-HP engine (Section C1).
 *
 * ⚠️ NEEDS IN-GAME VALIDATION. Every expected number below is derived from a
 * CITED source (see stat-constants.ts) — but ESO health/resistance math cannot be
 * confirmed without a game client. Treat these as documented-reference assertions,
 * not ground truth, until a maintainer validates against a live CP160 character.
 *
 * Reference primitives (all cited in stat-constants.ts):
 *   • Base Max Health (L50/CP160, 0 attr) = 16,000        [UESP Online:Health]
 *   • Health per attribute point = 122; 64 pts → 23,808   [UESP Online:Health]
 *   • Imperial Tough +2000 · Nord Resist Frost +1000      [eso-skillbook]
 *   • Necro Bone Tyrant "Last Gasp" R2 = +2412            [eso-hub]
 *   • The Lord mundus = +2225 (0 Divines) / +3639 (7)     [eso-hub]
 *   • Minor Toughness = +10% Max Health pool              [eso-hub]
 *   • 660 resistance = 1% mitigation, cap 50% @ 33,000    [esoacademy / ESO forums]
 *   • Per-piece base armor table (CP160 gold)             [ESO forums 244590 / Fextralife]
 */

import reducer from '@features/build-editor/store/buildEditorSlice';
import type { Build, BuildSetup } from '@features/build-editor/types/build.types';
import type { GearConfig } from '@features/loadout-manager/types/loadout.types';

import { BASE_MAX_HEALTH } from './stat-constants';
import {
  calculateBuildStats,
  calculateEHP,
  calculateHealth,
  calculateSurvivability,
  calculateTotalResistance,
  resistanceToMitigation,
} from './stat-engine';
import type { StatOverrides } from './stat-types';

const baseBuild = (): Build => reducer(undefined, { type: '@@test/init' }).build;
const baseSetup = (): BuildSetup => baseBuild().setups[0];
const overrides = (): StatOverrides => ({
  ...baseSetup().statOverrides,
  buffs: { ...baseSetup().statOverrides.buffs },
});

const buildWith = (opts: { lines?: string[]; races?: string[] } = {}): Build => ({
  ...baseBuild(),
  gameMode: 'pve',
  races: opts.races ?? [],
  classSkillLines: [
    opts.lines?.[0] ?? null,
    opts.lines?.[1] ?? null,
    opts.lines?.[2] ?? null,
  ] as Build['classSkillLines'],
});

const setupWith = (
  opts: { gear?: GearConfig; health?: number; mundus?: string } = {},
): BuildSetup => ({
  ...baseSetup(),
  attributes: { magicka: 0, health: opts.health ?? 0, stamina: 0 },
  mundusStone: opts.mundus ?? '',
  gear: opts.gear ?? {},
});

// Apparel slot numbers (from EQUIP_SLOTS).
const SLOT = { head: 0, chest: 2, shoulders: 3, waist: 6, hand: 16, legs: 8, feet: 9 } as const;

/** A full 7-piece set of one weight (optionally a trait on every piece). */
const armorSet = (weight: 'heavy' | 'medium' | 'light', trait?: string): GearConfig => {
  const gear: GearConfig = {};
  let id = 1;
  for (const slot of Object.values(SLOT)) {
    gear[slot] = { id: String(id++), weight, ...(trait ? { trait } : {}) };
  }
  return gear;
};

const item = (r: { items: { name: string; value: number; enabled: boolean }[] }, part: string) =>
  r.items.find((i) => i.name.includes(part));

describe('calculateHealth — Max Health pool', () => {
  it('a naked character is exactly the base pool (16,000)', () => {
    const r = calculateHealth(setupWith(), buildWith(), overrides());
    expect(r.total).toBe(BASE_MAX_HEALTH);
    expect(r.total).toBe(16000);
  });

  it('64 points in Health → 23,808 (UESP cross-check)', () => {
    const r = calculateHealth(setupWith({ health: 64 }), buildWith(), overrides());
    expect(r.total).toBe(16000 + 64 * 122);
    expect(r.total).toBe(23808);
  });

  it('Imperial "Tough" adds +2000 flat Max Health', () => {
    const r = calculateHealth(setupWith(), buildWith({ races: ['imperial'] }), overrides());
    expect(item(r, 'Tough')?.value).toBe(2000);
    expect(r.total).toBe(18000);
  });

  it('Nord Max Health comes from "Resist Frost" (+1000), never "Rugged"', () => {
    const r = calculateHealth(setupWith(), buildWith({ races: ['nord'] }), overrides());
    expect(item(r, 'Resist Frost')?.value).toBe(1000);
    expect(item(r, 'Rugged')).toBeUndefined();
    expect(r.total).toBe(17000);
  });

  it('Necromancer Bone Tyrant "Last Gasp" adds +2412 when the line is active', () => {
    const active = calculateHealth(
      setupWith(),
      buildWith({ lines: ['class.bone-tyrant'] }),
      overrides(),
    );
    expect(item(active, 'Last Gasp')?.value).toBe(2412);
    expect(active.total).toBe(18412);

    const inactive = calculateHealth(
      setupWith(),
      buildWith({ lines: ['class.grave-lord'] }),
      overrides(),
    );
    expect(item(inactive, 'Last Gasp')).toBeUndefined();
  });

  it('The Lord mundus adds +2225 at 0 Divines and +3639 at 7 gold Divines', () => {
    const zero = calculateHealth(setupWith({ mundus: 'lord' }), buildWith(), overrides());
    expect(item(zero, 'The Lord')?.value).toBe(2225);
    expect(zero.total).toBe(18225);

    const seven = calculateHealth(
      setupWith({ mundus: 'lord', gear: armorSet('light', 'divines') }),
      buildWith(),
      overrides(),
    );
    expect(item(seven, 'The Lord')?.value).toBe(3639);
    expect(seven.total).toBe(16000 + 3639);
  });

  it('Minor Toughness is off by default and adds +10% of the flat subtotal when toggled', () => {
    const off = calculateHealth(setupWith(), buildWith(), overrides());
    const offItem = item(off, 'Minor Toughness');
    expect(offItem?.enabled).toBe(false);
    expect(offItem?.value).toBe(1600); // 10% of 16,000, shown but not counted
    expect(off.total).toBe(16000);

    const ov = overrides();
    ov.buffs['Minor Toughness'] = true;
    const on = calculateHealth(setupWith({ health: 64 }), buildWith(), ov);
    // flat subtotal = 16000 + 7808 = 23808; +10% = 2381 (rounded)
    expect(item(on, 'Minor Toughness')?.enabled).toBe(true);
    expect(item(on, 'Minor Toughness')?.value).toBe(Math.round(23808 * 0.1));
    expect(on.total).toBe(23808 + Math.round(23808 * 0.1));
  });
});

describe('calculateTotalResistance — base gear armor + additions', () => {
  it('sums per-piece base armor for a full 7-piece set (cited per-piece table)', () => {
    // Sums of the cited per-piece values (NOT the synthesis totals, which mis-added).
    const heavy = calculateTotalResistance(armorSetSetup('heavy'), buildWith(), overrides());
    expect(item(heavy, 'Heavy Armor Base (7pc)')?.value).toBe(14897);
    expect(heavy.total).toBe(14897);

    const medium = calculateTotalResistance(armorSetSetup('medium'), buildWith(), overrides());
    expect(medium.total).toBe(11199);

    const light = calculateTotalResistance(armorSetSetup('light'), buildWith(), overrides());
    expect(light.total).toBe(7501);
  });

  it('maps each slot to the right per-piece value (chest 1.0 / waist 0.375 tiers)', () => {
    const chestOnly = calculateTotalResistance(
      setupWith({ gear: { [SLOT.chest]: { id: '1', weight: 'heavy' } } }),
      buildWith(),
      overrides(),
    );
    expect(chestOnly.total).toBe(2772); // heavy chest

    const waistOnly = calculateTotalResistance(
      setupWith({ gear: { [SLOT.waist]: { id: '1', weight: 'heavy' } } }),
      buildWith(),
      overrides(),
    );
    expect(waistOnly.total).toBe(1039); // heavy waist (lowest tier)
  });

  it('folds in calculateArmor additions (Nord Stalwart +2600 on top of gear base)', () => {
    const r = calculateTotalResistance(
      armorSetSetup('heavy'),
      buildWith({ races: ['nord'] }),
      overrides(),
    );
    expect(item(r, 'Stalwart')?.value).toBe(2600);
    expect(r.total).toBe(14897 + 2600);
  });
});

describe('resistanceToMitigation / calculateEHP — the cited mitigation curve', () => {
  it('660 resistance = 1% mitigation, linear, hard-capped at 50%', () => {
    expect(resistanceToMitigation(0)).toBe(0);
    expect(resistanceToMitigation(660)).toBeCloseTo(0.01, 6);
    expect(resistanceToMitigation(13200)).toBeCloseTo(0.2, 6);
    expect(resistanceToMitigation(33000)).toBeCloseTo(0.5, 6);
    expect(resistanceToMitigation(50000)).toBe(0.5); // clamped
  });

  it('EHP = health / (1 − mitigation)', () => {
    expect(calculateEHP(20000, 0)).toEqual({ ehp: 20000, mitigation: 0 });
    expect(calculateEHP(20000, 33000)).toEqual({ ehp: 40000, mitigation: 0.5 });
    expect(calculateEHP(20000, 13200).ehp).toBe(25000); // 20000 / 0.8
  });
});

describe('calculateSurvivability — composed bundle', () => {
  it('physical and spell EHP are symmetric under the current model', () => {
    const s = calculateSurvivability(armorSetSetup('heavy'), buildWith(), overrides());
    expect(s.physical.ehp).toBe(s.spell.ehp);
    expect(s.physical.resistance).toBe(s.resistance.total);
  });

  it('matches the documented reference build (Imperial · The Lord · 64 Health · 7pc heavy gold)', () => {
    const setup = setupWith({ health: 64, mundus: 'lord', gear: armorSet('heavy') });
    const build = buildWith({ races: ['imperial'] });
    const s = calculateSurvivability(setup, build, overrides());

    // Health: 16000 base + 64×122 + Imperial Tough 2000 + The Lord 2225 (0 Divines)
    expect(s.health.total).toBe(16000 + 7808 + 2000 + 2225);
    expect(s.health.total).toBe(28033);

    // Resistance: 14897 heavy gear base + Imperial Mettle 2000 (armor passive)
    expect(s.resistance.total).toBe(14897 + 2000);
    expect(s.resistance.total).toBe(16897);

    // EHP per the cited curve
    const mitigation = Math.min(16897 / 660, 50) / 100;
    expect(s.physical.mitigation).toBeCloseTo(mitigation, 6);
    expect(s.physical.ehp).toBe(Math.round(28033 / (1 - mitigation)));
  });
});

describe('calculateBuildStats — extended bundle', () => {
  it('exposes health and ehp StatResults', () => {
    const stats = calculateBuildStats(armorSetSetup('heavy'), buildWith({ races: ['imperial'] }));
    expect(stats.health.total).toBeGreaterThan(BASE_MAX_HEALTH);
    expect(stats.ehp.total).toBeGreaterThan(stats.health.total); // EHP ≥ health (mitigation > 0)
    expect(item(stats.ehp, 'Physical EHP')).toBeDefined();
    expect(item(stats.ehp, 'Spell EHP')).toBeDefined();
    // ehp headline is the worst-case (lower) channel
    const phys = item(stats.ehp, 'Physical EHP')!.value;
    const spell = item(stats.ehp, 'Spell EHP')!.value;
    expect(stats.ehp.total).toBe(Math.min(phys, spell));
  });
});

// helper used above — a setup carrying a full armor set
function armorSetSetup(weight: 'heavy' | 'medium' | 'light'): BuildSetup {
  return setupWith({ gear: armorSet(weight) });
}
