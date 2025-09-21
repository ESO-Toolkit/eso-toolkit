import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from '@mui/material';
import type { TooltipItem } from 'chart.js';
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
import { StatChecklist } from '../../../components/StatChecklist';
import { useRoleColors } from '../../../hooks';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import {
  CriticalDamageSource,
  CriticalDamageSourceWithActiveState,
} from '../../../utils/CritDamageUtils';
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
  annotationPlugin,
);

// Chart callback functions - extracted to module level for performance
const formatTooltipTitle = (context: TooltipItem<'line'>[]): string => {
  return `Time: ${Number(context[0].parsed.x).toFixed(1)}s`;
};

const formatTooltipLabel = (context: TooltipItem<'line'>): string => {
  return `${context.parsed.y}% critical damage`;
};

const formatXAxisTick = (value: number | string): string => {
  return `${Number(value).toFixed(1)}s`;
};

const formatYAxisTick = (value: number | string): string => {
  return `${value}%`;
};

interface CriticalDamageDataPoint {
  timestamp: number;
  criticalDamage: number;
  relativeTime: number; // Time since fight start in seconds
}

interface CriticalDamageAlert {
  abilityId: number;
  abilityName: string;
  timestamp: number;
  relativeTime: number;
  expectedCriticalDamage: number;
  actualCriticalDamage: number;
  normalDamage: number;
  actualCriticalMultiplier: number;
  expectedCriticalMultiplier: number;
  discrepancyPercent: number;
}

export interface PlayerCriticalDamageData {
  playerId: number;
  playerName: string;
  dataPoints: CriticalDamageDataPoint[];
  effectiveCriticalDamage: number;
  maximumCriticalDamage: number;
  timeAtCapPercentage: number;
  criticalDamageAlerts: CriticalDamageAlert[];
}

interface CriticalMultiplierInfo {
  abilityName: string;
  abilityId: number;
  criticalDamage: number;
  normalDamage: number;
  criticalMultiplier: number;
  foundPair: boolean;
  criticalTimestamp: number;
  accountedCritDamagePercent: number;
  unaccountedCritDamagePercent: number;
  activeSources: CriticalDamageSource[];
}

