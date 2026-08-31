import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { resetBuild } from '@/features/build-editor/store/buildEditorSlice';

import { clearSavedBuilds } from './savedBuildsSlice';
import {
  adoptBuildStorageSessionGeneration,
  BUILD_STORAGE_SESSION_GENERATION_KEY,
  captureBuildStorageSessionGeneration,
} from './savedBuildStorage';

/**
 * Keep account-bound build state fail-closed when another same-origin tab logs
 * out. The durable layer rejects stale writes independently; this listener
 * removes already-rendered data from the current document immediately.
 */
export const BuildStorageSessionSync: React.FC = () => {
  const dispatch = useDispatch();
  const documentGeneration = useRef(captureBuildStorageSessionGeneration());

  useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (
        event.key !== BUILD_STORAGE_SESSION_GENERATION_KEY ||
        !event.newValue ||
        event.newValue === documentGeneration.current
      ) {
        return;
      }

      // Clear synchronously before adopting the new generation. An old async
      // operation cannot pass its final fence between these two statements.
      dispatch(clearSavedBuilds());
      dispatch(resetBuild());
      adoptBuildStorageSessionGeneration(event.newValue);
      documentGeneration.current = event.newValue;
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [dispatch]);

  return null;
};
