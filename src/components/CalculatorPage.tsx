/**
 * /calculator host page — a top-level tab switcher between the existing stat
 * calculator (Penetration / Critical / Armor) and the new Ultimate Calculator.
 *
 * The Stats tab renders the original `Calculator` unchanged, so its sticky
 * footer and internal pen/crit/armor tabs keep working exactly as before — this
 * wrapper only adds the outer tab and never touches the stat calculator's markup.
 */

import { BoltOutlined, TuneOutlined } from '@mui/icons-material';
import { Box, Container, Tab, Tabs, Typography } from '@mui/material';
import React, { Suspense, useState } from 'react';

import { Calculator } from './Calculator';
import { SmartCalculatorSkeleton } from './SmartCalculatorSkeleton';

const UltimateCalculator = React.lazy(() =>
  import('@features/ultimate-simulator/presentation/components/UltimateCalculator').then((m) => ({
    default: m.UltimateCalculator,
  })),
);

type TopTab = 'stats' | 'ultimate';

const VALID_TABS: readonly TopTab[] = ['stats', 'ultimate'];

/** Read the initial tab from the URL hash (#ultimate) for shareable deep-links. */
function initialTab(): TopTab {
  if (typeof window === 'undefined') return 'stats';
  const hash = window.location.hash.replace('#', '').toLowerCase();
  return (VALID_TABS as readonly string[]).includes(hash) ? (hash as TopTab) : 'stats';
}

export const CalculatorPage: React.FC = () => {
  const [tab, setTab] = useState<TopTab>(initialTab);

  const handleChange = (_: React.SyntheticEvent, next: TopTab): void => {
    setTab(next);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', next === 'stats' ? ' ' : `#${next}`);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top-level page navigation. Rendered as a full-width underline tab bar
          (not a pill group) so it reads as primary, app-level navigation and is
          visually distinct from the secondary segmented pill controls (PvE/PvP,
          Pen/Crit/Armor, Solo/Group/PvP) that live inside each panel — fixing
          the "tabs inside tabs" / double-pill confusion. */}
      <Container maxWidth="lg" sx={{ pt: { xs: 1.5, sm: 2.5 } }}>
        <Box
          component="nav"
          aria-label="Calculator sections"
          sx={(theme) => ({
            borderBottom: `1px solid ${theme.palette.divider}`,
          })}
        >
          <Typography
            component="span"
            sx={(theme) => ({
              display: 'block',
              mb: 1,
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:
                theme.palette.mode === 'dark'
                  ? 'rgba(148,163,184,0.85)'
                  : theme.palette.text.secondary,
            })}
          >
            Calculator
          </Typography>
          <Tabs
            value={tab}
            onChange={handleChange}
            aria-label="Calculator type"
            variant="standard"
            sx={(theme) => {
              const accent = theme.palette.mode === 'dark' ? 'rgb(56,189,248)' : 'rgb(40,145,200)';
              return {
                minHeight: 52,
                // A clear cyan underline marks the active section — a tab-bar
                // affordance that differs from the filled inner pills.
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  backgroundColor: accent,
                  boxShadow: theme.palette.mode === 'dark' ? `0 0 12px ${accent}` : 'none',
                },
                '& .MuiTabs-flexContainer': { gap: { xs: 1, sm: 2.5 } },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.9375rem', sm: '1.0625rem' },
                  minHeight: 52,
                  px: { xs: 0.5, sm: 1 },
                  color: theme.palette.text.secondary,
                  transition: 'color 0.18s ease',
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                  '&:hover': { color: theme.palette.text.primary },
                },
                '& .Mui-selected': {
                  color: `${accent} !important`,
                  fontWeight: 700,
                },
              };
            }}
          >
            <Tab
              value="stats"
              icon={<TuneOutlined fontSize="small" />}
              iconPosition="start"
              label={
                <Box component="span">
                  Stats
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    {' '}
                    (Pen / Crit / Armor)
                  </Box>
                </Box>
              }
            />
            <Tab
              value="ultimate"
              icon={<BoltOutlined fontSize="small" />}
              iconPosition="start"
              label="Ultimate"
            />
          </Tabs>
        </Box>
      </Container>

      {/* Keep the stat calculator mounted (display:none) so switching back is
          instant and its sticky-footer measurements aren't torn down. */}
      <Box sx={{ display: tab === 'stats' ? 'block' : 'none' }}>
        <Calculator />
      </Box>

      {tab === 'ultimate' && (
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Suspense fallback={<SmartCalculatorSkeleton />}>
            <UltimateCalculator />
          </Suspense>
        </Container>
      )}
    </Box>
  );
};
