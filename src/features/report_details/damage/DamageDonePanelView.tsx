import { Box, Typography, Avatar, LinearProgress } from '@mui/material';
import React, { useState, useMemo } from 'react';

import { useRoleColors } from '../../../hooks';

interface DamageRow {
  id: string;
  name: string;
  total: number;
  dps: number;
  activePercentage: number;
  iconUrl?: string;
  role?: 'dps' | 'tank' | 'healer';
}

interface DamageDonePanelViewProps {
  damageRows: DamageRow[];
  selectedTargetNames?: string[] | null;
}

type SortField = 'name' | 'total' | 'dps' | 'activeDps';
type SortDirection = 'asc' | 'desc';

/**
 * Dumb component that only handles rendering the damage done panel UI
 */
export const DamageDonePanelView: React.FC<DamageDonePanelViewProps> = ({
  damageRows,
  selectedTargetNames,
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

  // Calculate total damage for percentage calculations
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

  // Get color based on player role using theme-aware colors
  const getPlayerColor = roleColors.getPlayerColor;

  return (
    <Box>
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
              sortField === 'name' ? 'rgba(56, 181, 248, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color: sortField === 'name' ? '#38bdf8' : '#ecf0f1',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(56, 181, 248, 0.15)',
              color: '#38bdf8',
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
              sortField === 'total' ? 'rgba(56, 181, 248, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color: sortField === 'total' ? '#38bdf8' : '#ecf0f1',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(56, 181, 248, 0.15)',
              color: '#38bdf8',
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
              sortField === 'dps' ? 'rgba(255, 139, 97, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color: sortField === 'dps' ? roleColors.getPlayerColor('dps') : '#ecf0f1',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 139, 97, 0.15)',
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
              sortField === 'activeDps' ? 'rgba(56, 181, 248, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color: sortField === 'activeDps' ? '#38bdf8' : '#ecf0f1',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(56, 181, 248, 0.15)',
              color: '#38bdf8',
            },
          }}
        >
          Active DPS{getSortIcon('activeDps')}
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
              gridTemplateColumns: '1fr 2fr 100px 100px',
              gap: 2,
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
              }}
              onClick={() => handleSort('activeDps')}
            >
              Active DPS{getSortIcon('activeDps')}
            </Box>
          </Box>

          {/* Data Rows */}
          {sortedRows.map((row, index) => {
            const percentage = ((row.total / totalDamage) * 100).toFixed(2);
            const playerColor = getPlayerColor(row.role);

            return (
              <Box
                key={row.id}
                sx={{
                  // Desktop grid layout
                  display: { xs: 'none', sm: 'grid' },
                  gridTemplateColumns: '1fr 2fr 100px 100px',
                  gap: 2,
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
                      maxWidth: '120px',
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

                {/* Amount with Progress Bar */}
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
                    {percentage}%
                  </Typography>
                  <Box sx={{ width: '200px', minWidth: '200px' }}>
                    <LinearProgress
                      variant="determinate"
                      value={parseFloat(percentage)}
                      sx={roleColors.getProgressBarStyles(playerColor)}
                    />
                  </Box>
                  <Typography
                    sx={{
                      color: roleColors.isDarkMode ? '#ecf0f1' : '#475569',
                      fontSize: '0.875rem',
                      minWidth: '60px',
                      textAlign: 'right',
                      textShadow: roleColors.isDarkMode
                        ? '0 1px 3px rgba(0,0,0,0.5)'
                        : '0 1px 1px rgba(0,0,0,0.15)',
                    }}
                  >
                    {formatNumber(row.total)}
                  </Typography>
                </Box>

                {/* DPS */}
                <Typography
                  sx={{
                    color: roleColors.isDarkMode ? '#ecf0f1' : '#334155',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textAlign: 'right',
                    textShadow: roleColors.isDarkMode
                      ? '0 1px 3px rgba(0,0,0,0.5)'
                      : '0 1px 1px rgba(0,0,0,0.12)',
                  }}
                >
                  {formatNumber(row.dps)}
                </Typography>

                {/* Active DPS */}
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
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textAlign: 'right',
                    textShadow:
                      row.activePercentage > 0
                        ? roleColors.isDarkMode
                          ? '0 1px 3px rgba(0,0,0,0.5)'
                          : '0 1px 0 rgba(14,165,233,0.25)'
                        : roleColors.isDarkMode
                          ? '0 1px 3px rgba(0,0,0,0.5)'
                          : '0 1px 1px rgba(0,0,0,0.1)',
                  }}
                >
                  {row.activePercentage > 0
                    ? formatNumber(Math.round(row.dps / (row.activePercentage / 100)))
                    : 'N/A'}
                </Typography>
              </Box>
            );
          })}

          {/* Mobile Card Layout */}
          {sortedRows.map((row, index) => {
            const percentage = ((row.total / totalDamage) * 100).toFixed(2);
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
                        maxWidth: '150px',
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
                    <Typography
                      sx={{
                        color: '#ecf0f1',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      }}
                    >
                      {formatNumber(row.dps)} DPS
                    </Typography>
                    <Typography
                      sx={{
                        color: row.activePercentage > 0 ? '#38bdf8' : '#888',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      }}
                    >
                      {row.activePercentage > 0
                        ? `${formatNumber(Math.round(row.dps / (row.activePercentage / 100)))} Active`
                        : 'N/A Active'}
                    </Typography>
                  </Box>
                </Box>

                {/* Mobile Progress Bar and Amount */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography
                    sx={{
                      color: '#ecf0f1',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      minWidth: '45px',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  >
                    {percentage}%
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <LinearProgress
                      variant="determinate"
                      value={parseFloat(percentage)}
                      sx={{
                        ...roleColors.getProgressBarStyles(playerColor),
                        height: 6, // Slightly smaller for mobile
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      color: '#ecf0f1',
                      fontSize: '0.8rem',
                      minWidth: '70px',
                      textAlign: 'right',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  >
                    {formatNumber(row.total)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Typography>No damage events found.</Typography>
      )}
    </Box>
  );
};
