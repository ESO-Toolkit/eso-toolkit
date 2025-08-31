import { Box, Typography, Avatar, LinearProgress } from '@mui/material';
import React, { useState, useMemo } from 'react';

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
}

type SortField = 'name' | 'total' | 'dps' | 'activeDps';
type SortDirection = 'asc' | 'desc';

/**
 * Dumb component that only handles rendering the damage done panel UI
 */
export const DamageDonePanelView: React.FC<DamageDonePanelViewProps> = ({ damageRows }) => {
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

  // Get color based on player role
  const getPlayerColor = (role?: 'dps' | 'tank' | 'healer'): string => {
    switch (role) {
      case 'tank':
        return '#62baff'; // Updated blue for tanks
      case 'healer':
        return '#b970ff'; // Updated purple for healers
      case 'dps':
      default:
        return '#ff8b61'; // Orange for DPS (default)
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6">Damage Done By Player</Typography>
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
            color: sortField === 'dps' ? '#ff8b61' : '#ecf0f1',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 139, 97, 0.15)',
              color: '#ff8b61',
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
            background:
              'linear-gradient(135deg, rgba(32, 89, 105, 0.35) 0%, rgba(67, 107, 119, 0.25) 50%, rgba(236, 240, 241, 0.18) 100%)',
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
              gridTemplateColumns: '1fr 2fr 100px 100px',
              gap: 2,
              p: 1.5,
              backgroundColor: 'transparent',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#ecf0f1',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '25px',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow:
                '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
              background:
                'linear-gradient(135deg, rgba(236, 240, 241, 0.25) 0%, rgba(236, 240, 241, 0.15) 50%, rgba(236, 240, 241, 0.08) 100%)',
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
            <Box
              sx={{
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': { color: '#38bdf8' },
              }}
              onClick={() => handleSort('name')}
            >
              Name{getSortIcon('name')}
            </Box>
            <Box
              sx={{
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': { color: '#38bdf8' },
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
                '&:hover': { color: '#38bdf8' },
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
                '&:hover': { color: '#38bdf8' },
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
                      color: playerColor,
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  >
                    {row.name}
                  </Typography>
                </Box>

                {/* Amount with Progress Bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <Typography
                    sx={{
                      color: '#ecf0f1',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      minWidth: '60px',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  >
                    {percentage}%
                  </Typography>
                  <Box sx={{ width: '200px', minWidth: '200px' }}>
                    <LinearProgress
                      variant="determinate"
                      value={parseFloat(percentage)}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        backgroundColor: '#757575',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: playerColor,
                          borderRadius: 1,
                        },
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      color: '#ecf0f1',
                      fontSize: '0.875rem',
                      minWidth: '60px',
                      textAlign: 'right',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  >
                    {formatNumber(row.total)}
                  </Typography>
                </Box>

                {/* DPS */}
                <Typography
                  sx={{
                    color: '#ecf0f1',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textAlign: 'right',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  }}
                >
                  {formatNumber(row.dps)}
                </Typography>

                {/* Active DPS */}
                <Typography
                  sx={{
                    color: row.activePercentage > 0 ? '#38bdf8' : '#888',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textAlign: 'right',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
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
                        sx={{ width: 28, height: 28, flexShrink: 0 }}
                      />
                    )}
                    <Typography
                      sx={{
                        color: playerColor,
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      }}
                    >
                      {row.name}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 1, textAlign: 'right' }}>
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
                        height: 6,
                        borderRadius: 1,
                        backgroundColor: '#757575',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: playerColor,
                          borderRadius: 1,
                        },
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
