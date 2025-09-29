import React from 'react';
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
} from '@mui/material';

import { ReportDamageBreakdown } from '../../types/reportSummaryTypes';

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
          <Alert severity="error">
            Failed to load damage data: {error}
          </Alert>
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

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h5">
            Damage Breakdown
          </Typography>
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
                            value={player.damagePercentage}
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
          <Paper variant="outlined">
            <List>
              {damageBreakdown.abilityTypeBreakdown.map((type, index) => (
                <React.Fragment key={type.abilityType}>
                  <ListItem>
                    <ListItemText
                      primary={type.abilityType}
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">
                              {formatDamage(type.totalDamage)} • {formatNumber(type.hitCount)} hits
                            </Typography>
                            <Typography variant="body2">
                              {type.percentage.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={type.percentage}
                            sx={{ 
                              height: 6, 
                              borderRadius: 3,
                              backgroundColor: 'action.hover',
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < damageBreakdown.abilityTypeBreakdown.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
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
                        <Chip 
                          label={player.role} 
                          size="small" 
                          color={getRoleColor(player.role)}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {formatDamage(player.totalDamage)}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(player.dps)}
                    </TableCell>
                    <TableCell align="right">
                      {player.damagePercentage.toFixed(1)}%
                    </TableCell>
                    <TableCell align="right" sx={{ width: 120 }}>
                      <LinearProgress
                        variant="determinate"
                        value={player.damagePercentage}
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

function getRoleColor(role: string): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
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

function getPerformanceColor(percentage: number): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
  if (percentage >= 20) return 'success';
  if (percentage >= 15) return 'primary';
  if (percentage >= 10) return 'warning';
  return 'error';
}

