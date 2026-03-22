/**
 * CollapsibleSection — reusable collapsible header + content for picker dialogs.
 *
 * Provides a consistent clickable header with label, item count, expand chevron,
 * and optional icon/color indicator. Used inside all picker dialog browse modes.
 */

import { ExpandMore as ExpandIcon } from '@mui/icons-material';
import { Box, ButtonBase, Collapse, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';

interface CollapsibleSectionProps {
  /** Section label displayed in the header */
  label: string;
  /** Item count badge shown to the right */
  count?: number;
  /** Whether the section starts expanded */
  defaultExpanded?: boolean;
  /** Optional left-side icon element */
  icon?: React.ReactNode;
  /** Optional accent color for the header text */
  labelColor?: string;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  label,
  count,
  defaultExpanded = false,
  icon,
  labelColor,
  children,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box>
      <ButtonBase
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        sx={{
          width: '100%',
          py: 0.75,
          px: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 1.5,
          transition: 'background 0.12s',
          '&:hover': {
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
          {icon}
          <Typography
            noWrap
            sx={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              color:
                labelColor ??
                (isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)'),
            }}
          >
            {label}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          {count != null && (
            <Typography
              sx={{
                fontSize: 10,
                color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
                fontFamily: 'Space Grotesk',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {count}
            </Typography>
          )}
          <ExpandIcon
            sx={{
              fontSize: 16,
              transition: 'transform 0.2s ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
            }}
          />
        </Stack>
      </ButtonBase>

      <Collapse in={expanded} unmountOnExit>
        {children}
      </Collapse>
    </Box>
  );
};
