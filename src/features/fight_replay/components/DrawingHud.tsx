/**
 * In-canvas drawing HUD — a floating control bar shown over the arena while a draw tool is armed.
 * It makes drawing controllable WITHOUT keyboard (essential on touch, where Enter/Esc don't exist):
 * the active tool + point count, Finish/Cancel for multi-point shapes, quick Undo/Redo, and Done
 * to exit. Two-click tools (circle/rect/ruler) auto-finish, so they show only the hint + Undo/Done.
 */
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RedoRoundedIcon from '@mui/icons-material/Redo';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import UndoRoundedIcon from '@mui/icons-material/Undo';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { ShapeKind } from '../types/mapMarkers';

const TOOL_META: Record<ShapeKind, { label: string; multi: boolean; min: number; hint: string }> = {
  polyline: { label: 'Line', multi: true, min: 2, hint: 'Tap to add points' },
  polygon: { label: 'Zone', multi: true, min: 3, hint: 'Tap to add points' },
  circle: { label: 'Circle', multi: false, min: 2, hint: 'Tap centre, then edge' },
  rect: { label: 'Rect', multi: false, min: 2, hint: 'Tap two opposite corners' },
  ruler: { label: 'Ruler', multi: false, min: 2, hint: 'Tap two points' },
};

interface DrawingHudProps {
  tool: ShapeKind;
  pointCount: number;
  /** Commit the in-progress multi-point shape. */
  onFinish: () => void;
  /** Discard the in-progress shape but stay on the tool. */
  onCancel: () => void;
  /** Exit draw mode (disarm the tool). */
  onDone: () => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
}

export const DrawingHud: React.FC<DrawingHudProps> = ({
  tool,
  pointCount,
  onFinish,
  onCancel,
  onDone,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
}) => {
  const meta = TOOL_META[tool];
  const canFinish = meta.multi && pointCount >= meta.min;
  const inProgress = pointCount > 0;

  return (
    <Box
      role="toolbar"
      aria-label="Drawing controls"
      // DELIBERATELY NOT `overlayPillSurface`: that token is a fixed dark-navy badge by design
      // (see its doc — "regardless of light/dark mode, a badge over the 3D scene, not a page
      // surface"), which is right for a passive read-only chip but wrong here. This toolbar hosts
      // real interactive IconButtons (Undo/Redo/Cancel/Done) that get their icon color from MUI's
      // mode-dependent `action.active` default rather than an explicit override, so forcing them
      // onto a permanently-dark fill would sink their contrast to near-invisible in light mode
      // (dark-on-dark icons). This sx already reads `theme.palette.mode` itself — unlike the
      // fixed-black dialects the audit flagged — so it already avoids the "stays black in light
      // mode" bug the shared tokens exist to fix; it just does so with its own bespoke pill
      // instead of the badge token, on purpose.
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flexWrap: 'wrap',
        justifyContent: 'center',
        px: 1,
        py: 0.5,
        borderRadius: 999,
        pointerEvents: 'auto',
        backgroundColor:
          theme.palette.mode === 'dark' ? 'rgba(8,11,20,0.92)' : 'rgba(255,255,255,0.95)',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[6],
        maxWidth: '92vw',
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.75, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }} noWrap>
          {meta.label}
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }} noWrap>
          {meta.multi ? `${pointCount} pt${pointCount === 1 ? '' : 's'} · ${meta.hint}` : meta.hint}
        </Typography>
      </Box>

      <Tooltip title="Undo">
        <span>
          <IconButton size="small" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
            <UndoRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Redo">
        <span>
          <IconButton size="small" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
            <RedoRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {meta.multi && (
        <>
          <Tooltip title="Cancel this shape">
            <span>
              <IconButton
                size="small"
                onClick={onCancel}
                disabled={!inProgress}
                aria-label="Cancel current shape"
              >
                <RestartAltRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            size="small"
            variant="contained"
            startIcon={<CheckRoundedIcon />}
            onClick={onFinish}
            disabled={!canFinish}
            sx={{ borderRadius: 999, minWidth: 0, px: 1.25 }}
          >
            Finish
          </Button>
        </>
      )}

      <Tooltip title="Done drawing">
        <IconButton
          size="small"
          onClick={onDone}
          aria-label="Done drawing"
          sx={(theme) => ({
            color: 'text.secondary',
            backgroundColor: alpha(theme.palette.text.primary, 0.06),
          })}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
