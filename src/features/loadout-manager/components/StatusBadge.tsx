/**
 * Status Badge Component
 * Displays CP values like "+12" with cyan styling matching the mockup
 */

import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface StatusBadgeProps {
  value: string;
  label?: string;
  color?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ value, label, color = '#00d9ff' }) => {
  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        px: 0.6,
        py: 0.15,
        borderRadius: 999,
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        color,
        backgroundColor: alpha(color, 0.18),
        border: `1px solid ${alpha(color, 0.35)}`,
        transition: 'all 0.15s ease-in-out',
        '&:hover': {
          backgroundColor: alpha(color, 0.25),
          borderColor: alpha(color, 0.5),
        },
      })}
    >
      {value}
    </Box>
  );
};
