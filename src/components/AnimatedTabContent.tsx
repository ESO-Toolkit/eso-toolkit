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

  useEffect(() => {
    if (tabKey === prevTabKey.current) {
      // Same tab — just update content (e.g. Suspense resolved)
      setDisplayContent(children);
      return;
    }

    prevTabKey.current = tabKey;

    // Use View Transitions API if available
    if ('startViewTransition' in document && containerRef.current) {
      const el = containerRef.current;

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
        // Return a promise that resolves after React commits
        return new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
      });

      transition.finished
        .then(() => {
          el.style.viewTransitionName = '';
        })
        .catch(() => {
          el.style.viewTransitionName = '';
        });
    } else {
      // Fallback: instant swap
      setDisplayContent(children);
    }
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
