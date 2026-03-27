/**
 * TraitEnchantPicker — compact popover (desktop) / bottom-sheet (mobile)
 * for selecting gear traits and enchants.
 *
 * Desktop: small anchored Popover attached to the triggering chip.
 * Mobile:  bottom-sheet Dialog that slides up from the screen edge,
 *          avoiding the iOS viewport-edge overflow problem with Popovers.
 */

import {
  AutoFixHigh as TraitIcon,
  Close as CloseIcon,
  LocalFireDepartment as EnchantIcon,
} from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Dialog,
  IconButton,
  Popover,
  Slide,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { TransitionProps } from '@mui/material/transitions';
import React, { useCallback } from 'react';

import type { EnchantDef, TraitDef } from '../../data/gear-traits-enchants';

// ─── Slide-up transition for mobile bottom-sheet ─────────────────────────────

const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // ── Shared content (used in both Popover and Dialog) ─────────────────────
  const content = (
    <>
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: isMobile ? 1.5 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          borderBottom: `1px solid ${borderColor}`,
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
              // On desktop, push CLEAR to the right; on mobile, the close
              // button does that job so CLEAR sits inline after the title.
              ml: isMobile ? 0 : 'auto',
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

        {/* Explicit close button — only shown in the mobile bottom-sheet.
            Desktop users dismiss the Popover by clicking outside. */}
        {isMobile && (
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Close"
            sx={{
              ml: 'auto',
              p: 0.5,
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
              '&:hover': {
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>

      {/* Options list */}
      <Stack
        sx={{
          // Mobile bottom-sheet can scroll up to half the viewport height.
          maxHeight: isMobile ? '50vh' : 280,
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
                // Slightly taller rows on mobile for easier tapping
                py: isMobile ? 1 : 0.75,
                px: 1,
                borderRadius: 1.5,
                width: '100%',
                textAlign: 'left',
                background: isSelected
                  ? isDark
                    ? `${accentColor}18`
                    : `${accentColor}10`
                  : 'transparent',
                border: isSelected ? `1px solid ${accentColor}40` : '1px solid transparent',
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
    </>
  );

  // ── Mobile: bottom-sheet Dialog ──────────────────────────────────────────
  if (isMobile) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        TransitionComponent={SlideUp}
        TransitionProps={{ timeout: { enter: 260, exit: 180 } }}
        // Align the dialog to the bottom of the screen
        sx={{ '& .MuiDialog-container': { alignItems: 'flex-end' } }}
        PaperProps={{
          sx: {
            m: 0,
            width: '100%',
            maxWidth: '100%',
            borderRadius: '16px 16px 0 0',
            background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255, 255, 255, 0.99)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            borderBottom: 'none',
            // Push content above iOS home indicator
            pb: 'env(safe-area-inset-bottom, 0px)',
          },
        }}
        slotProps={{
          backdrop: {
            sx: { background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)' },
          },
        }}
      >
        {content}
      </Dialog>
    );
  }

  // ── Desktop: anchored Popover ────────────────────────────────────────────
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
            background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 8px 32px rgba(0,0,0,0.12)',
          },
        },
      }}
    >
      {content}
    </Popover>
  );
};
