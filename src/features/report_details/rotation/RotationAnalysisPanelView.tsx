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
} from '@mui/material';
import React from 'react';

interface RotationAnalysis {
  playerId: string;
  playerName: string;
  abilities: AbilityUsage[];
  averageAPM: number;
  resourceEfficiency: ResourceEfficiencyData;
  rotationPattern: string[];
  skillPriorities: SkillPriority[];
  spammableSkills: SpammableSkill[];
  generalRotation: GeneralRotation;
}

interface AbilityUsage {
  abilityId: number | string;
  abilityName: string;
  useCount: number;
  averageCastTime: number;
  resourceCost: number;
  averageTimeBetweenCasts: number;
  timestamps: number[];
}

interface SkillPriority {
  higherPrioritySkill: string;
  lowerPrioritySkill: string;
  interruptionCount: number;
  confidence: number;
}

interface SpammableSkill {
  abilityName: string;
  averageInterval: number;
  burstCount: number;
  spammableScore: number;
}

interface GeneralRotation {
  commonSequences: RotationSequence[];
  openerSequence: string[];
  fillerAbilities: string[];
}

interface RotationSequence {
  sequence: string[];
  frequency: number;
  averageInterval: number;
}

interface ResourceEfficiencyData {
  magicka: {
    averageLevel: number;
    wastePercentage: number;
    lowestPoint: number;
  };
  stamina: {
    averageLevel: number;
    wastePercentage: number;
    lowestPoint: number;
  };
}

interface RotationAnalysisPanelViewProps {
  rotationAnalyses: RotationAnalysis[];
  fight: { startTime?: number; endTime?: number; friendlyPlayers?: (number | null)[] | null };
}

export const RotationAnalysisPanelView: React.FC<RotationAnalysisPanelViewProps> = ({
  rotationAnalyses,
  fight,
}) => {
  if (!rotationAnalyses.length) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Rotation Analysis
        </Typography>
        <Typography color="textSecondary">
          No cast or resource data available for this fight.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Rotation Analysis
      </Typography>

      {rotationAnalyses.map((analysis) => (
        <Accordion key={analysis.playerId} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {analysis.playerName}
              </Typography>
              <Chip label={`${analysis.averageAPM.toFixed(1)} APM`} size="small" color="primary" variant="outlined" />
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
                      {analysis.abilities
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
                        {analysis.resourceEfficiency.magicka.averageLevel.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={analysis.resourceEfficiency.magicka.averageLevel}
                        color="primary"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        Lowest: {analysis.resourceEfficiency.magicka.lowestPoint.toFixed(1)}% |
                        Waste: {analysis.resourceEfficiency.magicka.wastePercentage.toFixed(1)}%
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Stamina Average:{' '}
                        {analysis.resourceEfficiency.stamina.averageLevel.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={analysis.resourceEfficiency.stamina.averageLevel}
                        color="secondary"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        Lowest: {analysis.resourceEfficiency.stamina.lowestPoint.toFixed(1)}% |
                        Waste: {analysis.resourceEfficiency.stamina.wastePercentage.toFixed(1)}%
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
                        {analysis.skillPriorities.map((priority, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
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
                                    color={priority.confidence > 0.7 ? 'success' : priority.confidence > 0.4 ? 'warning' : 'default'}
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
                        {analysis.spammableSkills.map((skill, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
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
                            key={index}
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
                        {analysis.generalRotation.commonSequences.slice(0, 3).map((sequence, index) => (
                          <Box key={index} sx={{ p: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              {sequence.sequence.join(' → ')}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {sequence.frequency}x used • {sequence.averageInterval.toFixed(1)}s avg
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
                            key={index}
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
                        key={index}
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
