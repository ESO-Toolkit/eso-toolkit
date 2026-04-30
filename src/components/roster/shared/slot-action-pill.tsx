/**
 * Dual-action pill for roster slot cards.
 *
 * Left button  → "Edit" — navigates to /build-editor in the same tab
 *                with roster context params so the editor can push changes
 *                back to the originating slot.
 * Right button → "Save" — persists a copy to My Builds (redux-persist)
 *                without leaving the page.
 *
 * When the slot has a linked build (buildRef), a small badge is shown
 * between the pill and the card header, giving visual feedback that
 * a full build has been attached to this slot.
 *
 * Both actions share the same `buildFactory` that lazily produces a Build
 * from the current slot data.
 */

import {
  BookmarkAdd as BookmarkAddIcon,
  Link as LinkIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { Box, Chip, CircularProgress, Divider, IconButton, Tooltip } from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import type { Build } from '../../../features/build-editor/types/build.types';
import { saveBuild } from '../../../store/saved_builds/savedBuildsSlice';
import type { BuildReference } from '../../../types/roster';
import { encodeBuildToURL } from '../../../utils/buildEncoding';

export interface SlotActionPillProps {
  /** Factory that produces a Build from the current slot data. */
  buildFactory: () => Build;
  /** Accent colour for the pill (matches the role colour). */
  color: string;
  /** Label prefix for accessibility (e.g. "DPS 3", "Tank 1"). */
  label: string;
  /** Slot key for roster round-trip (e.g. "dps3", "tank1"). */
  slotKey?: string;
  /** Saved roster ID — enables "Apply to Roster" in the build editor. */
  rosterId?: string;
  /** Attached build reference — shows linked badge when present. */
  buildRef?: BuildReference;
}

export const SlotActionPill = React.memo<SlotActionPillProps>(
  ({ buildFactory, color, label, slotKey, rosterId, buildRef }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const [editLoading, setEditLoading] = useState(false);

    // ── Edit: same-tab navigation to build editor ──────────────────
    const handleEdit = useCallback(async () => {
      setEditLoading(true);
      try {
        const build = buildFactory();
        const encoded = await encodeBuildToURL(build);
        if (encoded) {
          // Build the URL with roster context params for round-trip support
          const params = new URLSearchParams({ b: encoded });
          if (slotKey) params.set('slot', slotKey);
          if (rosterId) params.set('rid', rosterId);
          if (slotKey || rosterId) params.set('from', 'roster');
          navigate(`/build-editor?${params.toString()}`);
        } else {
          enqueueSnackbar('Could not encode build — please try again.', { variant: 'error' });
        }
      } finally {
        setEditLoading(false);
      }
    }, [buildFactory, navigate, slotKey, rosterId, enqueueSnackbar]);

    // ── Save: persist to My Builds without navigating ──────────────
    const handleSave = useCallback(() => {
      const build = buildFactory();
      dispatch(saveBuild(build));
      enqueueSnackbar(`${build.name} saved to My Builds`, {
        variant: 'success',
        autoHideDuration: 3000,
      });
    }, [buildFactory, dispatch, enqueueSnackbar]);

    const iconSx = { fontSize: '0.9rem' };

    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', ml: 'auto', gap: 0.5 }}>
        {/* Linked build badge */}
        {buildRef?.buildName && (
          <Tooltip
            title={`Linked: ${buildRef.buildName}${buildRef.esoClass ? ` (${buildRef.esoClass})` : ''}`}
            arrow
            placement="top"
          >
            <Chip
              icon={<LinkIcon sx={{ fontSize: '0.75rem !important' }} />}
              label={buildRef.buildName}
              size="small"
              sx={{
                maxWidth: 120,
                height: 22,
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: 600,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                backgroundColor: `${color}12`,
                border: `1px solid ${color}30`,
                color,
                '& .MuiChip-icon': { color: `${color}80` },
                '& .MuiChip-label': {
                  px: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
            />
          </Tooltip>
        )}

        {/* Action pill */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
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

          <Divider orientation="vertical" flexItem sx={{ borderColor: `${color}25` }} />

          <Tooltip title="Save to My Builds" arrow placement="top">
            <IconButton
              size="small"
              onClick={handleSave}
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
              <BookmarkAddIcon sx={iconSx} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  },
);
SlotActionPill.displayName = 'SlotActionPill';
