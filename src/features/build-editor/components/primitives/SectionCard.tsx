/**
 * SectionCard
 * Bento grid card wrapper with header, optional progress dot, and
 * mobile-collapsible content.
 */

import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { Box, Collapse, IconButton, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';

import { GlassPanel } from './GlassPanel';

interface SectionCardProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  complete?: boolean;
  children: React.ReactNode;
  /** Grid column span hint for desktop bento layout */
  gridColumn?: string;
  gridRow?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  id,
  title,
  icon,
  complete,
  children,
  gridColumn,
  gridRow,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expanded, setExpanded] = useState(true);

  return (
    <GlassPanel
      id={`section-${id}`}
      glow
      sx={{
        gridColumn: isMobile ? undefined : gridColumn,
        gridRow: isMobile ? undefined : gridRow,
        overflow: 'hidden',
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
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
          userSelect: 'none',
        }}
      >
        {icon && (
          <Box sx={{ color: 'var(--be-accent, inherit)', display: 'flex', fontSize: 18 }}>
            {icon}
          </Box>
        )}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            letterSpacing: 0.3,
            flex: 1,
          }}
        >
          {title}
        </Typography>

        {/* Progress dot */}
        {complete !== undefined && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: complete
                ? 'var(--be-accent, #22c55e)'
                : isDark
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(0,0,0,0.12)',
              transition: 'background 0.3s',
              flexShrink: 0,
            }}
            aria-label={complete ? `${title} section complete` : `${title} section incomplete`}
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
        <Box sx={{ p: 2 }}>{children}</Box>
      )}
    </GlassPanel>
  );
};
