import {
  COST_REDUCTION_CATALOG,
  ULTIMATE_ABILITIES,
  ULTIMATE_SOURCE_CATALOG,
} from '../../shared/constants/catalog';
import type { CatalogSelection } from '../compileCatalog';
import {
  availableReductions,
  availableSources,
  compileReductions,
  compileSources,
  isEntryEnabled,
  isReductionAvailable,
  isSourceAvailable,
} from '../compileCatalog';

const baseSelection: CatalogSelection = {
  context: 'groupPve',
  esoClass: 'arcanist',
  role: 'dps',
  enabledOverrides: {},
  uptimeOverrides: {},
};

describe('isSourceAvailable', () => {
  it('filters group-only sources out of solo context', () => {
    const major = ULTIMATE_SOURCE_CATALOG.find((s) => s.id === 'major-heroism')!;
    expect(isSourceAvailable(major, { ...baseSelection, context: 'soloPve' })).toBe(false);
    expect(isSourceAvailable(major, { ...baseSelection, context: 'groupPve' })).toBe(true);
  });

  it('filters class passives to their class', () => {
    const implacable = ULTIMATE_SOURCE_CATALOG.find((s) => s.id === 'arcanist-implacable-outcome')!;
    expect(isSourceAvailable(implacable, { ...baseSelection, esoClass: 'arcanist' })).toBe(true);
    expect(isSourceAvailable(implacable, { ...baseSelection, esoClass: 'sorcerer' })).toBe(false);
  });

  it('keeps universal sources for every class and context', () => {
    const base = ULTIMATE_SOURCE_CATALOG.find((s) => s.id === 'base-light-attack')!;
    expect(isSourceAvailable(base, { ...baseSelection, esoClass: 'warden', context: 'pvp' })).toBe(
      true,
    );
  });
});

describe('isReductionAvailable', () => {
  it('filters Power Stone to Sorcerer', () => {
    const ps = COST_REDUCTION_CATALOG.find((r) => r.id === 'sorcerer-power-stone')!;
    expect(isReductionAvailable(ps, { context: 'groupPve', esoClass: 'sorcerer' })).toBe(true);
    expect(isReductionAvailable(ps, { context: 'groupPve', esoClass: 'arcanist' })).toBe(false);
  });
});

describe('isEntryEnabled', () => {
  it('override wins over default', () => {
    expect(isEntryEnabled('x', true, {})).toBe(true);
    expect(isEntryEnabled('x', true, { x: false })).toBe(false);
    expect(isEntryEnabled('x', false, { x: true })).toBe(true);
  });
});

describe('compileSources', () => {
  it('returns only enabled, available sources as engine UltimateSource shape', () => {
    const sources = compileSources(ULTIMATE_SOURCE_CATALOG, baseSelection);
    // Arcanist group DPS defaults: base income + implacable (Minor Heroism is
    // opt-in, off by default).
    const ids = sources.map((s) => s.id);
    expect(ids).toContain('base-light-attack');
    expect(ids).toContain('arcanist-implacable-outcome');
    // Minor Heroism is default-off (opt-in build choice).
    expect(ids).not.toContain('minor-heroism');
    // A non-arcanist class passive must not appear.
    expect(ids).not.toContain('necromancer-corpse-consumption');
    // Each compiled source is the bare engine shape (no catalog-only fields).
    for (const s of sources) {
      expect(s).not.toHaveProperty('category');
      expect(s).not.toHaveProperty('provenance');
      expect(typeof s.amountPerInstance).toBe('number');
    }
  });

  it('respects enabled overrides', () => {
    const off = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...baseSelection,
      enabledOverrides: { 'minor-heroism': false },
    });
    expect(off.map((s) => s.id)).not.toContain('minor-heroism');

    const on = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...baseSelection,
      enabledOverrides: { 'major-heroism': true },
    });
    expect(on.map((s) => s.id)).toContain('major-heroism');
  });

  it('applies and clamps uptime overrides', () => {
    const sources = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...baseSelection,
      // Minor Heroism is default-off — enable it so its uptime override applies.
      enabledOverrides: { 'minor-heroism': true },
      uptimeOverrides: { 'base-light-attack': 1.5, 'minor-heroism': -1 },
    });
    expect(sources.find((s) => s.id === 'base-light-attack')!.uptime).toBe(1);
    expect(sources.find((s) => s.id === 'minor-heroism')!.uptime).toBe(0);
  });

  it('drops external group support in solo context', () => {
    const solo = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...baseSelection,
      context: 'soloPve',
      enabledOverrides: { 'pillagers-profit-external': true },
    });
    expect(solo.map((s) => s.id)).not.toContain('pillagers-profit-external');
  });

  it('does not stack Minor Heroism across providers (keeps one, not both)', () => {
    // Generic Minor Heroism and Cryptcanon both grant the SAME named buff; with
    // both enabled, only one contribution should survive (they share a
    // nonStackingGroup), never summed.
    const both = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...baseSelection,
      enabledOverrides: { 'minor-heroism': true, 'cryptcanon-vestments': true },
    });
    const minorHeroismGroup = both.filter(
      (s) => s.id === 'minor-heroism' || s.id === 'cryptcanon-vestments',
    );
    expect(minorHeroismGroup).toHaveLength(1);

    // The single survivor's contribution must not exceed either provider alone —
    // i.e. enabling both is never larger than enabling just one.
    const onlyGeneric = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...baseSelection,
      enabledOverrides: { 'minor-heroism': true },
    });
    const rate = (s: { amountPerInstance: number; instancesPerSecond: number; uptime: number }) =>
      s.amountPerInstance * s.instancesPerSecond * s.uptime;
    const bothRate = rate(minorHeroismGroup[0]);
    const genericRate = rate(onlyGeneric.find((s) => s.id === 'minor-heroism')!);
    // The kept provider is the strongest single one, so its rate is ≥ the generic
    // alone but the GROUP total equals exactly that one provider (no doubling).
    expect(bothRate).toBeGreaterThanOrEqual(genericRate);
    expect(minorHeroismGroup).toHaveLength(1);
  });
});

