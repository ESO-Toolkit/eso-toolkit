import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
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
  TooltipItem,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React from 'react';

import { LineChart } from '../../../components/LazyCharts';
import type {
  DamageOverTimeResult,
  PlayerDamageOverTimeData,
} from '../../../workers/calculations/CalculateDamageOverTime';

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

// Color palette for multiple player lines
const PLAYER_COLORS = [
  '#2196f3', // Blue
  '#f44336', // Red
  '#4caf50', // Green
  '#ff9800', // Orange
  '#9c27b0', // Purple
  '#00bcd4', // Cyan
  '#ffeb3b', // Yellow
  '#795548', // Brown
  '#607d8b', // Blue Grey
  '#e91e63', // Pink
  '#3f51b5', // Indigo
  '#009688', // Teal
] as const;

interface DamageTimelineChartProps {
  /** Damage over time data */
  damageOverTimeData: DamageOverTimeResult | null;
  /** Selected target IDs for filtering */
  selectedTargetIds: Set<number>;
  /** Available target information */
  availableTargets?: Array<{ id: number; name: string }>;
  /** Loading state */
  isLoading?: boolean;
  /** Chart height in pixels */
  height?: number;
}

/**
 * Chart component for displaying damage over time with multiple player lines
 * Supports target filtering and shows DPS over time for each player
 */
export const DamageTimelineChart: React.FC<DamageTimelineChartProps> = ({
  damageOverTimeData,
  selectedTargetIds,
  availableTargets = [],
  isLoading = false,
  height = 400,
}) => {
  const [viewMode, setViewMode] = React.useState<'all' | 'filtered'>('filtered');

  // Determine which data to display
  const displayData = React.useMemo(() => {
    if (!damageOverTimeData) return null;

    if (viewMode === 'all' || selectedTargetIds.size === 0) {
      // Show data for all targets combined
      return damageOverTimeData.allTargets;
    } else {
      // Show data for selected targets combined
      const combinedData: Record<number, PlayerDamageOverTimeData> = {};

      // Aggregate data across selected targets for each player
      Object.values(damageOverTimeData.allTargets).forEach((playerData) => {
        const playerId = playerData.playerId;

        // Get this player's data for selected targets
        const playerTargetData: PlayerDamageOverTimeData[] = [];
        for (const targetId of selectedTargetIds) {
          const targetData = damageOverTimeData.byTarget[targetId]?.[playerId];
          if (targetData) {
            playerTargetData.push(targetData);
          }
        }

        if (playerTargetData.length === 0) return;

        // Combine data points across targets
        const bucketSize = damageOverTimeData.bucketSizeMs;
        const numBuckets = Math.ceil(damageOverTimeData.fightDuration / bucketSize);
        const combinedDataPoints = [];

        let totalDamage = 0;
        let totalEvents = 0;
        let maxDps = 0;

        for (let i = 0; i < numBuckets; i++) {
          let bucketDamage = 0;
          let bucketEvents = 0;

          playerTargetData.forEach((targetData) => {
            if (targetData.dataPoints[i]) {
              bucketDamage += targetData.dataPoints[i].damage;
              bucketEvents += targetData.dataPoints[i].eventCount;
            }
          });

          const relativeTime = (i * bucketSize) / 1000;
          const dps = bucketDamage / (bucketSize / 1000);

          totalDamage += bucketDamage;
          totalEvents += bucketEvents;
          maxDps = Math.max(maxDps, dps);

          combinedDataPoints.push({
            timestamp: damageOverTimeData.fightStartTime + i * bucketSize,
            relativeTime,
            damage: bucketDamage,
            eventCount: bucketEvents,
          });
        }

        const averageDps = totalDamage / (damageOverTimeData.fightDuration / 1000);

        combinedData[playerId] = {
          playerId: playerData.playerId,
          playerName: playerData.playerName,
          targetId: null,
          dataPoints: combinedDataPoints,
          totalDamage,
          totalEvents,
          averageDps,
          maxDps,
        };
      });

      return combinedData;
    }
  }, [damageOverTimeData, selectedTargetIds, viewMode]);

  // Prepare chart data
  const chartData = React.useMemo(() => {
    if (!displayData) return null;

    const players = Object.values(displayData);
    if (players.length === 0) return null;

    // Use relative time for x-axis labels
    const labels = players[0]?.dataPoints.map((point) => point.relativeTime.toFixed(1)) || [];

    const datasets = players.map((playerData, index) => {
      const color = PLAYER_COLORS[index % PLAYER_COLORS.length];

      // Convert damage to DPS for each data point
      const dpsData = playerData.dataPoints.map((point) => {
        const bucketSizeSeconds = (damageOverTimeData?.bucketSizeMs || 1000) / 1000;
        return point.damage / bucketSizeSeconds;
      });

      return {
        label: `${playerData.playerName} (Avg: ${Math.round(playerData.averageDps)} DPS)`,
        data: dpsData,
        borderColor: color,
        backgroundColor: `${color}20`, // 20% opacity
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0,
      };
    });

    return { labels, datasets };
  }, [displayData, damageOverTimeData?.bucketSizeMs]);

  // Get target name helper
  const getTargetName = React.useCallback(
    (targetId: number): string => {
      const target = availableTargets.find((t) => t.id === targetId);
      return target?.name || `Target ${targetId}`;
    },
    [availableTargets],
  );

  if (isLoading) {
    return (
      <Card sx={{ height }}>
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
        >
          <Typography color="text.secondary">Loading damage timeline...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!damageOverTimeData || !chartData) {
    return (
      <Card sx={{ height }}>
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
        >
          <Typography color="text.secondary">No damage data available</Typography>
        </CardContent>
      </Card>
    );
  }

  const selectedTargetNames = Array.from(selectedTargetIds).map(getTargetName);

  return (
    <Card sx={{ height }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              ⚔️ Damage Over Time
            </Typography>
            {selectedTargetIds.size > 0 && viewMode === 'filtered' && (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Targets:
                </Typography>
                {selectedTargetNames.slice(0, 3).map((name, index) => (
                  <Chip key={index} label={name} size="small" />
                ))}
                {selectedTargetNames.length > 3 && (
                  <Chip label={`+${selectedTargetNames.length - 3} more`} size="small" />
                )}
              </Stack>
            )}
          </Box>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>View</InputLabel>
            <Select
              value={viewMode}
              label="View"
              onChange={(e) => setViewMode(e.target.value as 'all' | 'filtered')}
            >
              <MenuItem value="all">All Targets</MenuItem>
              <MenuItem value="filtered" disabled={selectedTargetIds.size === 0}>
                Selected Targets
              </MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Chart */}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <LineChart
            data={chartData}
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
                    title: (context: TooltipItem<'line'>[]) => `Time: ${Number(context[0].label)}s`,
                    label: (context: TooltipItem<'line'>) => {
                      const dps = Math.round(Number(context.parsed.y));
                      return `${context.dataset.label?.split(' (')[0]}: ${dps.toLocaleString()} DPS`;
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
                  type: 'category',
                },
                y: {
                  title: {
                    display: true,
                    text: 'Damage Per Second (DPS)',
                  },
                  min: 0,
                  ticks: {
                    callback: (value: string | number) => `${Number(value).toLocaleString()}`,
                  },
                },
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
