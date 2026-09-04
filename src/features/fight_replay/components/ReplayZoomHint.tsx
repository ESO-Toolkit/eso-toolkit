import { Box, Fade, useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { REPLAY_Z, overlayPillSurface } from '../constants/replayDesign';

/**
 * One-time "Ctrl + scroll to zoom" hint for the replay canvas.
 *
 * Zoom is now cooperative (see CanvasWheelZoom): plain wheel scrolls the page, Ctrl/⌘+wheel zooms.
 * That's discoverable only if we tell the user once. This shows a small pill the first time the user
 * scrolls plainly over the canvas (the moment they'd otherwise expect zoom and get page-scroll), and
 * dismisses permanently once they either (a) successfully Ctrl/⌘+zoom or (b) see it a few seconds.
 * Dismissal is remembered in localStorage so it never nags again.
 *
 * It's a passive `window` wheel listener filtered to `<canvas>` targets — no coupling to the R3F
 * tree, and passive so it never affects scroll/zoom behavior itself.
 */
const STORAGE_KEY = 'replay.zoomHintDismissed.v1';
const VISIBLE_MS = 4000;

function alreadyDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export const ReplayZoomHint: React.FC = () => {
  const theme = useTheme();
  const [show, setShow] = useState(false);
  const dismissedRef = useRef(alreadyDismissed());
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dismissedRef.current || typeof window === 'undefined') return;

    const dismiss = (): void => {
      dismissedRef.current = true;
      setShow(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      try {
        window.localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // Private mode / storage disabled — the hint just won't persist; harmless.
      }
    };

    const onWheel = (event: WheelEvent): void => {
      if (dismissedRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName !== 'CANVAS') return;
      if (event.ctrlKey || event.metaKey) {
        // They've discovered the zoom gesture — retire the hint for good.
        dismiss();
        return;
      }
      // Plain wheel over the canvas: this is exactly the moment to surface the hint.
      setShow(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(dismiss, VISIBLE_MS);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <Fade in={show} timeout={{ enter: 200, exit: 600 }} unmountOnExit>
      <Box
        sx={{
          position: 'absolute',
          bottom: 96,
          left: '50%',
          transform: 'translateX(-50%)',
          px: 1.75,
          py: 0.75,
          fontSize: 13,
          fontWeight: 500,
          // Shared floating-badge token — this toast is exactly the "brief, self-dismissing chip
          // over the arena" case overlayPillSurface exists for (see that helper's doc, which
          // names this component directly as the deferred migration target). Replaces the old
          // one-off `rgba(0,0,0,0.78)` fill / 6px blur / 2-corner radius with the same pill chrome
          // as the other floating badges (auto-quality chip, "Following" chip): full 999px pill,
          // 10px blur, and the fixed dark-navy tint that stays a badge in every palette mode
          // rather than a page surface.
          ...overlayPillSurface(theme),
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          // Short-lived full-viewport-adjacent overlay — must beat the persistent panels and any
          // transient hint chips. See REPLAY_Z's module doc for the full rung ordering.
          zIndex: REPLAY_Z.overlay,
        }}
      >
        Hold <strong>Ctrl</strong> (or <strong>⌘</strong>) + scroll to zoom
      </Box>
    </Fade>
  );
};
