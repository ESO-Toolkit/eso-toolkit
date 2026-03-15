/**
 * BuildCompletionHeader
 * Top bar with editable build name, progress ring, and Save/Share buttons.
 */

import { SaveOutlined, ShareOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Box, Button, TextField, Tooltip, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { useBuildCompleteness } from '../hooks/useBuildCompleteness';
import { BUILD_EDITOR_STORAGE_KEY, markSaved, setBuildName } from '../store/buildEditorSlice';

import { ProgressRing } from './primitives/ProgressRing';

export const BuildCompletionHeader: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { enqueueSnackbar } = useSnackbar();

  const { build, isDirty, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const completeness = useBuildCompleteness();

  const handleSave = (): void => {
    if (!build.name.trim()) {
      enqueueSnackbar('Please enter a build name before saving.', { variant: 'warning' });
      return;
    }
    try {
      localStorage.setItem(
        BUILD_EDITOR_STORAGE_KEY,
        JSON.stringify({ build, activeSetupIndex }),
      );
    } catch {
      enqueueSnackbar('Could not save to browser storage.', { variant: 'warning' });
    }
    dispatch(markSaved());
    enqueueSnackbar('Build saved!', { variant: 'success' });
  };

  const handleShare = (): void => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => enqueueSnackbar('Link copied to clipboard!', { variant: 'info' }))
      .catch(() => enqueueSnackbar('Could not copy link.', { variant: 'error' }));
  };

  // Shared glass-pill button styles
  const pillBtn = {
    borderRadius: '99px',
    textTransform: 'none' as const,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.2,
    px: 1.75,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, md: 2 },
        px: { xs: 2, md: 3 },
        py: 1.75,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        backgroundColor: isDark ? 'rgba(11, 18, 32, 0.88)' : 'rgba(248, 250, 252, 0.92)',
        // Subtle class-accent gradient bleeds from top-left
        backgroundImage:
          'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.07) 0%, transparent 55%)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Build name — heading-style: no visible border until hover/focus */}
      <TextField
        size="small"
        placeholder="Untitled Build"
        value={build.name}
        onChange={(e) => dispatch(setBuildName(e.target.value))}
        inputProps={{ maxLength: 80, 'aria-label': 'Build name' }}
        sx={{
          flex: 1,
          minWidth: 160,
          maxWidth: 480,
          '& .MuiOutlinedInput-root': {
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontWeight: 700,
            fontSize: { xs: 15, md: 19 },
            letterSpacing: '-0.3px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.13)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--be-accent, #38bdf8)',
              borderWidth: '1px',
            },
          },
        }}
      />

      {/* Class identity badge — only on desktop, only when class is selected */}
      {build.esoClass && !isMobile && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.6,
            borderRadius: '99px',
            background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)',
            border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.28)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: 'var(--be-accent, #38bdf8)',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            boxShadow: '0 0 8px rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)',
          }}
        >
          {build.esoClass}
        </Box>
      )}

      {/* Progress ring — with glowing halo that brightens as build fills out */}
      <Tooltip title={`Build ${completeness}% complete`}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            borderRadius: '50%',
            boxShadow:
              completeness > 10
                ? '0 0 20px rgba(var(--be-accent-rgb, 56, 189, 248), 0.22), 0 0 40px rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                : 'none',
            transition: 'box-shadow 0.4s ease',
          }}
        >
          <ProgressRing value={completeness} size={52} showLabel />
        </Box>
      </Tooltip>

      {/* Action buttons — pill-shaped glass style */}
      <Box sx={{ display: 'flex', gap: 0.75, ml: isMobile ? 'auto' : 0 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveOutlined sx={{ fontSize: 14 }} />}
          onClick={handleSave}
          aria-label={isDirty ? 'Save build' : 'Build saved'}
          sx={{
            ...pillBtn,
            minWidth: 80,
            ...(isDirty
              ? {
                  background:
                    'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.9), rgba(var(--be-accent-rgb, 56, 189, 248), 0.7))',
                  border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.5)',
                  boxShadow: '0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)',
                  color: isDark ? '#fff' : '#0b1220',
                  '&:hover': {
                    boxShadow: '0 0 18px rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)',
                  },
                }
              : {
                  background: isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(5, 150, 105, 0.12)',
                  border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.35)' : 'rgba(5, 150, 105, 0.3)'}`,
                  color: isDark ? '#4ade80' : '#059669',
                  boxShadow: 'none',
                }),
          }}
        >
          {isDirty ? 'Save' : 'Saved'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ShareOutlined sx={{ fontSize: 14 }} />}
          onClick={handleShare}
          sx={{
            ...pillBtn,
            borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            '&:hover': {
              borderColor: 'var(--be-accent, #38bdf8)',
              background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
            },
          }}
        >
          Share
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityOutlined sx={{ fontSize: 14 }} />}
          disabled
          aria-label="View build (coming soon)"
          sx={{ ...pillBtn }}
        >
          View
        </Button>
      </Box>
    </Box>
  );
};
