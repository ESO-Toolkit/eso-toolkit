import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

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
 * Parse URLSearchParams to extract our tracked parameters
 */
function parseUrlSearchParams(searchParams: URLSearchParams): Partial<UrlParams> {
  const params: Partial<UrlParams> = {};

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
 * Build URL search params string from given params
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
 * Apply param changes to a URLSearchParams instance (mutates a copy)
 */
function applyParamsUpdate(prev: URLSearchParams, newParams: Partial<UrlParams>): URLSearchParams {
  const next = new URLSearchParams(prev);

  if (newParams.selectedTargetIds !== undefined) {
    if (newParams.selectedTargetIds.length === 0) {
      next.delete('selectedTargetIds');
    } else {
      next.set('selectedTargetIds', newParams.selectedTargetIds.join(','));
    }
  }
  if (newParams.selectedPlayerId !== undefined) {
    if (newParams.selectedPlayerId === null) {
      next.delete('selectedPlayerId');
    } else {
      next.set('selectedPlayerId', newParams.selectedPlayerId.toString());
    }
  }
  if (newParams.selectedTab !== undefined) {
    if (newParams.selectedTab === null) {
      next.delete('selectedTab');
    } else {
      next.set('selectedTab', newParams.selectedTab.toString());
    }
  }
  if (newParams.showExperimentalTabs !== undefined) {
    next.set('showExperimentalTabs', newParams.showExperimentalTabs.toString());
  }

  return next;
}

/**
 * Hook that syncs URL search parameters with Redux state using React Router v6.
 *
 * Key behaviours:
 * - URL is the source of truth on initial load / navigation
 * - Redux is updated from URL params via a debounced effect
 * - URL is updated via setSearchParams (no redux-first-history dependency)
 * - Uses a ref for initial-sync tracking to avoid setState re-render loops
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current Redux state
  const selectedTargetIds = useSelector(selectSelectedTargetIds);
  const selectedPlayerId = useSelector(selectSelectedPlayerId);
  const selectedTabId = useSelector(selectSelectedTabId);
  const showExperimentalTabs = useSelector(selectShowExperimentalTabs);

  // Use a ref to avoid re-render loops — setState inside a useEffect that lists the state
  // as a dependency would cause infinite re-renders with the old approach.
  const hasInitialSyncRef = React.useRef(false);

  // Sync URL params → Redux state whenever searchParams changes.
  // Small delay on first load only, to let redux-persist rehydration settle.
  React.useEffect(() => {
    const delay = hasInitialSyncRef.current ? 0 : 100;
    const timeoutId = setTimeout(() => {
      const urlParams = parseUrlSearchParams(searchParams);

      // Batch all updates together using React 18 automatic batching
      const updates: Array<() => void> = [];

      if (urlParams.selectedTargetIds !== undefined) {
        const value = urlParams.selectedTargetIds;
        updates.push(() => dispatch(setSelectedTargetIds(value)));
      }
      if (urlParams.selectedPlayerId !== undefined) {
        const value = urlParams.selectedPlayerId;
        updates.push(() => dispatch(setSelectedPlayerId(value)));
      }
      if (urlParams.selectedTab !== undefined) {
        const value = urlParams.selectedTab;
        updates.push(() => dispatch(setSelectedTabId(value)));
      }
      if (urlParams.showExperimentalTabs !== undefined) {
        const value = urlParams.showExperimentalTabs;
        updates.push(() => dispatch(setShowExperimentalTabs(value)));
      }

      updates.forEach((update) => update());
      hasInitialSyncRef.current = true;
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [searchParams, dispatch]);

  // Update functions — dispatch Redux action + update URL search params atomically
  const updateSelectedTargetIds = React.useCallback(
    (targetIds: number[], replaceHistory = true) => {
      const areEqual =
        targetIds.length === selectedTargetIds.length &&
        targetIds.every((id, index) => id === selectedTargetIds[index]);

      if (!areEqual) {
        dispatch(setSelectedTargetIds(targetIds));
        setSearchParams((prev) => applyParamsUpdate(prev, { selectedTargetIds: targetIds }), {
          replace: replaceHistory,
        });
      }
    },
    [dispatch, selectedTargetIds, setSearchParams],
  );

  const updateSelectedPlayerId = React.useCallback(
    (playerId: number | null, replaceHistory = true) => {
      if (playerId !== selectedPlayerId) {
        dispatch(setSelectedPlayerId(playerId));
        setSearchParams((prev) => applyParamsUpdate(prev, { selectedPlayerId: playerId }), {
          replace: replaceHistory,
        });
      }
    },
    [dispatch, selectedPlayerId, setSearchParams],
  );

  const updateSelectedTab = React.useCallback(
    (tab: number | null, replaceHistory = true) => {
      if (tab !== selectedTabId) {
        dispatch(setSelectedTabId(tab));
        setSearchParams((prev) => applyParamsUpdate(prev, { selectedTab: tab }), {
          replace: replaceHistory,
        });
      }
    },
    [dispatch, selectedTabId, setSearchParams],
  );

  const updateShowExperimentalTabs = React.useCallback(
    (show: boolean, replaceHistory = true) => {
      if (show !== showExperimentalTabs) {
        dispatch(setShowExperimentalTabs(show));
        setSearchParams((prev) => applyParamsUpdate(prev, { showExperimentalTabs: show }), {
          replace: replaceHistory,
        });
      }
    },
    [dispatch, showExperimentalTabs, setSearchParams],
  );

  // Bulk update — most efficient when changing multiple params at once
  const updateParams = React.useCallback(
    (params: Partial<UrlParams>, replaceHistory = true) => {
      let hasChanges = false;

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

      if (hasChanges) {
        setSearchParams((prev) => applyParamsUpdate(prev, params), { replace: replaceHistory });
      }
    },
    [
      dispatch,
      selectedTargetIds,
      selectedPlayerId,
      selectedTabId,
      showExperimentalTabs,
      setSearchParams,
    ],
  );

  const parseCurrentUrlParams = React.useCallback(
    () => parseUrlSearchParams(searchParams),
    [searchParams],
  );
  const buildCurrentUrlParams = React.useCallback(
    (params: Partial<UrlParams>) => buildUrlParams(params),
    [],
  );

  return {
    selectedTargetIds,
    selectedPlayerId,
    selectedTabId,
    showExperimentalTabs,
    updateSelectedTargetIds,
    updateSelectedPlayerId,
    updateSelectedTab,
    updateShowExperimentalTabs,
    updateParams,
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
