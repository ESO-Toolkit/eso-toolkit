/**
 * Styling utilities for player card components
 */

import type { ChipProps } from '@mui/material/Chip';
import { SxProps, Theme } from '@mui/material/styles';

import {
  ARENA_SET_NAMES,
  MONSTER_ONE_PIECE_HINTS,
  MYTHIC_SET_NAMES,
  normalizeGearName,
} from './gearUtilities';

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
      color: '#a29cff',
    },
    championRed: {
      background:
        'linear-gradient(135deg, rgba(244, 67, 54, 0.25) 0%, rgba(244, 67, 54, 0.15) 50%, rgba(244, 67, 54, 0.08) 100%)',
      borderColor: 'rgba(244, 67, 54, 0.3)',
      color: '#ff6b5a',
    },
    championBlue: {
      background:
        'linear-gradient(135deg, rgba(33, 150, 243, 0.25) 0%, rgba(33, 150, 243, 0.15) 50%, rgba(33, 150, 243, 0.08) 100%)',
      borderColor: 'rgba(33, 150, 243, 0.3)',
      color: '#42a5f5',
    },
    championGreen: {
      background:
        'linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.15) 50%, rgba(76, 175, 80, 0.08) 100%)',
      borderColor: 'rgba(76, 175, 80, 0.3)',
      color: '#66bb6a',
    },
  };

  const lightVariants: Record<string, SxProps<Theme>> = {
    green: {
      background:
        'linear-gradient(135deg, rgba(56, 142, 60, 0.15) 0%, rgba(56, 142, 60, 0.08) 50%, rgba(56, 142, 60, 0.04) 100%)',
      borderColor: 'rgba(56, 142, 60, 0.4)',
      color: '#2e7d32',
    },
    blue: {
      background:
        'linear-gradient(135deg, rgba(25, 118, 210, 0.15) 0%, rgba(25, 118, 210, 0.08) 50%, rgba(25, 118, 210, 0.04) 100%)',
      borderColor: 'rgba(25, 118, 210, 0.4)',
      color: '#1565c0',
    },
    lightBlue: {
      background:
        'linear-gradient(135deg, rgba(3, 169, 244, 0.15) 0%, rgba(3, 169, 244, 0.08) 50%, rgba(3, 169, 244, 0.04) 100%)',
      borderColor: 'rgba(3, 169, 244, 0.4)',
      color: '#0277bd',
    },
    purple: {
      background:
        'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(156, 39, 176, 0.08) 50%, rgba(156, 39, 176, 0.04) 100%)',
      borderColor: 'rgba(156, 39, 176, 0.4)',
      color: '#7b1fa2',
    },
    indigo: {
      background:
        'linear-gradient(135deg, rgba(63, 81, 181, 0.15) 0%, rgba(63, 81, 181, 0.08) 50%, rgba(63, 81, 181, 0.04) 100%)',
      borderColor: 'rgba(63, 81, 181, 0.4)',
      color: '#303f9f',
    },
    championRed: {
      background:
        'linear-gradient(135deg, rgba(211, 47, 47, 0.15) 0%, rgba(211, 47, 47, 0.08) 50%, rgba(211, 47, 47, 0.04) 100%)',
      borderColor: 'rgba(211, 47, 47, 0.4)',
      color: '#c62828',
    },
    championBlue: {
      background:
        'linear-gradient(135deg, rgba(30, 136, 229, 0.15) 0%, rgba(30, 136, 229, 0.08) 50%, rgba(30, 136, 229, 0.04) 100%)',
      borderColor: 'rgba(30, 136, 229, 0.4)',
      color: '#1976d2',
    },
    championGreen: {
      background:
        'linear-gradient(135deg, rgba(67, 160, 71, 0.15) 0%, rgba(67, 160, 71, 0.08) 50%, rgba(67, 160, 71, 0.04) 100%)',
      borderColor: 'rgba(67, 160, 71, 0.4)',
      color: '#388e3c',
    },
  };

  return isDark
    ? darkVariants[variant] || darkVariants.blue
    : lightVariants[variant] || lightVariants.blue;
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
  const normalizedName = normalizeGearName(setName);

  let variant: string;
  if (Array.from(MYTHIC_SET_NAMES).some((mythic) => normalizeGearName(mythic) === normalizedName)) {
    variant = 'purple';
  } else if (
    Array.from(ARENA_SET_NAMES).some((arena) => normalizeGearName(arena) === normalizedName)
  ) {
    variant = 'lightBlue';
  } else if (
    Array.from(MONSTER_ONE_PIECE_HINTS).some((monster) =>
      normalizedName.includes(normalizeGearName(monster)),
    )
  ) {
    variant = 'green';
  } else if (count >= 5) {
    variant = 'blue';
  } else {
    variant = 'indigo';
  }

  return {
    sx: {
      ...buildVariantSx(variant, theme),
      '& .MuiChip-label': { fontSize: '0.58rem' },
    },
  };
};
