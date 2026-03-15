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
      {/* Compact hero with class-colored accent */}
      <Box
        sx={{
          position: 'relative',
          height: 80,
          overflow: 'hidden',
          // Stacked gradients: accent tint on top, opaque dark base below.
          // Avoids the alpha-interpolation artifact where mid-gradient colors
          // become visibly orange/purple instead of staying near the base tone.
          background: isDark
            ? `linear-gradient(135deg, transparent 50%, rgba(${classTheme.accentRgb}, 0.08) 100%), linear-gradient(135deg, #0b1220, #0f172a)`
            : `linear-gradient(135deg, transparent 50%, rgba(${classTheme.accentRgb}, 0.06) 100%), linear-gradient(135deg, #f0f4f8, #f8fafc)`,
          // Subtle gradient line at bottom
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            background: classTheme.gradient,
            opacity: 0.3,
          },
        }}
      />

      {/* Editor container */}
      <Container maxWidth="xl" sx={{ mt: -3 }}>
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
