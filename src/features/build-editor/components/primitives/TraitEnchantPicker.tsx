/**
 * TraitEnchantPicker — compact popover for selecting gear traits and enchants.
 *
 * Renders as a small anchored popover (not a full dialog) with a scrollable
 * list of trait or enchant options. Follows the build-editor glass-morphism
 * design language.
 */

import { AutoFixHigh as TraitIcon, LocalFireDepartment as EnchantIcon } from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback } from 'react';

import type { EnchantDef, TraitDef } from '../../data/gear-traits-enchants';

// ─── Types ──────────────────────────────────────────────────────────────────

type PickerMode = 'trait' | 'enchant';

interface TraitEnchantPickerProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  mode: PickerMode;
  items: TraitDef[] | EnchantDef[];
  currentValue?: string;
  onSelect: (id: string | undefined) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const TraitEnchantPicker: React.FC<TraitEnchantPickerProps> = ({
  open,
  anchorEl,
  onClose,
  mode,
  items,
  currentValue,
  onSelect,
}) => {
  const isDark = useTheme().palette.mode === 'dark';

  const handleSelect = useCallback(
    (id: string) => {
      // Toggle off if already selected
      onSelect(id === currentValue ? undefined : id);
      onClose();
    },
    [currentValue, onSelect, onClose],
  );

  const handleClear = useCallback(() => {
    onSelect(undefined);
    onClose();
  }, [onSelect, onClose]);

  const isTrait = mode === 'trait';
  const Icon = isTrait ? TraitIcon : EnchantIcon;
  const accentColor = isTrait ? '#a78bfa' : '#fb923c';

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{
        paper: {
          sx: {
            mt: 0.5,
            borderRadius: 2.5,
            minWidth: 220,
            maxWidth: 280,
            maxHeight: 340,
            overflow: 'hidden',
            background: isDark
              ? 'rgba(15, 23, 42, 0.95)'
              : 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 8px 32px rgba(0,0,0,0.12)',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Icon sx={{ fontSize: 14, color: accentColor, opacity: 0.8 }} />
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: accentColor,
          }}
        >
          {isTrait ? 'Select Trait' : 'Select Enchant'}
        </Typography>
        {currentValue && (
          <ButtonBase
            onClick={handleClear}
            sx={{
              ml: 'auto',
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              fontSize: 9,
              fontWeight: 600,
              fontFamily: 'Space Grotesk',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              '&:hover': {
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              },
            }}
          >
            CLEAR
          </ButtonBase>
        )}
      </Box>

      {/* Options list */}
      <Stack
        sx={{
          maxHeight: 280,
          overflowY: 'auto',
          py: 0.5,
          px: 0.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            borderRadius: 2,
          },
        }}
      >
        {items.map((item) => {
          const isSelected = item.id === currentValue;
          return (
            <ButtonBase
              key={item.id}
              onClick={() => handleSelect(item.id)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                py: 0.75,
                px: 1,
                borderRadius: 1.5,
                width: '100%',
                textAlign: 'left',
                background: isSelected
                  ? isDark
                    ? `${accentColor}18`
                    : `${accentColor}10`
                  : 'transparent',
                border: isSelected
                  ? `1px solid ${accentColor}40`
                  : '1px solid transparent',
                transition: 'all 0.12s ease',
                '&:hover': {
                  background: isSelected
                    ? isDark
                      ? `${accentColor}22`
                      : `${accentColor}15`
                    : isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.025)',
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  color: isSelected
                    ? accentColor
                    : isDark
                      ? 'rgba(255,255,255,0.85)'
                      : 'rgba(0,0,0,0.80)',
                  lineHeight: 1.3,
                }}
              >
                {item.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: 10,
                  color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
                  lineHeight: 1.3,
                  mt: 0.15,
                }}
              >
                {item.description}
              </Typography>
            </ButtonBase>
          );
        })}
      </Stack>
    </Popover>
  );
};
