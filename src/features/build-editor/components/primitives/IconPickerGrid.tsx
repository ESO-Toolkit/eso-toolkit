/**
 * IconPickerGrid
 * Visual grid of selectable icon cards, replacing Select dropdowns.
 * Supports single-select mode with keyboard navigation.
 */

import { Box, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React, { useCallback, useRef } from 'react';

interface IconPickerOption<T extends string = string> {
  id: T;
  label: string;
  color?: string;
  description?: string;
}

interface IconPickerGridProps<T extends string = string> {
  options: IconPickerOption<T>[];
  value: T;
  onChange: (id: T) => void;
  columns?: number;
  label?: string;
}

export const IconPickerGrid = <T extends string = string>({
  options,
  value,
  onChange,
  columns = 4,
  label,
}: IconPickerGridProps<T>): React.ReactElement => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      let nextIdx = idx;
      switch (e.key) {
        case 'ArrowRight':
          nextIdx = (idx + 1) % options.length;
          break;
        case 'ArrowLeft':
          nextIdx = (idx - 1 + options.length) % options.length;
          break;
        case 'ArrowDown':
          nextIdx = Math.min(idx + columns, options.length - 1);
          break;
        case 'ArrowUp':
          nextIdx = Math.max(idx - columns, 0);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onChange(options[idx].id);
          return;
        default:
          return;
      }
      e.preventDefault();
      const buttons = gridRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      buttons?.[nextIdx]?.focus();
    },
    [columns, onChange, options],
  );

  return (
    <Box>
      {label && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, mb: 0.75, display: 'block' }}
        >
          {label}
        </Typography>
      )}
      <Box
        ref={gridRef}
        role="radiogroup"
        aria-label={label}
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 0.75,
        }}
      >
        {options.map((opt, idx) => {
          const selected = opt.id === value;
          const accentColor = opt.color ?? 'var(--be-accent, #38bdf8)';
          // MUI's alpha() can't parse CSS vars — use raw rgba when no hex is available
          const selectedBg = opt.color
            ? isDark
              ? alpha(opt.color, 0.15)
              : alpha(opt.color, 0.1)
            : isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.15)'
              : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.1)';

          return (
            <Tooltip key={opt.id} title={opt.description ?? opt.label} enterDelay={400}>
              <motion.button
                role="radio"
                aria-checked={selected}
                aria-label={opt.label}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(opt.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                whileHover={prefersReduced ? {} : { scale: 1.04 }}
                whileTap={prefersReduced ? {} : { scale: 0.97 }}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '10px 6px',
                  borderRadius: 12,
                  background: selected
                    ? selectedBg
                    : isDark
                      ? 'rgba(255, 255, 255, 0.03)'
                      : 'rgba(0, 0, 0, 0.02)',
                  outline: selected
                    ? `2px solid ${accentColor}`
                    : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  outlineOffset: selected ? -2 : -1,
                  transition: 'background 0.15s, outline 0.15s',
                  minHeight: 56,
                  fontFamily: 'inherit',
                }}
              >
                {/* Color dot */}
                {opt.color && (
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: opt.color,
                      boxShadow: selected ? `0 0 8px ${alpha(opt.color, 0.5)}` : 'none',
                      transition: 'box-shadow 0.2s',
                      flexShrink: 0,
                    }}
                  />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: selected ? 700 : 500,
                    color: selected ? accentColor : 'text.secondary',
                    lineHeight: 1.2,
                    textAlign: 'center',
                    fontSize: 11,
                  }}
                >
                  {opt.label}
                </Typography>
              </motion.button>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};
