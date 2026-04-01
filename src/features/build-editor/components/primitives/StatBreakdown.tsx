/**
 * StatBreakdown — Expandable source list showing individual stat contributions.
 * Groups items by source category with values aligned right.
 */

import { ExpandMore as ExpandIcon } from '@mui/icons-material';
import { Box, Collapse, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useState } from 'react';

import type { StatItem, StatResult, StatSource } from '../../engine/stat-types';

interface StatBreakdownProps {
  label: string;
  result: StatResult;
  isPercent?: boolean;
  defaultExpanded?: boolean;
}

const SOURCE_LABELS: Record<StatSource, string> = {
  base: 'Base',
  race: 'Race',
  class: 'Class',
  mundus: 'Mundus',
  gear: 'Gear',
  passive: 'Passive',
  cp: 'Champion',
  buff: 'Buffs',
};

const SOURCE_ORDER: StatSource[] = [
  'base',
  'buff',
  'gear',
  'passive',
  'class',
  'race',
  'mundus',
  'cp',
];

export const StatBreakdown: React.FC<StatBreakdownProps> = ({
  label,
  result,
  isPercent = false,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Group enabled items by source
  const enabledItems = result.items.filter((i) => i.enabled);
  const grouped = SOURCE_ORDER.reduce<Record<string, StatItem[]>>((acc, source) => {
    const items = enabledItems.filter((i) => i.source === source);
    if (items.length > 0) acc[source] = items;
    return acc;
  }, {});

  const formatValue = (item: StatItem): string => {
    if (item.isPercent || isPercent) return `${item.value}%`;
    return item.value.toLocaleString();
  };

  const statusColors = {
    under: '#f59e0b',
    optimal: '#22c55e',
    over: '#ef4444',
  };

  return (
    <Box>
      {/* Header — click to expand */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          py: 0.5,
          px: 0.5,
          borderRadius: 1,
          transition: 'background 0.15s',
          '&:hover': {
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          },
        }}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <ExpandIcon
          sx={{
            fontSize: 16,
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
        <Typography
          sx={{
            flex: 1,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontVariantNumeric: 'tabular-nums',
            color: statusColors[result.status],
          }}
        >
          {isPercent ? `${result.total}%` : result.total.toLocaleString()}
          <Box
            component="span"
            sx={{
              fontWeight: 500,
              fontSize: 10,
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)',
              ml: 0.5,
            }}
          >
            / {isPercent ? `${result.cap}%` : result.cap.toLocaleString()}
          </Box>
        </Typography>
      </Box>

      {/* Expandable detail */}
      <Collapse in={expanded} timeout={200}>
        <Box
          sx={{
            pl: 3,
            pr: 0.5,
            py: 0.5,
            mt: 0.5,
            borderLeft: `2px solid ${alpha(statusColors[result.status], 0.3)}`,
            ml: 1,
          }}
        >
          {Object.entries(grouped).map(([source, items]) => (
            <Box key={source} sx={{ mb: 0.75 }}>
              <Typography
                sx={{
                  fontSize: 9,
                  fontWeight: 600,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.28)',
                  mb: 0.25,
                }}
              >
                {SOURCE_LABELS[source as StatSource]}
              </Typography>
              {items.map((item, idx) => (
                <Box
                  key={`${item.name}-${idx}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    py: 0.15,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)',
                    }}
                  >
                    {item.name}
                    {item.autoDetected && (
                      <Box
                        component="span"
                        sx={{
                          fontSize: 8,
                          ml: 0.5,
                          px: 0.5,
                          py: 0.1,
                          borderRadius: 0.5,
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                          verticalAlign: 'middle',
                        }}
                      >
                        auto
                      </Box>
                    )}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      fontVariantNumeric: 'tabular-nums',
                      color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)',
                      flexShrink: 0,
                      ml: 1,
                    }}
                  >
                    {formatValue(item)}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}

          {/* Disabled items (collapsed) */}
          {result.items.filter((i) => !i.enabled).length > 0 && (
            <Typography
              sx={{
                fontSize: 9,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)',
                mt: 0.5,
                fontStyle: 'italic',
              }}
            >
              +{result.items.filter((i) => !i.enabled).length} inactive sources
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
