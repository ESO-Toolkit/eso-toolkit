import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { SystemStyleObject } from '@mui/system';
import React from 'react';

export type MetricIntent = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface MetricPillProps {
  label: string;
  value: string | number;
  suffix?: string;
  intent?: MetricIntent;
  size?: 'sm' | 'md';
  variant?: 'solid' | 'outline' | 'mono';
  tooltip?: string;
  ariaLabel?: string;
  sx?: SxProps<Theme>;
  _sx?: SxProps<Theme>; // Unused sx prop
}

const intentStyles = (
  theme: Theme,
  intent: MetricIntent,
  variant: NonNullable<MetricPillProps['variant']>,
): SystemStyleObject<Theme> => {
  // Match existing styling patterns from the codebase
  const palette = {
    success: {
      bg: 'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(76, 217, 100, 0.15) 50%, rgba(76, 217, 100, 0.08) 100%)',
      border: 'rgba(76, 217, 100, 0.3)',
      text: '#5ce572',
    },
    warning: {
      bg: 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 50%, rgba(255, 193, 7, 0.08) 100%)',
      border: 'rgba(255, 193, 7, 0.35)',
      text: '#ff9800',
    },
    danger: {
      bg: 'linear-gradient(135deg, rgba(255, 68, 68, 0.25) 0%, rgba(255, 68, 68, 0.15) 50%, rgba(255, 68, 68, 0.08) 100%)',
      border: 'rgba(255, 68, 68, 0.3)',
      text: '#ff6666',
    },
    info: {
      bg: 'linear-gradient(135deg, rgba(94, 234, 255, 0.25) 0%, rgba(94, 234, 255, 0.15) 50%, rgba(94, 234, 255, 0.08) 100%)',
      border: 'rgba(94, 234, 255, 0.35)',
      text: '#7ee8ff',
    },
    neutral: {
      bg: 'linear-gradient(135deg, rgba(148, 163, 184, 0.25) 0%, rgba(148, 163, 184, 0.15) 50%, rgba(148, 163, 184, 0.08) 100%)',
      border: 'rgba(148, 163, 184, 0.3)',
      text: theme.palette.text.primary,
    },
  } as const;

  const p = palette[intent];

  if (variant === 'outline') {
    return {
      background: 'transparent',
      border: `1px solid ${p.border}`,
      color: theme.palette.mode === 'dark' ? p.text : '#000000',
      backdropFilter: 'blur(10px)',
    };
  }

  if (variant === 'mono') {
    return {
      background: 'transparent',
      border: `2px solid ${p.text}`,
      color: theme.palette.mode === 'dark' ? p.text : '#000000',
      backdropFilter: 'blur(10px)',
    };
  }

  // solid - match existing glassmorphism styling
  return {
    background: p.bg,
    border: `1px solid ${p.border}`,
    color: theme.palette.mode === 'dark' ? p.text : '#000000',
    backdropFilter: 'blur(10px)',
  };
};

export const MetricPill: React.FC<MetricPillProps> = ({
  label,
  value,
  suffix,
  intent = 'neutral',
  size = 'md',
  variant = 'solid',
  tooltip,
  ariaLabel,
  _sx,
}) => {
  const theme = useTheme();
  const content = (
    <Box
      role="text"
      aria-label={ariaLabel ?? `${label}: ${value}${suffix ?? ''}`}
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: size === 'sm' ? 70 : { xs: 50, sm: 60 },
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        ...intentStyles(theme, intent, variant),
        outline: 'none',
        boxShadow:
          theme.palette.mode === 'light'
            ? 'rgba(0, 0, 0, 0.16) 0px 10px 36px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px'
            : 'none',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        '&:hover': {
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': {
          boxShadow: `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${theme.palette.primary.main}`,
        },
      })}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: size === 'sm' ? '0.65rem' : { xs: '0.6rem', sm: '0.65rem' },
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          mb: 0.25,
          textShadow:
            theme.palette.mode === 'dark'
              ? '0 1px 2px rgba(0,0,0,0.5)'
              : '0 1px 1px rgba(15, 23, 42, 0.1)',
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontSize: size === 'sm' ? '0.8rem' : { xs: '0.65rem', sm: '0.7rem' },
          textShadow:
            theme.palette.mode === 'dark'
              ? '0 1px 3px rgba(0,0,0,0.6)'
              : '0 1px 2px rgba(15, 23, 42, 0.15)',
        }}
      >
        {value}
        {suffix}
      </Typography>
    </Box>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow>
        {content}
      </Tooltip>
    );
  }
  return content;
};
