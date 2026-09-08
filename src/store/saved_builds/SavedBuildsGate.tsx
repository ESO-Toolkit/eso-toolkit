import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { loadBuild, setActiveSetupIndex } from '@/features/build-editor/store/buildEditorSlice';
import { migrateLegacyStoredBuild } from '@/features/build-editor/utils/buildDocument';
import type { RootState } from '@/store/storeWithHistory';

import { clearSavedBuilds, hydrateSavedBuilds, type SavedBuild } from './savedBuildsSlice';
import {
  acquireBuildStorageSessionGeneration,
  clearBuildStorage,
  hasPendingBuildStorageCleanup,
  isBuildStorageSessionCurrent,
  loadStoredEditorState,
  migrateAndLoadSavedBuildRecords,
  type StoredEditorState,
} from './savedBuildStorage';

interface SavedBuildsGateProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

const normalizeSavedBuild = (value: unknown): SavedBuild | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const candidate = value as Partial<SavedBuild>;
  const build = migrateLegacyStoredBuild(candidate.build);
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.savedAt !== 'string' ||
    Number.isNaN(Date.parse(candidate.savedAt)) ||
    !build
  ) {
    return undefined;
  }
  return { id: candidate.id, savedAt: candidate.savedAt, build };
};

const isStoredEditorState = (value: unknown): value is StoredEditorState => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<StoredEditorState>;
  return (
    candidate.key === 'current' &&
    typeof candidate.savedBuildId === 'string' &&
    typeof candidate.activeSetupIndex === 'number' &&
    Number.isInteger(candidate.activeSetupIndex) &&
    candidate.activeSetupIndex >= 0
  );
};

/**
 * Hydrate large saved builds from IndexedDB after redux-persist has restored
 * the legacy state. Legacy localStorage records are migrated before rendering.
 */
export const SavedBuildsGate: React.FC<SavedBuildsGateProps> = ({ children, fallback }) => {
  const dispatch = useDispatch();
  const savedBuildsState = useSelector((state: RootState) => state.savedBuilds);
  const [ready, setReady] = useState(savedBuildsState.hydrated);

  useEffect(() => {
    // The gate can unmount when users leave all build routes. Never replay the
    // resume pointer when they return: doing so would overwrite a dirty draft.
    if (savedBuildsState.hydrated) {
      setReady(true);
      return;
    }

    let active = true;

    const hydrate = async (): Promise<void> => {
      if (hasPendingBuildStorageCleanup()) {
        try {
          await clearBuildStorage();
        } catch {
          // Fail closed: a previous account's data stays hidden until durable
          // cleanup can be retried on a later gate mount or page load.
          if (active) {
            dispatch(clearSavedBuilds());
            setReady(true);
          }
          return;
        }
      }

      const legacyBuilds = savedBuildsState.builds
        .map(normalizeSavedBuild)
        .filter((saved): saved is SavedBuild => saved !== undefined);
      let hydratedBuilds = legacyBuilds;
      let sessionGeneration: string | undefined;

      try {
        sessionGeneration = await acquireBuildStorageSessionGeneration();
        // Migration and its durable marker are one IndexedDB transaction. A
        // second tab that saves or deletes first marks the durable library as
        // authoritative, so this tab cannot replay its stale legacy snapshot.
        hydratedBuilds = (await migrateAndLoadSavedBuildRecords(legacyBuilds, sessionGeneration))
          .map(normalizeSavedBuild)
          .filter((saved): saved is SavedBuild => saved !== undefined);
        hydratedBuilds.sort(
          (first, second) => Date.parse(second.savedAt) - Date.parse(first.savedAt),
        );

        const storedEditorState = await loadStoredEditorState(sessionGeneration);
        if (!active) return;
        if (!isBuildStorageSessionCurrent(sessionGeneration)) {
          dispatch(clearSavedBuilds());
          return;
        }

        dispatch(hydrateSavedBuilds(hydratedBuilds));
        if (isStoredEditorState(storedEditorState)) {
          const saved = hydratedBuilds.find(
            (candidate) => candidate.id === storedEditorState.savedBuildId,
          );
          if (saved) {
            dispatch(loadBuild(saved.build));
            dispatch(
              setActiveSetupIndex(
                Math.min(storedEditorState.activeSetupIndex, saved.build.setups.length - 1),
              ),
            );
          }
        }
      } catch {
        // IndexedDB can be disabled in hardened/private browser contexts. Keep
        // valid legacy data available in memory; explicit saves report failure.
        // A session rotation is different: fail closed instead of showing the
        // account that just signed out.
        if (active) {
          dispatch(
            sessionGeneration === undefined || isBuildStorageSessionCurrent(sessionGeneration)
              ? hydrateSavedBuilds(hydratedBuilds)
              : clearSavedBuilds(),
          );
        }
      } finally {
        if (active) setReady(true);
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
    // The persisted snapshot and hydration status are captured exactly once
    // for this gate mount. hydrateSavedBuilds prevents later mounts replaying
    // the resume pointer over an in-memory draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  return ready ? <>{children}</> : <>{fallback}</>;
};
