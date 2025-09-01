import { Box, CircularProgress } from '@mui/material';
import React from 'react';

import { getSkeletonForTab } from '../utils/getSkeletonForTab';

export const TabAwareLoadingSkeleton: React.FC = () => {
  // Check if we're on a fight details route
  const isFightRoute = (): boolean => {
    if (typeof window === 'undefined') return false;

    const path = window.location.pathname;
    return path.includes('/fight/') || path.includes('/live');
  };

  // If not on a fight route, show generic loading
  if (!isFightRoute()) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Read from browser URL directly since useSearchParams isn't available during Suspense
  const getSelectedTabFromURL = (): number => {
    if (typeof window === 'undefined') return 0;

    const urlParams = new URLSearchParams(window.location.search);
    return Number(urlParams.get('selectedTabId')) || 0;
  };

  const selectedTabId = getSelectedTabFromURL();
  return getSkeletonForTab(selectedTabId, true); // Include header and tabs for initial load
};
