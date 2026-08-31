import { getDpsDataTextColor } from './leaderboardTheme';

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Invalid color: ${hex}`);

  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('leaderboard data text colors', () => {
  it('meets WCAG AA contrast in light and dark leaderboard surfaces', () => {
    expect(contrastRatio(getDpsDataTextColor('light'), '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(getDpsDataTextColor('dark'), '#0f172a')).toBeGreaterThanOrEqual(4.5);
  });
});
