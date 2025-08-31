import { Box, Typography, Avatar, LinearProgress } from '@mui/material';
import React, { useState, useMemo } from 'react';

import { useRoleColors } from '../../../hooks';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { KnownAbilities } from '../../../types/abilities';

interface HealingRow {
  id: string;
  name: string;
  raw: number;
  hps: number;
  overheal: number;
  overhealHps: number;
  overhealPercentage: number;
  iconUrl?: string;
  ressurects: number;
  role?: 'dps' | 'tank' | 'healer';
}

interface HealingDonePanelViewProps {
  healingRows: HealingRow[];
}

type SortField = 'name' | 'raw' | 'hps' | 'overheal';
type SortDirection = 'asc' | 'desc';

/**
 * Dumb component that only handles rendering the healing done panel UI
 */
export const HealingDonePanelView: React.FC<HealingDonePanelViewProps> = ({ healingRows }) => {
  const roleColors = useRoleColors();
  const { reportId, fightId } = useSelectedReportAndFight();
  const [sortField, setSortField] = useState<SortField>('raw');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort the healing rows based on current sort settings
  const sortedRows = useMemo(() => {
    return [...healingRows].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'raw':
          aValue = a.raw;
          bValue = b.raw;
          break;
        case 'hps':
          aValue = a.hps;
          bValue = b.hps;
          break;
        case 'overheal':
          aValue = a.overheal;
          bValue = b.overheal;
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
  }, [healingRows, sortField, sortDirection]);

  // Calculate total healing for percentage calculations
  const totalHealing = sortedRows.reduce((sum, row) => sum + row.raw, 0);

  // Handle column header clicks for sorting
  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Get sort indicator icon
  const getSortIcon = (field: SortField): string => {
    if (sortField !== field) return ' ⇅';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // Format numbers for display with commas as thousand separators
  const formatNumber = (num: number): string => {
    return Math.round(num).toLocaleString();
  };

  // Get color based on player role using theme-aware colors
  const getPlayerColor = roleColors.getPlayerColor;

  const handleResurrectClick = (playerId: string): void => {
    if (reportId && fightId) {
      const url = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=casts&ability=${KnownAbilities.RESURRECT}&source=${playerId}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6">Healing Done By Player</Typography>
        <Typography
          variant="caption"
          sx={{
            color: roleColors.isDarkMode ? '#888' : '#64748b',
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
              sortField === 'name' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color: sortField === 'name' ? '#38bdf8' : roleColors.isDarkMode ? '#ecf0f1' : '#334155',
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
          onClick={() => handleSort('raw')}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: '12px',
            backgroundColor:
              sortField === 'raw' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color: sortField === 'raw' ? '#38bdf8' : roleColors.isDarkMode ? '#ecf0f1' : '#334155',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(56, 181, 248, 0.15)',
              color: '#38bdf8',
            },
          }}
        >
          Amount{getSortIcon('raw')}
        </Box>
        <Box
          onClick={() => handleSort('hps')}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: '12px',
            backgroundColor:
              sortField === 'hps' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color: sortField === 'hps' ? '#38bdf8' : roleColors.isDarkMode ? '#ecf0f1' : '#334155',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(56, 181, 248, 0.15)',
              color: '#38bdf8',
            },
          }}
        >
          HPS{getSortIcon('hps')}
        </Box>
        <Box
          onClick={() => handleSort('overheal')}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: '12px',
            backgroundColor:
              sortField === 'overheal' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.75rem',
            color:
              sortField === 'overheal' ? '#38bdf8' : roleColors.isDarkMode ? '#ecf0f1' : '#334155',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(56, 181, 248, 0.15)',
              color: '#38bdf8',
            },
          }}
        >
          Overheal{getSortIcon('overheal')}
        </Box>
      </Box>

      {healingRows.length > 0 ? (
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
              height: '50%',
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
              transform: 'skewX(-25deg)',
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
              gridTemplateColumns: '2fr 3fr 1fr 1fr',
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
                height: '50%',
                background: roleColors.isDarkMode
                  ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(15,23,42,0.08), transparent)',
                transform: 'skewX(-25deg)',
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
              onClick={() => handleSort('raw')}
            >
              Amount{getSortIcon('raw')}
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
              onClick={() => handleSort('hps')}
            >
              HPS{getSortIcon('hps')}
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
              onClick={() => handleSort('overheal')}
            >
              Overheal{getSortIcon('overheal')}
            </Box>
          </Box>

          {/* Data Rows */}
          {sortedRows.map((row, index) => {
            const percentage = ((row.raw / totalHealing) * 100).toFixed(2);
            const playerColor = getPlayerColor(row.role);

            return (
              <Box
                key={row.id}
                sx={{
                  // Desktop grid layout
                  display: { xs: 'none', sm: 'grid' },
                  gridTemplateColumns: '2fr 3fr 1fr 1fr',
                  gap: 2,
                  p: 1.5,
                  backgroundColor: 'transparent',
                  borderBottom:
                    index < healingRows.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
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
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                      ...(roleColors.isDarkMode
                        ? {
                            color: playerColor,
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
                      minWidth: '48px',
                      textShadow: roleColors.isDarkMode
                        ? '0 1px 3px rgba(0,0,0,0.5)'
                        : '0 1px 1px rgba(0,0,0,0.15)',
                    }}
                  >
                    {percentage}%
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: '80px' }}>
                    <LinearProgress
                      variant="determinate"
                      value={parseFloat(percentage)}
                      sx={{
                        ...roleColors.getProgressBarStyles(playerColor),
                      }}
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
                    {formatNumber(row.raw)}
                  </Typography>
                </Box>

                {/* HPS */}
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
                  {formatNumber(row.hps)}
                </Typography>

                {/* Overheal */}
                <Typography
                  sx={{
                    color: roleColors.isDarkMode ? '#b388ff' : '#7c3aed',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    textAlign: 'right',
                    textShadow: roleColors.isDarkMode
                      ? '0 1px 3px rgba(0,0,0,0.5)'
                      : '0 1px 0 rgba(124,58,237,0.2)',
                  }}
                >
                  {formatNumber(row.overheal)}
                </Typography>
              </Box>
            );
          })}

          {/* Mobile Card Layout */}
          {sortedRows.map((row, index) => {
            const percentage = ((row.raw / totalHealing) * 100).toFixed(2);
            const playerColor = getPlayerColor(row.role);

            return (
              <Box
                key={`mobile-${row.id}`}
                sx={{
                  display: { xs: 'block', sm: 'none' },
                  p: 2,
                  backgroundColor: 'transparent',
                  borderBottom:
                    index < healingRows.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  position: 'relative',
                  zIndex: 1,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                {/* Mobile Header: Name and HPS */}
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
                        sx={{ width: 28, height: 28, flexShrink: 0 }}
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
                          ? { color: playerColor }
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
                  <Typography
                    sx={{
                      color: roleColors.isDarkMode ? '#ecf0f1' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textShadow: roleColors.isDarkMode
                        ? '0 1px 3px rgba(0,0,0,0.5)'
                        : '0 1px 1px rgba(0,0,0,0.12)',
                      ml: 1,
                    }}
                  >
                    {formatNumber(row.hps)} HPS
                  </Typography>
                </Box>

                {/* Mobile Progress Bar and Amount */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography
                    sx={{
                      color: roleColors.isDarkMode ? '#ecf0f1' : '#334155',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      minWidth: '45px',
                      textShadow: roleColors.isDarkMode
                        ? '0 1px 3px rgba(0,0,0,0.5)'
                        : '0 1px 1px rgba(0,0,0,0.1)',
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
                      color: roleColors.isDarkMode ? '#ecf0f1' : '#334155',
                      fontSize: '0.8rem',
                      minWidth: '70px',
                      textAlign: 'right',
                      textShadow: roleColors.isDarkMode
                        ? '0 1px 3px rgba(0,0,0,0.5)'
                        : '0 1px 1px rgba(0,0,0,0.1)',
                    }}
                  >
                    {formatNumber(row.raw)}
                  </Typography>
                </Box>

                {/* Mobile Overheal and Resurrects */}
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography
                    sx={{
                      color: roleColors.isDarkMode ? '#ff9800' : '#ea580c',
                      fontSize: '0.8rem',
                      textShadow: roleColors.isDarkMode
                        ? '0 1px 3px rgba(0,0,0,0.5)'
                        : '0 1px 0 rgba(234,88,12,0.2)',
                    }}
                  >
                    Overheal: {formatNumber(row.overheal)}
                  </Typography>
                  {row.ressurects > 0 && (
                    <Box
                      onClick={() => handleResurrectClick(row.id)}
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '12px',
                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                        border: '1px solid rgba(76, 175, 80, 0.4)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        fontSize: '0.7rem',
                        color: '#38bdf8',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(56, 181, 248, 0.3)',
                        },
                      }}
                    >
                      💀 {row.ressurects}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Typography>No healing events found.</Typography>
      )}
    </Box>
  );
};
