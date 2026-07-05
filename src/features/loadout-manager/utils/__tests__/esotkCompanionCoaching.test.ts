import { computeStatCoaching, PVE_PENETRATION_CAP } from '../esotkCompanionCoaching';
import type { CompanionStats } from '../esotkCompanionParser';

describe('computeStatCoaching — penetration', () => {
  it('reports self penetration as a point-in-time figure, not a cap verdict', () => {
    const stats: CompanionStats = { physicalPen: PVE_PENETRATION_CAP + 3200 };
    const pen = computeStatCoaching(stats).find((i) => i.id === 'penetration')!;
    expect(pen.severity).toBe('info');
    expect(pen.label).not.toMatch(/over|under|cap/i);
    expect(pen.value).toBe(PVE_PENETRATION_CAP + 3200);
    expect(pen.detail).toMatch(/point-in-time/i);
  });

  it('uses the higher of physical/spell penetration', () => {
    const stats: CompanionStats = { physicalPen: 5000, spellPen: 9000 };
    const pen = computeStatCoaching(stats).find((i) => i.id === 'penetration')!;
    expect(pen.value).toBe(9000);
  });

  it('skips penetration when there is no data', () => {
    expect(computeStatCoaching({}).find((i) => i.id === 'penetration')).toBeUndefined();
  });
});

describe('computeStatCoaching — crit', () => {
  it('converts crit rating to a percentage', () => {
    const cc = computeStatCoaching({ weaponCrit: 21918 }).find((i) => i.id === 'critChance')!;
    expect(cc.detail).toContain('100%');
  });

  it('caps displayed crit chance at 100%', () => {
    const cc = computeStatCoaching({ weaponCrit: 30000 }).find((i) => i.id === 'critChance')!;
    expect(cc.value).toBe(100);
    expect(cc.detail).toContain('100%');
  });

  it('returns nothing for undefined stats', () => {
    expect(computeStatCoaching(undefined)).toEqual([]);
  });
});
