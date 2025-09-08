import { Box } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

interface MinimalPageTransitionProps {
  className?: string;
}

// Barely-there page transition - just the slightest indication of change
export const MinimalPageTransition: React.FC<MinimalPageTransitionProps> = ({ className }) => {
  const location = useLocation();
  const outlet = useOutlet();

  const [key, setKey] = useState(0);

  useEffect(() => {
    // Just increment a key to force a tiny re-render flash
    setKey((prev) => prev + 1);
  }, [location.pathname]);

  return (
    <Box
      key={key}
      className={className}
      sx={{
        // Just use your existing CSS transitions from the theme
        transition: 'opacity 0.05s ease-out',
        opacity: 1,
      }}
    >
      {outlet}
    </Box>
  );
};
