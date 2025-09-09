import { Box } from '@mui/material';
import React, { useEffect, useState, useRef, startTransition } from 'react';

interface AnimatedTabContentProps {
  children: React.ReactNode;
  tabKey: string;
}

export const AnimatedTabContent: React.FC<AnimatedTabContentProps> = ({ children, tabKey }) => {
  const [currentContent, setCurrentContent] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousTabKey = useRef(tabKey);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = useRef<React.ReactNode>(null);

  useEffect(() => {
    if (tabKey !== previousTabKey.current) {
      // Clear any existing transition
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      // Store the new content but don't switch to it immediately
      pendingContentRef.current = children;

      // Start animation immediately
      setIsTransitioning(true);

      // Use React's concurrent features to avoid blocking
      startTransition(() => {
        // After fade out completes, switch to new content
        transitionTimeoutRef.current = setTimeout(() => {
          // Only switch to pending content if we still have the same tabKey
          // This prevents race conditions with rapid tab switching
          if (pendingContentRef.current) {
            setCurrentContent(pendingContentRef.current);
            pendingContentRef.current = null;
          }

          // Brief pause to let DOM update, then fade in
          transitionTimeoutRef.current = setTimeout(() => {
            setIsTransitioning(false);
            previousTabKey.current = tabKey;
          }, 50); // Reduced pause for faster perceived loading
        }, 150); // Quick fade out
      });
    } else {
      // Tab hasn't changed, but children might have (e.g., Suspense resolved)
      // Update content immediately without animation if not transitioning
      if (!isTransitioning) {
        setCurrentContent(children);
      }
    }

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [children, tabKey, isTransitioning]);

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '600px',
        perspective: '1000px',
        // Add padding to prevent shadow clipping during animations
        padding: '0 4px 16px 4px',
        margin: '0 -4px -16px -4px',
      }}
    >
      <Box
        sx={{
          width: '100%',
          transform: isTransitioning
            ? 'translateY(6px) scale(0.99) rotateX(1deg)'
            : 'translateY(0px) scale(1) rotateX(0deg)',
          opacity: isTransitioning ? 0 : 1,
          filter: isTransitioning ? 'blur(2px)' : 'blur(0px)',
          transition: isTransitioning
            ? 'all 150ms cubic-bezier(0.4, 0, 1, 1)' // Fast out
            : 'all 200ms cubic-bezier(0, 0, 0.2, 1)', // Smooth in
          transformOrigin: 'center top',
          backfaceVisibility: 'hidden',
          willChange: 'transform, opacity, filter',
          // Optimize for accordion content
          '& .MuiAccordion-root': {
            transition: 'none !important', // Disable accordion animations during tab transition
          },
          '& .MuiCollapse-root': {
            transition: isTransitioning ? 'none !important' : undefined,
          },
        }}
      >
        {currentContent}
      </Box>
    </Box>
  );
};
