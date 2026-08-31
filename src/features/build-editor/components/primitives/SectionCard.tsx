/**
 * SectionCard
 * Bento grid card wrapper with header, optional progress dot, and
 * mobile-collapsible content.
 */

import { CheckCircleOutlined, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { Box, Collapse, Typography, useMediaQuery } from '@mui/material';
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
  /** Optional control rendered at the right edge of the header. */
  headerAction?: React.ReactNode;
}

const visuallyHiddenSx = {
  position: 'absolute',
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

export const SectionCard = React.memo<SectionCardProps>(function SectionCard({
  id,
  title,
  icon,
  complete,
  children,
  gridColumn,
  gridRow,
  variant = 'default',
  defaultExpanded = true,
  headerAction,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expanded, setExpanded] = useState(defaultExpanded);
  const accessibleTitle =
    complete === undefined ? title : `${title} (${complete ? 'complete' : 'incomplete'})`;

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
        scrollMarginTop: isMobile ? '12px' : undefined,
      }}
    >
      <Box
        data-build-section-header
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: { xs: 0.5, md: 1.5 },
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
        {isMobile && (
          <Box component="h2" id={`section-${id}-heading`} sx={visuallyHiddenSx}>
            {accessibleTitle}
          </Box>
        )}
        <Box
          component={isMobile ? 'button' : 'div'}
          type={isMobile ? 'button' : undefined}
          data-build-section-toggle
          data-build-section-focus-target={isMobile ? true : undefined}
          onClick={isMobile ? () => setExpanded((previous) => !previous) : undefined}
          aria-labelledby={isMobile ? `section-${id}-heading` : undefined}
          aria-expanded={isMobile ? expanded : undefined}
          aria-controls={isMobile ? `section-${id}-content` : undefined}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flex: 1,
            minWidth: 0,
            minHeight: isMobile ? 44 : undefined,
            p: 0,
            border: 0,
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            textAlign: 'left',
            cursor: isMobile ? 'pointer' : 'default',
            '&:focus-visible': {
              outline: `2px solid var(--be-accent, ${theme.palette.primary.main})`,
              outlineOffset: 4,
              borderRadius: 1,
            },
          }}
        >
          {icon && (
            <Box
              aria-hidden="true"
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
            component={isMobile ? 'span' : 'h2'}
            aria-hidden={isMobile ? 'true' : undefined}
            data-build-section-focus-target={!isMobile ? true : undefined}
            tabIndex={!isMobile ? -1 : undefined}
            sx={{
              fontWeight: 700,
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              letterSpacing: 0.2,
              fontSize: { xs: 13, md: 14 },
              flex: 1,
              '&:focus': { outline: 'none' },
              '&:focus-visible': {
                outline: `2px solid var(--be-accent, ${theme.palette.primary.main})`,
                outlineOffset: 4,
                borderRadius: 1,
              },
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
            {!isMobile && complete !== undefined && (
              <Box component="span" sx={visuallyHiddenSx}>
                {` (${complete ? 'complete' : 'incomplete'})`}
              </Box>
            )}
          </Typography>

          {complete && (
            <CheckCircleOutlined
              aria-hidden="true"
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
              aria-hidden="true"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)',
                flexShrink: 0,
              }}
            />
          )}

          {isMobile && (
            <ExpandMoreIcon
              aria-hidden="true"
              fontSize="small"
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s',
                flexShrink: 0,
              }}
            />
          )}
        </Box>

        {/* Keep actions outside the collapse button to avoid nested controls. */}
        {headerAction && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{headerAction}</Box>
        )}
      </Box>

      {isMobile ? (
        <Collapse in={expanded} unmountOnExit>
          <Box id={`section-${id}-content`} sx={{ p: 2 }}>
            {children}
          </Box>
        </Collapse>
      ) : (
        <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>
      )}
    </GlassPanel>
  );
});
