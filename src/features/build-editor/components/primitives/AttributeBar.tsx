/**
 * AttributeBar
 * Animated horizontal stat bar with +/- controls.
 * Shows a filled bar proportional to value/max.
 */

import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

interface AttributeBarProps {
  label: string;
  color: string;
  value: number;
  max: number;
  total: number;
  totalMax: number;
  onChange: (next: number) => void;
}

export const AttributeBar: React.FC<AttributeBarProps> = ({
  label,
  color,
  value,
  max,
  total,
  totalMax,
  onChange,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();

  const adjust = (delta: number, e: React.MouseEvent): void => {
    const step = e.shiftKey ? 10 : 1;
    const maxIncrease = totalMax - total;
    if (delta > 0) {
      onChange(Math.min(max, value + Math.min(step, maxIncrease)));
    } else {
      onChange(Math.max(0, value - step));
    }
  };

  const fillPercent = max > 0 ? (value / max) * 100 : 0;

  const btnSx = {
    width: 28,
    height: 28,
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: 16,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.12s',
    flexShrink: 0,
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        py: 1,
        px: 1.5,
        borderRadius: 2,
        background: isDark ? alpha(color, 0.06) : alpha(color, 0.04),
        border: `1px solid ${alpha(color, isDark ? 0.2 : 0.15)}`,
        transition: 'background 0.15s',
        '&:hover': {
          background: isDark ? alpha(color, 0.1) : alpha(color, 0.07),
        },
      }}
    >
      {/* Color dot */}
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />

      {/* Label */}
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, minWidth: 60, color: 'text.primary', fontSize: 12 }}
      >
        {label}
      </Typography>

      {/* Bar track */}
      <Box
        sx={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: isDark ? alpha(color, 0.12) : alpha(color, 0.1),
          overflow: 'hidden',
          minWidth: 48,
        }}
      >
        <motion.div
          style={{
            height: '100%',
            borderRadius: 4,
            background: color,
          }}
          initial={false}
          animate={{ width: `${fillPercent}%` }}
          transition={
            prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }
          }
        />
      </Box>

      {/* Minus */}
      <Tooltip title={`Decrease ${label} (Shift ×10)`}>
        <span>
          <ButtonBase
            onClick={(e: React.MouseEvent) => adjust(-1, e)}
            disabled={value === 0}
            aria-label={`Decrease ${label}`}
            sx={{
              ...btnSx,
              background: isDark ? alpha('#fff', 0.07) : alpha('#000', 0.07),
              color: 'text.primary',
              '&:hover:not(:disabled)': {
                background: isDark ? alpha('#fff', 0.15) : alpha('#000', 0.14),
              },
              '&:disabled': { opacity: 0.35 },
            }}
          >
            −
          </ButtonBase>
        </span>
      </Tooltip>

      {/* Value */}
      <Typography
        component="span"
        aria-live="polite"
        aria-label={`${label}: ${value}`}
        variant="caption"
        sx={{
          minWidth: 24,
          textAlign: 'center',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: value > 0 ? color : 'text.disabled',
          fontSize: 13,
        }}
      >
        {value}
      </Typography>

      {/* Plus */}
      <Tooltip title={`Increase ${label} (Shift ×10)`}>
        <span>
          <ButtonBase
            onClick={(e: React.MouseEvent) => adjust(1, e)}
            disabled={value >= max || total >= totalMax}
            aria-label={`Increase ${label}`}
            sx={{
              ...btnSx,
              background: isDark ? alpha(color, 0.25) : alpha(color, 0.2),
              color,
              '&:hover:not(:disabled)': {
                background: isDark ? alpha(color, 0.4) : alpha(color, 0.35),
              },
              '&:disabled': { opacity: 0.35 },
            }}
          >
            +
          </ButtonBase>
        </span>
      </Tooltip>
    </Box>
  );
};
