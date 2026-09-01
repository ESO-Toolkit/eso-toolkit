import { formatCompactDps, getLeaderboardClassDisplayName } from '../displayFormatting';

describe('formatCompactDps', () => {
  it('rounds values below one thousand', () => {
    expect(formatCompactDps(999.4)).toBe('999');
    expect(formatCompactDps(999.6)).toBe('1000');
  });

  it('uses a trimmed one-decimal k suffix for larger values', () => {
    expect(formatCompactDps(1_000)).toBe('1k');
    expect(formatCompactDps(1_250)).toBe('1.3k');
    expect(formatCompactDps(12_000)).toBe('12k');
  });
});

describe('getLeaderboardClassDisplayName', () => {
  it('normalizes ESO class aliases to their display labels', () => {
    expect(getLeaderboardClassDisplayName('DragonKnight')).toBe('Dragonknight');
    expect(getLeaderboardClassDisplayName('dragon knight')).toBe('Dragonknight');
    expect(getLeaderboardClassDisplayName('dk')).toBe('Dragonknight');
  });

  it('preserves unknown class labels', () => {
    expect(getLeaderboardClassDisplayName('FutureClass')).toBe('FutureClass');
  });
});
