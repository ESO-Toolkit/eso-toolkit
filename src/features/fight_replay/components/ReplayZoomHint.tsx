import { Box, Fade } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

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
          borderRadius: 2,
          fontSize: 13,
          fontWeight: 500,
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.78)',
          border: '1px solid rgba(148, 210, 255, 0.25)',
          backdropFilter: 'blur(6px)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 5,
        }}
      >
        Hold <strong>Ctrl</strong> (or <strong>⌘</strong>) + scroll to zoom
      </Box>
    </Fade>
  );
};
