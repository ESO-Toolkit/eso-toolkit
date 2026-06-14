/**
 * U50 base-class passives that move a calculator-modeled stat (penetration,
 * crit damage, crit chance, armor). Verified against the live in-game tooltip
 * dump (API 101050). These auto-apply when the owning class skill line is
 * active; flank/execute ones are off-by-default toggles.
 */

import reducer from '../store/buildEditorSlice';
import type { Build, BuildSetup } from '../types/build.types';

import { CRIT_CHANCE_DIVISOR } from './stat-constants';
import { calculateArmor, calculateCritChance, calculateCritDamage } from './stat-engine';
import type { StatOverrides } from './stat-types';

const baseBuild = (): Build => reducer(undefined, { type: '@@test/init' }).build;
const baseSetup = (): BuildSetup => baseBuild().setups[0];
const overrides = (): StatOverrides => ({
  ...baseSetup().statOverrides,
  buffs: { ...baseSetup().statOverrides.buffs },
});

/** A build whose three class lines are exactly the ones given (others empty). */
const buildWithLines = (lines: string[], gameMode: 'pve' | 'pvp' = 'pve'): Build => ({
  ...baseBuild(),
  gameMode,
  classSkillLines: [
    lines[0] ?? null,
    lines[1] ?? null,
    lines[2] ?? null,
  ] as Build['classSkillLines'],
});

const item = (
  result: { items: { name: string; value: number; enabled: boolean }[] },
  namePart: string,
) => result.items.find((i) => i.name.includes(namePart));

describe('calculateArmor — U50 base-class armor passives', () => {
  it('Heart of Stone (DK Earthen Heart) adds +2974 resistance', () => {
    const r = calculateArmor(baseSetup(), buildWithLines(['class.earthen-heart']), overrides());
    const it = item(r, 'Heart of Stone');
    expect(it?.enabled).toBe(true);
    expect(it?.value).toBe(2974);
    expect(r.total).toBe(2974); // default build has no race/mundus armor
  });

  it('Aegis of the Unseen (Arcanist) adds +3271 resistance', () => {
    const r = calculateArmor(
      baseSetup(),
      buildWithLines(['class.soldier-of-apocrypha']),
      overrides(),
    );
    expect(item(r, 'Aegis of the Unseen')?.value).toBe(3271);
    expect(r.total).toBe(3271);
  });

  it('Shadow Barrier (NB) grants Major Resolve +5948 resistance', () => {
    const r = calculateArmor(baseSetup(), buildWithLines(['class.shadow']), overrides());
    expect(item(r, 'Shadow Barrier')?.value).toBe(5948);
    expect(r.total).toBe(5948);
  });

  it('Frozen Armor (Warden) adds +6200 resistance at 5 slotted', () => {
    const r = calculateArmor(baseSetup(), buildWithLines(['class.winter-s-embrace']), overrides());
    expect(item(r, 'Frozen Armor')?.value).toBe(6200);
    expect(r.total).toBe(6200);
  });

  it('Balanced Warrior (Templar) is surfaced as +6% but not folded into the additive total', () => {
    const r = calculateArmor(baseSetup(), buildWithLines(['class.aedric-spear']), overrides());
    const it = item(r, 'Balanced Warrior');
    expect(it).toBeDefined();
    expect(it?.enabled).toBe(true);
    expect(it?.name).toContain('+6% Armor');
    expect(it?.value).toBe(0); // can't fold a % of total armor into this additive panel
    expect(r.total).toBe(0);
  });

  it('does nothing when the owning class line is not active', () => {
    const r = calculateArmor(baseSetup(), buildWithLines(['class.storm-calling']), overrides());
    expect(item(r, 'Heart of Stone')).toBeUndefined();
    expect(item(r, 'Frozen Armor')).toBeUndefined();
  });
});

describe('calculateCritChance — U50 base-class crit-chance passives', () => {
  it('Exploitation (Sorc Dark Magic) grants Minor Prophecy ≈ +6%', () => {
    const r = calculateCritChance(baseSetup(), buildWithLines(['class.dark-magic']), overrides());
    const it = item(r, 'Exploitation');
    expect(it?.enabled).toBe(true);
    expect(it?.value).toBe(parseFloat((1314 / CRIT_CHANCE_DIVISOR).toFixed(1))); // 6.0
  });

  it('Hemorrhage Minor Savagery (NB) adds its crit-chance half ≈ +6%', () => {
    const r = calculateCritChance(
      baseSetup(),
      buildWithLines(['class.assassination']),
      overrides(),
    );
    expect(item(r, 'Minor Savagery')?.value).toBe(
      parseFloat((1314 / CRIT_CHANCE_DIVISOR).toFixed(1)),
    );
  });

  it('Pressure Points (NB) adds ≈ +10% at 5 slotted', () => {
    const r = calculateCritChance(
      baseSetup(),
      buildWithLines(['class.assassination']),
      overrides(),
    );
    expect(item(r, 'Pressure Points')?.value).toBe(
      parseFloat((2190 / CRIT_CHANCE_DIVISOR).toFixed(1)),
    );
  });

  it('Master Assassin (NB, flank) is added but OFF by default', () => {
    const r = calculateCritChance(
      baseSetup(),
      buildWithLines(['class.assassination']),
      overrides(),
    );
    const it = item(r, 'Master Assassin');
    expect(it).toBeDefined();
    expect(it?.enabled).toBe(false);
    expect(it?.value).toBe(parseFloat((1448 / CRIT_CHANCE_DIVISOR).toFixed(1))); // 6.6
  });

  it('Master Assassin turns on when its toggle is enabled', () => {
    const ov = overrides();
    ov.buffs['Master Assassin (while flanking)'] = true;
    const r = calculateCritChance(baseSetup(), buildWithLines(['class.assassination']), ov);
    expect(item(r, 'Master Assassin')?.enabled).toBe(true);
  });

  it('Death Knell (Necro, execute) is +20% but OFF by default', () => {
    const r = calculateCritChance(baseSetup(), buildWithLines(['class.grave-lord']), overrides());
    const it = item(r, 'Death Knell');
    expect(it?.enabled).toBe(false);
    expect(it?.value).toBe(20);
  });
});

describe('engine integrity — conditional passives do not leak into other classes', () => {
  it('a Sorcerer build gets no Nightblade crit-chance passives', () => {
    const r = calculateCritChance(
      baseSetup(),
      buildWithLines(['class.dark-magic', 'class.storm-calling']),
      overrides(),
    );
    expect(item(r, 'Pressure Points')).toBeUndefined();
    expect(item(r, 'Master Assassin')).toBeUndefined();
  });

  it('crit damage still includes the existing class passive (Hemorrhage +10%) for NB', () => {
    const r = calculateCritDamage(
      baseSetup(),
      buildWithLines(['class.assassination']),
      overrides(),
    );
    const it = r.items.find((i) => i.name === 'Hemorrhage');
    expect(it?.value).toBe(10);
    expect(it?.enabled).toBe(true);
  });
});
