/**
 * IconPickerGrid
 * Glass-morphism selection grid with gradient-border active state,
 * glow halos on color dots, and glass-card hover effects.
 */

import { Box, Tooltip, Typography } from '@mui/material';
import { alpha, styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import React, { useCallback, useRef } from 'react';

// Tile button — uses CSS `:hover`/`:active` for feedback instead of
// framer-motion's `whileHover`/`whileTap`. Hover lift is gated behind
// `@media (hover: hover)` to avoid sticky-hover on touch devices.
const TileButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'reduceMotion',
})<{ reduceMotion: boolean }>(({ reduceMotion }) => ({
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '12px 8px',
  borderRadius: 14,
  width: '100%',
  position: 'relative',
  transform: 'translateZ(0)',
  transition: reduceMotion
    ? 'background 0.2s, box-shadow 0.25s, outline 0.15s'
    : 'background 0.2s, box-shadow 0.25s, outline 0.15s, transform 0.15s ease-out',
  minHeight: 62,
  fontFamily: 'inherit',
  ...(reduceMotion
    ? {}
    : {
        '@media (hover: hover)': {
          '&:hover': {
            transform: 'translate3d(0, -2px, 0) scale(1.05)',
          },
        },
        '&:active': {
          transform: 'scale(0.96)',
        },
      }),
}));

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
  const prefersReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const gridRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      let nextIdx: number;
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
          sx={{
            fontWeight: 700,
            mb: 1,
            display: 'block',
            fontSize: 11,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: 'text.secondary',
            fontFamily: 'Space Grotesk, Inter, system-ui',
          }}
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
          gap: 1,
        }}
      >
        {options.map((opt, idx) => {
          const selected = opt.id === value;
          const accentColor = opt.color ?? 'var(--be-accent, #38bdf8)';
          const selectedBg = opt.color
            ? isDark
              ? alpha(opt.color, 0.14)
              : alpha(opt.color, 0.08)
            : isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.14)'
              : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)';

          const selectedBorderGrad = opt.color
            ? `linear-gradient(135deg, ${alpha(opt.color, 0.7)} 0%, ${alpha(opt.color, 0.15)} 50%, ${alpha(opt.color, 0.4)} 100%)`
            : 'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.7) 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.15) 50%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.4) 100%)';

          const glowShadow = opt.color
            ? `0 0 16px ${alpha(opt.color, 0.3)}, 0 4px 12px ${alpha(opt.color, 0.15)}`
            : '0 0 16px rgba(var(--be-accent-rgb, 56, 189, 248), 0.3), 0 4px 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.15)';

          return (
            <Tooltip key={opt.id} title={opt.description ?? opt.label} enterDelay={400}>
              <Box sx={{ position: 'relative' }}>
                <TileButton
                  reduceMotion={Boolean(prefersReduced)}
                  role="radio"
                  aria-checked={selected}
                  aria-label={opt.label}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onChange(opt.id)}
                  onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, idx)}
                  style={{
                    background: selected
                      ? selectedBg
                      : isDark
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(0, 0, 0, 0.02)',
                    outline: selected
                      ? 'none'
                      : `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                    outlineOffset: -1,
                    boxShadow: selected ? glowShadow : 'none',
                  }}
                >
                  {/* Color dot with glow halo */}
                  {opt.color && (
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: opt.color,
                        boxShadow: selected
                          ? `0 0 12px ${alpha(opt.color, 0.65)}, 0 0 4px ${alpha(opt.color, 0.9)}`
                          : `0 0 6px ${alpha(opt.color, 0.25)}`,
                        transition: 'box-shadow 0.25s',
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
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      transition: 'color 0.15s',
                    }}
                  >
                    {opt.label}
                  </Typography>
                </TileButton>

                {/* Gradient border mask — only on selected */}
                {selected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '14px',
                      padding: '1.5px',
                      background: selectedBorderGrad,
                      WebkitMask:
                        'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      maskComposite: 'exclude',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};
