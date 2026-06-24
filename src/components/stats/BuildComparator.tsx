/**
 * BuildComparator — side-by-side stat comparison of 2–N columns (builds /
 * loadouts / setups) with per-row deltas against a baseline column.
 *
 * Neutral / presentational: consumes pre-computed ComparatorColumns (see
 * comparatorColumns.ts), so it never imports a feature. Higher is better for
 * every row here, so a positive delta is green and a negative delta is red.
 *
 * ⚠️ Max Health / EHP / Mitigation are research-derived estimates pending in-game
 * validation (see the engine constants + PR).
 */

import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import type { ComparatorColumn } from './comparatorColumns';

export interface BuildComparatorProps {
  columns: ComparatorColumn[];
  /** Column index deltas are measured against (default 0). */
  baselineIndex?: number;
}

interface RowDef {
  key: string;
  label: string;
  percent?: boolean;
  get: (c: ComparatorColumn) => number;
}

const ROWS: RowDef[] = [
  { key: 'pen', label: 'Penetration', get: (c) => c.stats.penetration.total },
  { key: 'critDmg', label: 'Crit Damage', percent: true, get: (c) => c.stats.critDamage.total },
  { key: 'critChance', label: 'Crit Chance', percent: true, get: (c) => c.stats.critChance.total },
  { key: 'resist', label: 'Resistance', get: (c) => c.survivability.physical.resistance },
  {
    key: 'mitigation',
    label: 'Mitigation',
    percent: true,
    get: (c) => Math.round(c.survivability.physical.mitigation * 100),
  },
  { key: 'health', label: 'Max Health', get: (c) => c.survivability.health.total },
  {
    key: 'ehp',
    label: 'Effective HP',
    get: (c) => Math.min(c.survivability.physical.ehp, c.survivability.spell.ehp),
  },
];

const fmt = (v: number, percent?: boolean): string => (percent ? `${v}%` : v.toLocaleString());

const SURVIVABILITY_KEYS = new Set(['resist', 'mitigation', 'health', 'ehp']);

export const BuildComparator: React.FC<BuildComparatorProps> = ({ columns, baselineIndex = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (columns.length < 2) {
    return (
      <Typography sx={{ p: 2, fontSize: 13, color: 'text.secondary' }}>
        Select at least two to compare.
      </Typography>
    );
  }

  const baseline = columns[baselineIndex] ?? columns[0];
  const cellBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const headerBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const labelColColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  const valueColor = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)';
  // Light-theme deltas darkened to meet AA contrast on the near-white cells.
  const upColor = isDark ? '#4ade80' : '#15803d';
  const downColor = isDark ? '#f87171' : '#b91c1c';

  const gridTemplateColumns = `minmax(116px, 1.1fr) repeat(${columns.length}, minmax(104px, 1fr))`;
  const stickySx = {
    position: 'sticky' as const,
    left: 0,
    zIndex: 1,
    background: isDark ? '#0f172a' : '#f8fafc',
  };

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 10.5,
          color: 'text.secondary',
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <Box component="span" aria-hidden>
          ⚠
        </Box>
        Resistance, Mitigation, Max Health and Effective HP are research-derived estimates pending
        in-game validation.
      </Typography>
      <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
        <Box sx={{ minWidth: 'min-content' }}>
          {/* Header row */}
          <Box sx={{ display: 'grid', gridTemplateColumns }}>
            {/* Sticky corner — opaque so horizontally-scrolled cells can't bleed through. */}
            <Box sx={{ ...stickySx, p: 1, borderBottom: `1px solid ${cellBorder}` }} />
            {columns.map((c, i) => (
              <Box
                key={c.id}
                sx={{
                  p: 1,
                  borderBottom: `1px solid ${cellBorder}`,
                  borderLeft: `1px solid ${cellBorder}`,
                  background: headerBg,
                  minWidth: 0,
                }}
              >
                <Tooltip arrow title={c.label}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: valueColor,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.label}
                  </Typography>
                </Tooltip>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.25 }}>
                  {i === baselineIndex && (
                    <Typography
                      sx={{
                        fontSize: 8.5,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        px: 0.5,
                        borderRadius: 0.5,
                        color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      }}
                    >
                      Baseline
                    </Typography>
                  )}
                  {c.sublabel && (
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.sublabel}
                    </Typography>
                  )}
                </Stack>
              </Box>
            ))}
          </Box>

          {/* Data rows */}
          {ROWS.map((row, rowIdx) => {
            const baseValue = row.get(baseline);
            const zebra = rowIdx % 2 === 1;
            const rowBg = zebra
              ? isDark
                ? 'rgba(255,255,255,0.015)'
                : 'rgba(0,0,0,0.012)'
              : 'transparent';
            return (
              <Box key={row.key} sx={{ display: 'grid', gridTemplateColumns }}>
                <Box
                  sx={{
                    ...stickySx,
                    background: isDark ? '#0f172a' : '#f8fafc',
                    px: 1,
                    py: 0.75,
                    borderBottom: `1px solid ${cellBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: labelColColor,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                    }}
                  >
                    {row.label}
                    {SURVIVABILITY_KEYS.has(row.key) && (
                      <Tooltip arrow title="Research-derived estimate pending in-game validation">
                        <Box
                          component="span"
                          role="img"
                          aria-label="estimated value"
                          sx={{ ml: 0.4, fontSize: 9, opacity: 0.7, cursor: 'help' }}
                        >
                          ⚠
                        </Box>
                      </Tooltip>
                    )}
                  </Typography>
                </Box>
                {columns.map((c, i) => {
                  const value = row.get(c);
                  const delta = value - baseValue;
                  const isBaseline = i === baselineIndex;
                  return (
                    <Box
                      key={c.id}
                      sx={{
                        px: 1,
                        py: 0.75,
                        borderBottom: `1px solid ${cellBorder}`,
                        borderLeft: `1px solid ${cellBorder}`,
                        background: rowBg,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: valueColor,
                          fontVariantNumeric: 'tabular-nums',
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                        }}
                      >
                        {fmt(value, row.percent)}
                      </Typography>
                      {!isBaseline && (
                        <Typography
                          sx={{
                            fontSize: 10,
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            color:
                              delta === 0
                                ? isDark
                                  ? 'rgba(255,255,255,0.3)'
                                  : 'rgba(0,0,0,0.3)'
                                : delta > 0
                                  ? upColor
                                  : downColor,
                          }}
                        >
                          {delta === 0
                            ? '—'
                            : `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta), row.percent)}`}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};
