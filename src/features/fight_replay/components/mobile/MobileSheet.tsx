/**
 * MobileSheet
 *
 * A dismissible bottom sheet for the mobile replay — the single surface every secondary panel
 * (players, chapters, settings) opens into, one at a time. Slides up over the arena with a
 * backdrop tap-to-dismiss, Escape, a real focus trap, and drag-to-dismiss on the grab handle /
 * header. Rendered INSIDE the replay container (no portal) so it layers correctly above the
 * pseudo-fullscreen overlay and respects the safe-area inset.
 *
 * This is the cornerstone of the deterministic mobile UI: instead of many absolutely-positioned
 * panels fighting for screen corners, secondary controls live in one sheet that's either open or
 * closed — structurally impossible to clutter.
 *
 * @module features/fight_replay/components/mobile/MobileSheet
 */

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Box, IconButton, Typography } from '@mui/material';
import React, { useCallback, useEffect, useRef } from 'react';

import { TRANSPORT_MOTION } from '../../constants/replayDesign';

interface MobileSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional element rendered on the right of the title row (e.g. a quick toggle). */
  action?: React.ReactNode;
}

/** Drag distance (fraction of sheet height) past which release dismisses. */
const DISMISS_FRACTION = 0.3;
/** Flick velocity (px/ms) past which release dismisses regardless of distance. */
const DISMISS_VELOCITY = 0.6;

const MobileSheetComponent: React.FC<MobileSheetProps> = ({
  open,
  title,
  onClose,
  children,
  action,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Close on Escape for keyboard/AT users (and external keyboards on tablets).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Dialog focus contract: on open, save the trigger and move focus in; on close, restore it.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      closeBtnRef.current?.focus();
      return;
    }
    const restore = restoreFocusRef.current;
    restoreFocusRef.current = null;
    restore?.focus?.();
  }, [open]);

  // Trap Tab within the sheet while open (wrap-around).
  const onTrapKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const root = sheetRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Drag-to-dismiss, scoped to the handle + title row so it never fights the content scroller.
  // Direct style writes via refs (no per-move re-render) keep the memo'd children untouched.
  const dragState = useRef<{ startY: number; startT: number; lastY: number; active: boolean }>({
    startY: 0,
    startT: 0,
    lastY: 0,
    active: false,
  });

  const onHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    // Leave the title-row buttons (close / action) alone.
    if ((e.target as HTMLElement).closest('button')) return;
    dragState.current = {
      startY: e.clientY,
      startT: performance.now(),
      lastY: e.clientY,
      active: true,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic/inactive pointers can't be captured — the drag still tracks via React events.
    }
  }, []);

  const onHeaderPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragState.current;
    if (!drag.active) return;
    drag.lastY = e.clientY;
    const dy = Math.max(0, e.clientY - drag.startY);
    const sheet = sheetRef.current;
    if (sheet && dy > 0) {
      sheet.style.transition = 'none';
      sheet.style.transform = `translateY(${dy}px)`;
    }
  }, []);

  const endDrag = useCallback(
    (commit: boolean) => {
      const drag = dragState.current;
      if (!drag.active) return;
      drag.active = false;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const dy = Math.max(0, drag.lastY - drag.startY);
      const dt = Math.max(1, performance.now() - drag.startT);
      const velocity = dy / dt;
      // Hand transform control back to the styled transition before settling either way.
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (
        commit &&
        (dy > sheet.offsetHeight * DISMISS_FRACTION || velocity > DISMISS_VELOCITY) &&
        dy > 24
      ) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <>
      {/* Backdrop — tap to dismiss. Fades with the sheet; pointer-events only while open. Kept
          light so the arena stays watchable while fine-tuning (e.g. scrubbing the chapters sheet). */}
      <Box
        aria-hidden
        onClick={onClose}
        sx={{
          // Fixed (not absolute) so the sheet covers the whole pseudo-fullscreen viewport no matter
          // where in the tree it's rendered (e.g. inside the bottom dock), without needing a flex
          // restructure of the container.
          position: 'fixed',
          inset: 0,
          zIndex: (theme) => theme.zIndex.modal + 20,
          backgroundColor: 'rgba(0,0,0,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
        }}
      />

      {/* Sheet */}
      <Box
        ref={sheetRef}
        role="dialog"
        aria-modal={open ? 'true' : undefined}
        aria-label={title}
        // Closed: inert removes the off-screen sheet from BOTH the tab order and the a11y tree
        // while preserving the slide-down exit animation (visibility/display would cut it).
        inert={open ? undefined : true}
        onKeyDown={onTrapKeyDown}
        sx={(theme) => ({
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: theme.zIndex.modal + 21,
          // Auto height (header + content) — the SCROLL CAP lives on the content box below, not here.
          // A percentage max-height on this flex column made the overflow:auto child collapse to ~0
          // (an indefinite-height flex container zeroes an auto-basis scroll item), so the sheet is
          // sized by its content and the content scrolls within its own cap instead.
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(13,18,30,0.98)' : '#fff',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTop: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 -8px 30px rgba(0,0,0,0.5)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
          // Don't intercept taps while hidden (the arena/dock stay interactive).
          pointerEvents: open ? 'auto' : 'none',
        })}
      >
        {/* Grab strip: handle + title row — the drag-to-dismiss surface. */}
        <Box
          onPointerDown={onHeaderPointerDown}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={() => endDrag(true)}
          onPointerCancel={() => endDrag(false)}
          sx={{ touchAction: 'none', cursor: 'grab' }}
        >
          {/* Grab handle */}
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'divider',
              mx: 'auto',
              mt: 1,
            }}
          />
          {/* Title row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 2,
              py: 1,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {action}
              <IconButton
                ref={closeBtnRef}
                aria-label={`Close ${title}`}
                size="small"
                onClick={onClose}
                sx={{ p: 1.25 }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
        {/* Scrollable content — its OWN max-height is the sheet's effective cap (see note above).
            Use dvh so the mobile browser's dynamic toolbar can't push the sheet off-screen. */}
        <Box
          sx={{
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            px: 2,
            pb: 2,
            maxHeight: 'min(60dvh, 520px)',
          }}
        >
          {children}
        </Box>
      </Box>
    </>
  );
};

export const MobileSheet = React.memo(MobileSheetComponent);
