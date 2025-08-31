import { useSelector } from 'react-redux';

import { RootState } from '../store/storeWithHistory';

interface PersistedState {
  _persist?: {
    rehydrated: boolean;
    version: number;
  };
}

/**
 * Hook to detect when redux-persist has finished rehydrating the store
 * This is useful for avoiding race conditions between URL parameter sync
 * and persisted state restoration
 */
export function usePersistRehydrated(): boolean {
  // Check if the persisted state has been rehydrated
  // The _persist key is added by redux-persist
  const persistRehydrated = useSelector((state: RootState) => {
    // Check if the ui slice (which is persisted) has the _persist key
    // and if rehydrated is true
    const uiState = state.ui as PersistedState;
    return uiState?._persist?.rehydrated === true;
  });

  return persistRehydrated;
}
