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
    // Pillager's Profit is an external healer source — group-only.
    const pillagers = ULTIMATE_SOURCE_CATALOG.find((s) => s.id === 'pillagers-profit-external')!;
    expect(isSourceAvailable(pillagers, { ...baseSelection, context: 'soloPve' })).toBe(false);
    expect(isSourceAvailable(pillagers, { ...baseSelection, context: 'groupPve' })).toBe(true);
  });

  it('keeps Major Heroism available solo (self-applied providers exist)', () => {
    // Major Heroism is modeled as one buff available in every context — solo it
    // comes from a self-applied source (e.g. the DK Basalt-Blooded Warrior set).
    const major = ULTIMATE_SOURCE_CATALOG.find((s) => s.id === 'major-heroism')!;
    expect(isSourceAvailable(major, { ...baseSelection, context: 'soloPve' })).toBe(true);
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

  it("scales Pillager's per-cast amount to the healer's ultimate cost (10% of it)", () => {
    // Pillager's grants 2% of the spent ult per tick × 5 ticks = 10% of the cost.
    // The per-cast amount must follow the healer's ult cost from the selection.
    const at500 = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...baseSelection,
      enabledOverrides: { 'pillagers-profit-external': true },
      pillagerHealerUltCost: 500,
    });
    const at200 = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...baseSelection,
      enabledOverrides: { 'pillagers-profit-external': true },
      pillagerHealerUltCost: 200,
    });
    const amt = (sources: ReturnType<typeof compileSources>) =>
      sources.find((s) => s.id === 'pillagers-profit-external')!.amountPerInstance;
    expect(amt(at500)).toBe(50); // 10% of 500 — the user's "50 from a full cast"
    expect(amt(at200)).toBe(20); // 10% of 200

    // Sanity: even at max healer ult, the rate stays a minor contributor, not the
    // ~4 ult/s the old flat-50 encoding produced.
    const src = at500.find((s) => s.id === 'pillagers-profit-external')!;
    const ultPerSecond = src.amountPerInstance * src.instancesPerSecond * src.uptime;
    expect(ultPerSecond).toBeLessThan(1.2); // 50 / 45 ≈ 1.11
  });

  it('falls back to the catalog default when no healer ult cost is given', () => {
    const compiled = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...baseSelection,
      enabledOverrides: { 'pillagers-profit-external': true },
    });
    // No pillagerHealerUltCost → catalog default amountPerInstance (25 = 10% of ~250).
    expect(compiled.find((s) => s.id === 'pillagers-profit-external')!.amountPerInstance).toBe(25);
  });

  it('models Minor Heroism as a single source (no per-provider duplicate)', () => {
    // Minor Heroism is one named buff; the catalog represents all of its
    // providers with the single `minor-heroism` entry, so enabling it yields
    // exactly one Minor Heroism source.
    const compiled = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...baseSelection,
      enabledOverrides: { 'minor-heroism': true },
    });
    expect(compiled.filter((s) => s.id === 'minor-heroism')).toHaveLength(1);
  });

  it('keeps source ids and cost-reduction ids disjoint', () => {
    // Both generation sources and cost reductions are toggled through the SAME
    // `enabledOverrides` map (keyed by id). That only stays correct while the two
    // id spaces never collide — a shared id would cross-wire one toggle to flip
    // both. This guards that invariant so a future catalog addition can't silently
    // break it (see LOW-1 in the catalog audit).
    const sourceIds = new Set(ULTIMATE_SOURCE_CATALOG.map((s) => s.id));
    const collisions = COST_REDUCTION_CATALOG.filter((r) => sourceIds.has(r.id)).map((r) => r.id);
    expect(collisions).toEqual([]);
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
    // Nova family has a SPLIT cost: base Nova / Solar Prison = 250, Solar
    // Disturbance morph = 225 (verified on ESO-Skillbook). We list the base (250).
    expect(cost('nova')).toBe(250);
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

  // ---- Catalog expansion (sets / class passives / more ultimates) ----------
  it('encodes the expanded generator rates within the sanity ceiling', () => {
    const src = (id: string) => ULTIMATE_SOURCE_CATALOG.find((s) => s.id === id);
    const rate = (id: string): number => {
      const s = src(id)!;
      return s.amountPerInstance * s.instancesPerSecond * s.uptime;
    };
    // New generators exist and are encoded.
    expect(src('bloodspawn')).toBeDefined();
    // Blessing at the Peak grants +1 ultimate per Earthen Heart cast (verified
    // against the repo's curated DK skill-line data — NOT the earlier unsourced 3).
    expect(src('dragonknight-mountains-blessing')?.amountPerInstance).toBe(1);
    expect(src('templar-prism')?.amountPerInstance).toBe(3);
    expect(src('nightblade-catalyst')?.amountPerInstance).toBe(22);
    // Every new generator stays a minor contributor — no Pillager's-style blowup
    // (a single source far below the base light-attack income of ~2.85 ult/s).
    for (const id of [
      'bloodspawn',
      'dragonknight-mountains-blessing',
      'templar-prism',
      'nightblade-catalyst',
    ]) {
      expect(rate(id)).toBeLessThan(2);
    }
    // Major Heroism is now available solo too (self-applied sources exist), and is
    // still a single non-stacking entry (no per-provider duplicates).
    expect(src('major-heroism')?.availableIn).toContain('soloPve');
    expect(ULTIMATE_SOURCE_CATALOG.filter((s) => s.id === 'major-heroism')).toHaveLength(1);
  });

  it('offers Templar Prism to Templar only, default-OFF until toggled on', () => {
    // Prism procs on a Dawn's Wrath cast — a loadout choice, not a class-universal
    // mechanic — so it is available to Templar but NOT default-on (a Templar
    // tank/healer may run no Dawn's Wrath skills). It must be explicitly enabled.
    const templarSelection = { ...baseSelection, esoClass: 'templar' as const };

    // Available to Templar...
    expect(availableSources(ULTIMATE_SOURCE_CATALOG, templarSelection).map((s) => s.id)).toContain(
      'templar-prism',
    );
    // ...but NOT compiled in by default (default-off).
    expect(
      compileSources(ULTIMATE_SOURCE_CATALOG, templarSelection).map((s) => s.id),
    ).not.toContain('templar-prism');
    // Turning it on compiles it in.
    const enabled = compileSources(ULTIMATE_SOURCE_CATALOG, {
      ...templarSelection,
      enabledOverrides: { 'templar-prism': true },
    });
    expect(enabled.map((s) => s.id)).toContain('templar-prism');

    // Not available to a non-Templar (Arcanist) at all.
    const arcanist = availableSources(ULTIMATE_SOURCE_CATALOG, baseSelection); // arcanist
    expect(arcanist.map((s) => s.id)).not.toContain('templar-prism');
  });

  it('adds the expanded ultimate cost-targets (weapon/guild + class bases)', () => {
    const cost = (id: string): number | undefined =>
      ULTIMATE_ABILITIES.find((a) => a.id === id)?.baseCost;
    expect(cost('lacerate')).toBe(150); // Dual Wield
    expect(cost('rapid-fire')).toBe(175); // Bow
    expect(cost('meteor')).toBe(200); // Mages Guild
    expect(cost('war-horn')).toBe(250); // Alliance War
    expect(cost('radial-sweep')).toBe(75); // Templar (cheapest)
    expect(cost('reanimate')).toBe(335); // Necromancer (priciest)
    // Every ability still carries a valid owner the picker can group by.
    const owners = new Set([
      'global',
      'weapon',
      ...['arcanist', 'dragonknight', 'necromancer', 'nightblade', 'sorcerer', 'templar', 'warden'],
    ]);
    for (const a of ULTIMATE_ABILITIES) expect(owners.has(a.owner)).toBe(true);
  });
});
