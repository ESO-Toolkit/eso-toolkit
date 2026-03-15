/**
 * Build Editor Page
 * Simplified wrapper — delegates to BuildEditorShell which provides
 * class theming, scoped background, and the bento grid layout.
 * AppLayout provides the xl Container and reduced padding for this route.
 */

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';
import { BuildEditorShell } from '@features/build-editor/components/BuildEditorShell';

const BuildEditorPageInner: React.FC = () => {
  const isDirty = useSelector((s: RootState) => s.buildEditor.isDirty);

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
