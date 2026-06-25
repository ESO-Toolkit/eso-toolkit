/**
 * /calculator host page — a top-level tab switcher between the existing stat
 * calculator (Penetration / Critical / Armor), the Ultimate Calculator, and the
 * Scribing planner.
 *
 * The Stats tab renders the original `Calculator` unchanged, so its sticky
 * footer and internal pen/crit/armor tabs keep working exactly as before — this
 * wrapper only adds the outer tab and never touches the stat calculator's markup.
 *
 * The active tab is derived from the URL hash (#ultimate / #scribing) via React
 * Router, so deep-links and header/footer links switch tabs reliably — even when
 * the user is already on /calculator.
 */

import { BoltOutlined, HistoryEduOutlined, TuneOutlined } from '@mui/icons-material';
import { Box, Container, Tab, Tabs } from '@mui/material';
import React, { Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ScribingSimulatorSkeleton } from '@features/scribing/presentation/components/ScribingSimulatorSkeleton';

import { Calculator } from './Calculator';
import { UltimateCalculatorSkeleton } from './UltimateCalculatorSkeleton';

const UltimateCalculator = React.lazy(() =>
  import('@features/ultimate-simulator/presentation/components/UltimateCalculator').then((m) => ({
    default: m.UltimateCalculator,
  })),
);

const ScribingSimulator = React.lazy(() =>
  import('@features/scribing/presentation/components/ScribingSimulator').then((m) => ({
    default: m.ScribingSimulator,
  })),
);

type TopTab = 'stats' | 'ultimate' | 'scribing';

const VALID_TABS: readonly TopTab[] = ['stats', 'ultimate', 'scribing'];

/** Map the URL hash (#ultimate / #scribing) to a tab, defaulting to Stats. */
function tabFromHash(hash: string): TopTab {
  const h = hash.replace('#', '').toLowerCase();
  return (VALID_TABS as readonly string[]).includes(h) ? (h as TopTab) : 'stats';
}

export const CalculatorPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = tabFromHash(location.hash);

  // The Scribing tab lazy-loads on first visit, then stays mounted (toggled with
  // display:none, like the Stats tab) instead of being torn down on every tab
  // switch. Its hook re-runs an async data load on each mount, so a conditional
  // mount would flash the loading skeleton every single time you returned to the
  // tab. Keeping it mounted means the skeleton shows only on the first visit —
  // matching the Stats and Ultimate tabs, which don't re-show their loaders.
  const scribingEverActiveRef = React.useRef(false);
  if (tab === 'scribing') scribingEverActiveRef.current = true;

  const handleChange = (_: React.SyntheticEvent, next: TopTab): void => {
    // Route the tab through React Router so the URL hash stays the single source
    // of truth. Preserve the live query string (the Scribing tab mirrors its
    // build there) and use `replace` so switching tabs doesn't stack history.
    const search = typeof window !== 'undefined' ? window.location.search : '';
    navigate(`/calculator${search}${next === 'stats' ? '' : `#${next}`}`, { replace: true });
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
          <Tab
            value="scribing"
            icon={<HistoryEduOutlined fontSize="small" />}
            iconPosition="start"
            label="Scribing"
          />
        </Tabs>
      </Container>

      {/* Keep the stat calculator mounted (display:none) so switching back is
          instant and its sticky-footer measurements aren't torn down. The
          `u-tab-enter` entrance animation re-runs every time this wrapper flips
          from display:none back to block (CSS animations restart on that
          transition), so the Stats tab fades in on first load AND on every
          switch-back — matching the Ultimate and Scribing tabs. It uses a
          `backwards`-fill fade (no lingering transform) so the calculator's
          sticky results footer is unaffected. */}
      <Box className="u-tab-enter" sx={{ display: tab === 'stats' ? 'block' : 'none' }}>
        <Calculator />
      </Box>

      {tab === 'ultimate' && (
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Suspense fallback={<UltimateCalculatorSkeleton />}>
            <UltimateCalculator />
          </Suspense>
        </Container>
      )}

      {scribingEverActiveRef.current && (
        <Box sx={{ display: tab === 'scribing' ? 'block' : 'none' }}>
          <Suspense fallback={<ScribingSimulatorSkeleton />}>
            {/* ScribingSimulator provides its own <Container> and entrance fade.
                Kept mounted (display toggle) so its data isn't reloaded — and the
                skeleton isn't re-shown — on every switch back to this tab. */}
            <ScribingSimulator />
          </Suspense>
        </Box>
      )}
    </Box>
  );
};
