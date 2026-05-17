import LayersIcon from '@mui/icons-material/Layers';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import React from 'react';

import { EChart } from '../../../components/EChart';
import { useEChartsTheme } from '../../../hooks/useEChartsTheme';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { useUptimeSeriesForStackedView } from '../../../hooks/useUptimeSeriesForStackedView';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { buildPhaseMarkLines } from '../../../utils/echartsAnnotationUtils';
import { glowLineStyle, gradientAreaStyle, steppedLineDefaults } from '../../../utils/echartsTheme';
import type { FightFragment } from '../../../graphql/gql/graphql';
import type {
  DamageOverTimeResult,
  PlayerDamageOverTimeData,
} from '../../../workers/calculations/CalculateDamageOverTime';
import type { UptimeTimelineSeries } from '../insights/utils/buildUptimeTimeline';

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

const UPTIME_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#dc2626', '#f97316',
  '#14b8a6', '#a855f7', '#f59e0b', '#0ea5e9', '#f43f5e',
  '#22c55e', '#e11d48',
] as const;

interface DamageTimelineChartProps {
  damageOverTimeData: DamageOverTimeResult | null;
  selectedTargetIds: Set<number>;
  availableTargets?: Array<{ id: number; name: string }>;
  isLoading?: boolean;
  height?: number;
  phaseTransitionInfo?: PhaseTransitionInfo;
  context?: ReportFightContextInput;
  fight?: FightFragment | null;
  resolvePlayerName?: (playerId: number, fallbackName: string) => string;
}

const StackedUptimeLoader: React.FC<{
  fight?: FightFragment | null;
  context?: ReportFightContextInput;
  onData: (series: UptimeTimelineSeries[]) => void;
}> = ({ fight, context, onData }) => {
  const { uptimeSeries } = useUptimeSeriesForStackedView({ fight, context, enabled: true });
  React.useEffect(() => {
    onData(uptimeSeries);
  }, [uptimeSeries, onData]);
  return null;
};

