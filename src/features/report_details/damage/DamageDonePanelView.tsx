import { Box, Typography, Avatar, LinearProgress, Tooltip } from '@mui/material';
import React, { useState, useMemo } from 'react';

import { useRoleColors } from '../../../hooks';
import { MUTED_ORANGE_PROGRESS_DARK, MUTED_ORANGE_PROGRESS_LIGHT } from '../../../utils/roleColors';
import type { DamageOverTimeResult } from '../../../workers/calculations/CalculateDamageOverTime';

import { DamageTimelineChart } from './DamageTimelineChart';

interface DamageRow {
  id: string;
  name: string;
  total: number;
  dps: number;
  activePercentage: number;
  criticalDamagePercent: number;
  criticalDamageTotal: number;
  iconUrl?: string;
  role?: 'dps' | 'tank' | 'healer';
  deaths: number;
  resurrects: number;
  cpm: number;
}

interface DamageDonePanelViewProps {
  damageRows: DamageRow[];
  selectedTargetNames?: string[] | null;
  damageOverTimeData?: DamageOverTimeResult | null;
  isDamageOverTimeLoading?: boolean;
  selectedTargetIds?: Set<number>;
  availableTargets?: Array<{ id: number; name: string }>;
}

type SortField = 'name' | 'total' | 'dps' | 'activeDps' | 'criticalDamage';
type SortDirection = 'asc' | 'desc';

/**
 * Dumb component that only handles rendering the damage done panel UI
 */
