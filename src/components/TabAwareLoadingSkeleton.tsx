import { Box, CircularProgress } from '@mui/material';
import React from 'react';

import { getSkeletonForTab, TabId } from '../utils/getSkeletonForTab';

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
  const getSelectedTabFromURL = (): TabId => {
    if (typeof window === 'undefined') return TabId.INSIGHTS;

    // Parse the URL to get the tab from the path
    const pathname = window.location.pathname;
    const pathParts = pathname.split('/');

    // URL structure: /report/:reportId/fight/:fightId/:tabId
    // So tabId should be at index 5 if the structure is correct
    if (pathParts.length >= 6 && pathParts[1] === 'report' && pathParts[3] === 'fight') {
      const tabFromUrl = pathParts[5];

      // Check if it's a valid tab ID
      const allValidTabs = Object.values(TabId);
      if (allValidTabs.includes(tabFromUrl as TabId)) {
        return tabFromUrl as TabId;
      }
    }

    return TabId.INSIGHTS;
  };

  const selectedTabId = getSelectedTabFromURL();
  return getSkeletonForTab(selectedTabId, true); // Include header and tabs for initial load
};