export const DamageTimelineChart: React.FC<DamageTimelineChartProps> = ({
  damageOverTimeData,
  selectedTargetIds,
  availableTargets = [],
  isLoading = false,
  height = 400,
  phaseTransitionInfo,
  context,
  fight,
  resolvePlayerName,
}) => {
  const { theme } = useEChartsTheme();
  const [viewMode, setViewMode] = React.useState<'all' | 'filtered'>('filtered');
  const [stacked, setStacked] = React.useState(false);
  const [uptimeSeries, setUptimeSeries] = React.useState<UptimeTimelineSeries[]>([]);
  const handleUptimeData = React.useCallback((series: UptimeTimelineSeries[]) => {
    setUptimeSeries(series);
  }, []);

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
    const showStacked = stacked && uptimeSeries && uptimeSeries.length > 0;

    const dpsSeries = players.map((playerData, index) => {
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
        name: `${resolvePlayerName ? resolvePlayerName(playerData.playerId, playerData.playerName) : playerData.playerName} (Avg: ${Math.round(playerData.averageDps).toLocaleString()} DPS)`,
        type: 'line' as const,
        data,
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0,
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

    const uptimeSeriesEcharts = showStacked
      ? uptimeSeries!.map((dataset, index) => {
          const color = UPTIME_COLORS[index % UPTIME_COLORS.length];
          return {
            name: dataset.label,
            type: 'line' as const,
            data: dataset.points.map((p: { x: number; y: number }) => [p.x, p.y]),
            xAxisIndex: 1,
            yAxisIndex: 1,
            ...steppedLineDefaults(),
            lineStyle: {
              color,
              width: 1.5,
              ...glowLineStyle(color, theme.intensity, theme.perfTier),
            },
            areaStyle: gradientAreaStyle(color, theme.intensity, theme.perfTier),
          };
        })
      : [];

    const allSeries = [...dpsSeries, ...uptimeSeriesEcharts];

    const grid = showStacked
      ? [
          { left: 12, right: 20, top: 40, bottom: '42%', containLabel: true },
          { left: 12, right: 20, top: '64%', bottom: 60, containLabel: true },
        ]
      : { left: 12, right: 20, top: 40, bottom: 60, containLabel: true };

    const axisLabelStyle = { color: theme.mutedColor, fontSize: 11 };
    const xSplitLine = { show: false };
    const ySplitLine = { lineStyle: { color: theme.gridLineColor, type: 'dotted' as const } };
    const xAxisLine = { lineStyle: { color: theme.borderColor } };

    const xAxis = showStacked
      ? [
          {
            type: 'value',
            gridIndex: 0,
            axisLabel: { show: false },
            axisTick: { show: false },
            axisLine: xAxisLine,
            splitLine: xSplitLine,
          },
          {
            type: 'value',
            gridIndex: 1,
            name: 'Fight Time (seconds)',
            nameLocation: 'middle',
            nameGap: 28,
            nameTextStyle: { color: theme.mutedColor },
            axisLabel: { ...axisLabelStyle, formatter: (v: number) => `${v.toFixed(1)}s` },
            axisLine: xAxisLine,
            splitLine: xSplitLine,
          },
        ]
      : {
          type: 'value',
          name: 'Fight Time (seconds)',
          nameLocation: 'middle',
          nameGap: 28,
          nameTextStyle: { color: theme.mutedColor },
          axisLabel: { ...axisLabelStyle, formatter: (v: number) => `${v.toFixed(1)}s` },
          axisLine: xAxisLine,
          splitLine: xSplitLine,
        };

    const yAxis = showStacked
      ? [
          {
            type: 'value',
            gridIndex: 0,
            min: 0,
            name: 'DPS',
            nameLocation: 'middle',
            nameGap: 55,
            nameTextStyle: { color: theme.mutedColor },
            axisLabel: { ...axisLabelStyle, formatter: (v: number) => v.toLocaleString() },
            axisLine: { show: false },
            splitLine: ySplitLine,
          },
          {
            type: 'value',
            gridIndex: 1,
            min: 0,
            max: 1.1,
            name: 'Buffs',
            nameLocation: 'middle',
            nameGap: 36,
            nameTextStyle: { color: theme.mutedColor },
            axisLabel: { ...axisLabelStyle, formatter: (v: number) => (v >= 1 ? 'Active' : '') },
            axisLine: { show: false },
            splitLine: ySplitLine,
          },
        ]
      : {
          type: 'value',
          min: 0,
          name: 'Damage Per Second (DPS)',
          nameLocation: 'middle',
          nameGap: 55,
          nameTextStyle: { color: theme.mutedColor },
          axisLabel: { ...axisLabelStyle, formatter: (v: number) => v.toLocaleString() },
          axisLine: { show: false },
          splitLine: ySplitLine,
        };

    const dataZoom = showStacked
      ? [
          { type: 'slider', xAxisIndex: [0, 1], bottom: 4, height: 20 },
          { type: 'inside', xAxisIndex: [0, 1], zoomOnMouseWheel: 'shift' },
        ]
      : undefined;

    return {
      grid,
      xAxis,
      yAxis,
      legend: {
        show: true,
        top: 4,
        left: 12,
        right: 60,
        type: 'scroll',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: Array<{ seriesName: string; value: number[]; color: string; axisIndex: number }>) => {
          if (!params[0]) return '';
          const time = Number(params[0].value[0]).toFixed(1);
          const dpsLines = params
            .filter((p) => p.value[1] > 0 && !uptimeSeriesEcharts.some((s) => s.name === p.seriesName))
            .sort((a, b) => b.value[1] - a.value[1])
            .map(
              (p) =>
                `<div style="display:flex;align-items:center;gap:6px">` +
                `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>` +
                `${p.seriesName.split(' (')[0]}: <b>${Math.round(p.value[1]).toLocaleString()} DPS</b></div>`,
            );
          const uptimeLines = showStacked
            ? params
                .filter((p) => uptimeSeriesEcharts.some((s) => s.name === p.seriesName) && p.value[1] > 0)
                .map(
                  (p) =>
                    `<div style="display:flex;align-items:center;gap:6px">` +
                    `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>` +
                    `${p.seriesName}: <b>Active</b></div>`,
                )
            : [];
          const allLines = [...dpsLines, ...(uptimeLines.length ? ['<div style="border-top:1px solid rgba(128,128,128,0.3);margin:4px 0"></div>', ...uptimeLines] : [])];
          return `<div style="font-size:13px"><div style="color:${theme.mutedColor};margin-bottom:4px">Time: ${time}s</div>${allLines.join('')}</div>`;
        },
      },
      toolbox: {
        show: true,
        right: 4,
        top: 2,
        itemSize: 14,
        feature: {
          saveAsImage: {
            title: 'Save',
            pixelRatio: 2,
          },
        },
      },
      ...(dataZoom ? { dataZoom } : {}),
      series: allSeries,
    };
  }, [displayData, damageOverTimeData, phaseTransitionInfo, theme, stacked, uptimeSeries, resolvePlayerName]);

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

  const showStacked = stacked && uptimeSeries && uptimeSeries.length > 0;
  const resolvedHeight = showStacked ? height + 220 : height;

  return (
    <Card sx={{ height: resolvedHeight, transition: 'height 0.3s ease' }}>
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title={stacked ? 'Hide buff timeline' : 'Stack buff timeline below'}>
              <IconButton
                size="small"
                onClick={() => setStacked((s) => !s)}
                sx={{
                  color: stacked ? 'primary.main' : 'text.secondary',
                  border: stacked ? '1px solid' : '1px solid transparent',
                  borderColor: stacked ? 'primary.main' : 'transparent',
                  borderRadius: 1,
                }}
              >
                <LayersIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <FormControl size="small" sx={{ minWidth: 130 }}>
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
        </Box>

        {/* Lazy loader — only mounts when stacked mode is activated */}
        {stacked && (
          <StackedUptimeLoader fight={fight} context={context} onData={handleUptimeData} />
        )}

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
