import { Box } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';

interface AnimatedTabContentProps {
  children: React.ReactNode;
  tabKey: string;
}

/**
 * GPU-accelerated tab content transitions using the native View Transitions API.
 * Falls back to an instant swap when the API isn't available.
 */
export const AnimatedTabContent: React.FC<AnimatedTabContentProps> = ({ children, tabKey }) => {
  const [displayContent, setDisplayContent] = useState(children);
  const prevTabKey = useRef(tabKey);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTransition = useRef<{ finished: Promise<void> } | null>(null);

  useEffect(() => {
    if (tabKey === prevTabKey.current) {
      // Same tab — just update content (e.g. Suspense resolved)
      setDisplayContent(children);
      return;
    }

    prevTabKey.current = tabKey;

    // Skip VT if API is missing or container isn't mounted
    if (!('startViewTransition' in document) || !containerRef.current) {
      setDisplayContent(children);
      return;
    }

    const el = containerRef.current;

    // If a previous transition is still in flight, skip animation to
    // avoid stacking view-transition-name on an already-captured element.
    if (activeTransition.current) {
      el.style.viewTransitionName = '';
      setDisplayContent(children);
      activeTransition.current = null;
      return;
    }

    // Give the container a unique VT name for the duration of the transition
    el.style.viewTransitionName = 'tab-content';

    const transition = (
      document as unknown as {
        startViewTransition: (cb: () => Promise<void>) => {
          finished: Promise<void>;
        };
      }
    ).startViewTransition(() => {
      setDisplayContent(children);
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });

    activeTransition.current = transition;

    const cleanup = (): void => {
      el.style.viewTransitionName = '';
      activeTransition.current = null;
    };

    transition.finished.then(cleanup).catch(cleanup);
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
