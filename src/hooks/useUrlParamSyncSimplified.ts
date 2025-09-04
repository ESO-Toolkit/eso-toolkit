import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { push, replace } from 'redux-first-history';

import {
  selectSelectedTargetId,
  selectSelectedPlayerId,
  selectSelectedTabId,
  selectShowExperimentalTabs,
} from '../store/ui/uiSelectors';
import {
  setSelectedTargetId,
  setSelectedPlayerId,
  setSelectedTabId,
  setShowExperimentalTabs,
} from '../store/ui/uiSlice';
import { useAppDispatch } from '../store/useAppDispatch';

export interface UrlParams {
  selectedTargetId: number | null;
  selectedPlayerId: number | null;
  selectedTab: number | null;
  showExperimentalTabs: boolean;
}

/**
 * Parse URL search params and hash fragments to extract our tracked parameters
 */
function parseUrlParams(location: { search: string; hash: string }): Partial<UrlParams> {
  const params: Partial<UrlParams> = {};

  // Parse search params from hash (since we're using hash routing)
  const hash = location.hash;
  let searchString = '';

  if (hash.includes('?')) {
    searchString = hash.split('?')[1];
  }

  const searchParams = new URLSearchParams(searchString);

  // Parse selectedTargetId
  const targetId = searchParams.get('selectedTargetId');
  if (targetId !== null) {
    const parsed = Number(targetId);
    if (!isNaN(parsed)) {
      params.selectedTargetId = parsed;
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

  if (params.selectedTargetId !== null && params.selectedTargetId !== undefined) {
    searchParams.set('selectedTargetId', params.selectedTargetId.toString());
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
  replaceHistory = true,
): string {
  // Extract current search params
  const hash = currentLocation.hash;
  const pathOnly = hash.includes('?') ? hash.split('?')[0] : hash;
  const currentSearchString = hash.includes('?') ? hash.split('?')[1] : '';
  const currentSearchParams = new URLSearchParams(currentSearchString);

  // Update our tracked params
  if (newParams.selectedTargetId !== undefined) {
    if (newParams.selectedTargetId === null) {
      currentSearchParams.delete('selectedTargetId');
    } else {
      currentSearchParams.set('selectedTargetId', newParams.selectedTargetId.toString());
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

  // Build new URL
  const searchString = currentSearchParams.toString();
  const newHash = searchString ? `${pathOnly}?${searchString}` : pathOnly;

  return newHash;
}

/**
 * Hook that syncs URL parameters with Redux state using redux-first-history
 *
 * This hook:
 * 1. Reads URL parameters on mount and location changes (with debouncing)
 * 2. Updates Redux state when URL parameters change (only if different)
 * 3. Provides functions to update both Redux state and URL together
 * 4. Works with hash routing and correctly parses search params from hash
 *
 * Performance optimizations:
 * - Debounced URL parsing to prevent excessive updates
 * - Change detection to avoid unnecessary Redux dispatches
 * - Batched updates using React.startTransition
 * - Memoized callbacks to prevent consumer re-renders
 */
export function useUrlParamSync(): {
  selectedTargetId: number | null;
  selectedPlayerId: number | null;
  selectedTabId: number | null;
  showExperimentalTabs: boolean;
  updateSelectedTargetId: (targetId: number | null, replaceHistory?: boolean) => void;
  updateSelectedPlayerId: (playerId: number | null, replaceHistory?: boolean) => void;
  updateSelectedTab: (tab: number | null, replaceHistory?: boolean) => void;
  updateShowExperimentalTabs: (show: boolean, replaceHistory?: boolean) => void;
  updateParams: (params: Partial<UrlParams>, replaceHistory?: boolean) => void;
  parseUrlParams: () => Partial<UrlParams>;
  buildUrlParams: (params: Partial<UrlParams>) => string;
} {
  const dispatch = useAppDispatch();
  const location = useLocation();

  // Get current Redux state
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const selectedPlayerId = useSelector(selectSelectedPlayerId);
  const selectedTabId = useSelector(selectSelectedTabId);
  const showExperimentalTabs = useSelector(selectShowExperimentalTabs);

  // Debounce URL parameter sync to reduce lag
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // Sync URL params to Redux state (debounced to improve performance)
  React.useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const urlParams = parseUrlParams(location);
      const updates: Array<() => void> = [];

      // Only dispatch if values actually changed
      if (
        urlParams.selectedTargetId !== undefined &&
        urlParams.selectedTargetId !== selectedTargetId
      ) {
        const targetId = urlParams.selectedTargetId;
        updates.push(() => dispatch(setSelectedTargetId(targetId)));
      }

      if (
        urlParams.selectedPlayerId !== undefined &&
        urlParams.selectedPlayerId !== selectedPlayerId
      ) {
        const playerId = urlParams.selectedPlayerId;
        updates.push(() => dispatch(setSelectedPlayerId(playerId)));
      }

      if (urlParams.selectedTab !== undefined && urlParams.selectedTab !== selectedTabId) {
        const tabId = urlParams.selectedTab;
        updates.push(() => dispatch(setSelectedTabId(tabId)));
      }

      if (
        urlParams.showExperimentalTabs !== undefined &&
        urlParams.showExperimentalTabs !== showExperimentalTabs
      ) {
        const showExperimental = urlParams.showExperimentalTabs;
        updates.push(() => dispatch(setShowExperimentalTabs(showExperimental)));
      }

      // Batch all updates to reduce re-renders
      if (updates.length > 0) {
        React.startTransition(() => {
          updates.forEach((update) => update());
        });
      }
    }, 50); // 50ms debounce - balance between responsiveness and performance

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location, dispatch, selectedTargetId, selectedPlayerId, selectedTabId, showExperimentalTabs]);

  // Update functions - memoized to prevent unnecessary re-renders
  const updateSelectedTargetId = React.useCallback(
    (targetId: number | null, replaceHistory = true) => {
      if (targetId !== selectedTargetId) {
        dispatch(setSelectedTargetId(targetId));
        const newUrl = updateUrl(location, { selectedTargetId: targetId }, replaceHistory);
        dispatch(replaceHistory ? replace(newUrl) : push(newUrl));
      }
    },
    [dispatch, location, selectedTargetId],
  );

  const updateSelectedPlayerId = React.useCallback(
    (playerId: number | null, replaceHistory = true) => {
      if (playerId !== selectedPlayerId) {
        dispatch(setSelectedPlayerId(playerId));
        const newUrl = updateUrl(location, { selectedPlayerId: playerId }, replaceHistory);
        dispatch(replaceHistory ? replace(newUrl) : push(newUrl));
      }
    },
    [dispatch, location, selectedPlayerId],
  );

  const updateSelectedTab = React.useCallback(
    (tab: number | null, replaceHistory = true) => {
      if (tab !== selectedTabId) {
        dispatch(setSelectedTabId(tab));
        const newUrl = updateUrl(location, { selectedTab: tab }, replaceHistory);
        dispatch(replaceHistory ? replace(newUrl) : push(newUrl));
      }
    },
    [dispatch, location, selectedTabId],
  );

  const updateShowExperimentalTabs = React.useCallback(
    (show: boolean, replaceHistory = true) => {
      if (show !== showExperimentalTabs) {
        dispatch(setShowExperimentalTabs(show));
        const newUrl = updateUrl(location, { showExperimentalTabs: show }, replaceHistory);
        dispatch(replaceHistory ? replace(newUrl) : push(newUrl));
      }
    },
    [dispatch, location, showExperimentalTabs],
  );

  // Bulk update function - more efficient for multiple changes
  const updateParams = React.useCallback(
    (params: Partial<UrlParams>, replaceHistory = true) => {
      const updates: Array<() => void> = [];
      let hasChanges = false;

      // Collect only the changes that are actually different
      if (params.selectedTargetId !== undefined && params.selectedTargetId !== selectedTargetId) {
        const targetId = params.selectedTargetId;
        updates.push(() => dispatch(setSelectedTargetId(targetId)));
        hasChanges = true;
      }
      if (params.selectedPlayerId !== undefined && params.selectedPlayerId !== selectedPlayerId) {
        const playerId = params.selectedPlayerId;
        updates.push(() => dispatch(setSelectedPlayerId(playerId)));
        hasChanges = true;
      }
      if (params.selectedTab !== undefined && params.selectedTab !== selectedTabId) {
        const tabId = params.selectedTab;
        updates.push(() => dispatch(setSelectedTabId(tabId)));
        hasChanges = true;
      }
      if (
        params.showExperimentalTabs !== undefined &&
        params.showExperimentalTabs !== showExperimentalTabs
      ) {
        const showExperimental = params.showExperimentalTabs;
        updates.push(() => dispatch(setShowExperimentalTabs(showExperimental)));
        hasChanges = true;
      }

      // Only update if there are actual changes
      if (hasChanges) {
        // Batch Redux updates
        updates.forEach((update) => update());

        // Update URL once with all changes
        const newUrl = updateUrl(location, params, replaceHistory);
        dispatch(replaceHistory ? replace(newUrl) : push(newUrl));
      }
    },
    [dispatch, location, selectedTargetId, selectedPlayerId, selectedTabId, showExperimentalTabs],
  );

  // Helper functions - memoized for performance
  const parseCurrentUrlParams = React.useCallback(() => parseUrlParams(location), [location]);
  const buildCurrentUrlParams = React.useCallback(
    (params: Partial<UrlParams>) => buildUrlParams(params),
    [],
  );

  return {
    // Current values (from Redux state)
    selectedTargetId,
    selectedPlayerId,
    selectedTabId,
    showExperimentalTabs,

    // Update functions
    updateSelectedTargetId,
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
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const selectedPlayerId = useSelector(selectSelectedPlayerId);
  const selectedTabId = useSelector(selectSelectedTabId);
  const showExperimentalTabs = useSelector(selectShowExperimentalTabs);

  return React.useMemo(
    () => ({
      selectedTargetId,
      selectedPlayerId,
      selectedTab: selectedTabId,
      showExperimentalTabs,
    }),
    [selectedTargetId, selectedPlayerId, selectedTabId, showExperimentalTabs],
  );
}
