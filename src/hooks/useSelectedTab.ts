import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { selectSelectedTabId } from '../store/ui/uiSelectors';
import { setSelectedTabId } from '../store/ui/uiSlice';
import { useAppDispatch } from '../store/useAppDispatch';

/**
 * Hook for managing the selected tab state.
 *
 * This hook manages tab selection with the following priority:
 * 1. URL query parameter (selectedTabId) - highest priority for deep linking
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
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTabIdFromState = useSelector(selectSelectedTabId);

  // Get selectedTabId from query param if present, otherwise use Redux state, then default
  const selectedTabId = React.useMemo(() => {
    const queryTabId = searchParams.get('selectedTabId');
    if (queryTabId !== null) {
      const parsedTabId = Number(queryTabId);
      if (!isNaN(parsedTabId)) {
        return parsedTabId;
      }
      // If query param is invalid, fall through to use state/default
    }
    return selectedTabIdFromState ?? defaultTabId;
  }, [searchParams, selectedTabIdFromState, defaultTabId]);

  // Sync Redux state with URL parameter on mount and when URL changes
  React.useEffect(() => {
    const queryTabId = searchParams.get('selectedTabId');
    if (queryTabId !== null) {
      const parsedTabId = Number(queryTabId);
      const tabId = !isNaN(parsedTabId) ? parsedTabId : null;
      if (tabId !== selectedTabIdFromState) {
        dispatch(setSelectedTabId(tabId));
      }
    }
  }, [searchParams, selectedTabIdFromState, dispatch]);

  const setSelectedTab = React.useCallback(
    (tabId: number | null) => {
      // Update Redux state
      dispatch(setSelectedTabId(tabId));

      // Update URL query parameter
      setSearchParams(
        (prevSearchParams) => {
          const newSearchParams = new URLSearchParams(prevSearchParams);
          if (tabId !== null) {
            newSearchParams.set('selectedTabId', tabId.toString());
          } else {
            newSearchParams.delete('selectedTabId');
          }
          return newSearchParams;
        },
        { replace: true }
      );
    },
    [dispatch, setSearchParams]
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
  const [searchParams] = useSearchParams();
  const selectedTabIdFromState = useSelector(selectSelectedTabId);

  return React.useMemo(() => {
    const queryTabId = searchParams.get('selectedTabId');
    if (queryTabId !== null) {
      const parsedTabId = Number(queryTabId);
      if (!isNaN(parsedTabId)) {
        return parsedTabId;
      }
      // If query param is invalid, fall through to use state/default
    }
    return selectedTabIdFromState ?? defaultTabId;
  }, [searchParams, selectedTabIdFromState, defaultTabId]);
}
