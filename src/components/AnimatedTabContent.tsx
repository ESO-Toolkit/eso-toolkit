import { Box } from '@mui/material';
import React, { useEffect, useState, useRef } from 'react';

interface AnimatedTabContentProps {
  children: React.ReactNode;
  tabKey: string;
}

export const AnimatedTabContent: React.FC<AnimatedTabContentProps> = ({ children, tabKey }) => {
  const [currentContent, setCurrentContent] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousTabKey = useRef(tabKey);

  useEffect(() => {
    if (tabKey !== previousTabKey.current) {
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setCurrentContent(children);
        setIsTransitioning(false);
        previousTabKey.current = tabKey;
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [children, tabKey]);

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
            ? 'translateY(8px) scale(0.98) rotateX(2deg)'
            : 'translateY(0px) scale(1) rotateX(0deg)',
          opacity: isTransitioning ? 0 : 1,
          filter: isTransitioning ? 'blur(4px)' : 'blur(0px)',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'center top',
          backfaceVisibility: 'hidden',
          willChange: 'transform, opacity, filter',
        }}
      >
        {currentContent}
      </Box>
    </Box>
  );
};
