import { buildSetPieceCounts } from './setPieceCounting';

jest.mock('@/features/loadout-manager/data/itemIdMap', () => ({
  getItemInfo: (id: number) => {
    const map: Record<number, { setName: string }> = {
      1: { setName: 'Crushing Wall' }, // 2H arena weapon
      2: { setName: "Mother's Sorrow" }, // body piece
      3: { setName: "Mother's Sorrow" }, // body piece
      99: undefined as unknown as { setName: string }, // unknown item
    };
    return map[id];
  },
}));

describe('buildSetPieceCounts', () => {
  it('counts a two-handed weapon as 2 set pieces', () => {
    const counts = buildSetPieceCounts([1], (id) => id === 1);
    expect(counts.get('Crushing Wall')).toBe(2);
  });

  it('counts non-two-handed pieces as 1 each', () => {
    const counts = buildSetPieceCounts([2, 3], () => false);
    expect(counts.get("Mother's Sorrow")).toBe(2);
  });

  it('skips items with no known set', () => {
    const counts = buildSetPieceCounts([99], () => false);
    expect(counts.size).toBe(0);
  });

  it('mixes a 2H weapon with body pieces (single arena weapon reaches its 2-piece tier)', () => {
    // One Crushing Wall ice staff (2) + two Mother's Sorrow body pieces (1 each).
    const counts = buildSetPieceCounts([1, 2, 3], (id) => id === 1);
    expect(counts.get('Crushing Wall')).toBe(2);
    expect(counts.get("Mother's Sorrow")).toBe(2);
  });
});
