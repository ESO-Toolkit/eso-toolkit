/**
 * Reusable UI components for player card features
 */

import { Box } from '@mui/material';
import React from 'react';

interface OneLineAutoFitProps {
  minScale?: number;
  children: React.ReactNode;
}

/**
 * Component that automatically scales text to fit on one line
 * @param minScale - Minimum scale factor (default: 0.7)
 * @param children - Content to scale
 */
export const OneLineAutoFit: React.FC<OneLineAutoFitProps> = React.memo(
  ({ minScale = 0.7, children }) => {
    const outerRef = React.useRef<HTMLDivElement>(null);
    const innerRef = React.useRef<HTMLDivElement>(null);
    const [scale, setScale] = React.useState(1);

    React.useEffect(() => {
      const updateScale = (): void => {
        if (outerRef.current && innerRef.current) {
          const outerWidth = outerRef.current.clientWidth;
          const innerWidth = innerRef.current.scrollWidth;

          if (innerWidth > outerWidth) {
            const newScale = Math.max(outerWidth / innerWidth, minScale);
            setScale(newScale);
          } else {
            setScale(1);
          }
        }
      };

      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }, [minScale]);

    return (
      <Box
        ref={outerRef}
        sx={{ minWidth: 0, width: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}
      >
        <Box
          ref={innerRef}
          sx={{
            display: 'inline-block',
            transform: `scale(${scale})`,
            transformOrigin: 'left center',
            whiteSpace: 'nowrap',
          }}
        >
          {children}
        </Box>
      </Box>
    );
  },
);
