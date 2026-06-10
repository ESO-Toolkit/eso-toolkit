/**
 * The add-marker icon picker: one flat surface showing every common marker at once.
 *
 * Presentation adapts to the input:
 *  - Touch (mobile): a bottom sheet with finger-sized cells, a visible title, and an
 *    explicit close button — dismissible by the backdrop, swipe, or the X. Replaces the
 *    desktop-style nested submenu, which on a phone opened under the finger (the tap's
 *    trailing click instantly placed the first option) and offered no way back to the
 *    other groups without dismissing everything.
 *  - Pointer (desktop): a popover anchored at the click point with the same grid, so one
 *    click places a marker and Escape/click-away backs out.
 */
import CloseIcon from '@mui/icons-material/Close';
import { Box, Drawer, IconButton, Popover, Typography } from '@mui/material';
import React, { useCallback, useRef } from 'react';

import { MarkerIconGrid } from './MarkerIconGrid';

interface MarkerIconPickerProps {
  open: boolean;
  /** Screen point the picker was invoked at — anchors the desktop popover. */
  anchorPosition: { left: number; top: number } | null;
  /** Bottom-sheet presentation (touch); false = popover at the pointer (desktop). */
  mobile?: boolean;
  onSelect: (iconKey: number) => void;
  onClose: () => void;
}

/** Both surfaces were opened by a right-click/long-press; don't let a second native
 *  context menu fire on top of them. */
const suppressContextMenu = (event: React.MouseEvent): void => {
  event.preventDefault();
};

export const MarkerIconPicker: React.FC<MarkerIconPickerProps> = ({
  open,
  anchorPosition,
  mobile = false,
  onSelect,
  onClose,
}) => {
  // Keep the last real anchor through the close transition — the owner nulls the anchor
  // the moment a pick/dismiss happens, and the popover would otherwise jump to (0,0)
  // while fading out.
  const lastAnchorRef = useRef(anchorPosition);
  if (anchorPosition) {
    lastAnchorRef.current = anchorPosition;
  }

  // Close commits on pointerup for touch/pen (same iOS synthesized-click unreliability the
  // grid guards against — see MarkerIconGrid); the click path stays for mouse/keyboard,
  // with a flag so a browser that does emit the trailing click can't double-close.
  const closeHandledRef = useRef(false);
  const handleClosePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') {
        return;
      }
      closeHandledRef.current = true;
      onClose();
    },
    [onClose],
  );
  const handleCloseTouchEnd = useCallback((event: React.TouchEvent) => {
    if (closeHandledRef.current) {
      event.preventDefault();
    }
  }, []);
  const handleCloseClick = useCallback(() => {
    if (closeHandledRef.current) {
      closeHandledRef.current = false;
      return;
    }
    onClose();
  }, [onClose]);

  if (mobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        // The mobile replay overlay sits at zIndex.modal; the sheet must stack above it.
        sx={(theme) => ({ zIndex: theme.zIndex.modal + 1 })}
        slotProps={{
          paper: {
            onContextMenu: suppressContextMenu,
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '70dvh',
              pb: 'calc(env(safe-area-inset-bottom) + 12px)',
              // iOS: a long-press that bleeds into the sheet must not text-select it, and
              // taps must act immediately (no double-tap-zoom heuristics).
              userSelect: 'none',
              WebkitTouchCallout: 'none',
              touchAction: 'manipulation',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'action.disabled' }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', pl: 2, pr: 1, pt: 0.5, pb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Add marker
          </Typography>
          <IconButton
            aria-label="Close marker picker"
            onPointerUp={handleClosePointerUp}
            onTouchEnd={handleCloseTouchEnd}
            onClick={handleCloseClick}
            sx={{ p: 1.25, touchAction: 'manipulation' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ px: 2, pt: 0.5, overflowY: 'auto' }}>
          <MarkerIconGrid touch onPick={onSelect} />
        </Box>
      </Drawer>
    );
  }

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={lastAnchorRef.current ?? undefined}
      sx={(theme) => ({ zIndex: theme.zIndex.modal + 1 })}
      slotProps={{
        paper: {
          onContextMenu: suppressContextMenu,
          sx: { p: 1.5, maxWidth: 320 },
        },
      }}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: 'block', lineHeight: 1.6, mb: 0.5 }}
      >
        Add marker
      </Typography>
      <MarkerIconGrid onPick={onSelect} />
    </Popover>
  );
};
