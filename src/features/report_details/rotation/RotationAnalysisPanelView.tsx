import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Tooltip,
} from '@mui/material';
import React from 'react';

import type {
  ResourceMetric,
  RotationAnalysis,
  RotationAnalysisDataState,
} from './RotationAnalysisPanel';

interface RotationAnalysisPanelViewProps {
  rotationAnalyses: RotationAnalysis[];
  fight: { startTime?: number; endTime?: number; friendlyPlayers?: (number | null)[] | null };
  dataState?: RotationAnalysisDataState;
  dataMessage?: string;
}

const isMeasuredValue = (value: number | null): value is number =>
  value !== null && Number.isFinite(value);

const formatMetric = (value: number | null, suffix = ''): string =>
  isMeasuredValue(value) ? `${value.toFixed(1)}${suffix}` : 'Unavailable';

const resourceDetails = (metric: ResourceMetric): string =>
  !isMeasuredValue(metric.averageLevel)
    ? 'Resource data unavailable'
    : `Lowest: ${formatMetric(metric.lowestPoint, '%')} | Waste: ${formatMetric(metric.wastePercentage, '%')}`;

export const RotationAnalysisPanelView: React.FC<RotationAnalysisPanelViewProps> = ({
  rotationAnalyses,
  fight: _fight,
  dataState = 'ready',
  dataMessage,
}) => {
  if (!rotationAnalyses.length) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Rotation Analysis
        </Typography>
        <Alert severity={dataState === 'invalid' ? 'error' : 'info'} role="status">
          {dataMessage || 'No cast or resource data available for this fight.'}
        </Alert>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 500,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Rotation Analysis
      </Typography>

      {dataState !== 'ready' && (
        <Alert severity={dataState === 'invalid' ? 'error' : 'info'} sx={{ mb: 2 }} role="status">
          {dataMessage || 'Some rotation measurements are unavailable and are not scored.'}
        </Alert>
      )}

      {rotationAnalyses.map((analysis) => (
        <Accordion key={analysis.playerId} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {analysis.playerName}
              </Typography>
              <Tooltip
                title={
                  !isMeasuredValue(analysis.averageAPM)
                    ? 'No valid cast stream is available, so APM is not scored.'
                    : 'Actions per minute from valid cast events.'
                }
              >
                <Chip
                  label={
                    !isMeasuredValue(analysis.averageAPM)
                      ? 'APM unavailable'
                      : `${analysis.averageAPM.toFixed(1)} APM`
                  }
                  size="small"
                  color={!isMeasuredValue(analysis.averageAPM) ? 'default' : 'primary'}
                  variant="outlined"
                />
              </Tooltip>
              {analysis.dataState !== 'ready' && (
                <Chip label="Partial data" size="small" variant="outlined" />
              )}
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Top Row - Abilities and Resource Efficiency */}
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                {/* Ability Usage */}
                <Box sx={{ flex: 1 }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Most Used Abilities
                    </Typography>
                    <List dense>
                      {[...analysis.abilities]
                        .sort((a, b) => b.useCount - a.useCount)
                        .slice(0, 5)
                        .map((ability) => (
                          <ListItem key={ability.abilityId}>
                            <ListItemText
                              primary={ability.abilityName}
                              secondary={`${ability.useCount} casts • Avg ${ability.averageTimeBetweenCasts.toFixed(1)}s interval`}
                            />
                          </ListItem>
                        ))}
                    </List>
                  </Paper>
                </Box>

                {/* Resource Efficiency */}
                <Box sx={{ flex: 1 }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Resource Efficiency
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Magicka Average:{' '}
                        {formatMetric(analysis.resourceEfficiency.magicka.averageLevel, '%')}
                      </Typography>
                      {isMeasuredValue(analysis.resourceEfficiency.magicka.averageLevel) && (
                        <LinearProgress
                          variant="determinate"
                          value={analysis.resourceEfficiency.magicka.averageLevel}
                          color="primary"
                          sx={{ mb: 1 }}
                        />
                      )}
                      <Typography variant="caption" color="textSecondary">
                        {resourceDetails(analysis.resourceEfficiency.magicka)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Stamina Average:{' '}
                        {formatMetric(analysis.resourceEfficiency.stamina.averageLevel, '%')}
                      </Typography>
                      {isMeasuredValue(analysis.resourceEfficiency.stamina.averageLevel) && (
                        <LinearProgress
                          variant="determinate"
                          value={analysis.resourceEfficiency.stamina.averageLevel}
                          color="secondary"
                          sx={{ mb: 1 }}
                        />
                      )}
                      <Typography variant="caption" color="textSecondary">
                        {resourceDetails(analysis.resourceEfficiency.stamina)}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              </Box>

              {/* Second Row - Skill Priorities and Spammable Skills */}
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                {/* Skill Priorities */}
                <Box sx={{ flex: 1 }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Skill Priorities
                    </Typography>
                    {analysis.skillPriorities.length > 0 ? (
                      <List dense>
                        {analysis.skillPriorities.map((priority) => (
                          <ListItem
                            key={`${priority.higherPrioritySkill}->${priority.lowerPrioritySkill}`}
                            sx={{ px: 0 }}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography
                                    variant="body2"
                                    color="primary"
                                    sx={{ fontWeight: 'bold' }}
                                  >
                                    {priority.higherPrioritySkill}
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary">
                                    →
                                  </Typography>
                                  <Typography variant="body2">
                                    {priority.lowerPrioritySkill}
                                  </Typography>
                                  <Chip
                                    label={`${(priority.confidence * 100).toFixed(0)}%`}
                                    size="small"
                                    variant="outlined"
                                    color={
                                      priority.confidence > 0.7
                                        ? 'success'
                                        : priority.confidence > 0.4
                                          ? 'warning'
                                          : 'default'
                                    }
                                  />
                                </Box>
                              }
                              secondary={`Interrupted ${priority.interruptionCount} times`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No clear skill priorities detected
                      </Typography>
                    )}
                  </Paper>
                </Box>

                {/* Spammable Skills */}
                <Box sx={{ flex: 1 }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Spammable Skills
                    </Typography>
                    {analysis.spammableSkills.length > 0 ? (
                      <List dense>
                        {analysis.spammableSkills.map((skill) => (
                          <ListItem key={skill.abilityName} sx={{ px: 0 }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {skill.abilityName}
                                  </Typography>
                                  <Chip
                                    label={`${(skill.spammableScore * 100).toFixed(0)}%`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                </Box>
                              }
                              secondary={`${skill.averageInterval.toFixed(1)}s avg • ${skill.burstCount} bursts`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No spammable skills identified
                      </Typography>
                    )}
                  </Paper>
                </Box>
              </Box>

              {/* Third Row - General Rotation Analysis */}
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
                {/* Fight Opener */}
                <Box sx={{ flex: 1 }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Fight Opener
                    </Typography>
                    {analysis.generalRotation.openerSequence.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {analysis.generalRotation.openerSequence.map((ability, index) => (
                          <Chip
                            key={`${index}-${ability}`}
                            label={`${index + 1}. ${ability}`}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No opener sequence detected
                      </Typography>
                    )}
                  </Paper>
                </Box>

                {/* Common Sequences */}
                <Box sx={{ flex: 1 }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Common Rotation Sequences
                    </Typography>
                    {analysis.generalRotation.commonSequences.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {analysis.generalRotation.commonSequences.slice(0, 3).map((sequence) => (
                          <Box
                            key={`${sequence.sequence.join('→')}-${sequence.frequency}`}
                            sx={{
                              p: 1,
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 1,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              {sequence.sequence.join(' → ')}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {sequence.frequency}x used • {sequence.averageInterval.toFixed(1)}s
                              avg
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No common sequences detected
                      </Typography>
                    )}
                  </Paper>
                </Box>

                {/* Filler Abilities */}
                <Box sx={{ flex: 1 }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Filler Abilities
                    </Typography>
                    {analysis.generalRotation.fillerAbilities.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {analysis.generalRotation.fillerAbilities.map((ability, index) => (
                          <Chip
                            key={`${ability}-${index}`}
                            label={ability}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No filler abilities detected
                      </Typography>
                    )}
                  </Paper>
                </Box>
              </Box>

              {/* Recent Rotation Pattern */}
              <Box>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Recent Rotation Pattern
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {analysis.rotationPattern.map((abilityName, index) => (
                      <Chip
                        key={`${index}-${abilityName}`}
                        label={abilityName}
                        size="small"
                        variant="outlined"
                        sx={{
                          opacity: 0.5 + (index / analysis.rotationPattern.length) * 0.5,
                        }}
                      />
                    ))}
                  </Box>
                  {analysis.rotationPattern.length === 0 && (
                    <Typography variant="body2" color="textSecondary">
                      No rotation pattern data available
                    </Typography>
                  )}
                </Paper>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};
