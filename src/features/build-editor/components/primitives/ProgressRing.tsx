/**
 * ProgressRing
 * SVG circular progress with gradient stroke, glow halo, and animated fill.
 * Uses the class accent color via CSS custom property.
 */

import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React, { useId } from 'react';

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

  // Unique ID for SVG gradient defs (safe with multiple rings on the page)
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const gradientId = `ring-grad-${uid}`;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  const trackColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.07)';
  const easing: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

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
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
      >
        <defs>
          {/* Gradient for progress stroke — accent fading to 30% opacity */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop
              offset="0%"
              style={{ stopColor: 'var(--be-accent, #38bdf8)', stopOpacity: 1 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: 'var(--be-accent, #38bdf8)', stopOpacity: 0.35 }}
            />
          </linearGradient>
        </defs>

        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Glow halo — wider blurred duplicate behind the progress arc */}
        {value > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--be-accent, #38bdf8)"
            strokeWidth={strokeWidth + 5}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={
              prefersReduced ? { duration: 0 } : { duration: 0.8, ease: easing }
            }
            style={{ filter: 'blur(4px)', opacity: 0.3 }}
          />
        )}

        {/* Progress arc — gradient stroke */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            prefersReduced ? { duration: 0 } : { duration: 0.8, ease: easing }
          }
        />
      </svg>

      {showLabel && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            fontWeight: 700,
            fontSize: size * 0.24,
            lineHeight: 1,
            color: 'text.primary',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          {value}
          <Box
            component="span"
            sx={{ fontSize: '0.6em', opacity: 0.5, ml: '1px', fontWeight: 600 }}
          >
            %
          </Box>
        </Typography>
      )}
    </Box>
  );
};
