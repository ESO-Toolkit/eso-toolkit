/**
 * Class Mastery (U50) crit-damage wiring in the stat engine.
 *
 * Only three of the 35 Class Mastery passives move a stat this engine models,
 * and all three affect crit damage:
 *   - Ink-Scribe's Verve (Arcanist) → Major Force (+20%)
 *   - Tundra's Maw (Warden)        → Major Brittle (+20%)
 *   - Above and Beyond (Nightblade) → +25% PvE / +5% PvP, and +30% crit cap
 */

import reducer from '../store/buildEditorSlice';
import type { Build, BuildSetup, GameMode } from '../types/build.types';

import { CRIT_DMG_CAPS } from './stat-constants';
import { calculateCritDamage } from './stat-engine';
import type { StatOverrides } from './stat-types';

const INK_SCRIBES_VERVE = 263416;
const TUNDRAS_MAW = 263519;
const ABOVE_AND_BEYOND = 263605;

/** A real default Build/Setup straight from the slice's initialState. */
const baseBuild = (): Build => reducer(undefined, { type: '@@test/init' }).build;
const baseSetup = (): BuildSetup => baseBuild().setups[0];

/** Build with a chosen game mode + Class Mastery picks (engine doesn't gate class). */
const buildWith = (passives: number[], gameMode: GameMode = 'pve'): Build => ({
  ...baseBuild(),
  gameMode,
  classMasteryPassives: passives,
});

/** Default PvE overrides as the engine sees them (Minor Force/Brittle on). */
const overrides = (): StatOverrides => baseSetup().statOverrides as StatOverrides;

/** Crit-damage total for a set of picks, in a given mode. */
const totalFor = (passives: number[], gameMode: GameMode = 'pve', ov = overrides()) =>
  calculateCritDamage(baseSetup(), buildWith(passives, gameMode), ov).total;

/** Baseline (no Class Mastery picks) so tests assert the passive's delta, not
 *  the default build's incidental class-passive contributions. */
const PVE_BASELINE = totalFor([]);
const PVP_BASELINE = totalFor([], 'pvp');

describe('calculateCritDamage — Class Mastery passives', () => {
  it('leaves crit damage untouched when no Class Mastery passive is selected', () => {
    const result = calculateCritDamage(baseSetup(), buildWith([]), overrides());
    expect(result.cap).toBe(CRIT_DMG_CAPS.cap);
    expect(result.items.some((i) => i.name.includes('Major Force') && i.enabled)).toBe(false);
  });

  it("Ink-Scribe's Verve forces Major Force on and labels its source", () => {
    const result = calculateCritDamage(baseSetup(), buildWith([INK_SCRIBES_VERVE]), overrides());
    const majorForce = result.items.find((i) => i.name.startsWith('Major Force'));
    expect(majorForce).toBeDefined();
    expect(majorForce?.name).toBe("Major Force (Ink-Scribe's Verve)");
    expect(majorForce?.enabled).toBe(true);
    expect(majorForce?.autoDetected).toBe(true);
    expect(majorForce?.value).toBe(20);
    expect(result.total).toBe(PVE_BASELINE + 20);
  });

  it('does not double-count Major Force when the toggle is also on', () => {
    // Clone — the slice's stored overrides are frozen by Redux Toolkit.
    const ov: StatOverrides = { ...overrides(), buffs: { ...overrides().buffs } };
    ov.buffs['Major Force'] = true; // user also ticked the manual toggle
    const result = calculateCritDamage(baseSetup(), buildWith([INK_SCRIBES_VERVE]), ov);
    const majorForceItems = result.items.filter((i) => i.name.startsWith('Major Force'));
    expect(majorForceItems).toHaveLength(1);
    expect(result.total).toBe(PVE_BASELINE + 20); // still a single +20
  });

  it("Tundra's Maw forces Major Brittle on", () => {
    const result = calculateCritDamage(baseSetup(), buildWith([TUNDRAS_MAW]), overrides());
    const majorBrittle = result.items.find((i) => i.name.startsWith('Major Brittle'));
    expect(majorBrittle?.name).toBe("Major Brittle (Tundra's Maw)");
    expect(majorBrittle?.enabled).toBe(true);
    expect(majorBrittle?.value).toBe(20);
    expect(result.total).toBe(PVE_BASELINE + 20);
  });

  it('Above and Beyond adds +25% (PvE) and raises the crit cap by +30%', () => {
    const result = calculateCritDamage(baseSetup(), buildWith([ABOVE_AND_BEYOND]), overrides());
    const item = result.items.find((i) => i.name === 'Above and Beyond');
    expect(item?.enabled).toBe(true);
    expect(item?.autoDetected).toBe(true);
    expect(item?.value).toBe(25);
    expect(result.cap).toBe(CRIT_DMG_CAPS.cap + 30);
    expect(result.maxCap).toBe(CRIT_DMG_CAPS.max + 30);
    expect(result.total).toBe(PVE_BASELINE + 25);
  });

  it('Above and Beyond contributes only +5% in PvP but still raises the cap', () => {
    const build = buildWith([ABOVE_AND_BEYOND], 'pvp');
    const result = calculateCritDamage(baseSetup(), build, overrides());
    const item = result.items.find((i) => i.name === 'Above and Beyond');
    expect(item?.value).toBe(5);
    expect(result.cap).toBe(CRIT_DMG_CAPS.cap + 30);
    expect(result.total).toBe(PVP_BASELINE + 5);
  });

  it('stacks both selected crit passives', () => {
    const result = calculateCritDamage(
      baseSetup(),
      buildWith([INK_SCRIBES_VERVE, ABOVE_AND_BEYOND]),
      overrides(),
    );
    expect(result.total).toBe(PVE_BASELINE + 20 + 25); // Major Force + A&B
    expect(result.cap).toBe(CRIT_DMG_CAPS.cap + 30);
  });
});
