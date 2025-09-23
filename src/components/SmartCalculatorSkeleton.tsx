import { useMediaQuery, useTheme } from '@mui/material';
import React from 'react';

import { CalculatorSkeleton } from './CalculatorSkeleton';
import { CalculatorSkeletonLite } from './CalculatorSkeletonLite';

interface SmartCalculatorSkeletonProps {
  /** Test ID for testing */
  'data-testid'?: string;
}

export const SmartCalculatorSkeleton: React.FC<SmartCalculatorSkeletonProps> = ({
  'data-testid': dataTestId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // For loading skeleton, default to lite mode on mobile, regular on desktop
  // This matches the Calculator component's default behavior
  const liteMode = isMobile;

  // Pass the test ID to the appropriate skeleton component
  const skeletonTestId = dataTestId || 'calculator-skeleton';

  return liteMode ? (
    <CalculatorSkeletonLite data-testid={skeletonTestId} />
  ) : (
    <CalculatorSkeleton data-testid={skeletonTestId} />
  );
};
