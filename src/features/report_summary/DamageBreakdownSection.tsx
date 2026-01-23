import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
} from '@mui/material';
import React from 'react';

import { ReportDamageBreakdown } from '../../types/reportSummaryTypes';

// Damage type icon mapping (from insights panel)
const DAMAGE_TYPE_ICONS: Record<string, string> = {
  'Direct Damage': '🎯',
  Direct: '🎯',
  'Damage over Time': '🔄',
  DOT: '🔄',
  'Area of Effect': '💥',
  AOE: '💥',
  'Single Target': '🎯',
  Magic: '✨',
  Martial: '⚔️',
  Physical: '⚔️',
  Fire: '🔥',
  Frost: '❄️',
  Shock: '⚡',
  Poison: '☠️',
  Disease: '🦠',
  Bleed: '🩸',
  'Status Effects': '🌟',
};

// Damage type color mapping (from insights panel)
const DAMAGE_TYPE_COLORS: Record<string, string> = {
  'Direct Damage': '#F59E0B',
  Direct: '#F59E0B',
  'Damage over Time': '#10B981',
  DOT: '#10B981',
  'Area of Effect': '#EF4444',
  AOE: '#EF4444',
  'Single Target': '#3B82F6',
  Magic: '#6366F1',
  Martial: '#8B5A2B',
  Physical: '#8B5A2B',
  Fire: '#EF4444',
  Frost: '#3B82F6',
  Shock: '#8B5CF6',
  Poison: '#10B981',
  Disease: '#8B5CF6',
  Bleed: '#DC2626',
  'Status Effects': '#F59E0B',
};

interface DamageBreakdownSectionProps {
  damageBreakdown?: ReportDamageBreakdown;
  isLoading: boolean;
  error?: string;
}

