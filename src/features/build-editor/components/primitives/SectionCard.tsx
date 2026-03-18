/**
 * SectionCard
 * Bento grid card wrapper with header, optional progress dot, and
 * mobile-collapsible content.
 */

import { CheckCircleOutlined, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { Box, Collapse, IconButton, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';

import { type GlassPanelVariant, GlassPanel } from './GlassPanel';

interface SectionCardProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  complete?: boolean;
  children: React.ReactNode;
  /** Grid column span hint for desktop bento layout */
  gridColumn?: string;
  gridRow?: string;
  /** Visual emphasis tier — controls border brightness and hover glow intensity */
  variant?: GlassPanelVariant;
  /** Whether the section starts expanded. Defaults to true. Pass false to start collapsed on mobile. */
  defaultExpanded?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  id,
  title,
  icon,
  complete,
  children,
  gridColumn,
  gridRow,
  variant = 'default',
  defaultExpanded = true,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <GlassPanel
      id={`section-${id}`}
      glow
      variant={variant}
      sx={{
        gridColumn: isMobile ? undefined : gridColumn,
        gridRow: isMobile ? undefined : gridRow,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        onClick={isMobile ? () => setExpanded((p) => !p) : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.5,
          cursor: isMobile ? 'pointer' : 'default',
          // Accent-tinted bottom border + subtle header gradient fill for primary
          borderBottom:
            variant === 'primary'
              ? `1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.18)`
              : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          ...(variant === 'primary' && {
            backgroundImage: isDark
              ? 'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.08) 0%, transparent 65%)'
              : 'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.05) 0%, transparent 65%)',
          }),
          userSelect: 'none',
        }}
      >
        {icon && (
          <Box
            sx={{
              color: 'var(--be-accent, inherit)',
              display: 'flex',
              fontSize: 20,
              opacity: variant === 'primary' ? 1 : 0.85,
              filter:
                variant === 'primary'
                  ? 'drop-shadow(0 0 4px rgba(var(--be-accent-rgb, 56, 189, 248), 0.40))'
                  : 'none',
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant="subtitle1"
          component="h2"
          sx={{
            fontWeight: 700,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            letterSpacing: 0.2,
            fontSize: { xs: 13, md: 14 },
            flex: 1,
            // Gradient text for primary tier — class accent bleeds into the title
            ...(variant === 'primary' && {
              background:
                'linear-gradient(90deg, var(--be-accent, #38bdf8) 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.60) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }),
          }}
        >
          {title}
        </Typography>

        {/* Completion indicator — checkmark when done, nothing when not */}
        {complete && (
          <CheckCircleOutlined
            aria-label={`${title} section complete`}
            sx={{
              fontSize: 16,
              color: 'var(--be-accent, #22c55e)',
              opacity: 0.85,
              flexShrink: 0,
              transition: 'opacity 0.3s',
            }}
          />
        )}
        {complete === false && (
          <Box
            aria-label={`${title} section incomplete`}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)',
              flexShrink: 0,
            }}
          />
        )}

        {/* Mobile expand/collapse */}
        {isMobile && (
          <IconButton
            size="small"
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s',
            }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Content */}
      {isMobile ? (
        <Collapse in={expanded}>
          <Box sx={{ p: 2 }}>{children}</Box>
        </Collapse>
      ) : (
        <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>
      )}
    </GlassPanel>
  );
};
