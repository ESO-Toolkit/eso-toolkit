/**
 * Build Editor Page
 * Simplified wrapper — delegates to BuildEditorShell which provides
 * class theming, scoped background, and the bento grid layout.
 * AppLayout provides the xl Container and reduced padding for this route.
 *
 * Supports loading a build to edit from two sources:
 *  - `location.state.buildData` — the preferred in-app handoff. Same-app
 *    navigations (My Builds, Build View, Roster slot) pass the encoded build
 *    through router state so a build blob — which may be a *private* build —
 *    never lands in the address bar / browser history / Referer header.
 *  - `?b=<encoded>` URL param — the legacy / external path (e.g. a build opened
 *    in a fresh tab, or an older link). Still honored, then stripped on load.
 *
 * The non-sensitive save-target (`?id=`) and roster round-trip params
 * (`from`/`slot`/`rid`) always stay in the URL — they carry no build content.
 */

import { useSnackbar } from 'notistack';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { usePageTitle } from '@/hooks/useDocumentTitle';
import type { RootState } from '@/store/storeWithHistory';
import { decodeBuildFromURL } from '@/utils/buildEncoding';
import { BuildEditorShell } from '@features/build-editor/components/BuildEditorShell';
import { loadBuild } from '@features/build-editor/store/buildEditorSlice';

interface BuildEditorNavState {
  /** Encoded build blob handed off via router state (kept out of the URL). */
  buildData?: string;
}

const BuildEditorPageInner: React.FC = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isDirty = useSelector((s: RootState) => s.buildEditor.isDirty);
  const loadedRef = React.useRef(false);

  usePageTitle('/build-editor');

  // Load build from router state (preferred) or ?b= URL param (legacy) on mount.
  useEffect(() => {
    if (loadedRef.current) return;
    // `?b=` may be an empty string (`?b=`), which decodes to nothing — treat it
    // as absent so we fall through to the state handoff.
    const encoded = searchParams.get('b') || '';
    const stateBuild = (location.state as BuildEditorNavState | null)?.buildData ?? '';
    const source = encoded || stateBuild;
    if (!source) return;
    loadedRef.current = true;

    // Scrub the build payload from the URL/history IMMEDIATELY — before the async
    // decode — so a build blob (which may be a *private* build) never lingers in
    // the address bar or in window.history.state, regardless of whether decoding
    // succeeds (a failed/version-skewed payload must not survive in history). This
    // also stops a refresh or Back from reloading the original over the user's
    // in-progress edits (the editor's own state is persisted separately). The
    // non-sensitive save-target (?id=) and roster params (from/slot/rid) stay put.
    if (encoded) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('b');
      setSearchParams(newParams, { replace: true });
    } else {
      // Clear the router state (persisted in window.history across refreshes)
      // while keeping the current path + remaining query params.
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: null },
      );
    }

    void decodeBuildFromURL(source).then((decoded) => {
      if (decoded) {
        dispatch(loadBuild(decoded));
        return;
      }
      // Fail closed: the build never loaded. Drop the ?id= save target (and any
      // leftover ?b=) so a later Save can't overwrite that saved build with the
      // stale/default editor state that's still on screen. Roster round-trip
      // params are left as-is — they carry no overwrite risk.
      if (searchParams.get('id') || searchParams.get('b')) {
        const failParams = new URLSearchParams(searchParams);
        failParams.delete('b');
        failParams.delete('id');
        setSearchParams(failParams, { replace: true });
      }
      enqueueSnackbar('Could not load shared build — the link may be invalid.', {
        variant: 'warning',
      });
    });
  }, [searchParams, setSearchParams, location, navigate, dispatch, enqueueSnackbar]);

  // Warn before unloading if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return <BuildEditorShell />;
};

export const BuildEditorPage: React.FC = () => {
  return <BuildEditorPageInner />;
};
