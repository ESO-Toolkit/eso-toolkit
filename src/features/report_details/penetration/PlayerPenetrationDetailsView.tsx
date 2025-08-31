import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
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

import { PlayerIcon } from '../../../components/PlayerIcon';
import { StatChecklist } from '../../../components/StatChecklist';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
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

interface PenetrationDataPoint {
  timestamp: number;
  penetration: number;
  relativeTime: number; // Time since fight start in seconds
}

export interface PlayerPenetrationData {
  playerId: string;
  playerName: string;
  dataPoints: PenetrationDataPoint[];
  max: number;
  effective: number;
  timeAtCapPercentage: number;
}

interface PenetrationSource {
  name: string;
  value: number;
  wasActive: boolean;
  description: string;
  link?: string; // Optional external link for detailed analysis
}

export interface PenetrationSourceWithActiveState extends PenetrationSource {
  wasActive: boolean;
}

interface PlayerPenetrationDetailsViewProps {
  id: string;
  player: PlayerDetailsWithRole;
  name: string;
  expanded: boolean;
  isLoading: boolean;
  penetrationData: PlayerPenetrationData | null;
  penetrationSources: PenetrationSourceWithActiveState[];
  playerBasePenetration: number;
  fightDurationSeconds: number;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const PlayerPenetrationDetailsView: React.FC<PlayerPenetrationDetailsViewProps> = ({
  id,
  name,
  expanded,
  isLoading,
  penetrationData,
  penetrationSources,
  player,
  playerBasePenetration,
  fightDurationSeconds,
  onExpandChange,
}) => {
  if (!penetrationData) {
    return (
      <Accordion 
        expanded={expanded} 
        onChange={onExpandChange}
        variant="outlined"
        className="u-hover-lift u-fade-in-up"
        sx={{
          background: 'linear-gradient(135deg, rgb(110 214 240 / 25%) 0%, rgb(131 208 227 / 15%) 50%, rgb(35 122 144 / 8%) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
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
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexGrow: 1 }}>
            <PlayerIcon player={player} />
            <Typography variant="h6" sx={{ 
              fontSize: '1.75rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.2)'
            }}>
              {name}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>No penetration data available for this player.</Typography>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Accordion 
      expanded={expanded} 
      onChange={onExpandChange}
      variant="outlined"
      className="u-hover-lift u-fade-in-up"
      sx={{
        background: 'linear-gradient(135deg, rgb(110 214 240 / 25%) 0%, rgb(131 208 227 / 15%) 50%, rgb(35 122 144 / 8%) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
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
        sx={{
          '& .MuiAccordionSummary-content': {
            margin: '12px 0',
          },
          '&.Mui-expanded .MuiAccordionSummary-content': {
            margin: '12px 0',
          },
        }}
        id={`panel-${id}-header`}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <PlayerIcon player={player} />
            <Typography variant="subtitle1" fontWeight="bold" sx={{
              fontSize: '1.75rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.2)'
            }}>
              {resolveActorName(player)}
            </Typography>
          </Box>
          {!isLoading && (
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {/* Max Penetration */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                <Typography
                  variant="caption"
                  sx={{ 
                    color: 'text.secondary', 
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 0.25
                  }}
                >
                  Max
                </Typography>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    background: penetrationData.max > 18200 
                      ? 'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(76, 217, 100, 0.15) 50%, rgba(76, 217, 100, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 68, 68, 0.25) 0%, rgba(255, 68, 68, 0.15) 50%, rgba(255, 68, 68, 0.08) 100%)',
                    border: `1px solid ${penetrationData.max > 18200 ? 'rgba(76, 217, 100, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ 
                      color: penetrationData.max > 18200 ? '#5ce572' : '#ff6666',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}
                  >
                    {penetrationData.max}
                  </Typography>
                </Box>
              </Box>

              {/* Effective Penetration */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                <Typography
                  variant="caption"
                  sx={{ 
                    color: 'text.secondary', 
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 0.25
                  }}
                >
                  Effective
                </Typography>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    background: penetrationData.effective > 18200 
                      ? 'linear-gradient(135deg, rgba(94, 234, 255, 0.25) 0%, rgba(94, 234, 255, 0.15) 50%, rgba(94, 234, 255, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 50%, rgba(255, 193, 7, 0.08) 100%)',
                    border: `1px solid ${penetrationData.effective > 18200 ? 'rgba(94, 234, 255, 0.35)' : 'rgba(255, 193, 7, 0.35)'}`,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ 
                      color: penetrationData.effective > 18200 ? '#7ee8ff' : '#ffd54f',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}
                  >
                    {penetrationData.effective.toFixed(0)}
                  </Typography>
                </Box>
              </Box>

              {/* Time at Cap */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                <Typography
                  variant="caption"
                  sx={{ 
                    color: 'text.secondary', 
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 0.25
                  }}
                >
                  At Cap
                </Typography>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    background: penetrationData.timeAtCapPercentage >= 80
                      ? 'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(76, 217, 100, 0.15) 50%, rgba(76, 217, 100, 0.08) 100%)'
                      : penetrationData.timeAtCapPercentage >= 50
                      ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 50%, rgba(255, 193, 7, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 68, 68, 0.25) 0%, rgba(255, 68, 68, 0.15) 50%, rgba(255, 68, 68, 0.08) 100%)',
                    border: `1px solid ${
                      penetrationData.timeAtCapPercentage >= 80 
                        ? 'rgba(76, 217, 100, 0.3)'
                        : penetrationData.timeAtCapPercentage >= 50
                        ? 'rgba(255, 193, 7, 0.35)'
                        : 'rgba(255, 68, 68, 0.3)'
                    }`,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ 
                      color: penetrationData.timeAtCapPercentage >= 80 
                        ? '#5ce572'
                        : penetrationData.timeAtCapPercentage >= 50
                        ? '#ffd54f'
                        : '#ff6666',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}
                  >
                    {penetrationData.timeAtCapPercentage.toFixed(0)}%
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {/* Only render content when panel is expanded */}
        {expanded && (
          <Box>

            {/* Penetration Sources Checklist */}
            <StatChecklist
              sources={penetrationSources}
              title="Penetration Sources"
              loading={isLoading}
            />

            {/* Penetration vs Time Chart */}
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                mb: 2,
                background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(0, 122, 255, 0.08) 50%, rgba(0, 122, 255, 0.04) 100%)',
                border: '1px solid rgba(0, 122, 255, 0.3)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <Typography variant="h6" sx={{ 
                mb: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.2)'
              }}>
                Penetration vs Time
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <Line
                  data={{
                    labels: penetrationData.dataPoints.map((point) =>
                      point.relativeTime.toFixed(1)
                    ),
                    datasets: [
                      {
                        label: 'Penetration',
                        data: penetrationData.dataPoints.map((point) => ({
                          x: point.relativeTime,
                          y: point.penetration,
                        })),
                        borderColor: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
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
                          title: (context) => `Time: ${Number(context[0].parsed.x).toFixed(1)}s`,
                          label: (context) => `${context.parsed.y} penetration`,
                        },
                      },
                      annotation: {
                        annotations: {
                          goalLine: {
                            type: 'line',
                            yMin: 18200,
                            yMax: 18200,
                            borderColor: '#ff6b6b',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                              content: 'Goal: 18,200',
                              display: true,
                              position: 'end',
                              backgroundColor: 'rgba(255, 107, 107, 0.8)',
                              color: 'white',
                              font: {
                                size: 12,
                              },
                              padding: 4,
                            },
                          },
                          baseLine: {
                            type: 'line',
                            yMin: playerBasePenetration,
                            yMax: playerBasePenetration,
                            borderColor: '#2196f3',
                            borderWidth: 2,
                            borderDash: [3, 3],
                            label: {
                              content: `Base: ${playerBasePenetration.toLocaleString()}`,
                              display: true,
                              position: 'start',
                              backgroundColor: 'rgba(33, 150, 243, 0.8)',
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
                          callback: function (value) {
                            return `${Number(value).toFixed(1)}s`;
                          },
                        },
                      },
                      y: {
                        display: true,
                        title: {
                          display: true,
                          text: 'Penetration',
                        },
                        min: 0,
                        max: 20000,
                        ticks: {
                          callback: function (value) {
                            return `${value}`;
                          },
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
                Shows penetration changes over the duration of the fight. Data voxelized to 1-second
                intervals (highest value per interval). Data points:{' '}
                {penetrationData.dataPoints.length}
              </Typography>
            </Paper>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
