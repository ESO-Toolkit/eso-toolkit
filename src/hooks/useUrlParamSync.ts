import React from 'react';
import { useSelector } from 'react-redux';
import { push, replace } from 'redux-first-history';

import { RootState } from '../store/storeWithHistory';
import {
  selectSelectedTargetIds,
  selectSelectedPlayerId,
  selectSelectedTabId,
  selectShowExperimentalTabs,
} from '../store/ui/uiSelectors';
import {
  setSelectedTargetIds,
  setSelectedPlayerId,
  setSelectedTabId,
  setShowExperimentalTabs,
} from '../store/ui/uiSlice';
import { useAppDispatch } from '../store/useAppDispatch';

export interface UrlParams {
  selectedTargetIds: number[];
  selectedPlayerId: number | null;
  selectedTab: number | null;
  showExperimentalTabs: boolean;
}

/**
 * Parse URL search params and hash fragments to extract our tracked parameters
 */
function parseUrlParams(location: { search: string; hash: string }): Partial<UrlParams> {
  const params: Partial<UrlParams> = {};

  // Parse search params from URL search (browser routing)
  const searchParams = new URLSearchParams(location.search);

  // Parse selectedTargetIds (comma-separated string)
  const targetIds = searchParams.get('selectedTargetIds');
  if (targetIds !== null) {
    try {
      const parsed = targetIds
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id));
      if (parsed.length > 0) {
        params.selectedTargetIds = parsed;
      }
    } catch {
      // If parsing fails, ignore
    }
  }

  // Parse selectedPlayerId
  const playerId = searchParams.get('selectedPlayerId');
  if (playerId !== null) {
    const parsed = Number(playerId);
    if (!isNaN(parsed)) {
      params.selectedPlayerId = parsed;
    }
  }

  // Parse selectedTab
  const tab = searchParams.get('selectedTab');
  if (tab !== null) {
    const parsed = Number(tab);
    if (!isNaN(parsed)) {
      params.selectedTab = parsed;
    }
  }

  // Parse showExperimentalTabs
  const experimental = searchParams.get('showExperimentalTabs');
  if (experimental !== null) {
    params.showExperimentalTabs = experimental === 'true';
  }

  return params;
}

/**
 * Build URL search params string from current state
 */
function buildUrlParams(params: Partial<UrlParams>): string {
  const searchParams = new URLSearchParams();

  if (params.selectedTargetIds && params.selectedTargetIds.length > 0) {
    searchParams.set('selectedTargetIds', params.selectedTargetIds.join(','));
  }

  if (params.selectedPlayerId !== null && params.selectedPlayerId !== undefined) {
    searchParams.set('selectedPlayerId', params.selectedPlayerId.toString());
  }

  if (params.selectedTab !== null && params.selectedTab !== undefined) {
    searchParams.set('selectedTab', params.selectedTab.toString());
  }

  if (params.showExperimentalTabs !== undefined) {
    searchParams.set('showExperimentalTabs', params.showExperimentalTabs.toString());
  }

  return searchParams.toString();
}

/**
 * Update URL with current state while preserving other search params
 */
function updateUrl(
  currentLocation: { pathname: string; search: string; hash: string },
  newParams: Partial<UrlParams>,
): string {
  // Extract current search params from location.search (browser routing)
  const currentSearchParams = new URLSearchParams(currentLocation.search);

  // Update our tracked params
  if (newParams.selectedTargetIds !== undefined) {
    if (newParams.selectedTargetIds.length === 0) {
      currentSearchParams.delete('selectedTargetIds');
    } else {
      currentSearchParams.set('selectedTargetIds', newParams.selectedTargetIds.join(','));
    }
  }

  if (newParams.selectedPlayerId !== undefined) {
    if (newParams.selectedPlayerId === null) {
      currentSearchParams.delete('selectedPlayerId');
    } else {
      currentSearchParams.set('selectedPlayerId', newParams.selectedPlayerId.toString());
    }
  }

  if (newParams.selectedTab !== undefined) {
    if (newParams.selectedTab === null) {
      currentSearchParams.delete('selectedTab');
    } else {
      currentSearchParams.set('selectedTab', newParams.selectedTab.toString());
    }
  }

  if (newParams.showExperimentalTabs !== undefined) {
    currentSearchParams.set('showExperimentalTabs', newParams.showExperimentalTabs.toString());
  }

  // Build new URL with search params
  const searchString = currentSearchParams.toString();
  const newUrl = searchString
    ? `${currentLocation.pathname}?${searchString}`
    : currentLocation.pathname;

  return newUrl;
}

