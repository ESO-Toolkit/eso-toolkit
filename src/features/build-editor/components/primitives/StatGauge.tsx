/**
 * StatGauge — Circular gauge showing a stat value vs its cap.
 * Reuses the ProgressRing SVG pattern but with cap-based coloring:
 *   amber = under cap, green = optimal, red = over cap.
 */

import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React, { useId } from 'react';

import type { StatResult } from '../../engine/stat-types';

interface StatGaugeProps {
  /** Label shown below the gauge (e.g. "Penetration") */
  label: string;
  /** Computed stat result from the engine */
  result: StatResult;
  /** Display as percentage (e.g. "112%") vs flat number (e.g. "18,200") */
  isPercent?: boolean;
  /** Size of the SVG ring */
  size?: number;
}

const STATUS_COLORS = {
  under: { stroke: '#f59e0b', text: '#fbbf24', label: 'Under cap' },
  optimal: { stroke: '#22c55e', text: '#4ade80', label: 'Optimal' },
  over: { stroke: '#ef4444', text: '#f87171', label: 'Over cap' },
} as const;

export const StatGauge: React.FC<StatGaugeProps> = ({
  label,
  result,
  isPercent = false,
  size = 80,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();

  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const gradientId = `stat-grad-${uid}`;

  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate fill percentage (clamped to 0-100 for the ring)
  const fillPercent = result.cap > 0 ? Math.min((result.total / result.cap) * 100, 100) : 0;
  const offset = circumference - (fillPercent / 100) * circumference;

  const colors = STATUS_COLORS[result.status];
  const trackColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.07)';
  const easing: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

  const formatted = isPercent ? `${result.total}%` : result.total.toLocaleString();

  const capFormatted = isPercent ? `${result.cap}%` : result.cap.toLocaleString();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        minWidth: size + 16,
      }}
    >
      {/* Ring */}
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
        }}
        role="meter"
        aria-valuenow={result.total}
        aria-valuemin={0}
        aria-valuemax={result.cap}
        aria-label={`${label}: ${formatted} of ${capFormatted}`}
      >
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: colors.stroke, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: colors.stroke, stopOpacity: 0.4 }} />
            </linearGradient>
          </defs>

          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />

          {/* Glow */}
          {fillPercent > 0 && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={strokeWidth + 4}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={prefersReduced ? { duration: 0 } : { duration: 0.8, ease: easing }}
              style={{ filter: 'blur(4px)', opacity: 0.25 }}
            />
          )}

          {/* Progress arc */}
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
            transition={prefersReduced ? { duration: 0 } : { duration: 0.8, ease: easing }}
          />
        </svg>

        {/* Center value */}
        <Typography
          sx={{
            position: 'absolute',
            fontWeight: 700,
            fontSize: size * 0.17,
            lineHeight: 1,
            color: colors.text,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            textAlign: 'center',
          }}
        >
          {formatted}
        </Typography>
      </Box>

      {/* Label */}
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 600,
          fontFamily: 'Space Grotesk, Inter, system-ui',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)',
          textAlign: 'center',
        }}
      >
        {label}
      </Typography>

      {/* Cap indicator */}
      <Typography
        sx={{
          fontSize: 9,
          fontWeight: 500,
          fontFamily: 'Space Grotesk, Inter, system-ui',
          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)',
          textAlign: 'center',
        }}
      >
        Cap: {capFormatted}
      </Typography>
    </Box>
  );
};
