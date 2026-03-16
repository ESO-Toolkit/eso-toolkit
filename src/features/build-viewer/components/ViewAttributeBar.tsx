/**
 * ViewAttributeBar
 * Read-only version of the build editor's AttributeBar.
 * Shows a colored bar with label and value — no +/- controls.
 */

import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

interface ViewAttributeBarProps {
  label: string;
  color: string;
  value: number;
  max: number;
}

export const ViewAttributeBar: React.FC<ViewAttributeBarProps> = ({ label, color, value, max }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();
  const fillPercent = max > 0 ? (value / max) * 100 : 0;

  if (value === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        py: 0.75,
        px: 1.5,
        borderRadius: 2.5,
        background: isDark ? alpha(color, 0.05) : alpha(color, 0.03),
        border: `1px solid ${alpha(color, isDark ? 0.18 : 0.12)}`,
      }}
    >
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${alpha(color, 0.55)}`,
          flexShrink: 0,
        }}
      />

      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          minWidth: 60,
          color: 'text.primary',
          fontSize: 12,
          fontFamily: 'Space Grotesk, Inter, system-ui',
        }}
      >
        {label}
      </Typography>

      <Box
        sx={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: isDark ? alpha(color, 0.1) : alpha(color, 0.08),
          boxShadow: `inset 0 1px 3px ${alpha(color, 0.15)}`,
          overflow: 'hidden',
          minWidth: 48,
        }}
      >
        <motion.div
          style={{
            height: '100%',
            borderRadius: 4,
            background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.55)} 100%)`,
            boxShadow:
              fillPercent > 0
                ? `0 0 10px ${alpha(color, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.18)`
                : 'none',
          }}
          initial={false}
          animate={{ width: `${fillPercent}%` }}
          transition={
            prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }
          }
        />
      </Box>

      <Typography
        variant="caption"
        sx={{
          minWidth: 26,
          textAlign: 'center',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'Space Grotesk, Inter, system-ui',
          color,
          fontSize: 13,
          textShadow: `0 0 8px ${alpha(color, 0.4)}`,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};
