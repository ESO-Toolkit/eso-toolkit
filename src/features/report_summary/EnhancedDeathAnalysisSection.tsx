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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  LinearProgress,
  Avatar,
  Tooltip,
  useTheme,
} from '@mui/material';
import { Grid } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SkullIcon from '@mui/icons-material/Dangerous';
import PersonIcon from '@mui/icons-material/Person';
import BoltIcon from '@mui/icons-material/Bolt';
import GroupIcon from '@mui/icons-material/Group';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { ReportDeathAnalysis, MechanicCategory, DeathPatternType } from '../../types/reportSummaryTypes';

interface EnhancedDeathAnalysisSectionProps {
  deathAnalysis?: ReportDeathAnalysis;
  isLoading: boolean;
  error?: string;
}

/**
 * Enhanced Death Analysis Component
 * 
 * Displays comprehensive death analysis including:
 * - Death summary with key metrics
 * - Abilities/mechanics that caused deaths
 * - Players most affected by deaths  
 * - Death patterns and actionable insights
 * - Per-fight breakdown
 */
export const EnhancedDeathAnalysisSection: React.FC<EnhancedDeathAnalysisSectionProps> = ({
  deathAnalysis,
  isLoading,
  error,
}) => {
  const theme = useTheme();

  if (error) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SkullIcon color="error" />
            <Typography variant="h5">Death Analysis</Typography>
          </Box>
          <Alert severity="error">
            <Typography variant="h6">Analysis Failed</Typography>
            <Typography>Error loading death analysis: {error}</Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SkullIcon />
            <Typography variant="h5">Death Analysis</Typography>
          </Box>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Analyzing death patterns, causes, and affected players...
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rounded" height={60} />
            <Skeleton variant="rounded" height={200} />
            <Skeleton variant="rounded" height={150} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const hasDeaths = deathAnalysis && deathAnalysis.totalDeaths > 0;

  return (
    <Card elevation={2}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <SkullIcon color={hasDeaths ? "error" : "success"} />
          <Typography variant="h5">Death Analysis</Typography>
        </Box>

        {!hasDeaths ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CheckCircleIcon fontSize="large" />
              <Box>
                <Typography variant="h6">Flawless Performance! 🎉</Typography>
                <Typography>
                  No deaths recorded across all fights. Excellent execution by the entire team!
                </Typography>
              </Box>
            </Box>
          </Alert>
        ) : (
          <>
            {/* Death Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* @ts-expect-error - MUI Grid item prop typing issue */}
              <Grid item xs={12} md={3}>
                <Card variant="outlined" sx={{ 
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(244, 67, 54, 0.05) 0%, rgba(244, 67, 54, 0.02) 100%)'
                }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error" sx={{ fontWeight: 'bold' }}>
                      {deathAnalysis.totalDeaths}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Deaths
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* @ts-expect-error - MUI Grid item prop typing issue */}
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                      {deathAnalysis.playerDeaths.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Players Affected
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* @ts-expect-error - MUI Grid item prop typing issue */}
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                      {deathAnalysis.mechanicDeaths.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Deadly Abilities
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* @ts-expect-error - MUI Grid item prop typing issue */}
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                      {deathAnalysis.deathPatterns.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Patterns Found
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Death Patterns & Insights */}
            {deathAnalysis.deathPatterns.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon />
                  Death Patterns Observed
                </Typography>
                {deathAnalysis.deathPatterns.map((pattern, index) => (
                  <Alert 
                    key={index}
                    severity={getSeverityLevel(pattern.severity)}
                    sx={{ mb: 2 }}
                    icon={<WarningIcon />}
                  >
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {getPatternTypeLabel(pattern.type)}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {pattern.description}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>� Additional Info:</strong> {pattern.suggestion}
                    </Typography>
                    {pattern.affectedPlayers.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <PersonIcon fontSize="small" />
                        <Typography variant="caption" sx={{ mr: 1 }}>Affected players:</Typography>
                        {pattern.affectedPlayers.slice(0, 5).map((player) => (
                          <Chip key={player} label={player} size="small" />
                        ))}
                        {pattern.affectedPlayers.length > 5 && (
                          <Chip 
                            label={`+${pattern.affectedPlayers.length - 5} more`} 
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
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BoltIcon />
                Deadliest Abilities & Mechanics
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Ability/Mechanic</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Deaths</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>% of Total</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Category</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Avg Damage</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Players Hit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deathAnalysis.mechanicDeaths.slice(0, 10).map((mechanic) => (
                      <TableRow key={mechanic.mechanicId} hover>
                        <TableCell>
                          <Tooltip title={`Ability ID: ${mechanic.mechanicId}`}>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {mechanic.mechanicName}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={mechanic.totalDeaths}
                            size="small"
                            color="error"
                            sx={{ minWidth: 40 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {mechanic.percentage.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={mechanic.category} 
                            size="small" 
                            color={getCategoryColor(mechanic.category)}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {Math.round(mechanic.averageKillingBlowDamage).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <GroupIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {mechanic.playersAffected.length}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Player Death Analysis */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon />
                Player Death Analysis
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Player</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Deaths</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Avg Time Alive</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 'bold' }}>Top Cause of Death</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deathAnalysis.playerDeaths.map((player) => (
                      <TableRow key={player.playerId} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                              {player.playerName.charAt(0)}
                            </Avatar>
                            {player.playerName}
                            {player.role && (
                              <Chip 
                                label={player.role} 
                                size="small" 
                                color={getRoleColor(player.role)}
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={player.totalDeaths}
                            size="small"
                            color={player.totalDeaths === 0 ? 'success' : player.totalDeaths >= 3 ? 'error' : 'warning'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {Math.round(player.averageTimeAlive)}s
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {player.topCausesOfDeath[0] ? (
                            <Box>
                              <Typography variant="body2">
                                {player.topCausesOfDeath[0].abilityName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {player.topCausesOfDeath[0].deathCount} deaths ({player.topCausesOfDeath[0].percentage.toFixed(0)}%)
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Per-Fight Death Breakdown */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Deaths by Fight
              </Typography>
              {deathAnalysis.fightDeaths.map((fight) => (
                <Accordion key={fight.fightId} sx={{ mb: 1 }}>
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
                              secondary={`${mechanic.deathCount} deaths`}
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

// Helper functions
function getCategoryColor(category: MechanicCategory): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
  switch (category) {
    case MechanicCategory.AREA_EFFECT:
      return 'warning';
    case MechanicCategory.BURST_DAMAGE:
      return 'error';
    case MechanicCategory.EXECUTE_PHASE:
      return 'error';
    case MechanicCategory.DAMAGE_OVER_TIME:
      return 'info';
    case MechanicCategory.ENVIRONMENTAL:
      return 'secondary';
    case MechanicCategory.DIRECT_DAMAGE:
      return 'primary';
    default:
      return 'primary';
  }
}

function getRoleColor(role: string): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
  const lowerRole = role.toLowerCase();
  if (lowerRole.includes('tank')) return 'info';
  if (lowerRole.includes('heal')) return 'success';
  if (lowerRole.includes('dps') || lowerRole.includes('damage')) return 'error';
  return 'primary';
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

export default React.memo(EnhancedDeathAnalysisSection);