// src/components/LazyCombatArena.tsx
import { Box, CircularProgress, Typography } from '@mui/material';
import React, { Suspense } from 'react';

// Lazy load the heavy 3D components
const LazyCombatArena = React.lazy(() =>
  import('../features/fight_replay/components/CombatArena').then((module) => ({
    default: module.CombatArena,
  })),
);

// 3D loading fallback with appropriate messaging
const ThreeDLoadingFallback: React.FC = () => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    height="400px"
    sx={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
      Loading 3D combat arena...
    </Typography>
  </Box>
);

// Wrapper component with Suspense
export const CombatArena: React.FC<React.ComponentProps<typeof LazyCombatArena>> = (props) => (
  <Suspense fallback={<ThreeDLoadingFallback />}>
    <LazyCombatArena {...props} />
  </Suspense>
);