export const DamageDonePanelView: React.FC<DamageDonePanelViewProps> = ({
  damageRows,
  selectedTargetNames,
  damageOverTimeData,
  isDamageOverTimeLoading = false,
  selectedTargetIds = new Set(),
  availableTargets = [],
}) => {
  const roleColors = useRoleColors();
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort the damage rows based on current sort settings
  const sortedRows = useMemo(() => {
    return [...damageRows].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'dps':
          aValue = a.dps;
          bValue = b.dps;
          break;
        case 'activeDps':
          aValue = a.activePercentage > 0 ? a.dps / (a.activePercentage / 100) : 0;
          bValue = b.activePercentage > 0 ? b.dps / (b.activePercentage / 100) : 0;
          break;
        case 'criticalDamage':
          aValue = a.criticalDamageTotal;
          bValue = b.criticalDamageTotal;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [damageRows, sortField, sortDirection]);

  // Find the highest damage for progress bar calculations
  const maxDamage = sortedRows.length > 0 ? Math.max(...sortedRows.map((row) => row.total)) : 1;

  // Calculate total damage for percentage display
  const totalDamage = sortedRows.reduce((sum, row) => sum + row.total, 0);

  // Handle column header clicks for sorting
  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc'); // Default to desc for numeric fields, asc for name
    }
  };

  // Get sort indicator icon
  const getSortIcon = (field: SortField): string => {
    if (sortField !== field) return ' ⇅'; // Show sortable indicator for inactive columns
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // Format numbers for display with commas as thousand separators
  const formatNumber = (num: number): string => {
    return Math.round(num).toLocaleString();
  };

  // Format numbers in short format (k for thousands, m for millions)
  const formatNumberShort = (num: number): string => {
    const rounded = Math.round(num);
    if (rounded >= 1000000) {
      return `${(rounded / 1000000).toFixed(1)}m`;
    } else if (rounded >= 1000) {
      return `${(rounded / 1000).toFixed(1)}k`;
    }
    return rounded.toString();
  };

  const formatPercent = (num: number): string => {
    if (!Number.isFinite(num)) return '0%';
    const precision = Math.abs(num) >= 10 ? 0 : 1;
    return `${num.toFixed(precision)}%`;
  };

  // Get color based on player role using theme-aware colors
  const getPlayerColor = roleColors.getPlayerColor;

  return (
    <Box data-testid="damage-done-panel">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6">
          ⚔️ Damage Done By Player
          {selectedTargetNames && selectedTargetNames.length > 0 && (
            <Typography component="span" variant="body2" sx={{ color: 'primary.main', ml: 1 }}>
              (vs{' '}
              {selectedTargetNames.length === 1
                ? selectedTargetNames[0]
                : `${selectedTargetNames.length} targets`}
              )
            </Typography>
          )}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: '#888',
            fontSize: '0.75rem',
            fontStyle: 'italic',
            display: { xs: 'none', sm: 'block' },
          }}
        >
          Click column headers to sort
        </Typography>
      </Box>

      {/* Mobile Sort Controls - Simplified and Mobile-Friendly */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          mb: 2,
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            backgroundColor: roleColors.isDarkMode
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.06)',
            borderRadius: '12px',
            padding: '4px',
            border: roleColors.isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : '1px solid rgba(0, 0, 0, 0.1)',
            gap: '2px',
          }}
        >
          {[
            { field: 'name' as SortField, label: 'Name', icon: getSortIcon('name') },
            { field: 'total' as SortField, label: 'Damage', icon: getSortIcon('total') },
            { field: 'dps' as SortField, label: 'DPS', icon: getSortIcon('dps'), accent: true },
            { field: 'activeDps' as SortField, label: 'Active', icon: getSortIcon('activeDps') },
            {
              field: 'criticalDamage' as SortField,
              label: 'Crit',
              icon: getSortIcon('criticalDamage'),
            },
          ].map(({ field, label, icon, accent }) => (
            <Box
              key={field}
              onClick={() => handleSort(field)}
              sx={{
                px: 2,
                py: 1,
                borderRadius: '8px',
                cursor: 'pointer',
                userSelect: 'none',
                minWidth: '48px', // Touch target minimum
                height: '40px', // Touch target minimum
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease',
                fontWeight: sortField === field ? 600 : 500,
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                backgroundColor:
                  sortField === field
                    ? accent
                      ? roleColors.isDarkMode
                        ? 'rgba(255, 139, 97, 0.9)'
                        : 'rgba(255, 139, 97, 0.95)'
                      : roleColors.isDarkMode
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(0, 0, 0, 0.12)'
                    : 'transparent',
                color:
                  sortField === field
                    ? accent
                      ? '#ffffff'
                      : roleColors.isDarkMode
                        ? '#ffffff'
                        : '#000000'
                    : roleColors.isDarkMode
                      ? 'rgba(255, 255, 255, 0.7)'
                      : 'rgba(0, 0, 0, 0.6)',
                '&:hover': {
                  backgroundColor:
                    sortField === field
                      ? accent
                        ? roleColors.isDarkMode
                          ? 'rgba(255, 139, 97, 0.95)'
                          : 'rgba(255, 139, 97, 1)'
                        : roleColors.isDarkMode
                          ? 'rgba(255, 255, 255, 0.2)'
                          : 'rgba(0, 0, 0, 0.16)'
                      : roleColors.isDarkMode
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.03)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Typography sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>{label}</Typography>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 'inherit',
                    opacity: sortField === field ? 1 : 0.7,
                  }}
                >
                  {icon}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      {damageRows.length > 0 ? (
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '25px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow:
              '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
            background: roleColors.getTableBackground(),
            transition: 'all 0.3s ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
              transition: 'left 0.5s ease',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
              borderRadius: '25px 25px 25px 25px',
              pointerEvents: 'none',
            },
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow:
                '0 12px 40px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)',
            },
            '&:hover::before': {
              left: '100%',
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'grid' },
              gridTemplateColumns: '1.5fr 80px 80px 80px 60px 60px 60px',
              gap: 1,
              p: 1.5,
              backgroundColor: 'transparent',
              borderBottom: roleColors.isDarkMode
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(15, 23, 42, 0.08)',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: roleColors.isDarkMode ? '#ecf0f1' : '#334155',
              textShadow: roleColors.isDarkMode
                ? '0 1px 3px rgba(0,0,0,0.5)'
                : '0 1px 1px rgba(0,0,0,0.1)',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '25px',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: roleColors.isDarkMode
                ? '1px solid rgba(255, 255, 255, 0.15)'
                : '1px solid rgba(15, 23, 42, 0.15)',
              boxShadow: roleColors.isDarkMode
                ? '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)'
                : '0 4px 12px 0 rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(15, 23, 42, 0.05)',
              background: roleColors.isDarkMode
                ? 'linear-gradient(135deg, rgba(236, 240, 241, 0.25) 0%, rgba(236, 240, 241, 0.15) 50%, rgba(236, 240, 241, 0.08) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.9) 50%, rgba(241, 245, 249, 0.95) 100%)',
              transition: 'all 0.3s ease',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: roleColors.isDarkMode
                  ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(15,23,42,0.08), transparent)',
                transition: 'left 0.5s ease',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: roleColors.isDarkMode
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)'
                  : 'linear-gradient(180deg, rgba(15,23,42,0.08) 0%, transparent 100%)',
                borderRadius: '25px 25px 25px 25px',
                pointerEvents: 'none',
              },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: roleColors.isDarkMode
                  ? '0 12px 40px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)'
                  : '0 6px 20px 0 rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(15, 23, 42, 0.08)',
              },
              '&:hover::before': {
                left: '100%',
              },
            }}
          >
            <Box
              sx={{
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': {
                  color: roleColors.isDarkMode ? '#38bdf8' : '#0ea5e9',
                },
              }}
              onClick={() => handleSort('name')}
            >
              Name{getSortIcon('name')}
            </Box>
            <Box
              sx={{
                textAlign: 'right',
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': {
                  color: roleColors.isDarkMode ? '#38bdf8' : '#0ea5e9',
                },
              }}
              onClick={() => handleSort('dps')}
            >
              DPS{getSortIcon('dps')}
            </Box>
            <Box
              sx={{
                textAlign: 'right',
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': {
                  color: roleColors.isDarkMode ? '#38bdf8' : '#0ea5e9',
                },
                position: 'relative',
              }}
              onClick={() => handleSort('activeDps')}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 1,
                }}
              >
                Active{getSortIcon('activeDps')}
              </Box>
            </Box>
            <Box
              sx={{
                textAlign: 'right',
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': {
                  color: roleColors.isDarkMode ? '#fbbf24' : '#f59e0b',
                },
              }}
              onClick={() => handleSort('criticalDamage')}
            >
              Crit %{getSortIcon('criticalDamage')}
            </Box>
            <Tooltip title="Deaths" arrow>
              <Box
                sx={{
                  textAlign: 'center',
                }}
              >
                💀
              </Box>
            </Tooltip>
            <Tooltip title="Resurrects" arrow>
              <Box
                sx={{
                  textAlign: 'center',
                }}
              >
                ❤️
              </Box>
            </Tooltip>
            <Tooltip title="Casts Per Minute" arrow>
              <Box
                sx={{
                  textAlign: 'center',
                }}
              >
                🐭
              </Box>
            </Tooltip>
          </Box>

          {/* Data Rows */}
          {sortedRows.map((row, index) => {
            const percentage = ((row.total / maxDamage) * 100).toFixed(2);
            const percentageOfTotal = ((row.total / totalDamage) * 100).toFixed(2);
            const playerColor = getPlayerColor(row.role);

            return (
              <Box
                key={row.id}
                data-testid={`damage-row-${row.id}`}
                sx={{
                  // Desktop grid layout
                  display: { xs: 'none', sm: 'grid' },
                  gridTemplateColumns: '1.5fr 80px 80px 80px 60px 60px 60px',
                  gap: 1,
                  p: 1.5,
                  backgroundColor: 'transparent',
                  borderBottom:
                    index < damageRows.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                {/* Name with Icon and Progress Bar */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  {/* Name Row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    {row.iconUrl && (
                      <Avatar
                        src={row.iconUrl}
                        alt="icon"
                        sx={{ width: 32, height: 32, flexShrink: 0 }}
                      />
                    )}
                    <Typography
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        fontFamily: '"Space Grotesk", "Inter", system-ui',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        ...(roleColors.isDarkMode
                          ? {
                              color: roleColors.getPlayerColor(row.role),
                              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            }
                          : {
                              background: roleColors.getGradientColor(row.role),
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: row.role === 'dps' ? '#ffbd7d00' : 'transparent',
                              textShadow: '0 1px 1px rgba(0,0,0,0.2)',
                            }),
                      }}
                    >
                      {row.name}
                    </Typography>
                  </Box>

                  {/* Progress Bar Row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: roleColors.isDarkMode ? '#ecf0f1' : '#475569',
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        minWidth: '40px',
                        textShadow: roleColors.isDarkMode
                          ? '0 1px 3px rgba(0,0,0,0.5)'
                          : '0 1px 1px rgba(0,0,0,0.15)',
                      }}
                    >
                      {percentageOfTotal}%
                    </Typography>
                    <Tooltip title={`${formatNumber(row.total)} total damage`} arrow>
                      <Box sx={{ flex: 1, minWidth: '80px', position: 'relative', cursor: 'help' }}>
                        {/* Total Damage Progress Bar (Background) - Muted Orange */}
                        <LinearProgress
                          variant="determinate"
                          value={parseFloat(percentage)}
                          sx={{
                            height: 6,
                            borderRadius: 1,
                            backgroundColor: roleColors.isDarkMode
                              ? MUTED_ORANGE_PROGRESS_DARK.background
                              : MUTED_ORANGE_PROGRESS_LIGHT.background,
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 1,
                              background: roleColors.isDarkMode
                                ? MUTED_ORANGE_PROGRESS_DARK.bar
                                : MUTED_ORANGE_PROGRESS_LIGHT.bar,
                            },
                          }}
                        />
                        {/* Critical Damage Progress Bar (Overlay) - Role Colors */}
                        <LinearProgress
                          variant="determinate"
                          value={(row.criticalDamageTotal / maxDamage) * 100}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '100%',
                            backgroundColor: 'transparent',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 1,
                              background: playerColor,
                              opacity: 0.85,
                            },
                          }}
                        />
                      </Box>
                    </Tooltip>
                  </Box>
                </Box>

                {/* DPS */}
                <Box
                  sx={{
                    textAlign: 'right',
                  }}
                >
                  <Tooltip title={formatNumber(row.dps)} arrow>
                    <Typography
                      sx={{
                        color: roleColors.isDarkMode ? '#ffffff' : '#000000',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        textShadow: roleColors.isDarkMode
                          ? '0 1px 3px rgba(0,0,0,0.8)'
                          : '0 1px 2px rgba(255,255,255,0.8)',
                        cursor: 'help',
                      }}
                    >
                      {formatNumberShort(row.dps)}
                    </Typography>
                  </Tooltip>
                </Box>

                {/* Active DPS */}
                <Box
                  sx={{
                    textAlign: 'right',
                  }}
                >
                  {row.activePercentage > 0 ? (
                    <Tooltip
                      title={formatNumber(Math.round(row.dps / (row.activePercentage / 100)))}
                      arrow
                    >
                      <Typography
                        sx={{
                          color: roleColors.isDarkMode ? '#38bdf8' : '#0ea5e9',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          textShadow: roleColors.isDarkMode
                            ? '0 1px 3px rgba(0,0,0,0.5)'
                            : '0 1px 0 rgba(14,165,233,0.25)',
                          cursor: 'help',
                        }}
                      >
                        {formatNumberShort(Math.round(row.dps / (row.activePercentage / 100)))}
                      </Typography>
                    </Tooltip>
                  ) : (
                    <Typography
                      sx={{
                        color: roleColors.isDarkMode ? '#888' : '#64748b',
                        fontWeight: 500,
                        fontSize: '0.8rem',
                        fontStyle: 'italic',
                        opacity: 0.7,
                      }}
                    >
                      —
                    </Typography>
                  )}
                </Box>

                {/* Critical Damage */}
                <Box
                  sx={{
                    textAlign: 'right',
                  }}
                >
                  <Tooltip
                    title={`${formatPercent(row.criticalDamagePercent)} crit (${formatNumber(row.criticalDamageTotal)} dmg)`}
                    arrow
                  >
                    <Typography
                      sx={{
                        color: playerColor,
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        textShadow: roleColors.isDarkMode
                          ? '0 1px 3px rgba(0,0,0,0.5)'
                          : '0 1px 1px rgba(0,0,0,0.12)',
                        cursor: 'help',
                      }}
                    >
                      {formatPercent(row.criticalDamagePercent)}
                    </Typography>
                  </Tooltip>
                </Box>

                {/* Deaths */}
                {row.deaths > 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: roleColors.isDarkMode ? '#f44336' : '#dc2626',
                        textShadow: roleColors.isDarkMode
                          ? '0 1px 3px rgba(0,0,0,0.5)'
                          : '0 1px 0 rgba(220,38,38,0.2)',
                      }}
                    >
                      💀 {row.deaths}
                    </Typography>
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: roleColors.isDarkMode ? '#666' : '#999',
                      textAlign: 'center',
                    }}
                  >
                    —
                  </Typography>
                )}

                {/* Resurrects */}
                {row.resurrects > 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: roleColors.isDarkMode ? '#4ade80' : '#22c55e',
                        textShadow: roleColors.isDarkMode
                          ? '0 1px 3px rgba(0,0,0,0.5)'
                          : '0 1px 0 rgba(34,197,94,0.2)',
                      }}
                    >
                      ❤️ {row.resurrects}
                    </Typography>
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: roleColors.isDarkMode ? '#666' : '#999',
                      textAlign: 'center',
                    }}
                  >
                    —
                  </Typography>
                )}

                {/* CPM */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: roleColors.isDarkMode ? '#ffffff' : '#000000',
                      textShadow: roleColors.isDarkMode
                        ? '0 1px 2px rgba(0,0,0,0.5)'
                        : '0 1px 1px rgba(0,0,0,0.2)',
                    }}
                  >
                    {row.cpm.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
            );
          })}

          {/* Premium Mobile Card Layout */}
          {sortedRows.map((row, _index) => {
            const percentage = ((row.total / maxDamage) * 100).toFixed(2);
            const percentageOfTotal = ((row.total / totalDamage) * 100).toFixed(2);
            const playerColor = getPlayerColor(row.role);
            const isActive = row.activePercentage > 0;

            return (
              <Box
                key={`mobile-${row.id}`}
                sx={{
                  display: { xs: 'block', sm: 'none' },
                  p: '16px',
                  mb: '16px',
                  backgroundColor: roleColors.isDarkMode
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '12px',
                  border: `1px solid ${roleColors.isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
                  boxShadow: roleColors.isDarkMode
                    ? '0 4px 6px rgba(0, 0, 0, 0.3)'
                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: playerColor,
                    opacity: 0.8,
                  },
                }}
              >
                {/* Card Header */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: '12px',
                  }}
                >
                  {/* Player Info Section */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {row.iconUrl && (
                      <Avatar
                        src={row.iconUrl}
                        alt="icon"
                        sx={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          border: `2px solid ${playerColor}`,
                        }}
                      />
                    )}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: roleColors.isDarkMode ? playerColor : 'inherit',
                        }}
                      >
                        {row.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: roleColors.isDarkMode
                            ? 'rgba(255, 255, 255, 0.5)'
                            : 'rgba(0, 0, 0, 0.4)',
                          mt: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {row.role?.toUpperCase()}
                      </Typography>
                    </Box>
                  </Box>

                  {/* DPS Display - Simple and Clean */}
                  <Box sx={{ textAlign: 'right' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '4px',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Tooltip title={formatNumber(row.dps)} arrow>
                        <Typography
                          sx={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: roleColors.isDarkMode ? '#ffffff' : '#000000',
                            cursor: 'help',
                            lineHeight: 1,
                          }}
                        >
                          {formatNumberShort(row.dps)}
                        </Typography>
                      </Tooltip>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: roleColors.isDarkMode
                            ? 'rgba(255, 255, 255, 0.7)'
                            : 'rgba(0, 0, 0, 0.6)',
                          fontWeight: 500,
                          textTransform: 'uppercase',
                        }}
                      >
                        DPS
                      </Typography>
                    </Box>
                    {isActive && (
                      <Tooltip
                        title={formatNumber(Math.round(row.dps / (row.activePercentage / 100)))}
                        arrow
                      >
                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            color: '#38bdf8',
                            fontWeight: 600,
                            mt: '2px',
                            cursor: 'help',
                          }}
                        >
                          {formatNumberShort(Math.round(row.dps / (row.activePercentage / 100)))}{' '}
                          active
                        </Typography>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {/* Progress Section */}
                <Box sx={{ mb: '12px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '4px' }}>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: roleColors.isDarkMode
                          ? 'rgba(255, 255, 255, 0.7)'
                          : 'rgba(0, 0, 0, 0.6)',
                        fontWeight: 600,
                        minWidth: '48px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {percentageOfTotal}%
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
                      {/* Total Damage Progress Bar (Background) - Muted Orange */}
                      <LinearProgress
                        variant="determinate"
                        value={parseFloat(percentage)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: roleColors.isDarkMode
                            ? MUTED_ORANGE_PROGRESS_DARK.background
                            : MUTED_ORANGE_PROGRESS_LIGHT.background,
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            background: roleColors.isDarkMode
                              ? MUTED_ORANGE_PROGRESS_DARK.bar
                              : MUTED_ORANGE_PROGRESS_LIGHT.bar,
                          },
                        }}
                      />
                      {/* Critical Damage Progress Bar (Overlay) - Role Colors */}
                      <LinearProgress
                        variant="determinate"
                        value={(row.criticalDamageTotal / maxDamage) * 100}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '100%',
                          backgroundColor: 'transparent',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            background: playerColor,
                            opacity: 0.85,
                          },
                        }}
                      />
                    </Box>
                    <Tooltip title={formatNumber(row.total)} arrow>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: roleColors.isDarkMode
                            ? 'rgba(255, 255, 255, 0.7)'
                            : 'rgba(0, 0, 0, 0.6)',
                          fontWeight: 600,
                          minWidth: '48px',
                          textAlign: 'right',
                          cursor: 'help',
                        }}
                      >
                        {formatNumberShort(row.total)}
                      </Typography>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Stats Row */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pt: '8px',
                    borderTop: `1px solid ${roleColors.isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
                  }}
                >
                  {/* Left Side: Critical Damage */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box
                        sx={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: playerColor,
                          opacity: 0.8,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: roleColors.isDarkMode
                            ? 'rgba(255, 255, 255, 0.5)'
                            : 'rgba(0, 0, 0, 0.4)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        Crit
                      </Typography>
                      <Tooltip title={formatNumber(row.criticalDamageTotal)} arrow>
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: playerColor,
                            fontWeight: 700,
                            cursor: 'help',
                          }}
                        >
                          {formatNumberShort(row.criticalDamageTotal)}
                        </Typography>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Right Side: Death, Resurrect & CPM Indicators */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {row.deaths > 0 ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          px: '8px',
                          py: '4px',
                          borderRadius: '6px',
                          backgroundColor: roleColors.isDarkMode
                            ? 'rgba(244, 67, 54, 0.15)'
                            : 'rgba(239, 68, 68, 0.08)',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: roleColors.isDarkMode ? '#f87171' : '#dc2626',
                            fontWeight: 700,
                          }}
                        >
                          💀
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: roleColors.isDarkMode ? '#f87171' : '#dc2626',
                            fontWeight: 700,
                          }}
                        >
                          {row.deaths}
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          px: '8px',
                          py: '4px',
                          borderRadius: '6px',
                          backgroundColor: roleColors.isDarkMode
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.03)',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: roleColors.isDarkMode ? '#666' : '#999',
                            fontWeight: 700,
                          }}
                        >
                          💀 0
                        </Typography>
                      </Box>
                    )}
                    {row.resurrects > 0 ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          px: '8px',
                          py: '4px',
                          borderRadius: '6px',
                          backgroundColor: roleColors.isDarkMode
                            ? 'rgba(74, 222, 128, 0.15)'
                            : 'rgba(34, 197, 94, 0.08)',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: roleColors.isDarkMode ? '#4ade80' : '#22c55e',
                            fontWeight: 700,
                          }}
                        >
                          ❤️
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: roleColors.isDarkMode ? '#4ade80' : '#22c55e',
                            fontWeight: 700,
                          }}
                        >
                          {row.resurrects}
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          px: '8px',
                          py: '4px',
                          borderRadius: '6px',
                          backgroundColor: roleColors.isDarkMode
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.03)',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: roleColors.isDarkMode ? '#666' : '#999',
                            fontWeight: 700,
                          }}
                        >
                          ❤️ 0
                        </Typography>
                      </Box>
                    )}
                    {/* CPM */}
                    <Tooltip title="Casts Per Minute" arrow>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          px: '8px',
                          py: '4px',
                          borderRadius: '6px',
                          backgroundColor: roleColors.isDarkMode
                            ? 'rgba(56, 189, 248, 0.15)'
                            : 'rgba(14, 165, 233, 0.08)',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: roleColors.isDarkMode ? '#ffffff' : '#000000',
                            fontWeight: 700,
                          }}
                        >
                          🐭
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: roleColors.isDarkMode ? '#ffffff' : '#000000',
                            fontWeight: 700,
                          }}
                        >
                          {row.cpm.toFixed(1)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Typography>No damage events found.</Typography>
      )}

      {/* Damage Over Time Chart */}
      <Box sx={{ mt: 3 }}>
        <DamageTimelineChart
          damageOverTimeData={damageOverTimeData || null}
          selectedTargetIds={selectedTargetIds}
          availableTargets={availableTargets}
          isLoading={isDamageOverTimeLoading}
          height={400}
        />
      </Box>
    </Box>
  );
};
