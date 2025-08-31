import React from 'react';
import { useSelector } from 'react-redux';

import { selectSelectedTabId } from '../store/ui/uiSelectors';

import { useUrlParamSync } from './useUrlParamSync';

/**
 * Hook for managing the selected tab state.
 *
 * This hook manages tab selection with the following priority:
 * 1. URL query parameter (selectedTab) - highest priority for deep linking
 * 2. Redux UI state (selectedTabId) - persisted state across navigation
 * 3. Default value provided to the hook
 *
 * @param defaultTabId - The default tab ID to use if no other source is available
 * @returns Object containing the selected tab ID and setter function
 */
export function useSelectedTab(defaultTabId: number | null = null): {
  selectedTabId: number | null;
  setSelectedTab: (tabId: number | null) => void;
} {
  const { selectedTabId: urlSelectedTabId, updateSelectedTab } = useUrlParamSync();
  const selectedTabIdFromState = useSelector(selectSelectedTabId);

  // Get selectedTabId from URL param if present, otherwise use Redux state, then default
  const selectedTabId = React.useMemo(() => {
    // URL params take priority, then Redux state, then default
    if (urlSelectedTabId !== null) {
      return urlSelectedTabId;
    }
    return selectedTabIdFromState ?? defaultTabId;
  }, [urlSelectedTabId, selectedTabIdFromState, defaultTabId]);

  const setSelectedTab = React.useCallback(
    (tabId: number | null) => {
      // Update both Redux state and URL parameter via the URL sync hook
      updateSelectedTab(tabId, true); // Use replace=true to avoid adding history entries
    },
    [updateSelectedTab]
  );

  return {
    selectedTabId,
    setSelectedTab,
  };
}

/**
 * Hook for getting only the selected tab ID (read-only).
 *
 * This is a lighter version of useSelectedTab for components that only need
 * to read the selected tab without the ability to change it.
 *
 * @param defaultTabId - The default tab ID to use if no other source is available
 * @returns The currently selected tab ID
 */
export function useSelectedTabId(defaultTabId: number | null = null): number | null {
  const { selectedTabId: urlSelectedTabId } = useUrlParamSync();
  const selectedTabIdFromState = useSelector(selectSelectedTabId);

  return React.useMemo(() => {
    // URL params take priority, then Redux state, then default
    if (urlSelectedTabId !== null) {
      return urlSelectedTabId;
    }
    return selectedTabIdFromState ?? defaultTabId;
  }, [urlSelectedTabId, selectedTabIdFromState, defaultTabId]);
}
