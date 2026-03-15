/**
 * Class Color Map
 * Maps each ESO class to accent, glow, and gradient values
 * used as CSS custom properties on the build editor wrapper.
 */

import type { ESOClass } from '../types/build.types';

export interface ClassTheme {
  accent: string;
  glow: string;
  gradient: string;
  accentRgb: string; // For rgba() usage
}

export const CLASS_COLOR_MAP: Record<ESOClass, ClassTheme> = {
  dragonknight: {
    accent: '#e05c00',
    glow: 'rgba(224, 92, 0, 0.35)',
    gradient: 'linear-gradient(135deg, #e05c00 0%, #ff8a3d 100%)',
    accentRgb: '224, 92, 0',
  },
  sorcerer: {
    accent: '#7c4dff',
    glow: 'rgba(124, 77, 255, 0.35)',
    gradient: 'linear-gradient(135deg, #7c4dff 0%, #b388ff 100%)',
    accentRgb: '124, 77, 255',
  },
  nightblade: {
    accent: '#26a69a',
    glow: 'rgba(38, 166, 154, 0.35)',
    gradient: 'linear-gradient(135deg, #26a69a 0%, #4dd0c8 100%)',
    accentRgb: '38, 166, 154',
  },
  templar: {
    accent: '#ffb300',
    glow: 'rgba(255, 179, 0, 0.35)',
    gradient: 'linear-gradient(135deg, #ffb300 0%, #ffe082 100%)',
    accentRgb: '255, 179, 0',
  },
  warden: {
    accent: '#43a047',
    glow: 'rgba(67, 160, 71, 0.35)',
    gradient: 'linear-gradient(135deg, #43a047 0%, #81c784 100%)',
    accentRgb: '67, 160, 71',
  },
  necromancer: {
    accent: '#78909c',
    glow: 'rgba(120, 144, 156, 0.35)',
    gradient: 'linear-gradient(135deg, #546e7a 0%, #90a4ae 100%)',
    accentRgb: '120, 144, 156',
  },
  arcanist: {
    accent: '#00acc1',
    glow: 'rgba(0, 172, 193, 0.35)',
    gradient: 'linear-gradient(135deg, #00acc1 0%, #4dd0e1 100%)',
    accentRgb: '0, 172, 193',
  },
};
