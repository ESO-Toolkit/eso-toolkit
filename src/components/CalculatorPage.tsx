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
          sx={{
            minHeight: 44,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 44 },
          }}
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
