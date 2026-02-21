/* eslint-disable import/no-default-export */
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  LinearProgress,
} from '@mui/material';
import React from 'react';

import {
  ReportDeathAnalysis,
  MechanicCategory,
  DeathPatternType,
} from '../../types/reportSummaryTypes';

interface DeathAnalysisSectionProps {
  deathAnalysis?: ReportDeathAnalysis;
  isLoading: boolean;
  error?: string;
}

const DeathAnalysisSection: React.FC<DeathAnalysisSectionProps> = ({
  deathAnalysis,
  isLoading,
  error,
}) => {
  if (error) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Death Analysis
          </Typography>
          <Alert severity="error">Failed to load death analysis data: {error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !deathAnalysis) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Death Analysis
          </Typography>
          <DeathAnalysisSkeleton />
        </CardContent>
      </Card>
    );
  }

  const hasDeaths = deathAnalysis.totalDeaths > 0;

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h5">Death Analysis</Typography>
          <Chip
            label={`${deathAnalysis.totalDeaths} Total Deaths`}
            color={deathAnalysis.totalDeaths === 0 ? 'success' : 'error'}
            icon={deathAnalysis.totalDeaths === 0 ? <CheckCircleIcon /> : <ErrorIcon />}
          />
        </Box>

        {!hasDeaths ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="h6">Flawless Performance! 🎉</Typography>
            <Typography>
              No deaths recorded across all fights. Excellent execution by the entire team!
            </Typography>
          </Alert>
        ) : (
          <>
            {/* Death Patterns */}
            {deathAnalysis.deathPatterns.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Key Issues Identified
                </Typography>
                {deathAnalysis.deathPatterns.map((pattern, index) => (
                  <Alert
                    key={index}
                    severity={getSeverityLevel(pattern.severity)}
                    sx={{ mb: 2 }}
                    icon={<WarningIcon />}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      {getPatternTypeLabel(pattern.type)}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {pattern.description}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Suggestion:</strong> {pattern.suggestion}
                    </Typography>
                    {pattern.affectedPlayers.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="caption">Affected players:</Typography>
                        {pattern.affectedPlayers.slice(0, 3).map((player) => (
                          <Chip key={player} label={player} size="small" />
                        ))}
                        {pattern.affectedPlayers.length > 3 && (
                          <Chip
                            label={`+${pattern.affectedPlayers.length - 3} more`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    )}
                  </Alert>
                ))}
              </Box>
            )}

            {/* Top Mechanics Causing Deaths */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Most Deadly Mechanics
              </Typography>
              <Paper variant="outlined">
                <List>
                  {deathAnalysis.mechanicDeaths.slice(0, 5).map((mechanic, index) => (
                    <React.Fragment key={mechanic.mechanicId}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant="subtitle1">{mechanic.mechanicName}</Typography>
                              <Chip
                                label={getCategoryLabel(mechanic.category)}
                                size="small"
                                color={getCategoryColor(mechanic.category)}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">
                                  {mechanic.totalDeaths} deaths • {mechanic.playersAffected.length}{' '}
                                  players affected
                                </Typography>
                                <Typography variant="body2">
                                  {mechanic.percentage.toFixed(1)}% of all deaths
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={mechanic.percentage}
                                sx={{ height: 6, borderRadius: 3 }}
                                color="error"
                              />
                              {mechanic.averageKillingBlowDamage > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  Avg. killing blow:{' '}
                                  {formatDamage(mechanic.averageKillingBlowDamage)}
                                </Typography>
                              )}
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

            {/* Player Death Analysis */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Player Death Analysis
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell align="right">Deaths</TableCell>
                      <TableCell align="right">Avg Time Alive</TableCell>
                      <TableCell align="right">Top Cause</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deathAnalysis.playerDeaths.map((player) => (
                      <TableRow key={player.playerId}>
                        <TableCell component="th" scope="row">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {player.playerName}
                            {player.role && (
                              <Chip
                                label={player.role}
                                size="small"
                                color={getRoleColor(player.role)}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={player.totalDeaths.toString()}
                            size="small"
                            color={
                              player.totalDeaths === 0
                                ? 'success'
                                : player.totalDeaths <= 2
                                  ? 'warning'
                                  : 'error'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">{formatTime(player.averageTimeAlive)}</TableCell>
                        <TableCell align="right">
                          {player.topCausesOfDeath.length > 0 ? (
                            <Typography variant="body2" noWrap>
                              {player.topCausesOfDeath[0].abilityName}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Fight-by-Fight Breakdown */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Fight Breakdown
              </Typography>
              {deathAnalysis.fightDeaths.map((fight) => (
                <Accordion key={fight.fightId}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography variant="subtitle1" sx={{ flex: 1 }}>
                        {fight.fightName}
                      </Typography>
                      <Chip
                        label={`${fight.totalDeaths} deaths`}
                        size="small"
                        color={fight.totalDeaths === 0 ? 'success' : 'error'}
                      />
                      <Chip
                        label={fight.success ? 'Kill' : 'Wipe'}
                        size="small"
                        color={fight.success ? 'success' : 'error'}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Death rate: {fight.deathRate.toFixed(2)} deaths/minute
                    </Typography>
                    {fight.mechanicBreakdown.length > 0 && (
                      <List dense>
                        {fight.mechanicBreakdown.map((mechanic) => (
                          <ListItem key={mechanic.mechanicId}>
                            <ListItemText
                              primary={mechanic.mechanicName}
                              secondary={`${mechanic.deathCount} ${mechanic.deathCount === 1 ? 'death' : 'deaths'}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Export memoized component
export default React.memo(DeathAnalysisSection);
export { DeathAnalysisSection };

const DeathAnalysisSkeleton: React.FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Skeleton variant="rectangular" width={150} height={32} />
      </Box>

      <Typography variant="h6" gutterBottom>
        <Skeleton width="40%" />
      </Typography>
      <Skeleton variant="rectangular" height={120} sx={{ mb: 4 }} />

      <Typography variant="h6" gutterBottom>
        <Skeleton width="45%" />
      </Typography>
      <Skeleton variant="rectangular" height={200} sx={{ mb: 4 }} />

      <Typography variant="h6" gutterBottom>
        <Skeleton width="35%" />
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={48} />
        ))}
      </Box>
    </Box>
  );
};

// Helper functions
function formatDamage(damage: number): string {
  if (damage >= 1000000) {
    return `${(damage / 1000000).toFixed(1)}M`;
  } else if (damage >= 1000) {
    return `${(damage / 1000).toFixed(1)}K`;
  }
  return damage.toString();
}

function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
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

function getCategoryColor(
  category: MechanicCategory,
): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
  switch (category) {
    case MechanicCategory.AREA_EFFECT:
      return 'warning';
    case MechanicCategory.BURST_DAMAGE:
      return 'error';
    case MechanicCategory.DAMAGE_OVER_TIME:
      return 'info';
    case MechanicCategory.ENVIRONMENTAL:
      return 'secondary';
    default:
      return 'primary';
  }
}

function getCategoryLabel(category: MechanicCategory): string {
  return category;
}

function getPatternTypeLabel(type: DeathPatternType): string {
  return type.replace(/_/g, ' ');
}

function getSeverityLevel(severity: 'High' | 'Medium' | 'Low'): 'error' | 'warning' | 'info' {
  switch (severity) {
    case 'High':
      return 'error';
    case 'Medium':
      return 'warning';
    case 'Low':
      return 'info';
    default:
      return 'info';
  }
}
