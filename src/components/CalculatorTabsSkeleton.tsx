/**
 * Static placeholder for the /calculator page's top tab strip
 * (Stats / Ultimate / Scribing).
 *
 * The App-level Suspense fallback replaces the *entire* `CalculatorPage` while
 * its chunk loads — including the tab bar that `CalculatorPage` always renders
 * above the calculator. Without this, the tab strip pops in when the chunk
 * resolves and pushes the skeleton/content down. Rendering this shell (with the
 * about-to-be-active tab pre-selected) reserves that space so first paint
 * matches the loaded page — and shows all three tabs, not a momentary subset.
 *
 * It mirrors `CalculatorPage`'s `<Tabs>` styling so the swap is seamless; the
 * labels/icons are the real ones (they're static chrome, not data) so there's
 * no shimmer-to-content flash.
 */

import { BoltOutlined, HistoryEduOutlined, TuneOutlined } from '@mui/icons-material';
import { Box, Container, useTheme } from '@mui/material';
import React from 'react';

interface CalculatorTabsSkeletonProps {
  /** Which tab the loading page is about to show. */
  selected?: 'stats' | 'ultimate' | 'scribing';
}

export const CalculatorTabsSkeleton: React.FC<CalculatorTabsSkeletonProps> = ({
  selected = 'stats',
}) => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const selectedSx = {
    color: dark ? `${theme.palette.primary.main}` : '#ffffff',
    background: dark
      ? 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(0,225,255,0.06))'
      : 'linear-gradient(135deg, #0f172a, #1e293b)',
    boxShadow: dark
      ? '0 0 18px rgba(56,189,248,0.15), inset 0 0 0 1px rgba(56,189,248,0.35)'
      : '0 4px 12px rgba(15,23,42,0.18)',
  };

  const pillSx = (isSelected: boolean): object => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.75,
    minHeight: 38,
    borderRadius: 2.25,
    px: { xs: 1.5, sm: 2 },
    fontWeight: 600,
    fontSize: '0.875rem',
    textTransform: 'none',
    color: theme.palette.text.secondary,
    '& svg': { fontSize: 20 },
    ...(isSelected ? selectedSx : {}),
  });

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 1.5, sm: 2.5 } }}>
      <Box
        aria-hidden
        sx={{
          minHeight: 46,
          display: 'inline-flex',
          p: 0.5,
          gap: 0.5,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          background: dark
            ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
            : 'rgba(255,255,255,0.6)',
        }}
      >
        <Box sx={pillSx(selected === 'stats')}>
          <TuneOutlined fontSize="small" />
          <Box component="span">
            Stats
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {' '}
              (Pen / Crit / Armor)
            </Box>
          </Box>
        </Box>
        <Box sx={pillSx(selected === 'ultimate')}>
          <BoltOutlined fontSize="small" />
          <Box component="span">Ultimate</Box>
        </Box>
        <Box sx={pillSx(selected === 'scribing')}>
          <HistoryEduOutlined fontSize="small" />
          <Box component="span">Scribing</Box>
        </Box>
      </Box>
    </Container>
  );
};
