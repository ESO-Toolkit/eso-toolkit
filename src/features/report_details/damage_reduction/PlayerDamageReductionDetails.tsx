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

import { MetricPill } from '../../../components/MetricPill';
import { PlayerIcon } from '../../../components/PlayerIcon';
import { useRoleColors } from '../../../hooks';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { resistanceToDamageReduction } from '../../../utils/damageReductionUtils';
import { resolveActorName } from '../../../utils/resolveActorName';

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
  player?: PlayerDetailsWithRole;
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
  player,
  expanded,
  onExpandChange,
  damageReductionData,
  isLoading,
}) => {
  const theme = useTheme();
  const roleColors = useRoleColors();

  if (isLoading || !damageReductionData) {
    return (
      <Accordion
        disabled
        variant="outlined"
        className="u-hover-lift u-fade-in-up"
        sx={{
          ...roleColors.getAccordionStyles(),
          borderRadius: 2,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: 0,
          },
          margin: 0,
          mb: 2,
        }}
      >
        <AccordionSummary>
          <Typography
            variant="h6"
            sx={{
              fontSize: '1.75rem',
              textShadow: roleColors.getAccordionTextShadow(),
            }}
          >
            {name}
          </Typography>
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
      variant="outlined"
      className="u-hover-lift u-fade-in-up"
      sx={{
        ...roleColors.getAccordionStyles(),
        borderRadius: 2,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: 0,
        },
        margin: 0,
        mb: 2,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`panel-${id}-content`}
        id={`panel-${id}-header`}
        sx={{
          '& .MuiAccordionSummary-content': {
            margin: '12px 0',
          },
          '&.Mui-expanded .MuiAccordionSummary-content': {
            margin: '12px 0',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            {player && <PlayerIcon player={player} />}
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{
                fontSize: '1.75rem',
                textShadow: roleColors.getAccordionTextShadow(),
              }}
            >
              {player ? resolveActorName(player) : name}
            </Typography>
          </Box>
          {!isLoading && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2.5, alignItems: 'center' }}>
              <MetricPill
                label="Max"
                value={`${resistanceToDamageReduction(maxDynamicResistance + staticResistance).toFixed(1)}%`}
                intent={resistanceToDamageReduction(maxDynamicResistance + staticResistance) >= 50 ? 'success' : 'danger'}
                size="md"
              />
              <MetricPill
                label="Average"
                value={`${resistanceToDamageReduction(averageDynamicResistance + staticResistance).toFixed(1)}%`}
                intent={resistanceToDamageReduction(averageDynamicResistance + staticResistance) >= 40 ? 'info' : 'warning'}
                size="md"
              />
              <MetricPill
                label="Static"
                value={`${resistanceToDamageReduction(staticResistance).toFixed(1)}%`}
                intent={
                  resistanceToDamageReduction(staticResistance) >= 30
                    ? 'success'
                    : resistanceToDamageReduction(staticResistance) >= 20
                    ? 'warning'
                    : 'danger'
                }
                size="md"
              />
            </Box>
          )}
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
          {/* Mobile Metrics - Only visible on mobile */}
          {!isLoading && (
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                gap: 2,
                mb: 3,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <MetricPill
                label="Max"
                value={`${resistanceToDamageReduction(maxDynamicResistance + staticResistance).toFixed(1)}%`}
                intent={resistanceToDamageReduction(maxDynamicResistance + staticResistance) >= 50 ? 'success' : 'danger'}
                size="sm"
              />
              <MetricPill
                label="Average"
                value={`${resistanceToDamageReduction(averageDynamicResistance + staticResistance).toFixed(1)}%`}
                intent={resistanceToDamageReduction(averageDynamicResistance + staticResistance) >= 40 ? 'info' : 'warning'}
                size="sm"
              />
              <MetricPill
                label="Static"
                value={`${resistanceToDamageReduction(staticResistance).toFixed(1)}%`}
                intent={
                  resistanceToDamageReduction(staticResistance) >= 30
                    ? 'success'
                    : resistanceToDamageReduction(staticResistance) >= 20
                    ? 'warning'
                    : 'danger'
                }
                size="sm"
              />
            </Box>
          )}

          {/* Summary Statistics */}
          <Card
            sx={{
              background:
                'linear-gradient(135deg, rgba(175, 82, 222, 0.15) 0%, rgba(175, 82, 222, 0.08) 50%, rgba(175, 82, 222, 0.04) 100%)',
              border: '1px solid rgba(175, 82, 222, 0.3)',
              borderRadius: 2,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  textShadow:
                    '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
                }}
              >
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
            <Card
              sx={{
                flex: '1 1 300px',
                background:
                  'linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(0, 122, 255, 0.08) 50%, rgba(0, 122, 255, 0.04) 100%)',
                border: '1px solid rgba(0, 122, 255, 0.3)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    textShadow:
                      '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
                  }}
                >
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
                            {source.source === 'not_implemented' && (
                              <Chip
                                label="not implemented"
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{
                                  fontSize: '0.6rem',
                                  height: '20px',
                                  opacity: 0.8,
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
          <Card
            sx={{
              background:
                'linear-gradient(135deg, rgba(76, 217, 100, 0.15) 0%, rgba(76, 217, 100, 0.08) 50%, rgba(76, 217, 100, 0.04) 100%)',
              border: '1px solid rgba(76, 217, 100, 0.3)',
              borderRadius: 2,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  textShadow:
                    '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
                }}
              >
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
