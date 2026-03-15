/**
 * ProgressRing
 * SVG circular progress indicator with animated fill.
 * Uses the class accent color via CSS custom property.
 */

import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { BE_TOKENS } from '../../theme/buildEditorTokens';

interface ProgressRingProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = BE_TOKENS.ring.size,
  strokeWidth = BE_TOKENS.ring.strokeWidth,
  showLabel = true,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  const trackColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Build ${value}% complete`}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--be-accent, #38bdf8)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            prefersReduced ? { duration: 0 } : { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
          }
        />
      </svg>
      {showLabel && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            fontWeight: 700,
            fontSize: size * 0.28,
            lineHeight: 1,
            color: isDark ? 'text.primary' : 'text.primary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  );
};
