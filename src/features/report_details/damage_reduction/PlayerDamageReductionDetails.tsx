import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React from 'react';
import { Line } from 'react-chartjs-2';

import { resistanceToDamageReduction } from '../../../utils/damageReductionUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  annotationPlugin
);

export interface DamageReductionDataPoint {
  timestamp: number;
  damageReduction: number;
  totalResistance: number;
  staticResistance: number;
  dynamicResistance: number;
  relativeTime: number;
}

export interface PlayerDamageReductionData {
  playerId: number;
  playerName: string;
  dataPoints: Array<DamageReductionDataPoint>;
  damageReductionSources: Array<{
    source: string;
    name: string;
    isActive: boolean;
    resistanceValue: number;
  }>;
  staticResistance: number;
  maxDynamicResistance: number;
  averageDynamicResistance: number;
}

interface PlayerDamageReductionDetailsProps {
  id: string;
  name: string;
  expanded: boolean;
  onExpandChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  damageReductionData?: PlayerDamageReductionData;
  isLoading?: boolean;
}

/**
 * Individual player damage reduction details component with accordion layout
 */
export const PlayerDamageReductionDetails: React.FC<PlayerDamageReductionDetailsProps> = ({
  id,
  name,
  expanded,
  onExpandChange,
  damageReductionData,
  isLoading,
}) => {
  const theme = useTheme();

  if (isLoading || !damageReductionData) {
    return (
      <Accordion disabled>
        <AccordionSummary>
          <Typography variant="h6">{name}</Typography>
        </AccordionSummary>
      </Accordion>
    );
  }

  const {
    dataPoints,
    damageReductionSources,
    maxDynamicResistance,
    staticResistance,
    averageDynamicResistance,
  } = damageReductionData;

  const staticDamageReduction = resistanceToDamageReduction(staticResistance);

  return (
    <Accordion
      expanded={expanded}
      onChange={onExpandChange}
      sx={{
        mb: 1,
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: '0 0 8px 0',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`panel-${id}-content`}
        id={`panel-${id}-header`}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: '8px',
          '&.Mui-expanded': {
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
            <Chip
              label={`Avg: ${resistanceToDamageReduction(averageDynamicResistance + staticResistance).toFixed(1)}%`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`Max: ${resistanceToDamageReduction(maxDynamicResistance + staticResistance).toFixed(1)}%`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          backgroundColor: theme.palette.background.default,
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
          pt: 2,
        }}
      >
        <Stack spacing={3}>
          {/* Summary Statistics */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Damage Reduction Summary
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    Max Reduction
                  </Typography>
                  <Typography variant="h5" color="secondary">
                    {resistanceToDamageReduction(staticResistance + maxDynamicResistance).toFixed(
                      1
                    )}
                    %
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {staticResistance + maxDynamicResistance} resistance
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    Average Reduction
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {resistanceToDamageReduction(
                      averageDynamicResistance + staticResistance
                    ).toFixed(1)}
                    %
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(averageDynamicResistance + staticResistance).toFixed(0)} resistance
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    Static Reduction
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {resistanceToDamageReduction(staticResistance).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {staticResistance.toLocaleString()} resistance
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    Dynamic Reduction
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {resistanceToDamageReduction(maxDynamicResistance).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {maxDynamicResistance.toLocaleString()} resistance
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* Damage Reduction Sources */}
            <Card sx={{ flex: '1 1 300px' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Damage Reduction Sources
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {damageReductionSources.length > 0 ? (
                    damageReductionSources.map((source, index) => {
                      const resistanceValue = source.resistanceValue;
                      const damageReductionPercent = resistanceToDamageReduction(resistanceValue);
                      // Create a unique key based on source properties
                      const sourceKey = `${source.source}-${source.name}-${index}`;

                      return (
                        <Box
                          key={sourceKey}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1,
                            backgroundColor: theme.palette.background.default,
                            borderRadius: 1,
                            opacity: source.isActive ? 1 : 0.5,
                            color: source.isActive ? 'inherit' : 'text.secondary',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: source.isActive ? 'inherit' : 'text.secondary',
                                fontStyle: source.isActive ? 'normal' : 'italic',
                              }}
                            >
                              {source.name}
                            </Typography>
                            <Chip
                              label={source.source}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: '0.6rem',
                                height: '20px',
                                opacity: source.isActive ? 1 : 0.6,
                                color: source.isActive ? 'inherit' : 'text.secondary',
                              }}
                            />
                            {!source.isActive && (
                              <Chip
                                label="inactive"
                                size="small"
                                variant="outlined"
                                color="default"
                                sx={{
                                  fontSize: '0.6rem',
                                  height: '20px',
                                  opacity: 0.6,
                                }}
                              />
                            )}
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              sx={{
                                color: source.isActive ? 'inherit' : 'text.secondary',
                              }}
                            >
                              {damageReductionPercent.toFixed(1)}%
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                opacity: source.isActive ? 1 : 0.6,
                              }}
                            >
                              {resistanceValue.toLocaleString()} resistance
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No active damage reduction sources found
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Damage Reduction vs Time Chart */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Damage Reduction Over Time
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <Line
                  data={{
                    labels: dataPoints.map((point) => point.relativeTime.toFixed(1)),
                    datasets: [
                      {
                        label: 'Damage Reduction %',
                        data: dataPoints.map((point) => ({
                          x: point.relativeTime,
                          y: point.damageReduction,
                        })),
                        borderColor: '#2196f3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        stepped: 'after',
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        tension: 0,
                      },
                      {
                        label: 'Static Reduction',
                        data: dataPoints.map((point) => ({
                          x: point.relativeTime,
                          y: staticDamageReduction,
                        })),
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        borderWidth: 1,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        tension: 0,
                        borderDash: [2, 2],
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      intersect: false,
                      mode: 'index',
                    },
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top',
                      },
                      tooltip: {
                        callbacks: {
                          title: (context) => `Time: ${Number(context[0].parsed.x).toFixed(1)}s`,
                          label: (context) =>
                            `${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)}%`,
                        },
                      },
                      annotation: {
                        annotations: {
                          targetLine: {
                            type: 'line',
                            yMin: 50,
                            yMax: 50,
                            borderColor: '#ff9800',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                              display: true,
                              content: 'Target: 50%',
                              position: 'end',
                              backgroundColor: '#ff9800',
                              color: 'white',
                              padding: 4,
                            },
                          },
                          staticLine: {
                            type: 'line',
                            yMin: staticDamageReduction,
                            yMax: staticDamageReduction,
                            borderColor: '#ff5722',
                            borderWidth: 1,
                            borderDash: [3, 3],
                            label: {
                              display: true,
                              content: `Static: ${staticDamageReduction.toFixed(1)}%`,
                              position: 'start',
                              backgroundColor: '#ff5722',
                              color: 'white',
                              padding: 4,
                            },
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Fight Time (seconds)',
                        },
                        type: 'linear',
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Damage Reduction (%)',
                        },
                        min: 0,
                        max: 60,
                        ticks: {
                          callback: (value) => `${value}%`,
                        },
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
