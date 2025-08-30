import { Box, Typography, Avatar, LinearProgress } from '@mui/material';
import React, { useState, useMemo } from 'react';

interface DamageRow {
  id: string;
  name: string;
  total: number;
  dps: number;
  iconUrl?: string;
  role?: 'dps' | 'tank' | 'healer';
}

interface DamageDonePanelViewProps {
  damageRows: DamageRow[];
}

type SortField = 'name' | 'total' | 'dps';
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

  // Calculate max damage for percentage calculations
  const maxDamage = Math.max(...sortedRows.map((row) => row.total));

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
        return '#ff6b35'; // Orange for DPS (default)
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
          }}
        >
          Click column headers to sort
        </Typography>
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
              'linear-gradient(135deg, rgb(110 214 240 / 25%) 0%, rgb(131 208 227 / 15%) 50%, rgb(35 122 144 / 8%) 100%)',
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
              display: 'grid',
              gridTemplateColumns: '1fr 2fr 1fr',
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
                '&:hover': { color: '#4caf50' },
              }}
              onClick={() => handleSort('name')}
            >
              Name{getSortIcon('name')}
            </Box>
            <Box
              sx={{
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': { color: '#4caf50' },
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
                '&:hover': { color: '#4caf50' },
              }}
              onClick={() => handleSort('dps')}
            >
              DPS{getSortIcon('dps')}
            </Box>
          </Box>

          {/* Data Rows */}
          {sortedRows.map((row, index) => {
            const percentage = ((row.total / maxDamage) * 100).toFixed(2);
            const playerColor = getPlayerColor(row.role);

            return (
              <Box
                key={row.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 1fr',
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
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
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