/**
 * Hook that syncs URL parameters with Redux state using redux-first-history
 *
 * Key performance optimizations:
 * - Only updates when values actually change (change detection)
 * - Uses React 18's automatic batching
 * - Debounced URL parsing to prevent excessive updates
 */
export function useUrlParamSync(): {
  selectedTargetIds: number[];
  selectedPlayerId: number | null;
  selectedTabId: number | null;
  showExperimentalTabs: boolean;
  updateSelectedTargetIds: (targetIds: number[], replaceHistory?: boolean) => void;
  updateSelectedPlayerId: (playerId: number | null, replaceHistory?: boolean) => void;
  updateSelectedTab: (tab: number | null, replaceHistory?: boolean) => void;
  updateShowExperimentalTabs: (show: boolean, replaceHistory?: boolean) => void;
  updateParams: (params: Partial<UrlParams>, replaceHistory?: boolean) => void;
  parseUrlParams: () => Partial<UrlParams>;
  buildUrlParams: (params: Partial<UrlParams>) => string;
} {
  const dispatch = useAppDispatch();
  const location = useSelector((state: RootState) => state.router.location);

  // Get current Redux state
  const selectedTargetIds = useSelector(selectSelectedTargetIds);
  const selectedPlayerId = useSelector(selectSelectedPlayerId);
  const selectedTabId = useSelector(selectSelectedTabId);
  const showExperimentalTabs = useSelector(selectShowExperimentalTabs);

  // Track if we've done the initial sync from URL to avoid race conditions
  const [hasInitialSync, setHasInitialSync] = React.useState(false);

  // Sync URL params to Redux state on location change
  // Use a delayed approach to avoid race conditions with redux-persist
  React.useEffect(() => {
    if (!location) return;

    // Small delay to ensure redux-persist has completed rehydration
    const timeoutId = setTimeout(
      () => {
        const urlParams = parseUrlParams(location);

        // Batch all updates together using React 18 automatic batching
        const updates: Array<() => void> = [];

        // Always apply URL params on initial load/location change
        // Don't compare to Redux state to avoid timing issues
        if (urlParams.selectedTargetIds !== undefined) {
          const value = urlParams.selectedTargetIds;
          updates.push(() => dispatch(setSelectedTargetIds(value)));
          setHasInitialSync(true);
        }

        if (urlParams.selectedPlayerId !== undefined) {
          const value = urlParams.selectedPlayerId;
          updates.push(() => dispatch(setSelectedPlayerId(value)));
          setHasInitialSync(true);
        }

        if (urlParams.selectedTab !== undefined) {
          const value = urlParams.selectedTab;
          updates.push(() => dispatch(setSelectedTabId(value)));
          setHasInitialSync(true);
        }

        if (urlParams.showExperimentalTabs !== undefined) {
          const value = urlParams.showExperimentalTabs;
          updates.push(() => dispatch(setShowExperimentalTabs(value)));
          setHasInitialSync(true);
        }

        // Execute all updates - React 18 will batch them automatically
        updates.forEach((update) => update());
      },
      hasInitialSync ? 0 : 100,
    ); // Small delay only on first sync

    return () => clearTimeout(timeoutId);
  }, [location, dispatch, hasInitialSync, setHasInitialSync]);

  // Update functions - optimized with change detection
  const updateSelectedTargetIds = React.useCallback(
    (targetIds: number[], replaceHistory = true) => {
      // Only update if value actually changed (deep comparison for array)
      const areEqual =
        targetIds.length === selectedTargetIds.length &&
        targetIds.every((id, index) => id === selectedTargetIds[index]);

      if (!areEqual && location) {
        dispatch(setSelectedTargetIds(targetIds));
        const newUrl = updateUrl(location, { selectedTargetIds: targetIds });
        dispatch(replaceHistory ? replace(newUrl) : push(newUrl));
      }
    },
    [dispatch, location, selectedTargetIds],
  );

  const updateSelectedPlayerId = React.useCallback(
    (playerId: number | null, replaceHistory = true) => {
      if (playerId !== selectedPlayerId && location) {
        dispatch(setSelectedPlayerId(playerId));
        const newUrl = updateUrl(location, { selectedPlayerId: playerId });
        dispatch(replaceHistory ? replace(newUrl) : push(newUrl));
      }
    },
    [dispatch, location, selectedPlayerId],
  );

  const updateSelectedTab = React.useCallback(
    (tab: number | null, replaceHistory = true) => {
      if (tab !== selectedTabId && location) {
        dispatch(setSelectedTabId(tab));
        const newUrl = updateUrl(location, { selectedTab: tab });
        dispatch(replaceHistory ? replace(newUrl) : push(newUrl));
      }
    },
    [dispatch, location, selectedTabId],
  );

  const updateShowExperimentalTabs = React.useCallback(
    (show: boolean, replaceHistory = true) => {
      if (show !== showExperimentalTabs && location) {
        dispatch(setShowExperimentalTabs(show));
        const newUrl = updateUrl(location, { showExperimentalTabs: show });
        dispatch(replaceHistory ? replace(newUrl) : push(newUrl));
      }
    },
    [dispatch, location, showExperimentalTabs],
  );

  // Bulk update function - most efficient for multiple changes
  const updateParams = React.useCallback(
    (params: Partial<UrlParams>, replaceHistory = true) => {
      let hasChanges = false;

      // Check what actually changed and batch Redux updates
      if (params.selectedTargetIds !== undefined) {
        const areEqual =
          params.selectedTargetIds.length === selectedTargetIds.length &&
          params.selectedTargetIds.every((id, index) => id === selectedTargetIds[index]);
        if (!areEqual) {
          dispatch(setSelectedTargetIds(params.selectedTargetIds));
          hasChanges = true;
        }
      }
      if (params.selectedPlayerId !== undefined && params.selectedPlayerId !== selectedPlayerId) {
        dispatch(setSelectedPlayerId(params.selectedPlayerId));
        hasChanges = true;
      }
      if (params.selectedTab !== undefined && params.selectedTab !== selectedTabId) {
        dispatch(setSelectedTabId(params.selectedTab));
        hasChanges = true;
      }
      if (
        params.showExperimentalTabs !== undefined &&
        params.showExperimentalTabs !== showExperimentalTabs
      ) {
        dispatch(setShowExperimentalTabs(params.showExperimentalTabs));
        hasChanges = true;
      }

      // Only update URL if there were actual changes
      if (hasChanges && location) {
        const newUrl = updateUrl(location, params);
        dispatch(replaceHistory ? replace(newUrl) : push(newUrl));
      }
    },
    [dispatch, location, selectedTargetIds, selectedPlayerId, selectedTabId, showExperimentalTabs],
  );

  // Helper functions
  const parseCurrentUrlParams = React.useCallback(() => {
    return location ? parseUrlParams(location) : {};
  }, [location]);
  const buildCurrentUrlParams = React.useCallback(
    (params: Partial<UrlParams>) => buildUrlParams(params),
    [],
  );

  return {
    // Current values (from Redux state)
    selectedTargetIds,
    selectedPlayerId,
    selectedTabId,
    showExperimentalTabs,

    // Update functions
    updateSelectedTargetIds,
    updateSelectedPlayerId,
    updateSelectedTab,
    updateShowExperimentalTabs,
    updateParams,

    // URL parsing helpers
    parseUrlParams: parseCurrentUrlParams,
    buildUrlParams: buildCurrentUrlParams,
  };
}

/**
 * Simplified hook for read-only access to URL-synced parameters
 * This is more performant for components that only read values
 */
export function useUrlParams(): UrlParams {
  const selectedTargetIds = useSelector(selectSelectedTargetIds);
  const selectedPlayerId = useSelector(selectSelectedPlayerId);
  const selectedTabId = useSelector(selectSelectedTabId);
  const showExperimentalTabs = useSelector(selectShowExperimentalTabs);

  return React.useMemo(
    () => ({
      selectedTargetIds,
      selectedPlayerId,
      selectedTab: selectedTabId,
      showExperimentalTabs,
    }),
    [selectedTargetIds, selectedPlayerId, selectedTabId, showExperimentalTabs],
  );
}
