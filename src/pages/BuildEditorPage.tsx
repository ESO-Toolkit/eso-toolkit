/**
 * Build Editor Page
 * Full-page wrapper for the ESO build editor with hero banner and layout.
 */

import { Box, Container, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import { BuildEditorLayout } from '@features/build-editor/components/BuildEditorLayout';

export const BuildEditorPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', pb: 8 }}>
      {/* Hero Banner */}
      <Box
        sx={{
          position: 'relative',
          height: 160,
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(135deg, #0b1220 0%, #0f172a 40%, #1a0a2e 100%)'
            : 'linear-gradient(135deg, #e8f4fd 0%, #f0f7ff 40%, #e8eaf6 100%)',
          display: 'flex',
          alignItems: 'flex-end',
          pb: 2.5,
          mb: 0,
        }}
      >
        {/* Decorative glow */}
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: '10%',
            width: 320,
            height: 200,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(ellipse, rgba(56,189,248,0.12) 0%, transparent 70%)'
              : 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <Container maxWidth="xl">
          <Box sx={{ px: { xs: 0, sm: 1 } }}>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 700,
                color: isDark ? '#e5e7eb' : '#1e293b',
                mb: 0.5,
              }}
            >
              ESO Build Editor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create, configure, and share your Elder Scrolls Online build.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Editor container */}
      <Container maxWidth="xl" sx={{ pt: 3 }}>
        <BuildEditorLayout />
      </Container>
    </Box>
  );
};
