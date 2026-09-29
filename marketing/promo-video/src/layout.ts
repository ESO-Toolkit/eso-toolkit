import { useVideoConfig } from 'remotion';
import type { Rect } from './lib/anim';

export type Stage = {
  portrait: boolean;
  width: number;
  height: number;
  /** Top-left of the headline block and its max width. */
  headline: { x: number; y: number; w: number; size: number; subSize: number };
  /** Where product footage sits while the tooltip is docked beside it. */
  screen: Rect;
  /** Near-full-bleed footage frame for the 3D replay. */
  screenWide: Rect;
  /** Docked tooltip position and width. */
  tooltip: { x: number; y: number; w: number };
  /** Centered hero tooltip used when the item is first introduced. */
  tooltipHero: { x: number; y: number; w: number; scale: number };
  /** Summary comparison: the Equipped card (top of its label) and the upgraded card. */
  compare: {
    headlineY: number;
    equipped: { x: number; y: number; w: number };
    upgraded: { x: number; y: number; w: number; scale: number };
  };
  /** Whether the docked tooltip folds away the report lines to save height. */
  compactDock: boolean;
};

const landscape: Stage = {
  portrait: false,
  width: 1920,
  height: 1080,
  headline: { x: 96, y: 84, w: 1240, size: 64, subSize: 27 },
  screen: { x: 96, y: 282, w: 1244, h: 700 },
  screenWide: { x: 96, y: 84, w: 1728, h: 912 },
  tooltip: { x: 1396, y: 282, w: 428 },
  tooltipHero: { x: 699, y: 232, w: 428, scale: 1.22 },
  compare: {
    headlineY: 110,
    equipped: { x: 500, y: 272, w: 428 },
    upgraded: { x: 1004, y: 300, w: 428, scale: 1.04 },
  },
  compactDock: false,
};

// 9:16 keeps copy clear of the platform UI: top ~10%, bottom ~20%, right ~10%.
const portrait: Stage = {
  portrait: true,
  width: 1080,
  height: 1920,
  headline: { x: 72, y: 206, w: 900, size: 62, subSize: 30 },
  screen: { x: 48, y: 470, w: 984, h: 700 },
  screenWide: { x: 0, y: 380, w: 1080, h: 1150 },
  tooltip: { x: 270, y: 1200, w: 540 },
  tooltipHero: { x: 215, y: 560, w: 580, scale: 1.12 },
  // Stacked rather than side by side so the cards stay legible on a phone.
  compare: {
    headlineY: 250,
    equipped: { x: 300, y: 420, w: 480 },
    upgraded: { x: 260, y: 900, w: 560, scale: 1 },
  },
  compactDock: true,
};

export const useStage = (): Stage => {
  const { width, height } = useVideoConfig();
  return height > width ? portrait : landscape;
};
