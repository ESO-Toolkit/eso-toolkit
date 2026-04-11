import { Box } from '@mui/material';
import React from 'react';

interface AnimatedTabContentProps {
  children: React.ReactNode;
  tabKey: string;
}

/**
 * Tab content wrapper with a lightweight CSS fade-in animation.
 *
 * Previously this used the View Transitions API (`document.startViewTransition`)
 * to cross-fade between tabs. That approach freezes the page because VT places
 * an opaque screenshot overlay while React synchronously renders heavy panel
 * trees (Players, Insights, etc.), blocking all interaction for 2-3+ seconds.
 *
 * The current approach uses `key` to remount on tab change, triggering a simple
 * CSS fade-in. React handles the heavy rendering normally — Suspense shows
 * loading skeletons while panels mount, and the browser stays responsive.
 */
export const AnimatedTabContent: React.FC<AnimatedTabContentProps> = ({ children, tabKey }) => {
  return (
    <Box
      key={tabKey}
      sx={{
        position: 'relative',
        minHeight: '600px',
        animation: 'tabFadeIn 150ms ease-out',
        '@keyframes tabFadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      {children}
    </Box>
  );
};