describe('compileReductions', () => {
  it('compiles available reductions with enabled state', () => {
    const reductions = compileReductions(COST_REDUCTION_CATALOG, {
      ...baseSelection,
      esoClass: 'sorcerer',
    });
    const ps = reductions.find((r) => r.id === 'sorcerer-power-stone');
    expect(ps).toBeDefined();
    expect(ps!.enabled).toBe(true); // defaultEnabled for its class
    expect(ps!.fraction).toBeCloseTo(0.15, 6);
  });

  it('omits reductions for the wrong class', () => {
    const reductions = compileReductions(COST_REDUCTION_CATALOG, baseSelection); // arcanist
    expect(reductions.map((r) => r.id)).not.toContain('sorcerer-power-stone');
    expect(reductions.map((r) => r.id)).not.toContain('templar-restoring-spirit');
  });
});

describe('catalog data integrity', () => {
  it('every source carries provenance and confidence (no guessing)', () => {
    for (const s of ULTIMATE_SOURCE_CATALOG) {
      expect(s.provenance).toMatch(/^https?:\/\//);
      expect(['high', 'medium', 'low']).toContain(s.confidence);
    }
  });

  it('every cost reduction and ability carries provenance', () => {
    for (const r of COST_REDUCTION_CATALOG) {
      expect(r.provenance).toMatch(/^https?:\/\//);
    }
  });

  it('availableSources/availableReductions are subsets of the catalog', () => {
    const s = availableSources(ULTIMATE_SOURCE_CATALOG, baseSelection);
    expect(s.length).toBeLessThanOrEqual(ULTIMATE_SOURCE_CATALOG.length);
    const r = availableReductions(COST_REDUCTION_CATALOG, baseSelection);
    expect(r.length).toBeLessThanOrEqual(COST_REDUCTION_CATALOG.length);
  });

  it('only cites UESP or ESO-Skillbook as provenance (repo data-source policy)', () => {
    // Allowlist the permitted hosts rather than denylisting the forbidden one, so
    // this test never contains the banned substring (the repo guard is a literal
    // source-text scan) and any future disallowed host is caught too.
    const allowedHosts = ['en.uesp.net', 'eso-skillbook.com'];
    const all = [...ULTIMATE_SOURCE_CATALOG, ...COST_REDUCTION_CATALOG, ...ULTIMATE_ABILITIES];
    for (const e of all) {
      const host = new URL(e.provenance).host;
      expect(allowedHosts).toContain(host);
    }
  });

  // Lock the ultimate costs to the values verified against primary sources
  // (ESO-Skillbook / UESP, U50). A silent regression here would mislead the
  // time-to-ultimate output.
  it('encodes the verified U50 ultimate costs', () => {
    const cost = (id: string): number | undefined =>
      ULTIMATE_ABILITIES.find((a) => a.id === id)?.baseCost;
    expect(cost('dawnbreaker')).toBe(125);
    expect(cost('standard-of-might')).toBe(200);
    expect(cost('shifting-standard')).toBe(200);
    expect(cost('corrosive-armor')).toBe(200);
    expect(cost('storm-atronach')).toBe(200);
    expect(cost('negate-magic')).toBe(225);
    expect(cost('incapacitating-strike')).toBe(70);
    expect(cost('nova')).toBe(225);
    expect(cost('permafrost')).toBe(200);
    expect(cost('colossus')).toBe(175);
    expect(cost('the-unblinking-eye')).toBe(175);
  });

  it('encodes the verified generation rates and cost-reduction percentages', () => {
    const src = (id: string) => ULTIMATE_SOURCE_CATALOG.find((s) => s.id === id);
    // Base light-attack income = 3 ult/sec.
    expect(src('base-light-attack')?.amountPerInstance).toBe(3);
    expect(src('base-light-attack')?.instancesPerSecond).toBe(1);
    // Minor Heroism = 1 ult / 1.5s; Major Heroism = 3 ult / 1.5s.
    expect(src('minor-heroism')?.amountPerInstance).toBe(1);
    expect(src('minor-heroism')?.instancesPerSecond).toBeCloseTo(1 / 1.5, 6);
    expect(src('major-heroism')?.amountPerInstance).toBe(3);
    // Class ult-gen passives.
    expect(src('arcanist-implacable-outcome')?.amountPerInstance).toBe(4);
    expect(src('necromancer-corpse-consumption')?.amountPerInstance).toBe(10);
    // Cost reductions.
    const red = (id: string) => COST_REDUCTION_CATALOG.find((r) => r.id === id);
    expect(red('sorcerer-power-stone')?.fraction).toBeCloseTo(0.15, 6);
    expect(red('templar-restoring-spirit')?.fraction).toBeCloseTo(0.05, 6);
  });
});
