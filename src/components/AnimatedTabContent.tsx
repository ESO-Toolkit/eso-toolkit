import { Box } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';

interface AnimatedTabContentProps {
  children: React.ReactNode;
  tabKey: string;
}

interface VTHandle {
  finished: Promise<void>;
}

/**
 * GPU-accelerated tab content transitions using the native View Transitions API.
 * Falls back to an instant swap when the API isn't available or when a
 * route-level transition is already in flight.
 */
export const AnimatedTabContent: React.FC<AnimatedTabContentProps> = ({ children, tabKey }) => {
  const [displayContent, setDisplayContent] = useState(children);
  const prevTabKey = useRef(tabKey);
  const containerRef = useRef<HTMLDivElement>(null);
  const transitioning = useRef(false);

  useEffect(() => {
    if (tabKey === prevTabKey.current) {
      // Same tab — just update content (e.g. Suspense resolved)
      setDisplayContent(children);
      return;
    }

    prevTabKey.current = tabKey;

    const el = containerRef.current;

    // Skip VT when: API missing, element unmounted, or another
    // transition (route-level or previous tab) is still active.
    // document.activeViewTransition is non-null when any VT is running.
    const docHasActiveVT = !!(document as unknown as { activeViewTransition?: object })
      .activeViewTransition;

    if (!('startViewTransition' in document) || !el || transitioning.current || docHasActiveVT) {
      setDisplayContent(children);
      return;
    }

    transitioning.current = true;
    el.style.viewTransitionName = 'tab-content';

    let handle: VTHandle;
    try {
      handle = (
        document as unknown as {
          startViewTransition: (cb: () => Promise<void>) => VTHandle;
        }
      ).startViewTransition(() => {
        setDisplayContent(children);
        return new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
      });
    } catch {
      // VT failed — instant swap
      el.style.viewTransitionName = '';
      transitioning.current = false;
      setDisplayContent(children);
      return;
    }

    const cleanup = (): void => {
      el.style.viewTransitionName = '';
      transitioning.current = false;
    };

    handle.finished.then(cleanup).catch(cleanup);
  }, [children, tabKey]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        minHeight: '600px',
      }}
    >
      {displayContent}
    </Box>
  );
};
