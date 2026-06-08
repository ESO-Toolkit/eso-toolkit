import {
  computeStatCoaching,
  PVE_PENETRATION_CAP,
  STANDARD_GROUP_PEN,
} from '../esotkCompanionCoaching';
import type { CompanionStats } from '../esotkCompanionParser';

describe('computeStatCoaching — penetration', () => {
  it('flags over-penetration as wasted', () => {
    const stats: CompanionStats = { physicalPen: PVE_PENETRATION_CAP + 3200 };
    const pen = computeStatCoaching(stats).find((i) => i.id === 'penetration')!;
    expect(pen.severity).toBe('warn');
    expect(pen.label).toMatch(/over/i);
    expect(pen.detail).toContain('3,200');
    expect(pen.value).toBe(PVE_PENETRATION_CAP + 3200);
  });

  it('flags under-penetration as lost damage', () => {
    const stats: CompanionStats = { physicalPen: PVE_PENETRATION_CAP - 1300 };
    const pen = computeStatCoaching(stats).find((i) => i.id === 'penetration')!;
    expect(pen.label).toMatch(/under/i);
    expect(pen.detail).toContain('1,300');
  });

  it('reports on-cap as good', () => {
    const stats: CompanionStats = { physicalPen: PVE_PENETRATION_CAP };
    const pen = computeStatCoaching(stats).find((i) => i.id === 'penetration')!;
    expect(pen.severity).toBe('good');
  });

  it('adds an assumed group-pen contribution for a live estimate', () => {
    // self 7,200 + 11,030 group ≈ 18,230 → on cap
    const stats: CompanionStats = { physicalPen: 7200 };
    const pen = computeStatCoaching(stats, { assumedGroupPen: STANDARD_GROUP_PEN }).find(
      (i) => i.id === 'penetration',
    )!;
    expect(pen.severity).toBe('good');
    expect(pen.detail).toContain('assumed');
    expect(pen.value).toBe(7200 + STANDARD_GROUP_PEN);
  });

  it('uses the higher of physical/spell penetration', () => {
    const stats: CompanionStats = { physicalPen: 5000, spellPen: PVE_PENETRATION_CAP };
    const pen = computeStatCoaching(stats).find((i) => i.id === 'penetration')!;
    expect(pen.severity).toBe('good');
  });

  it('skips penetration when there is no data', () => {
    expect(computeStatCoaching({}).find((i) => i.id === 'penetration')).toBeUndefined();
  });
});

describe('computeStatCoaching — crit', () => {
  it('flags crit damage over the 125% cap', () => {
    const cd = computeStatCoaching({ critDamage: 130 }).find((i) => i.id === 'critDamage')!;
    expect(cd.severity).toBe('warn');
    expect(cd.detail).toContain('5%');
  });

  it('reports crit damage headroom under the cap', () => {
    const cd = computeStatCoaching({ critDamage: 110 }).find((i) => i.id === 'critDamage')!;
    expect(cd.severity).toBe('info');
    expect(cd.detail).toContain('15%');
  });

  it('converts crit rating to a percentage', () => {
    const cc = computeStatCoaching({ weaponCrit: 21918 }).find((i) => i.id === 'critChance')!;
    expect(cc.detail).toContain('100%');
  });

  it('returns nothing for undefined stats', () => {
    expect(computeStatCoaching(undefined)).toEqual([]);
  });
});
