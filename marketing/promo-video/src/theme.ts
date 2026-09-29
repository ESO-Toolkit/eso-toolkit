import { loadFont as loadBarlowCondensed } from '@remotion/google-fonts/BarlowCondensed';
import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk';

// Space Grotesk is the site's heading face. Barlow Condensed stands in for the condensed
// face ESO uses in its own item tooltips, and is only used inside the tooltip cards.
export const display = loadSpaceGrotesk('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
}).fontFamily;

export const tooltipFace = loadBarlowCondensed('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
}).fontFamily;

// Brand tokens from src/ReduxThemeProvider.tsx (dark theme) and the nebula background.
export const color = {
  void: '#050810',
  navy: '#0b1220',
  deep: '#0a0f1e',
  panel: '#0f172a',
  text: '#e5e7eb',
  muted: '#94a3b8',
  faint: '#64748b',
  sky: '#38bdf8',
  aqua: '#00e1ff',
  violet: '#8b5cf6',
} as const;

// ESO's own item-quality colors. The video's comparison device is an item "upgrade".
export const quality = [
  { name: 'Fine', hex: '#2dc50e', rgb: '45, 197, 14' },
  { name: 'Superior', hex: '#3a92ff', rgb: '58, 146, 255' },
  { name: 'Epic', hex: '#a02ef7', rgb: '160, 46, 247' },
  { name: 'Legendary', hex: '#eeca2a', rgb: '238, 202, 42' },
] as const;

export type Tier = 0 | 1 | 2 | 3;
