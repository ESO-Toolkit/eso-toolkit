/**
 * Dual-action pill for roster slot cards.
 *
 * Left button  → "Edit" — navigates to /build-editor in the same tab
 *                (browser back returns to the roster).
 * Right button → "Save" — persists a copy to My Builds (redux-persist)
 *                without leaving the page.
 *
 * Both actions share the same `buildFactory` that lazily produces a Build
 * from the current slot data.
 */

import { BookmarkAdd as BookmarkAddIcon, Tune as TuneIcon } from '@mui/icons-material';
import { Box, CircularProgress, Divider, IconButton, Tooltip } from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import type { Build } from '../../../features/build-editor/types/build.types';
import { saveBuild } from '../../../store/saved_builds/savedBuildsSlice';
import { encodeBuildToURL } from '../../../utils/buildEncoding';

export interface SlotActionPillProps {
  /** Factory that produces a Build from the current slot data. */
  buildFactory: () => Build;
  /** Accent colour for the pill (matches the role colour). */
  color: string;
  /** Label prefix for accessibility (e.g. "DPS 3", "Tank 1"). */
  label: string;
}

export const SlotActionPill = React.memo<SlotActionPillProps>(
  ({ buildFactory, color, label }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const [editLoading, setEditLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    // ── Edit: same-tab navigation to build editor ──────────────────
    const handleEdit = useCallback(async () => {
      setEditLoading(true);
      try {
        const build = buildFactory();
        const encoded = await encodeBuildToURL(build);
        if (encoded) {
          navigate(`/build-editor?b=${encoded}`);
        }
      } finally {
        setEditLoading(false);
      }
    }, [buildFactory, navigate]);

    // ── Save: persist to My Builds without navigating ──────────────
    const handleSave = useCallback(() => {
      setSaveLoading(true);
      try {
        const build = buildFactory();
        dispatch(saveBuild(build));
        enqueueSnackbar(`${build.name} saved to My Builds`, {
          variant: 'success',
          autoHideDuration: 3000,
        });
      } finally {
        setSaveLoading(false);
      }
    }, [buildFactory, dispatch, enqueueSnackbar]);

    const iconSx = { fontSize: '0.9rem' };

    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          ml: 'auto',
          borderRadius: '8px',
          border: `1px solid ${color}30`,
          backgroundColor: `${color}0a`,
          overflow: 'hidden',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: `${color}50`,
            boxShadow: `0 0 8px ${color}15`,
          },
        }}
      >
        <Tooltip title="Edit in Build Editor" arrow placement="top">
          <IconButton
            size="small"
            onClick={handleEdit}
            disabled={editLoading}
            aria-label={`Edit ${label} in Build Editor`}
            sx={{
              borderRadius: 0,
              color,
              px: 0.75,
              py: 0.5,
              opacity: 0.7,
              transition: 'opacity 0.15s ease, background-color 0.15s ease',
              '&:hover': {
                opacity: 1,
                backgroundColor: `${color}18`,
              },
            }}
          >
            {editLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <TuneIcon sx={iconSx} />
            )}
          </IconButton>
        </Tooltip>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: `${color}25` }}
        />

        <Tooltip title="Save to My Builds" arrow placement="top">
          <IconButton
            size="small"
            onClick={handleSave}
            disabled={saveLoading}
            aria-label={`Save ${label} to My Builds`}
            sx={{
              borderRadius: 0,
              color,
              px: 0.75,
              py: 0.5,
              opacity: 0.7,
              transition: 'opacity 0.15s ease, background-color 0.15s ease',
              '&:hover': {
                opacity: 1,
                backgroundColor: `${color}18`,
              },
            }}
          >
            {saveLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <BookmarkAddIcon sx={iconSx} />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    );
  },
);
SlotActionPill.displayName = 'SlotActionPill';
