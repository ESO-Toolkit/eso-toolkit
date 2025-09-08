import { Box } from '@mui/material';
import React from 'react';
import { useOutlet } from 'react-router-dom';

interface SimplePageTransitionProps {
  className?: string;
  enabled?: boolean;
}

// Clean page wrapper without transitions - just renders content
export const SimplePageTransition: React.FC<SimplePageTransitionProps> = ({ className }) => {
  const outlet = useOutlet();

  return <Box className={className}>{outlet}</Box>;
};
