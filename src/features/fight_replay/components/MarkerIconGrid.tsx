/**
 * Grouped grid of the common Elms marker icons (Numbers / Arrows / Squares / Hexagons),
 * shared by the add-marker picker and the marker edit dialog. Every option is visible at
 * once — no nested menus — and each cell is a real button, so the grid works the same for
 * touch, mouse, and keyboard.
 *
 * Touch activation is pointer-based, NOT click-based: iOS Safari's synthesized click is
 * unreliable inside the replay's immersive overlay (field-reported as "can't tap anything
 * in the sheet" — the same WebKit behavior that forced the canvas gestures onto pointer
 * events). A touch/pen tap commits on `pointerup` (slop-gated so a scroll over the grid
 * never picks), and the trailing synthetic click — if the browser does emit one — is
 * suppressed so the pick can't double-fire or click through to whatever is underneath.
 * Mouse and keyboard still use the plain click path.
 */
import { Box, Tooltip, Typography } from '@mui/material';
import React, { useRef } from 'react';

import { COMMON_MARKER_GROUPS } from '../utils/mapMarkerConverters';

import { MarkerSpritePreview } from './MarkerSpritePreview';

/** Max pointer travel (px) between down and up for the touch to count as a tap. */
const TAP_SLOP_PX = 12;

interface MarkerIconGridProps {
  /** Highlights the matching cell (edit dialog); omit for one-shot pickers. */
  selectedIconKey?: number;
  onPick: (iconKey: number) => void;
  /** Finger-sized cells (≥48px) for touch surfaces; compact cells for pointer use. */
  touch?: boolean;
}

export const MarkerIconGrid: React.FC<MarkerIconGridProps> = ({
  selectedIconKey,
  onPick,
  touch = false,
}) => {
  const cellSize = touch ? 48 : 38;

  // One finger at a time is the case that matters; a shared ref keeps the handlers simple.
  const touchPressRef = useRef<{ pointerId: number; x: number; y: number; iconKey: number } | null>(
    null,
  );
  const suppressClickRef = useRef(false);

  const handlePointerDown = (event: React.PointerEvent, iconKey: number): void => {
    suppressClickRef.current = false;
    if (event.pointerType === 'mouse') {
      touchPressRef.current = null;
      return;
    }
    touchPressRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      iconKey,
    };
  };

  const handlePointerUp = (event: React.PointerEvent, iconKey: number): void => {
    const press = touchPressRef.current;
    if (!press || event.pointerId !== press.pointerId || press.iconKey !== iconKey) {
      return;
    }
    touchPressRef.current = null;

    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (dx * dx + dy * dy > TAP_SLOP_PX * TAP_SLOP_PX) {
      return; // The finger travelled — that was a scroll over the grid, not a pick.
    }

    suppressClickRef.current = true;
    onPick(iconKey);
  };

  const handleTouchEnd = (event: React.TouchEvent): void => {
    // The pick already committed on pointerup; cancel the synthetic click so it can't
    // double-fire here or land on whatever replaces the sheet once it closes.
    if (suppressClickRef.current) {
      event.preventDefault();
    }
  };

  const handleClick = (iconKey: number): void => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onPick(iconKey);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: touch ? 1.5 : 1 }}>
      {COMMON_MARKER_GROUPS.filter((group) => group.options.length > 0).map((group) => (
        <Box key={group.key}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}
          >
            {group.label}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: touch ? 1 : 0.5 }}>
            {group.options.map((option) => {
              const selected = selectedIconKey === option.iconKey;
              const cell = (
                <Box
                  key={option.iconKey}
                  component="button"
                  type="button"
                  onPointerDown={(event: React.PointerEvent) =>
                    handlePointerDown(event, option.iconKey)
                  }
                  onPointerUp={(event: React.PointerEvent) =>
                    handlePointerUp(event, option.iconKey)
                  }
                  onTouchEnd={handleTouchEnd}
                  onClick={() => handleClick(option.iconKey)}
                  aria-label={`Use icon ${option.label}`}
                  aria-pressed={selectedIconKey !== undefined ? selected : undefined}
                  sx={{
                    width: cellSize,
                    height: cellSize,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: '2px solid',
                    borderColor: selected ? 'primary.main' : 'transparent',
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    p: 0,
                    // Kill iOS double-tap-zoom heuristics on the cells; taps act immediately.
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    '&:hover': { backgroundColor: 'action.hover' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                  }}
                >
                  <MarkerSpritePreview iconKey={option.iconKey} label={option.label} />
                </Box>
              );

              // Tooltips are hover affordances; on touch they only add competing touch
              // listeners (and iOS press-and-hold behaviors), so the label rides on
              // aria-label alone there.
              return touch ? (
                cell
              ) : (
                <Tooltip key={option.iconKey} title={option.label}>
                  {cell}
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
