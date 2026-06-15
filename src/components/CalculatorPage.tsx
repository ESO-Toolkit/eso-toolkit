/**
 * /calculator host page — a top-level tab switcher between the existing stat
 * calculator (Penetration / Critical / Armor) and the new Ultimate Calculator.
 *
 * The Stats tab renders the original `Calculator` unchanged, so its sticky
 * footer and internal pen/crit/armor tabs keep working exactly as before — this
 * wrapper only adds the outer tab and never touches the stat calculator's markup.
 */

import { BoltOutlined, TuneOutlined } from '@mui/icons-material';
import { Box, Container, Tab, Tabs } from '@mui/material';
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
      <Container maxWidth="lg" sx={{ pt: { xs: 1.5, sm: 2.5 } }}>
        <Tabs
          value={tab}
          onChange={handleChange}
          aria-label="Calculator type"
          variant="standard"
          sx={(theme) => ({
            minHeight: 46,
            display: 'inline-flex',
            p: 0.5,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
                : 'rgba(255,255,255,0.6)',
            // Hide the default underline indicator — selection is shown by the
            // filled pill behind the active tab instead.
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTabs-flexContainer': { gap: 0.5 },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 38,
              borderRadius: 2.25,
              px: { xs: 1.5, sm: 2 },
              color: theme.palette.text.secondary,
              transition: 'background-color 0.18s ease, color 0.18s ease',
              '&:hover': {
                color: theme.palette.text.primary,
                backgroundColor:
                  theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.06)' : 'rgba(15,23,42,0.04)',
              },
            },
            '& .Mui-selected': {
              color:
                theme.palette.mode === 'dark'
                  ? `${theme.palette.primary.main} !important`
                  : '#ffffff !important',
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(0,225,255,0.06))'
                  : 'linear-gradient(135deg, #0f172a, #1e293b)',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 0 18px rgba(56,189,248,0.15), inset 0 0 0 1px rgba(56,189,248,0.35)'
                  : '0 4px 12px rgba(15,23,42,0.18)',
            },
          })}
        >
          <Tab
            value="stats"
            icon={<TuneOutlined fontSize="small" />}
            iconPosition="start"
            label="Stats (Pen / Crit / Armor)"
          />
          <Tab
            value="ultimate"
            icon={<BoltOutlined fontSize="small" />}
            iconPosition="start"
            label="Ultimate"
          />
        </Tabs>
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
