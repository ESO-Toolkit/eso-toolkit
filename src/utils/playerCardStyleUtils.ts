/**
 * Styling utilities for player card components
 */

import type { ChipProps } from '@mui/material/Chip';
import { SxProps, Theme } from '@mui/material/styles';
import { keyframes } from '@mui/system';

import {
  ARENA_SET_NAMES,
  MONSTER_ONE_PIECE_HINTS,
  MYTHIC_SET_NAMES,
  normalizeGearName,
} from './gearUtilities';

// Glossy Chip styling (glassmorphism + shine) and color variants
const legendaryGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 8px 32px 0 rgba(255, 0, 150, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow:
      0 8px 32px 0 rgba(0, 150, 255, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
`;

const getGlossyBaseSx = (theme: Theme): SxProps<Theme> => ({
  position: 'relative',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  borderRadius: 28,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)'
      : '0 4px 16px 0 rgba(59, 130, 246, 0.15), 0 2px 8px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
  '& .MuiChip-label': {
    color: theme.palette.mode === 'dark' ? '#ffffff' : '#1f2937',
    textShadow:
      theme.palette.mode === 'dark'
        ? '0 1px 3px rgba(0,0,0,0.5)'
        : '0 1px 2px rgba(255,255,255,0.8)',
    fontWeight: theme.palette.mode === 'dark' ? 500 : 600,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
    transform: 'skewX(-15deg)',
    transformOrigin: 'center center',
    transition: 'left 0.5s ease',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
    borderRadius: '28px 28px 100px 100px / 28px 28px 50px 50px',
    pointerEvents: 'none',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 12px 40px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)'
        : '0 8px 24px 0 rgba(59, 130, 246, 0.25), 0 4px 12px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.15)',
  },
  '&:hover::before': {
    left: '100%',
  },
});

/**
 * Builds Material-UI sx props for different variant styles
 * @param variant - The style variant to apply
 * @param theme - Material-UI theme object
 * @returns SxProps for the variant
 */
export const buildVariantSx = (variant: string, theme: Theme): SxProps<Theme> => {
  const isDark = theme.palette.mode === 'dark';

  const darkVariants: Record<string, SxProps<Theme>> = {
    green: {
      background:
        'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(76, 217, 100, 0.15) 50%, rgba(76, 217, 100, 0.08) 100%)',
      borderColor: 'rgba(76, 217, 100, 0.3)',
      color: '#5ce572',
    },
    blue: {
      background:
        'linear-gradient(135deg, rgba(0, 122, 255, 0.25) 0%, rgba(0, 122, 255, 0.15) 50%, rgba(0, 122, 255, 0.08) 100%)',
      borderColor: 'rgba(0, 122, 255, 0.3)',
      color: '#4da3ff',
    },
    lightBlue: {
      background:
        'linear-gradient(135deg, rgba(94, 234, 255, 0.25) 0%, rgba(94, 234, 255, 0.15) 50%, rgba(94, 234, 255, 0.08) 100%)',
      borderColor: 'rgba(94, 234, 255, 0.35)',
      color: '#7ee8ff',
    },
    purple: {
      background:
        'linear-gradient(135deg, rgba(175, 82, 222, 0.25) 0%, rgba(175, 82, 222, 0.15) 50%, rgba(175, 82, 222, 0.08) 100%)',
      borderColor: 'rgba(175, 82, 222, 0.3)',
      color: '#c57fff',
    },
    indigo: {
      background:
        'linear-gradient(135deg, rgba(88, 86, 214, 0.25) 0%, rgba(88, 86, 214, 0.15) 50%, rgba(88, 86, 214, 0.08) 100%)',
      borderColor: 'rgba(88, 86, 214, 0.3)',
      '& .MuiChip-label': { color: '#8583ff' },
    },
    gold: {
      background:
        'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 50%, rgba(255, 193, 7, 0.08) 100%)',
      borderColor: 'rgba(255, 193, 7, 0.35)',
      color: '#ffd54f',
    },
    silver: {
      background:
        'linear-gradient(135deg, rgba(236, 240, 241, 0.25) 0%, rgba(236, 240, 241, 0.15) 50%, rgba(236, 240, 241, 0.08) 100%)',
      borderColor: 'rgba(236, 240, 241, 0.35)',
      color: '#ecf0f1',
    },
    championRed: {
      background:
        'linear-gradient(135deg, rgba(255, 68, 68, 0.25) 0%, rgba(255, 68, 68, 0.15) 50%, rgba(255, 68, 68, 0.08) 100%)',
      borderColor: 'rgba(255, 68, 68, 0.3)',
      '& .MuiChip-label': { color: '#ff6666' },
    },
    championBlue: {
      background:
        'linear-gradient(135deg, rgba(68, 136, 255, 0.25) 0%, rgba(68, 136, 255, 0.15) 50%, rgba(68, 136, 255, 0.08) 100%)',
      borderColor: 'rgba(68, 136, 255, 0.3)',
      '& .MuiChip-label': { color: '#66aaff' },
    },
    championGreen: {
      background:
        'linear-gradient(135deg, rgba(68, 255, 136, 0.25) 0%, rgba(68, 255, 136, 0.15) 50%, rgba(68, 255, 136, 0.08) 100%)',
      borderColor: 'rgba(68, 255, 136, 0.3)',
      '& .MuiChip-label': { color: '#66ffaa' },
    },
    legendary: {
      background:
        'linear-gradient(135deg, rgba(255,0,150,0.2) 0%, rgba(255,150,0,0.2) 20%, rgba(255,255,0,0.2) 40%, rgba(0,255,0,0.2) 60%, rgba(0,150,255,0.2) 80%, rgba(150,0,255,0.2) 100%)',
      borderImage:
        'linear-gradient(135deg, #ff0096, #ff9600, #ffff00, #00ff00, #0096ff, #9600ff) 1',
      border: '1px solid transparent',
      color: '#ffffff',
      animation: `${legendaryGlow} 3s ease-in-out infinite`,
    },
  };

  const lightVariants: Record<string, SxProps<Theme>> = {
    green: {
      background:
        'linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(16, 185, 129, 0.08) 50%, rgba(34, 197, 94, 0.04) 100%)',
      borderColor: 'rgba(5, 150, 105, 0.3)',
      '& .MuiChip-label': { color: '#065f46' },
    },
    blue: {
      background:
        'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(96, 165, 250, 0.04) 100%)',
      borderColor: 'rgba(37, 99, 235, 0.3)',
      '& .MuiChip-label': { color: '#1e3a8a' },
    },
    lightBlue: {
      background:
        'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(14, 165, 233, 0.08) 50%, rgba(56, 189, 248, 0.04) 100%)',
      borderColor: 'rgba(2, 132, 199, 0.3)',
      '& .MuiChip-label': { color: '#0c4a6e' },
    },
    purple: {
      background:
        'linear-gradient(135deg, rgba(126, 34, 206, 0.12) 0%, rgba(147, 51, 234, 0.08) 50%, rgba(168, 85, 247, 0.04) 100%)',
      borderColor: 'rgba(126, 34, 206, 0.3)',
      '& .MuiChip-label': { color: '#581c87' },
    },
    indigo: {
      background:
        'linear-gradient(135deg, rgba(67, 56, 202, 0.12) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(129, 140, 248, 0.04) 100%)',
      borderColor: 'rgba(67, 56, 202, 0.3)',
      '& .MuiChip-label': { color: '#3730a3' },
    },
    gold: {
      background:
        'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(245, 158, 11, 0.08) 50%, rgba(251, 191, 36, 0.04) 100%)',
      borderColor: 'rgba(217, 119, 6, 0.3)',
      '& .MuiChip-label': { color: '#92400e' },
    },
    silver: {
      background:
        'linear-gradient(135deg, rgba(100, 116, 139, 0.12) 0%, rgba(148, 163, 184, 0.08) 50%, rgba(203, 213, 225, 0.04) 100%)',
      borderColor: 'rgba(100, 116, 139, 0.3)',
      '& .MuiChip-label': { color: '#334155' },
    },
    championRed: {
      background:
        'linear-gradient(135deg, rgba(220, 38, 38, 0.12) 0%, rgba(239, 68, 68, 0.08) 50%, rgba(248, 113, 113, 0.04) 100%)',
      borderColor: 'rgba(220, 38, 38, 0.3)',
      '& .MuiChip-label': { color: '#991b1b' },
    },
    championBlue: {
      background:
        'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(96, 165, 250, 0.04) 100%)',
      borderColor: 'rgba(37, 99, 235, 0.3)',
      '& .MuiChip-label': { color: '#1e3a8a' },
    },
    championGreen: {
      background:
        'linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(16, 185, 129, 0.08) 50%, rgba(34, 197, 94, 0.04) 100%)',
      borderColor: 'rgba(5, 150, 105, 0.3)',
      '& .MuiChip-label': { color: '#065f46' },
    },
    legendary: {
      background:
        'linear-gradient(135deg, rgba(255,0,150,0.2) 0%, rgba(255,150,0,0.2) 20%, rgba(255,255,0,0.2) 40%, rgba(0,255,0,0.2) 60%, rgba(0,150,255,0.2) 80%, rgba(150,0,255,0.2) 100%)',
      borderImage:
        'linear-gradient(135deg, #ff0096, #ff9600, #ffff00, #00ff00, #0096ff, #9600ff) 1',
      border: '1px solid transparent',
      '& .MuiChip-label': { color: '#1f2937', fontWeight: 'bold' },
      animation: `${legendaryGlow} 3s ease-in-out infinite`,
    },
  };

  const variants = isDark ? darkVariants : lightVariants;
  const baseStyles = getGlossyBaseSx(theme);

  return { ...baseStyles, ...(variants[variant] || variants.silver) } as SxProps<Theme>;
};

/**
 * Gets chip properties for gear sets based on type and count
 * @param setName - The gear set name
 * @param count - Number of pieces in the set
 * @param theme - Material-UI theme object
 * @returns Partial ChipProps with styling
 */
export const getGearChipProps = (
  setName: string,
  count: number,
  theme: Theme,
): Partial<ChipProps> => {
  const n = normalizeGearName(setName);
  // Mythics first (explicit list)
  if (MYTHIC_SET_NAMES.has(n)) {
    return {
      sx: buildVariantSx('gold', theme),
    };
  }
  // Arena weapons
  if (ARENA_SET_NAMES.has(n)) {
    return {
      sx: buildVariantSx('blue', theme),
    };
  }
  // Special case: 4-piece Highland Sentinel uses a specific font color
  if (count === 4 && n === normalizeGearName('Highland Sentinel')) {
    return {
      sx: buildVariantSx('green', theme),
    };
  }
  // 5-piece sets
  if (count >= 5) {
    return {
      sx: buildVariantSx('green', theme),
    };
  }
  // Two-piece monsters
  if (count === 2 && MONSTER_ONE_PIECE_HINTS.has(n)) {
    return {
      sx: buildVariantSx('purple', theme),
    };
  }
  // One-piece monsters
  if (count === 1 && MONSTER_ONE_PIECE_HINTS.has(n)) {
    return {
      sx: buildVariantSx('lightBlue', theme),
    };
  }
  // Default neutral
  return { sx: buildVariantSx('silver', theme) };
};
