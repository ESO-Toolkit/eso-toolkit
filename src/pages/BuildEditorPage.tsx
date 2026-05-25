/**
 * Build Editor Page
 * Simplified wrapper — delegates to BuildEditorShell which provides
 * class theming, scoped background, and the bento grid layout.
 * AppLayout provides the xl Container and reduced padding for this route.
 *
 * Supports loading a shared build via `?b=<encoded>` URL parameter.
 */

import { useSnackbar } from 'notistack';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import type { RootState } from '@/store/storeWithHistory';
import { decodeBuildFromURL } from '@/utils/buildEncoding';
import { BuildEditorShell } from '@features/build-editor/components/BuildEditorShell';
import { loadBuild } from '@features/build-editor/store/buildEditorSlice';

const BuildEditorPageInner: React.FC = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDirty = useSelector((s: RootState) => s.buildEditor.isDirty);
  const loadedRef = React.useRef(false);

  useEffect(() => {
    document.title = 'Build Editor | ESO Toolkit';
  }, []);

  // Load build from ?b= URL param on mount
  useEffect(() => {
    if (loadedRef.current) return;
    const encoded = searchParams.get('b');
    if (!encoded) return;
    loadedRef.current = true;

    void decodeBuildFromURL(encoded).then((decoded) => {
      if (decoded) {
        dispatch(loadBuild(decoded));
        // Remove the ?b= param from URL to avoid re-loading on refresh
        // Keep other params like ?id= for saved build editing
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('b');
        setSearchParams(newParams, { replace: true });
      } else {
        enqueueSnackbar('Could not load shared build — the link may be invalid.', {
          variant: 'warning',
        });
      }
    });
  }, [searchParams, setSearchParams, dispatch, enqueueSnackbar]);

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
