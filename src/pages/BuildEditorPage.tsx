/**
 * Build Editor Page
 * Simplified wrapper — delegates to BuildEditorShell which provides
 * class theming, scoped background, and the bento grid layout.
 */

import { Box, Container } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';
import { BuildEditorShell } from '@features/build-editor/components/BuildEditorShell';
import { useClassTheme } from '@features/build-editor/hooks/useClassTheme';

const BuildEditorPageInner: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isDirty = useSelector((s: RootState) => s.buildEditor.isDirty);
  const classTheme = useClassTheme();

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

  return (
    <Box sx={{ minHeight: '100vh', pb: 4 }}>
      {/* Class-colored accent strip — replaces the ambiguous dark hero band */}
      <Box
        sx={{
          height: 4,
          background: classTheme.gradient,
          opacity: 0.85,
        }}
      />

      {/* Editor container */}
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <BuildEditorShell />
      </Container>
    </Box>
  );
};

export const BuildEditorPage: React.FC = () => {
  // Wrap in a minimal boundary — useClassTheme needs Redux context
  // which is already provided by the store provider
  return <BuildEditorPageInner />;
};
