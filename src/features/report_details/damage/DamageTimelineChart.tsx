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
import React from 'react';

import { EChart } from '../../../components/EChart';
import { useEChartsTheme } from '../../../hooks/useEChartsTheme';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { buildPhaseMarkLines } from '../../../utils/echartsAnnotationUtils';
import { glowLineStyle, gradientAreaStyle } from '../../../utils/echartsTheme';
import type {
  DamageOverTimeResult,
  PlayerDamageOverTimeData,
} from '../../../workers/calculations/CalculateDamageOverTime';

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
  /** Phase transition timeline information */
  phaseTransitionInfo?: PhaseTransitionInfo;
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
  phaseTransitionInfo,
}) => {
  const { theme } = useEChartsTheme();
  const [viewMode, setViewMode] = React.useState<'all' | 'filtered'>('filtered');

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

  const echartsOption = React.useMemo(() => {
    if (!displayData) return null;

    const players = Object.values(displayData);
    if (players.length === 0) return null;

    const bucketSizeSeconds = (damageOverTimeData?.bucketSizeMs || 1000) / 1000;

    const series = players.map((playerData, index) => {
      const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
      const data = playerData.dataPoints.map((point) => [
        point.relativeTime,
        point.damage / bucketSizeSeconds,
      ]);

      const phaseMarkLines =
        index === 0
          ? buildPhaseMarkLines(
              phaseTransitionInfo?.phaseTransitions,
              damageOverTimeData?.fightStartTime,
              damageOverTimeData?.fightEndTime,
            )
          : null;

      return {
        name: `${playerData.playerName} (Avg: ${Math.round(playerData.averageDps)} DPS)`,
        type: 'line' as const,
        data,
        showSymbol: false,
        emphasis: {
          focus: 'series' as const,
          lineStyle: { width: 3 },
        },
        lineStyle: {
          color,
          width: 2,
          ...glowLineStyle(color, theme.intensity, theme.perfTier),
        },
        areaStyle: gradientAreaStyle(color, theme.intensity, theme.perfTier),
        ...(phaseMarkLines ? { markLine: phaseMarkLines } : {}),
      };
    });

    return {
      xAxis: {
        type: 'value',
        name: 'Fight Time (seconds)',
        nameLocation: 'middle',
        nameGap: 28,
        axisLabel: {
          formatter: (v: number) => `${v.toFixed(1)}s`,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        name: 'Damage Per Second (DPS)',
        nameLocation: 'middle',
        nameGap: 55,
        axisLabel: {
          formatter: (v: number) => v.toLocaleString(),
        },
      },
      legend: {
        show: true,
        top: 0,
        type: 'scroll',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: Array<{ seriesName: string; value: number[]; color: string }>) => {
          if (!params[0]) return '';
          const time = Number(params[0].value[0]).toFixed(1);
          const lines = params
            .filter((p) => p.value[1] > 0)
            .sort((a, b) => b.value[1] - a.value[1])
            .map(
              (p) =>
                `<div style="display:flex;align-items:center;gap:6px">` +
                `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>` +
                `${p.seriesName.split(' (')[0]}: <b>${Math.round(p.value[1]).toLocaleString()} DPS</b></div>`,
            );
          return `<div style="font-size:13px"><div style="color:${theme.mutedColor};margin-bottom:4px">Time: ${time}s</div>${lines.join('')}</div>`;
        },
      },
      toolbox: {
        show: true,
        right: 12,
        top: 0,
        feature: {
          saveAsImage: {
            title: 'Save',
            pixelRatio: 2,
          },
        },
      },
      series,
    };
  }, [displayData, damageOverTimeData, phaseTransitionInfo, theme]);

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

  if (!damageOverTimeData || !echartsOption) {
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
          <EChart
            option={echartsOption}
            height="100%"
            group="fightReport"
          />
        </Box>
      </CardContent>
    </Card>
  );
};