interface PlayerCriticalDamageDetailsViewProps {
  id: number;
  player: PlayerDetailsWithRole;
  name: string;
  expanded: boolean;
  isLoading: boolean;
  criticalDamageData: PlayerCriticalDamageData | null;
  criticalDamageSources: CriticalDamageSourceWithActiveState[];
  criticalMultiplier: CriticalMultiplierInfo | null;
  fightDurationSeconds: number;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const PlayerCriticalDamageDetailsView: React.FC<PlayerCriticalDamageDetailsViewProps> = ({
  id,
  name: _name,
  expanded,
  isLoading,
  criticalDamageData,
  criticalDamageSources,
  criticalMultiplier,
  fightDurationSeconds,
  player,
  onExpandChange,
}) => {
  const roleColors = useRoleColors();

  // Transform critical damage sources to StatChecklistSource format
  const statChecklistSources = React.useMemo(() => {
    return criticalDamageSources.map((source) => ({
      name: source.name,
      wasActive: source.wasActive,
      description: source.description,
      sourceType: source.source,
      // Add link if it's a known ability that can be looked up
      link:
        'ability' in source
          ? `https://www.esoui.com/downloads/info7-ESOUIAddOnCollection.html`
          : undefined,
    }));
  }, [criticalDamageSources]);

  // Memoize expensive chart data transformations to prevent recalculation on every render
  const chartLabels = React.useMemo(() => {
    return criticalDamageData?.dataPoints.map((point) => point.relativeTime.toFixed(1)) || [];
  }, [criticalDamageData?.dataPoints]);

  const chartDataPoints = React.useMemo(() => {
    return (
      criticalDamageData?.dataPoints.map((point) => ({
        x: point.relativeTime,
        y: point.criticalDamage,
      })) || []
    );
  }, [criticalDamageData?.dataPoints]);

  if (!criticalDamageData) {
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
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexGrow: 1 }}>
              <PlayerIcon player={player} />
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                sx={{
                  fontSize: '1.75rem',
                  textShadow: roleColors.getAccordionTextShadow(),
                }}
              >
                {resolveActorName(player)}
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>No critical damage data available for this player.</Typography>
        </AccordionDetails>
      </Accordion>
    );
  }

  const maxCriticalDamage = Math.max(
    ...criticalDamageData.dataPoints.map((point) => point.criticalDamage),
    0,
  );

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
            <PlayerIcon player={player} />
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{
                fontSize: '1.75rem',
                textShadow: roleColors.getAccordionTextShadow(),
              }}
            >
              {resolveActorName(player)}
            </Typography>
          </Box>
          {!isLoading && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2.5, alignItems: 'center' }}>
              <MetricPill
                label="Max"
                value={maxCriticalDamage}
                suffix="%"
                intent={maxCriticalDamage >= 125 ? 'success' : 'danger'}
                size="md"
              />
              <MetricPill
                label="Effective"
                value={criticalDamageData.effectiveCriticalDamage.toFixed(1)}
                suffix="%"
                intent={
                  criticalDamageData.effectiveCriticalDamage >= 125
                    ? 'success'
                    : criticalDamageData.effectiveCriticalDamage >= 100
                      ? 'warning'
                      : 'danger'
                }
                size="md"
              />
              <MetricPill
                label="At Cap"
                value={criticalDamageData.timeAtCapPercentage.toFixed(0)}
                suffix="%"
                intent={
                  criticalDamageData.timeAtCapPercentage >= 80
                    ? 'success'
                    : criticalDamageData.timeAtCapPercentage >= 50
                      ? 'warning'
                      : 'danger'
                }
                size="md"
              />
            </Box>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {/* Only render content when panel is expanded */}
        {expanded && (
          <Box>
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
                  value={maxCriticalDamage}
                  suffix="%"
                  intent={maxCriticalDamage >= 125 ? 'success' : 'danger'}
                  size="sm"
                />
                <MetricPill
                  label="Effective"
                  value={criticalDamageData.effectiveCriticalDamage.toFixed(1)}
                  suffix="%"
                  intent={
                    criticalDamageData.effectiveCriticalDamage >= 125
                      ? 'success'
                      : criticalDamageData.effectiveCriticalDamage >= 100
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                />
                <MetricPill
                  label="At Cap"
                  value={criticalDamageData.timeAtCapPercentage.toFixed(0)}
                  suffix="%"
                  intent={
                    criticalDamageData.timeAtCapPercentage >= 80
                      ? 'success'
                      : criticalDamageData.timeAtCapPercentage >= 50
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                />
              </Box>
            )}

            {/* Critical Damage Sources Checklist */}
            <StatChecklist
              sources={statChecklistSources}
              title="Critical Damage Sources"
              loading={isLoading}
            />

            {/* Critical Multiplier Information */}
            {criticalMultiplier && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  background:
                    'linear-gradient(135deg, rgba(175, 82, 222, 0.15) 0%, rgba(175, 82, 222, 0.08) 50%, rgba(175, 82, 222, 0.04) 100%)',
                  border: '1px solid rgba(175, 82, 222, 0.3)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    textShadow:
                      '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  Critical Multiplier Analysis
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Ability:</strong> {criticalMultiplier.abilityName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Normal Damage (Avg):</strong>{' '}
                  {criticalMultiplier.normalDamage.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Critical Damage (Avg):</strong>{' '}
                  {criticalMultiplier.criticalDamage.toLocaleString()}
                </Typography>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Critical Multiplier:</strong>{' '}
                  {criticalMultiplier.criticalMultiplier.toFixed(2)}x (Critical damage is{' '}
                  {(criticalMultiplier.criticalMultiplier * 100).toFixed(0)}% of normal damage)
                </Typography>

                <Typography variant="body2" sx={{ mb: 1, color: '#2e7d32', fontWeight: 'bold' }}>
                  <strong>Accounted Critical Damage:</strong>{' '}
                  {(criticalMultiplier.accountedCritDamagePercent + 50).toFixed(1)}% total
                  <span style={{ color: '#666', marginLeft: '4px' }}>
                    (50% base + {criticalMultiplier.accountedCritDamagePercent.toFixed(1)}% bonus)
                  </span>
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mb: 2,
                    color:
                      criticalMultiplier.unaccountedCritDamagePercent > 0 ? '#d32f2f' : '#2e7d32',
                    fontWeight: 'bold',
                  }}
                >
                  <strong>Unaccounted Critical Damage:</strong>{' '}
                  {criticalMultiplier.unaccountedCritDamagePercent.toFixed(1)}%
                  {criticalMultiplier.unaccountedCritDamagePercent > 0 &&
                    ' (This could be from unknown sources like gear sets, mundus stones, or other effects)'}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2, fontStyle: 'italic' }}
                >
                  Critical damage bonuses are additive before being applied as a multiplier. For
                  example, if you have 75% critical damage total (50% base + 25% from sources), your
                  critical hits will do 175% of normal damage (1.75x multiplier). This analysis
                  compares the actual multiplier observed in combat against what we expect from
                  known additive sources.
                </Typography>
              </Paper>
            )}

            {/* Critical Damage vs Time Chart */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                background:
                  'linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(0, 122, 255, 0.08) 50%, rgba(0, 122, 255, 0.04) 100%)',
                border: '1px solid rgba(0, 122, 255, 0.3)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  textShadow:
                    '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
                }}
              >
                Critical Damage vs Time
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <Line
                  data={{
                    labels: chartLabels,
                    datasets: [
                      {
                        label: 'Critical Damage %',
                        data: chartDataPoints,
                        borderColor: '#d32f2f',
                        backgroundColor: 'rgba(211, 47, 47, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        stepped: 'after',
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        tension: 0,
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
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          title: formatTooltipTitle,
                          label: formatTooltipLabel,
                        },
                      },
                      annotation: {
                        annotations: {
                          target: {
                            type: 'line',
                            yMin: 125,
                            yMax: 125,
                            borderColor: '#2e7d32',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                              content: 'Target: 125%',
                              display: true,
                              position: 'end',
                              backgroundColor: 'rgba(46, 125, 50, 0.8)',
                              color: 'white',
                              font: {
                                size: 12,
                              },
                              padding: 4,
                            },
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        type: 'linear',
                        display: true,
                        min: 0,
                        max: fightDurationSeconds,
                        title: {
                          display: true,
                          text: 'Time (seconds)',
                        },
                        ticks: {
                          callback: formatXAxisTick,
                        },
                      },
                      y: {
                        display: true,
                        title: {
                          display: true,
                          text: 'Critical Damage (%)',
                        },
                        min: 50,
                        max: 150,
                        ticks: {
                          callback: formatYAxisTick,
                        },
                      },
                    },
                    elements: {
                      point: {
                        hoverRadius: 6,
                      },
                    },
                    animation: {
                      duration: 0, // Disable animations for better performance
                    },
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Shows critical damage changes over the duration of the fight. Data downsampled to
                0.5-second intervals (highest value per interval). Data points:{' '}
                {criticalDamageData.dataPoints.length}
              </Typography>
            </Paper>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