const DamageBreakdownSection: React.FC<DamageBreakdownSectionProps> = ({
  damageBreakdown,
  isLoading,
  error,
}) => {
  if (error) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Damage Breakdown
          </Typography>
          <Alert severity="error">Failed to load damage data: {error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !damageBreakdown) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Damage Breakdown
          </Typography>
          <DamageBreakdownSkeleton />
        </CardContent>
      </Card>
    );
  }

  // Calculate highest damage for relative progress bars
  const highestDamage =
    damageBreakdown.playerBreakdown.length > 0 ? damageBreakdown.playerBreakdown[0].totalDamage : 1;

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h5">Damage Breakdown</Typography>
          <Chip
            label={formatDamage(damageBreakdown.totalDamage)}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${formatNumber(damageBreakdown.dps)} DPS`}
            color="secondary"
            variant="outlined"
          />
        </Box>

        {/* Top Players List */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Top Damage Dealers
          </Typography>
          <Paper variant="outlined">
            <List>
              {damageBreakdown.playerBreakdown.slice(0, 5).map((player, index) => (
                <React.Fragment key={player.playerId}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1">
                            #{index + 1} {player.playerName}
                          </Typography>
                          {player.role && (
                            <Chip
                              label={player.role}
                              size="small"
                              color={getRoleColor(player.role)}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">
                              {formatDamage(player.totalDamage)} • {formatNumber(player.dps)} DPS
                            </Typography>
                            <Typography variant="body2">
                              {player.damagePercentage.toFixed(1)}% of total
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={(player.totalDamage / highestDamage) * 100}
                            sx={{ height: 6, borderRadius: 3 }}
                            color={getPerformanceColor(player.damagePercentage)}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < 4 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>

        {/* Damage Type Breakdown */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Damage Type Distribution
          </Typography>
          <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
            <List disablePadding>
              {damageBreakdown.abilityTypeBreakdown.map((type, index) => {
                const icon = DAMAGE_TYPE_ICONS[type.abilityType] || '💥';
                const color = DAMAGE_TYPE_COLORS[type.abilityType] || '#6B7280';

                return (
                  <React.Fragment key={type.abilityType}>
                    <ListItem sx={{ py: 1.5, pl: 0.5, pr: 1.5 }}>
                      <Box sx={{ width: '100%' }}>
                        {/* Progress bar container with content inside */}
                        <Box
                          sx={{
                            position: 'relative',
                            height: 48,
                            borderRadius: 2,
                            overflow: 'hidden',
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(0,0,0,0.06)',
                          }}
                        >
                          {/* Progress bar fill */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              height: '100%',
                              width: `${Math.max(0, Math.min(100, type.percentage))}%`,
                              bgcolor: color,
                              borderRadius: 2,
                              transition: 'width 0.3s ease-in-out',
                            }}
                          />

                          {/* Content overlay */}
                          <Box
                            sx={{
                              position: 'relative',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              px: 2,
                              zIndex: 1,
                            }}
                          >
                            {/* Icon */}
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: 'transparent',
                                fontSize: '1.2rem',
                                filter:
                                  'drop-shadow(0px 0px 2px rgba(0,0,0,0.8)) drop-shadow(0px 0px 4px rgba(255,255,255,0.3))',
                                textShadow:
                                  '0px 0px 2px rgba(0,0,0,0.9), 0px 0px 4px rgba(255,255,255,0.4)',
                              }}
                              variant="rounded"
                            >
                              {icon}
                            </Avatar>

                            {/* Labels */}
                            <Box sx={{ flex: 1, minWidth: 0, ml: 1.5 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: 'white',
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                  lineHeight: 1.2,
                                }}
                              >
                                {type.abilityType}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(255,255,255,0.9)',
                                    textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                    fontWeight: 500,
                                  }}
                                >
                                  {formatDamage(type.totalDamage)} dmg
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(255,255,255,0.7)',
                                    textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                  }}
                                >
                                  •
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(255,255,255,0.9)',
                                    textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                    fontWeight: 500,
                                  }}
                                >
                                  {formatNumber(type.hitCount)} hits
                                </Typography>
                              </Box>
                            </Box>

                            {/* Percentage */}
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                minWidth: 60,
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: 'white',
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                }}
                              >
                                {type.percentage.toFixed(1)}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </ListItem>
                    {index < damageBreakdown.abilityTypeBreakdown.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          </Box>
        </Box>

        {/* Player Details Table */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Player Performance Details
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Total Damage</TableCell>
                  <TableCell align="right">DPS</TableCell>
                  <TableCell align="right">% of Total</TableCell>
                  <TableCell align="right">Performance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {damageBreakdown.playerBreakdown.map((player) => (
                  <TableRow key={player.playerId}>
                    <TableCell component="th" scope="row">
                      {player.playerName}
                    </TableCell>
                    <TableCell>
                      {player.role && (
                        <Chip label={player.role} size="small" color={getRoleColor(player.role)} />
                      )}
                    </TableCell>
                    <TableCell align="right">{formatDamage(player.totalDamage)}</TableCell>
                    <TableCell align="right">{formatNumber(player.dps)}</TableCell>
                    <TableCell align="right">{player.damagePercentage.toFixed(1)}%</TableCell>
                    <TableCell align="right" sx={{ width: 120 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(player.totalDamage / highestDamage) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                        color={getPerformanceColor(player.damagePercentage)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

const DamageBreakdownSkeleton: React.FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Skeleton variant="rectangular" width={120} height={32} />
        <Skeleton variant="rectangular" width={100} height={32} />
      </Box>

      <Typography variant="h6" gutterBottom>
        <Skeleton width="40%" />
      </Typography>
      <Skeleton variant="rectangular" height={200} sx={{ mb: 4 }} />

      <Typography variant="h6" gutterBottom>
        <Skeleton width="50%" />
      </Typography>
      <Skeleton variant="rectangular" height={200} sx={{ mb: 4 }} />

      <Typography variant="h6" gutterBottom>
        <Skeleton width="45%" />
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={48} />
        ))}
      </Box>
    </Box>
  );
};

// Export memoized component
// eslint-disable-next-line import/no-default-export
export default React.memo(DamageBreakdownSection);
export { DamageBreakdownSection };

// Helper functions
function formatDamage(damage: number): string {
  if (damage >= 1000000) {
    return `${(damage / 1000000).toFixed(1)}M`;
  } else if (damage >= 1000) {
    return `${(damage / 1000).toFixed(1)}K`;
  }
  return damage.toString();
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(Math.round(num));
}

function getRoleColor(
  role: string,
): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
  switch (role.toLowerCase()) {
    case 'tank':
      return 'primary';
    case 'healer':
      return 'success';
    case 'dps':
      return 'error';
    default:
      return 'secondary';
  }
}

function getPerformanceColor(
  percentage: number,
): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
  if (percentage >= 20) return 'success';
  if (percentage >= 15) return 'primary';
  if (percentage >= 10) return 'warning';
  return 'error';
}
