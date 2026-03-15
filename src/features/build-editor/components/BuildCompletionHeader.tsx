/**
 * BuildCompletionHeader
 * Top bar with editable build name, progress ring, and Save/Share buttons.
 */

import { SaveOutlined, ShareOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Box, Button, TextField, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { useBuildCompleteness } from '../hooks/useBuildCompleteness';
import { markSaved, setBuildName } from '../store/buildEditorSlice';

import { ProgressRing } from './primitives/ProgressRing';

export const BuildCompletionHeader: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { enqueueSnackbar } = useSnackbar();

  const { build, isDirty } = useSelector((s: RootState) => s.buildEditor);
  const completeness = useBuildCompleteness();

  const handleSave = (): void => {
    if (!build.name.trim()) {
      enqueueSnackbar('Please enter a build name before saving.', { variant: 'warning' });
      return;
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

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, md: 2 },
        px: { xs: 2, md: 3 },
        py: 1.5,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        background: isDark ? 'rgba(11, 18, 32, 0.85)' : 'rgba(248, 250, 252, 0.9)',
        backdropFilter: 'blur(12px)',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}
    >
      {/* Build name */}
      <TextField
        size="small"
        placeholder="Build Name"
        value={build.name}
        onChange={(e) => dispatch(setBuildName(e.target.value))}
        inputProps={{ maxLength: 80, 'aria-label': 'Build name' }}
        sx={{
          flex: 1,
          minWidth: 160,
          '& .MuiOutlinedInput-root': {
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontWeight: 700,
            fontSize: { xs: 14, md: 16 },
          },
        }}
      />

      {/* Progress ring */}
      <Tooltip title={`Build ${completeness}% complete`}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <ProgressRing value={completeness} size={36} />
          {!isMobile && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
            >
              {completeness}%
            </Typography>
          )}
        </Box>
      </Tooltip>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 0.75, ml: isMobile ? 'auto' : 0 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveOutlined sx={{ fontSize: 15 }} />}
          onClick={handleSave}
          aria-label={isDirty ? 'Save build' : 'Build saved'}
          sx={{
            minWidth: 72,
            ...(isDirty
              ? {}
              : {
                  background: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(5, 150, 105, 0.15)',
                  color: isDark ? '#22c55e' : '#059669',
                }),
          }}
        >
          {isDirty ? 'Save' : 'Saved'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ShareOutlined sx={{ fontSize: 15 }} />}
          onClick={handleShare}
        >
          Share
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityOutlined sx={{ fontSize: 15 }} />}
          disabled
          aria-label="View build (coming soon)"
        >
          View
        </Button>
      </Box>
    </Box>
  );
};
