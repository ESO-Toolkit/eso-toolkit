/**
 * Build Editor Page
 *
 * In-app edit navigation carries a complete Build through router state. Public
 * links still use the compact `?b=` transport and are scrubbed immediately.
 * A saved-build `?id=` is also sufficient to restore an edit after refresh.
 */

import { Box, CircularProgress, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router-dom';

import { BuildEditorShell } from '@/features/build-editor/components/BuildEditorShell';
import { selectIsDirty } from '@/features/build-editor/store/buildEditorSelectors';
import {
  loadBuild,
  loadDraftBuild,
  resetBuild,
} from '@/features/build-editor/store/buildEditorSlice';
import type { Build } from '@/features/build-editor/types/build.types';
import { isBuild } from '@/features/build-editor/utils/buildDocument';
import { usePageTitle } from '@/hooks/useDocumentTitle';
import type { RootState } from '@/store/storeWithHistory';
import { decodeBuildFromURL } from '@/utils/buildEncoding';

interface BuildEditorNavState {
  /** Complete in-app edit document. Never encoded through the public-link codec. */
  build?: Build;
  /** Legacy compact router-state handoff retained for old navigation entries. */
  buildData?: string;
  /** Explicitly discard the crash-recovery draft and start from defaults. */
  newBuild?: boolean;
  /** First-save marker used to avoid reloading the snapshot the editor just saved. */
  savedByEditor?: string;
}

const BuildEditorPageInner: React.FC = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const loadedSourceRef = React.useRef<string | undefined>(undefined);
  const scrubbedSourceRef = React.useRef<string | undefined>(undefined);
  const hydrationGenerationRef = React.useRef(0);
  const isMountedRef = React.useRef(false);
  const routeState = location.state as BuildEditorNavState | null;
  const queryEncoded = searchParams.get('b') || '';
  const stateEncoded = routeState?.buildData || '';
  const encodedBuild = queryEncoded || stateEncoded;
  const savedBuildId = searchParams.get('id');
  const savedBuild = useSelector((state: RootState) =>
    savedBuildId
      ? state.savedBuilds.builds.find((candidate) => candidate.id === savedBuildId)?.build
      : undefined,
  );
  const isDirty = useSelector(selectIsDirty);
  const [isHydrating, setIsHydrating] = React.useState(
    Boolean(encodedBuild || routeState?.build || savedBuildId || routeState?.newBuild),
  );

  usePageTitle('/build-editor');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const directBuild = routeState?.build;
    const sourceKey = queryEncoded
      ? `query:${location.key}:${queryEncoded}`
      : savedBuildId
        ? `saved:${savedBuildId}`
        : directBuild !== undefined
          ? `direct:${location.key}`
          : stateEncoded
            ? `state:${location.key}:${stateEncoded}`
            : routeState?.newBuild
              ? `new:${location.key}`
              : 'resume';

    // Replacing the current history entry after scrubbing changes the route
    // source. Suppress only that REPLACE follow-up: a PUSH/POP to the same bare
    // route is a genuine navigation and must invalidate pending hydration.
    if (scrubbedSourceRef.current === sourceKey) {
      scrubbedSourceRef.current = undefined;
      if (navigationType === 'REPLACE') return;
    }
    if (loadedSourceRef.current === sourceKey) return;
    loadedSourceRef.current = sourceKey;
    const generation = ++hydrationGenerationRef.current;
    const isCurrent = (): boolean =>
      isMountedRef.current && hydrationGenerationRef.current === generation;

    const scrubNavigationPayload = (removeSaveTarget = false): void => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('b');
      if (removeSaveTarget) nextParams.delete('id');
      const remainingSaveTarget = nextParams.get('id');
      scrubbedSourceRef.current = remainingSaveTarget ? `saved:${remainingSaveTarget}` : 'resume';
      const nextSearch = nextParams.toString();
      navigate(
        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
        { replace: true, state: null },
      );
    };
    const failClosed = (navigationAlreadyScrubbed = false): void => {
      if (!isCurrent()) return;
      if (!navigationAlreadyScrubbed) scrubNavigationPayload(true);
      enqueueSnackbar('Could not load that build. The document may be invalid or out of date.', {
        variant: 'warning',
      });
    };

    // A public ?b= document is authoritative over stale history state. It is a
    // new, unsaved draft and must never inherit an unrelated ?id= overwrite target.
    if (queryEncoded) {
      setIsHydrating(true);
      // Remove the private payload from the address bar and history entry
      // before any asynchronous decoding work begins.
      scrubNavigationPayload(true);
      const failQueryDecode = (): void => failClosed(true);
      void decodeBuildFromURL(queryEncoded)
        .then((decoded) => {
          if (!isCurrent()) return;
          if (decoded && isBuild(decoded)) {
            dispatch(loadDraftBuild(decoded));
          } else {
            failQueryDecode();
          }
        })
        .catch(failQueryDecode)
        .finally(() => {
          if (isCurrent()) setIsHydrating(false);
        });
      return;
    }

    // A durable saved-build id is authoritative over router state. This avoids
    // an old Back/Forward history entry overwriting the current saved document.
    if (savedBuildId) {
      setIsHydrating(true);
      const isCompletedFirstSave = routeState?.savedByEditor === savedBuildId;
      if (routeState) scrubNavigationPayload();
      if (isCompletedFirstSave) {
        // The current editor snapshot is already the exact value committed by
        // useSaveBuild. Preserve active setup, section, and any newer edits.
      } else if (savedBuild && isBuild(savedBuild)) {
        dispatch(loadBuild(savedBuild));
      } else {
        failClosed();
      }
      setIsHydrating(false);
      return;
    }

    if (directBuild !== undefined) {
      setIsHydrating(true);
      scrubNavigationPayload();
      if (isBuild(directBuild)) {
        dispatch(loadDraftBuild(directBuild));
      } else {
        failClosed(true);
      }
      setIsHydrating(false);
      return;
    }

    if (stateEncoded) {
      setIsHydrating(true);
      // Router state is private history data too; clear it before decoding.
      scrubNavigationPayload();
      const failStateDecode = (): void => failClosed(true);
      void decodeBuildFromURL(stateEncoded)
        .then((decoded) => {
          if (!isCurrent()) return;
          if (decoded && isBuild(decoded)) {
            dispatch(loadDraftBuild(decoded));
          } else {
            failStateDecode();
          }
        })
        .catch(failStateDecode)
        .finally(() => {
          if (isCurrent()) setIsHydrating(false);
        });
      return;
    }

    if (routeState?.newBuild) {
      setIsHydrating(true);
      dispatch(resetBuild());
      scrubNavigationPayload(true);
      setIsHydrating(false);
      return;
    }

    // A bare route resumes the in-memory/IndexedDB crash-recovery document.
    setIsHydrating(false);
  }, [
    dispatch,
    enqueueSnackbar,
    location.key,
    location.pathname,
    navigate,
    navigationType,
    queryEncoded,
    routeState,
    routeState?.build,
    routeState?.buildData,
    routeState?.newBuild,
    routeState?.savedByEditor,
    savedBuild,
    savedBuildId,
    searchParams,
    stateEncoded,
  ]);

  if (isHydrating) {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{ minHeight: 480, display: 'grid', placeItems: 'center' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={22} />
          <Typography color="text.secondary">Opening build…</Typography>
        </Box>
      </Box>
    );
  }

  return <BuildEditorShell />;
};

export const BuildEditorPage: React.FC = () => <BuildEditorPageInner />;
