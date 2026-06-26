import { CRIT_CHANCE_DIVISOR } from '@/features/build-editor/engine/stat-constants';

import { UPGRADE_CATALOG } from '../gear-upgrade-catalog';
import {
  applyPackage,
  computeUpgrades,
  marginalDpsPct,
  MITIGATION_DIVISOR,
  relativeDamage,
  WD_TO_STAT,
} from '../gearUpgradeEngine';
import type { BuildBaseline, UpgradeOption } from '../types';

const baseline: BuildBaseline = {
  weaponOrSpellDamage: 6500,
  maxStat: 36000,
  critChancePct: 60,
  critDamagePct: 100,
  penetration: 18200,
  targetResistance: 18200,
  mundus: 'thief',
};

describe('relativeDamage', () => {
  it('combines offensive power, crit, and mitigation multiplicatively', () => {
    const offensivePower = 36000 + WD_TO_STAT * 6500;
    const critMult = 1 + 0.6 * (2.0 - 1); // 100% crit dmg ⇒ 2.0× on crit
    const mitigation = 1; // pen meets resistance exactly ⇒ no mitigation
    expect(relativeDamage(baseline)).toBeCloseTo(offensivePower * critMult * mitigation, 5);
  });

  it('caps critical damage at 125% by default', () => {
    const over = relativeDamage({ ...baseline, critDamagePct: 200 });
    const atCap = relativeDamage({ ...baseline, critDamagePct: 125 });
    expect(over).toBeCloseTo(atCap, 5);
  });

  it('honours a raised crit-damage cap (e.g. NB Above and Beyond → 155%)', () => {
    const raised = { ...baseline, critDamageCapPct: 155 };
    // At a 140% baseline, crit damage is clamped to 0 under the default cap but
    // still has headroom under the raised cap, so it must read higher.
    const atDefaultCap = relativeDamage({ ...raised, critDamagePct: 125 });
    const underRaisedCap = relativeDamage({ ...raised, critDamagePct: 140 });
    expect(underRaisedCap).toBeGreaterThan(atDefaultCap);
  });

  it('applies mitigation when the target out-resists your penetration', () => {
    const under = { ...baseline, penetration: 0 };
    const expectedMitigation = 1 - 18200 / MITIGATION_DIVISOR;
    expect(relativeDamage(under) / relativeDamage({ ...baseline, penetration: 18200 })).toBeCloseTo(
      expectedMitigation,
      5,
    );
  });
});

describe('applyPackage', () => {
  it('converts crit rating to crit chance via the shared divisor', () => {
    const out = applyPackage(baseline, { deltaCritRating: CRIT_CHANCE_DIVISOR });
    expect(out.critChancePct).toBeCloseTo(61, 5); // +1% chance per 219 rating
  });

  it('never lets crit chance exceed 100%', () => {
    const out = applyPackage(baseline, { deltaCritRating: 100000 });
    expect(out.critChancePct).toBe(100);
  });
});

describe('marginalDpsPct', () => {
  const wsdOption: UpgradeOption = {
    id: 't',
    group: 'enchant',
    change: '+WSD',
    slot: 'jewelry',
    slotLabel: 'Jewelry',
    pkg: { deltaWeaponOrSpellDamage: 173 },
    confidence: 'medium',
  };

  it('returns a positive percentage for a damage-stat gain', () => {
    expect(marginalDpsPct(wsdOption, baseline)).toBeGreaterThan(0);
  });

  it('values penetration at zero when already at the resistance cap', () => {
    const penOption: UpgradeOption = { ...wsdOption, pkg: { deltaPenetration: 2000 } };
    expect(marginalDpsPct(penOption, baseline)).toBeCloseTo(0, 6);
  });

  it('values penetration above zero when under the cap', () => {
    const penOption: UpgradeOption = { ...wsdOption, pkg: { deltaPenetration: 2000 } };
    expect(marginalDpsPct(penOption, { ...baseline, penetration: 0 })).toBeGreaterThan(0);
  });

  it('applies damage-done deltas multiplicatively', () => {
    const ddOption: UpgradeOption = { ...wsdOption, pkg: { deltaDamageDonePct: 5 } };
    expect(marginalDpsPct(ddOption, baseline)).toBeCloseTo(5, 6);
  });

  it('values a crit-damage upgrade at zero when capped, but positive with a raised cap', () => {
    const critDmgOption: UpgradeOption = { ...wsdOption, pkg: { deltaCritDamagePct: 10 } };
    const capped = { ...baseline, critDamagePct: 125, critDamageCapPct: 125 };
    const raised = { ...baseline, critDamagePct: 125, critDamageCapPct: 155 };
    expect(marginalDpsPct(critDmgOption, capped)).toBeCloseTo(0, 6);
    expect(marginalDpsPct(critDmgOption, raised)).toBeGreaterThan(0);
  });

  it('weights weapon upgrades by the active-bar damage share', () => {
    const frontOpt: UpgradeOption = {
      ...wsdOption,
      bar: 'front',
      pkg: { deltaWeaponOrSpellDamage: 100 },
    };
    const backOpt: UpgradeOption = { ...frontOpt, bar: 'back' };
    const unweighted: UpgradeOption = { ...frontOpt, bar: undefined };
    const b = { ...baseline, frontBarDamageShare: 0.8 };

    const full = marginalDpsPct(unweighted, b);
    expect(marginalDpsPct(frontOpt, b)).toBeCloseTo(full * 0.8, 6);
    expect(marginalDpsPct(backOpt, b)).toBeCloseTo(full * 0.2, 6);
    expect(marginalDpsPct(frontOpt, b)).toBeGreaterThan(marginalDpsPct(backOpt, b));
  });

  it('does not bar-weight when no front-bar share is set', () => {
    const frontOpt: UpgradeOption = {
      ...wsdOption,
      bar: 'front',
      pkg: { deltaWeaponOrSpellDamage: 100 },
    };
    const noBar: UpgradeOption = { ...frontOpt, bar: undefined };
    expect(marginalDpsPct(frontOpt, baseline)).toBeCloseTo(marginalDpsPct(noBar, baseline), 6);
  });

  it('resolves Mundus-dependent (Divines) packages from the baseline', () => {
    const divines = UPGRADE_CATALOG.find((o) => o.id === 'trait-divines-bigArmor')!;
    // Thief Mundus feeds crit chance ⇒ positive; "other" Mundus feeds nothing ⇒ ~0.
    expect(marginalDpsPct(divines, { ...baseline, mundus: 'thief' })).toBeGreaterThan(0);
    expect(marginalDpsPct(divines, { ...baseline, mundus: 'other' })).toBeCloseTo(0, 6);
  });
});

describe('computeUpgrades', () => {
  it('sorts results by marginal DPS, highest first', () => {
    const results = computeUpgrades(UPGRADE_CATALOG, baseline);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].dmgIncreasePct).toBeGreaterThanOrEqual(results[i].dmgIncreasePct);
    }
  });

  it('excludes qualitative options from the computed table', () => {
    const withQualitative: UpgradeOption[] = [
      ...UPGRADE_CATALOG,
      {
        id: 'q',
        group: 'trait',
        change: 'Charged',
        slot: 'frontBar2H',
        slotLabel: 'Front Bar',
        pkg: {},
        confidence: 'low',
        qualitative: true,
      },
    ];
    const results = computeUpgrades(withQualitative, baseline);
    expect(results.some((r) => r.id === 'q')).toBe(false);
  });
});
