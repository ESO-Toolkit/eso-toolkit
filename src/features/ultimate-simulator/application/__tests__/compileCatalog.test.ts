import {
  COST_REDUCTION_CATALOG,
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
    expect(isSourceAvailable(base, { ...baseSelection, esoClass: 'warden', context: 'pvp' })).toBe(true);
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
    // Arcanist group DPS defaults: base + minor heroism + implacable.
    const ids = sources.map((s) => s.id);
    expect(ids).toContain('base-light-attack');
    expect(ids).toContain('minor-heroism');
    expect(ids).toContain('arcanist-implacable-outcome');
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
});
