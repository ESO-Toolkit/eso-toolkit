import { Box, Skeleton, useTheme } from '@mui/material';
import React from 'react';

interface TextEditorSkeletonProps {
  /** Test ID for testing */
  'data-testid'?: string;
}

export const TextEditorSkeleton: React.FC<TextEditorSkeletonProps> = ({
  'data-testid': dataTestId,
}) => {
  const theme = useTheme();

  return (
    <Box
      data-testid={dataTestId}
      sx={{
        minHeight: '100vh',
        backgroundColor: 'transparent',
        paddingTop: theme.spacing(3),
        paddingBottom: theme.spacing(3),
        position: 'relative',

        // Mobile styles
        [theme.breakpoints.down('sm')]: {
          paddingTop: 0,
          paddingBottom: 0,
        },
      }}
    >
      <Box
        sx={{
          maxWidth: '900px',
          margin: '2rem auto 2rem auto',
          background: 'var(--panel)',
          padding: { xs: '16px', sm: '24px' },
          borderRadius: { xs: '0', sm: '14px' },
          border: { xs: 'none', sm: '1px solid var(--border)' },
          fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          color: 'var(--text)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 8px 30px rgba(0, 0, 0, 0.6)'
              : '0 8px 30px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          position: 'relative',
          zIndex: 1,

          // Mobile styles - full width
          [theme.breakpoints.down('sm')]: {
            display: 'grid',
            gridTemplateRows: 'auto auto',
            gap: '16px',
            margin: '0',
            minHeight: '100vh',
            maxWidth: '100%',
          },
        }}
      >
        {/* Desktop Toolbar Skeleton */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            gap: '12px',
            marginBottom: '20px',
            padding: '16px',
            background: 'var(--panel2)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            alignItems: 'center',
            overflowX: 'auto',
          }}
        >
          {/* Undo/Redo Group Skeleton */}
          <Box sx={{ display: 'flex', gap: '8px' }}>
            <Skeleton variant="rectangular" width={60} height={36} sx={{ borderRadius: '8px' }} />
            <Skeleton variant="rectangular" width={60} height={36} sx={{ borderRadius: '8px' }} />
          </Box>

          {/* Clear Formatting Skeleton */}
          <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: '8px' }} />

          {/* Remove Format Skeleton */}
          <Skeleton variant="rectangular" width={110} height={36} sx={{ borderRadius: '8px' }} />

          {/* Preset Colors Skeleton */}
          <Box sx={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="circular"
                width={24}
                height={24}
                sx={{ borderRadius: '3px' }}
              />
            ))}
          </Box>

          {/* Color Picker Button Skeleton */}
          <Skeleton variant="circular" width={52} height={52} />
        </Box>

        {/* Mobile Format Container Skeleton */}
        <Box
          sx={{
            display: { xs: 'flex', sm: 'none' },
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '20px',
            gridRow: 2,
          }}
        >
          {/* Mobile Row 1: Undo/Redo */}
          <Box
            sx={{
              display: 'flex',
              gap: '8px',
              padding: '12px',
              background: 'var(--panel2)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              alignItems: 'center',
            }}
          >
            <Skeleton variant="rectangular" width={80} height={40} sx={{ borderRadius: '8px' }} />
            <Skeleton variant="rectangular" width={80} height={40} sx={{ borderRadius: '8px' }} />
          </Box>

          {/* Mobile Row 2: Clear/Remove Format */}
          <Box
            sx={{
              display: 'flex',
              gap: '8px',
              padding: '12px',
              background: 'var(--panel2)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              alignItems: 'center',
            }}
          >
            <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: '8px' }} />
            <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: '8px' }} />
          </Box>
        </Box>

        {/* Mobile Color Section Skeleton */}
        <Box
          sx={{
            display: { xs: 'flex', sm: 'none' },
            flexDirection: 'column',
            alignItems: 'center',
            gap: '40px',
            marginBottom: '4px',
            gridRow: 1,
          }}
        >
          {/* Color Picker Button Skeleton */}
          <Skeleton variant="circular" width={52} height={52} />

          {/* Preset Colors Skeleton */}
          <Box sx={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                width="calc(16.666% - 7px)"
                height={40}
                sx={{ borderRadius: '6px' }}
              />
            ))}
          </Box>
        </Box>

        {/* Text Input Skeleton */}
        <Skeleton
          variant="rectangular"
          width="100%"
          height={280}
          sx={{
            borderRadius: '12px 12px 0 0',
            border: '1px solid var(--border)',
            borderBottom: 'none',
            fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
          }}
        />

        {/* Status Bar Skeleton */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            background: 'var(--panel2)',
            border: '1px solid var(--border)',
            borderTop: 'none',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
          }}
        >
          {/* Character Counter Skeleton */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="text" width={80} height={16} />
            <Skeleton variant="text" width={40} height={16} />
          </Box>

          {/* Copy Button Skeleton */}
          <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: '8px' }} />
        </Box>

        {/* Preview Area Skeleton */}
        <Box
          sx={{
            marginTop: '20px',
            padding: { xs: '16px', sm: '20px' },
            borderRadius: { xs: '8px', sm: '12px' },
            minHeight: { xs: '100px', sm: '120px' },
            background: 'transparent',
            border:
              theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.2)'
                : '1px solid rgba(0, 0, 0, 0.1)',
            fontSize: '1rem',
            lineHeight: '1.6',
            position: 'relative',
            overflow: 'hidden',
            zIndex: 1,
            color: '#ffffff',
          }}
        >
          {/* Preview text skeleton with multiple lines */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Skeleton
              variant="text"
              width="60%"
              height={20}
              sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            />
            <Skeleton
              variant="text"
              width="80%"
              height={20}
              sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            />
            <Skeleton
              variant="text"
              width="45%"
              height={20}
              sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            />
            <Skeleton
              variant="text"
              width="70%"
              height={20}
              sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
