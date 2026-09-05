import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import { upsertSavedBuild } from '@/store/saved_builds';
import {
  acquireBuildStorageSessionGeneration,
  assertBuildStorageSessionCurrent,
  LEGACY_BUILD_EDITOR_STORAGE_KEY,
  putSavedBuildAndEditorState,
} from '@/store/saved_builds/savedBuildStorage';
import type { RootState } from '@/store/storeWithHistory';

import { markSaved } from '../store/buildEditorSlice';

// The header and layout each consume this hook. A module-level lock makes
// simultaneous button/shortcut saves for the same draft converge on one write.
const savesInFlight = new Set<string>();

/**
 * The single save path for both the visible Save button and Ctrl/Cmd+S.
 * Returns true only after the durable browser draft write and saved-build
 * upsert both complete.
 */
export const useSaveBuild = (): (() => Promise<boolean>) => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const locationKeyRef = useRef(location.key);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    locationKeyRef.current = location.key;
  }, [location.key]);

  return useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return false;

    const state = store.getState();
    const { build, activeSetupIndex } = state.buildEditor;
    if (!build.name.trim()) {
      enqueueSnackbar('Please enter a build name before saving.', { variant: 'warning' });
      return false;
    }
    if (savesInFlight.has(build.id)) return false;

    const params = new URLSearchParams(location.search);
    const requestedId = params.get('id');
    const existingId =
      requestedId && state.savedBuilds.builds.some((saved) => saved.id === requestedId)
        ? requestedId
        : undefined;
    const action = upsertSavedBuild({ id: existingId, build });
    const initiatingLocationKey = location.key;
    savesInFlight.add(build.id);
    savingRef.current = true;
    try {
      const sessionGeneration = await acquireBuildStorageSessionGeneration();
      await putSavedBuildAndEditorState(action.payload, activeSetupIndex, sessionGeneration);
      // Logout rotates the generation before asynchronous cleanup. Do not let
      // a save that started in the previous session repopulate live Redux.
      assertBuildStorageSessionCurrent(sessionGeneration);
      dispatch(action);

      // The durable commit remains valid after navigation or unmount, but UI
      // effects belong only to the history entry that initiated this save.
      const canUpdateInitiatingEditor =
        mountedRef.current && locationKeyRef.current === initiatingLocationKey;
      const hasNewerChanges =
        canUpdateInitiatingEditor && store.getState().buildEditor.build !== build;
      if (canUpdateInitiatingEditor && !hasNewerChanges) dispatch(markSaved());

      try {
        localStorage.removeItem(LEGACY_BUILD_EDITOR_STORAGE_KEY);
      } catch {
        // Cleanup is best-effort; the authoritative save already committed.
      }

      if (canUpdateInitiatingEditor && requestedId !== action.payload.id) {
        params.set('id', action.payload.id);
        params.delete('b');
        navigate(
          { pathname: location.pathname, search: params.toString() },
          {
            replace: true,
            // Adding the first durable id changes the route source. Tell the
            // editor this exact id came from its own completed save so it does
            // not rehydrate the snapshot and reset the user's active context.
            state: { savedByEditor: action.payload.id },
          },
        );
      }

      if (canUpdateInitiatingEditor) {
        enqueueSnackbar(
          hasNewerChanges
            ? 'Build saved. Your newer edits are still unsaved.'
            : existingId
              ? 'Build updated.'
              : 'Build saved.',
          { variant: 'success' },
        );
      }
      return true;
    } catch {
      enqueueSnackbar('Build could not be saved. Export a backup and check browser storage.', {
        variant: 'error',
      });
      return false;
    } finally {
      savesInFlight.delete(build.id);
      savingRef.current = false;
    }
  }, [
    dispatch,
    enqueueSnackbar,
    location.key,
    location.pathname,
    location.search,
    navigate,
    store,
  ]);
};
