/**
 * AttributeBar
 * Animated horizontal stat bar with +/- controls.
 * Shows a filled bar proportional to value/max.
 *
 * UX improvement: click the numeric value to type directly.
 */

import { Box, ButtonBase, InputBase, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React, { useRef, useState } from 'react';

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

  // ── Inline editing state ────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (): void => {
    setDraft(String(value));
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  };

  const commitEdit = (): void => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) {
      const maxAllowed = Math.min(max, value + (totalMax - total));
      onChange(Math.max(0, Math.min(maxAllowed, parsed)));
    }
    setEditing(false);
  };

  const cancelEdit = (): void => {
    setEditing(false);
  };

  // ── +/- adjustment ──────────────────────────────────────────────────────
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
    width: 36,
    height: 36,
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

  const atMax = value >= max || total >= totalMax;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        py: 1,
        px: 1.5,
        borderRadius: 2.5,
        background: isDark ? alpha(color, 0.05) : alpha(color, 0.03),
        border: `1px solid ${alpha(color, isDark ? 0.18 : 0.12)}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          background: isDark ? alpha(color, 0.09) : alpha(color, 0.06),
          borderColor: alpha(color, isDark ? 0.3 : 0.22),
          boxShadow: `0 0 16px ${alpha(color, 0.1)}`,
        },
      }}
    >
      {/* Color dot with glow */}
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

      {/* Label */}
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

      {/* Bar track — inner shadow for depth, gradient fill */}
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

      {/* Minus — glass-style button */}
      <Tooltip title={`Decrease ${label} (Shift ×10)`}>
        <span>
          <ButtonBase
            onClick={(e: React.MouseEvent) => adjust(-1, e)}
            disabled={value === 0}
            aria-label={`Decrease ${label}`}
            sx={{
              ...btnSx,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
              color: 'text.primary',
              '&:hover:not(:disabled)': {
                borderColor: alpha(color, 0.45),
                background: alpha(color, isDark ? 0.14 : 0.1),
                color,
              },
              '&:disabled': { opacity: 0.3, border: '1px solid transparent' },
            }}
          >
            −
          </ButtonBase>
        </span>
      </Tooltip>

      {/* Value — click to type directly */}
      <Tooltip title={editing ? '' : 'Click to type a value'} enterDelay={600}>
        <Box
          sx={{ minWidth: 26, textAlign: 'center', flexShrink: 0 }}
          onClick={!editing ? startEdit : undefined}
        >
          {editing ? (
            <InputBase
              inputRef={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              slotProps={{
                input: {
                  type: 'number',
                  min: 0,
                  max: max,
                  'aria-label': `${label} value`,
                },
              }}
              sx={{
                width: 36,
                '& input': {
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  color,
                  fontVariantNumeric: 'tabular-nums',
                  background: alpha(color, isDark ? 0.12 : 0.08),
                  borderRadius: '6px',
                  border: `1px solid ${alpha(color, 0.4)}`,
                  px: 0.5,
                  py: 0.25,
                  // Remove number input arrows
                  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                    WebkitAppearance: 'none',
                    margin: 0,
                  },
                  '&[type=number]': { MozAppearance: 'textfield' },
                },
              }}
            />
          ) : (
            <Typography
              aria-live="polite"
              aria-label={`${label}: ${value}`}
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: value > 0 ? color : 'text.disabled',
                fontSize: 13,
                textShadow: atMax && value > 0 ? `0 0 8px ${alpha(color, 0.6)}` : 'none',
                transition: 'text-shadow 0.3s',
                cursor: 'text',
                borderRadius: '4px',
                px: 0.5,
                py: 0.25,
                '&:hover': {
                  background: alpha(color, isDark ? 0.12 : 0.08),
                },
              }}
            >
              {value}
            </Typography>
          )}
        </Box>
      </Tooltip>

      {/* Plus — glass-style button with accent color */}
      <Tooltip title={`Increase ${label} (Shift ×10)`}>
        <span>
          <ButtonBase
            onClick={(e: React.MouseEvent) => adjust(1, e)}
            disabled={atMax}
            aria-label={`Increase ${label}`}
            sx={{
              ...btnSx,
              background: isDark ? alpha(color, 0.14) : alpha(color, 0.1),
              border: `1px solid ${alpha(color, 0.3)}`,
              color,
              '&:hover:not(:disabled)': {
                background: alpha(color, isDark ? 0.28 : 0.22),
                borderColor: alpha(color, 0.55),
                boxShadow: `0 0 10px ${alpha(color, 0.25)}`,
              },
              '&:disabled': { opacity: 0.3, border: '1px solid transparent' },
            }}
          >
            +
          </ButtonBase>
        </span>
      </Tooltip>
    </Box>
  );
};
