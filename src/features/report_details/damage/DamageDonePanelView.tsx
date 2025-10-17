import { Box, Typography, Avatar, LinearProgress, Tooltip } from '@mui/material';
import React, { useState, useMemo } from 'react';

import { useRoleColors } from '../../../hooks';
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
}

interface DamageDonePanelViewProps {
  damageRows: DamageRow[];
  selectedTargetNames?: string[] | null;
  damageOverTimeData?: DamageOverTimeResult | null;
  isDamageOverTimeLoading?: boolean;
  selectedTargetIds?: Set<number>;
  availableTargets?: Array<{ id: number; name: string }>;
}

type SortField = 'name' | 'total' | 'dps' | 'activeDps' | 'criticalDamagePercent';
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
        case 'criticalDamagePercent':
          aValue = a.criticalDamagePercent;
          bValue = b.criticalDamagePercent;
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

      {/* Mobile Sort Controls */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          gap: 1,
          mb: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box
          onClick={() => handleSort('name')}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: '12px',
            backgroundColor:
              sortField === 'name'
                ? roleColors.isDarkMode
                  ? 'rgba(56, 181, 248, 0.2)'
                  : 'rgba(14, 165, 233, 0.1)'
                : roleColors.isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(15, 23, 42, 0.05)',
            border: roleColors.isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.2)'
              : '1px solid rgba(15, 23, 42, 0.1)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color:
              sortField === 'name'
                ? roleColors.isDarkMode
                  ? '#38bdf8'
                  : '#0ea5e9'
                : roleColors.isDarkMode
                  ? '#ecf0f1'
                  : '#334155',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: roleColors.isDarkMode
                ? 'rgba(56, 181, 248, 0.15)'
                : 'rgba(14, 165, 233, 0.08)',
              color: roleColors.isDarkMode ? '#38bdf8' : '#0ea5e9',
            },
          }}
        >
          Name{getSortIcon('name')}
        </Box>
        <Box
          onClick={() => handleSort('total')}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: '12px',
            backgroundColor:
              sortField === 'total'
                ? roleColors.isDarkMode
                  ? 'rgba(56, 181, 248, 0.2)'
                  : 'rgba(14, 165, 233, 0.1)'
                : roleColors.isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(15, 23, 42, 0.05)',
            border: roleColors.isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.2)'
              : '1px solid rgba(15, 23, 42, 0.1)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color:
              sortField === 'total'
                ? roleColors.isDarkMode
                  ? '#38bdf8'
                  : '#0ea5e9'
                : roleColors.isDarkMode
                  ? '#ecf0f1'
                  : '#334155',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: roleColors.isDarkMode
                ? 'rgba(56, 181, 248, 0.15)'
                : 'rgba(14, 165, 233, 0.08)',
              color: roleColors.isDarkMode ? '#38bdf8' : '#0ea5e9',
            },
          }}
        >
          Amount{getSortIcon('total')}
        </Box>
        <Box
          onClick={() => handleSort('dps')}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: '12px',
            backgroundColor:
              sortField === 'dps'
                ? roleColors.isDarkMode
                  ? 'rgba(255, 139, 97, 0.2)'
                  : 'rgba(239, 68, 68, 0.1)'
                : roleColors.isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(15, 23, 42, 0.05)',
            border: roleColors.isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.2)'
              : '1px solid rgba(15, 23, 42, 0.1)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color:
              sortField === 'dps'
                ? roleColors.getPlayerColor('dps')
                : roleColors.isDarkMode
                  ? '#ecf0f1'
                  : '#334155',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: roleColors.isDarkMode
                ? 'rgba(255, 139, 97, 0.15)'
                : 'rgba(239, 68, 68, 0.08)',
              color: roleColors.getPlayerColor('dps'),
            },
          }}
        >
          DPS{getSortIcon('dps')}
        </Box>
        <Box
          onClick={() => handleSort('activeDps')}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: '12px',
            backgroundColor:
              sortField === 'activeDps'
                ? roleColors.isDarkMode
                  ? 'rgba(56, 181, 248, 0.2)'
                  : 'rgba(14, 165, 233, 0.1)'
                : roleColors.isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(15, 23, 42, 0.05)',
            border: roleColors.isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.2)'
              : '1px solid rgba(15, 23, 42, 0.1)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color:
              sortField === 'activeDps'
                ? roleColors.isDarkMode
                  ? '#38bdf8'
                  : '#0ea5e9'
                : roleColors.isDarkMode
                  ? '#ecf0f1'
                  : '#334155',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: roleColors.isDarkMode
                ? 'rgba(56, 181, 248, 0.15)'
                : 'rgba(14, 165, 233, 0.08)',
              color: roleColors.isDarkMode ? '#38bdf8' : '#0ea5e9',
            },
          }}
        >
          Active{getSortIcon('activeDps')}
        </Box>
        <Box
          onClick={() => handleSort('criticalDamagePercent')}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: '12px',
            backgroundColor:
              sortField === 'criticalDamagePercent'
                ? roleColors.isDarkMode
                  ? 'rgba(251, 191, 36, 0.2)'
                  : 'rgba(245, 158, 11, 0.1)'
                : roleColors.isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(15, 23, 42, 0.05)',
            border: roleColors.isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.2)'
              : '1px solid rgba(15, 23, 42, 0.1)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color:
              sortField === 'criticalDamagePercent'
                ? roleColors.isDarkMode
                  ? '#fbbf24'
                  : '#f59e0b'
                : roleColors.isDarkMode
                  ? '#ecf0f1'
                  : '#334155',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: roleColors.isDarkMode
                ? 'rgba(251, 191, 36, 0.15)'
                : 'rgba(245, 158, 11, 0.08)',
              color: roleColors.isDarkMode ? '#fbbf24' : '#f59e0b',
            },
          }}
        >
          Crit %{getSortIcon('criticalDamagePercent')}
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
              gridTemplateColumns: '1.5fr 2fr 80px 80px 80px 60px 60px',
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
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': {
                  color: roleColors.isDarkMode ? '#38bdf8' : '#0ea5e9',
                },
              }}
              onClick={() => handleSort('total')}
            >
              Amount{getSortIcon('total')}
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
              onClick={() => handleSort('criticalDamagePercent')}
            >
              Crit %{getSortIcon('criticalDamagePercent')}
            </Box>
            <Box
              sx={{
                textAlign: 'center',
              }}
            >
              💀
            </Box>
            <Box
              sx={{
                textAlign: 'center',
              }}
            >
              ❤️
            </Box>
          </Box>

          {/* Data Rows */}
          {sortedRows.map((row, index) => {
            const percentage = ((row.total / maxDamage) * 100).toFixed(2);
            const percentageValue = parseFloat(percentage);
            const percentageOfTotal = ((row.total / totalDamage) * 100).toFixed(2);
            const playerColor = getPlayerColor(row.role);

            return (
              <Box
                key={row.id}
                data-testid={`damage-row-${row.id}`}
                sx={{
                  // Desktop grid layout
                  display: { xs: 'none', sm: 'grid' },
                  gridTemplateColumns: '1.5fr 2fr 80px 80px 80px 60px 60px',
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
                {/* Name with Icon */}
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

                {/* Amount with Progress Bars */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <Typography
                    sx={{
                      color: roleColors.isDarkMode ? '#ecf0f1' : '#475569',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      minWidth: '60px',
                      textShadow: roleColors.isDarkMode
                        ? '0 1px 3px rgba(0,0,0,0.5)'
                        : '0 1px 1px rgba(0,0,0,0.15)',
                    }}
                  >
                    {percentageOfTotal}%
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: '100px', position: 'relative' }}>
                    {/* Total Damage Progress Bar (Background) - Yellow/Amber */}
                    <LinearProgress
                      variant="determinate"
                      value={percentageValue}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        backgroundColor: roleColors.isDarkMode
                          ? 'rgba(250, 204, 21, 0.1)'
                          : 'rgba(234, 179, 8, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 1,
                          background: roleColors.isDarkMode
                            ? 'linear-gradient(90deg, #facc15 0%, #eab308 100%)'
                            : 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)',
                        },
                      }}
                    />
                    {/* Critical Damage Progress Bar (Overlay) - Role Colors */}
                    <LinearProgress
                      variant="determinate"
                      value={(percentageValue * row.criticalDamagePercent) / 100}
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
                  <Tooltip title={formatNumber(row.total)} arrow>
                    <Typography
                      sx={{
                        color: roleColors.isDarkMode ? '#ecf0f1' : '#475569',
                        fontSize: '0.875rem',
                        minWidth: '60px',
                        textAlign: 'right',
                        textShadow: roleColors.isDarkMode
                          ? '0 1px 3px rgba(0,0,0,0.5)'
                          : '0 1px 1px rgba(0,0,0,0.15)',
                        cursor: 'help',
                      }}
                    >
                      {formatNumberShort(row.total)}
                    </Typography>
                  </Tooltip>
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
                        color: roleColors.isDarkMode ? '#eab308' : '#ca8a04',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        textShadow: roleColors.isDarkMode
                          ? '0 1px 3px rgba(0,0,0,0.5)'
                          : '0 1px 1px rgba(0,0,0,0.12)',
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
              </Box>
            );
          })}

          {/* Mobile Card Layout */}
          {sortedRows.map((row, index) => {
            const percentage = ((row.total / maxDamage) * 100).toFixed(2);
            const percentageValue = parseFloat(percentage);
            const percentageOfTotal = ((row.total / totalDamage) * 100).toFixed(2);
            const playerColor = getPlayerColor(row.role);

            return (
              <Box
                key={`mobile-${row.id}`}
                sx={{
                  display: { xs: 'block', sm: 'none' },
                  p: 2,
                  backgroundColor: 'transparent',
                  borderBottom:
                    index < damageRows.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  position: 'relative',
                  zIndex: 1,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                {/* Mobile Header: Name and DPS */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
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
                        fontSize: '0.9rem',
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

                  <Box>
                    <Tooltip title={formatNumber(row.dps)} arrow>
                      <Typography
                        sx={{
                          color: roleColors.isDarkMode ? '#eab308' : '#ca8a04',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          textShadow: roleColors.isDarkMode
                            ? '0 1px 3px rgba(0,0,0,0.5)'
                            : '0 1px 1px rgba(0,0,0,0.12)',
                          cursor: 'help',
                        }}
                      >
                        {formatNumberShort(row.dps)} DPS
                      </Typography>
                    </Tooltip>
                    <Tooltip
                      title={
                        row.activePercentage > 0
                          ? formatNumber(Math.round(row.dps / (row.activePercentage / 100)))
                          : 'N/A'
                      }
                      arrow
                    >
                      <Typography
                        sx={{
                          color:
                            row.activePercentage > 0
                              ? roleColors.isDarkMode
                                ? '#38bdf8'
                                : '#0ea5e9'
                              : roleColors.isDarkMode
                                ? '#888'
                                : '#64748b',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          textShadow: roleColors.isDarkMode
                            ? '0 1px 3px rgba(0,0,0,0.5)'
                            : '0 1px 1px rgba(0,0,0,0.1)',
                          cursor: row.activePercentage > 0 ? 'help' : 'default',
                        }}
                      >
                        {row.activePercentage > 0
                          ? `${formatNumberShort(Math.round(row.dps / (row.activePercentage / 100)))} Active`
                          : 'N/A Active'}
                      </Typography>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Mobile Progress Bars and Amount */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography
                    sx={{
                      color: roleColors.isDarkMode ? '#ecf0f1' : '#475569',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      minWidth: '45px',
                      textShadow: roleColors.isDarkMode
                        ? '0 1px 3px rgba(0,0,0,0.5)'
                        : '0 1px 1px rgba(0,0,0,0.15)',
                    }}
                  >
                    {percentageOfTotal}%
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    {/* Total Damage Progress Bar (Background) - Yellow/Amber */}
                    <LinearProgress
                      variant="determinate"
                      value={percentageValue}
                      sx={{
                        height: 6, // Slightly smaller for mobile
                        borderRadius: 1,
                        backgroundColor: roleColors.isDarkMode
                          ? 'rgba(250, 204, 21, 0.1)'
                          : 'rgba(234, 179, 8, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 1,
                          background: roleColors.isDarkMode
                            ? 'linear-gradient(90deg, #facc15 0%, #eab308 100%)'
                            : 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)',
                        },
                      }}
                    />
                    {/* Critical Damage Progress Bar (Overlay) - Role Colors */}
                    <LinearProgress
                      variant="determinate"
                      value={(percentageValue * row.criticalDamagePercent) / 100}
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
                  <Tooltip title={formatNumber(row.total)} arrow>
                    <Typography
                      sx={{
                        color: roleColors.isDarkMode ? '#ecf0f1' : '#475569',
                        fontSize: '0.8rem',
                        minWidth: '70px',
                        textAlign: 'right',
                        textShadow: roleColors.isDarkMode
                          ? '0 1px 3px rgba(0,0,0,0.5)'
                          : '0 1px 1px rgba(0,0,0,0.15)',
                        cursor: 'help',
                      }}
                    >
                      {formatNumberShort(row.total)}
                    </Typography>
                  </Tooltip>
                </Box>

                {/* Critical Damage - Mobile */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography
                    sx={{
                      color: roleColors.isDarkMode ? '#888' : '#64748b',
                      fontSize: '0.75rem',
                      minWidth: '45px',
                    }}
                  >
                    Crit:
                  </Typography>
                  <Tooltip
                    title={`${formatPercent(row.criticalDamagePercent)} crit (${formatNumber(row.criticalDamageTotal)} dmg)`}
                    arrow
                  >
                    <Typography
                      sx={{
                        color: playerColor,
                        fontWeight: 700,
                        fontSize: '0.8rem',
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

                {/* Mobile Death and Resurrect Counters */}
                {(row.deaths > 0 || row.resurrects > 0) && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      mt: 0.5,
                      gap: 0.5,
                    }}
                  >
                    {row.deaths > 0 && (
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '12px',
                          backgroundColor: roleColors.isDarkMode
                            ? 'rgba(244, 67, 54, 0.2)'
                            : 'rgba(239, 68, 68, 0.1)',
                          border: roleColors.isDarkMode
                            ? '1px solid rgba(244, 67, 54, 0.4)'
                            : '1px solid rgba(239, 68, 68, 0.2)',
                          cursor: 'default',
                          userSelect: 'none',
                          fontSize: '0.7rem',
                          color: roleColors.isDarkMode ? '#f44336' : '#dc2626',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        💀 {row.deaths}
                      </Box>
                    )}
                    {row.resurrects > 0 && (
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '12px',
                          backgroundColor: roleColors.isDarkMode
                            ? 'rgba(74, 222, 128, 0.2)'
                            : 'rgba(34, 197, 94, 0.1)',
                          border: roleColors.isDarkMode
                            ? '1px solid rgba(74, 222, 128, 0.4)'
                            : '1px solid rgba(34, 197, 94, 0.2)',
                          cursor: 'default',
                          userSelect: 'none',
                          fontSize: '0.7rem',
                          color: roleColors.isDarkMode ? '#4ade80' : '#22c55e',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        ❤️ {row.resurrects}
                      </Box>
                    )}
                  </Box>
                )}
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
