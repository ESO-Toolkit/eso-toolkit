 
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
}

interface AbilityUsage {
  abilityId: number | string;
  abilityName: string;
  useCount: number;
  averageCastTime: number;
  resourceCost: number;
  averageTimeBetweenCasts: number;
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
  fight: { startTime?: number; endTime?: number };
}

const RotationAnalysisPanelView: React.FC<RotationAnalysisPanelViewProps> = ({
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
              <Chip label={`${analysis.averageAPM.toFixed(1)} APM`} size="small" color="primary" />
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
                              secondary={`${ability.useCount} casts`}
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

export default React.memo(RotationAnalysisPanelView);
