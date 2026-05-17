import FilterListIcon from '@mui/icons-material/FilterList';
import LayersIcon from '@mui/icons-material/Layers';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Collapse,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { getInstanceByDom } from 'echarts/core';
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
  const [stacked, setStacked] = React.useState(false);
  const [uptimeSeries, setUptimeSeries] = React.useState<UptimeTimelineSeries[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);
  const [hiddenPlayerIds, setHiddenPlayerIds] = React.useState<Set<number>>(new Set());
  const [localTargetIds, setLocalTargetIds] = React.useState<number[] | null>(null);
  const [hiddenBuffNames, setHiddenBuffNames] = React.useState<Set<string>>(new Set());
  const chartWrapperRef = React.useRef<HTMLDivElement>(null);
  const handleUptimeData = React.useCallback((series: UptimeTimelineSeries[]) => {
    setUptimeSeries(series);
  }, []);

  const handleSaveAsImage = React.useCallback(() => {
    const container = chartWrapperRef.current?.firstElementChild as HTMLElement | null;
    if (!container) return;
    const instance = getInstanceByDom(container);
    if (!instance) return;
    const url = instance.getDataURL({ pixelRatio: 2, type: 'png' });
    const a = document.createElement('a');
    a.href = url;
    a.download = 'damage-over-time.png';
    a.click();
  }, []);

  const effectiveTargetIds = React.useMemo(() => {
    if (localTargetIds !== null) return new Set(localTargetIds);
    return selectedTargetIds;
  }, [localTargetIds, selectedTargetIds]);

  const displayData = React.useMemo(() => {
    if (!damageOverTimeData) return null;

    if (effectiveTargetIds.size === 0) {
      return damageOverTimeData.allTargets;
    }

    const combinedData: Record<number, PlayerDamageOverTimeData> = {};

    Object.values(damageOverTimeData.allTargets).forEach((playerData) => {
      const playerId = playerData.playerId;
      const playerTargetData: PlayerDamageOverTimeData[] = [];
      for (const targetId of effectiveTargetIds) {
        const targetData = damageOverTimeData.byTarget[targetId]?.[playerId];
        if (targetData) {
          playerTargetData.push(targetData);
        }
      }

      if (playerTargetData.length === 0) return;

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
  }, [damageOverTimeData, effectiveTargetIds]);

  const playerOptions = React.useMemo(() => {
    if (!displayData) return [];
    return Object.values(displayData).map((p) => ({
      id: p.playerId,
      name: resolvePlayerName ? resolvePlayerName(p.playerId, p.playerName) : p.playerName,
    }));
  }, [displayData, resolvePlayerName]);

  const buffOptions = React.useMemo(() => {
    return uptimeSeries.map((s) => s.label);
  }, [uptimeSeries]);

  const handlePlayerChipClick = React.useCallback((id: number) => {
    setHiddenPlayerIds((prev) => {
      const allIds = new Set(playerOptions.map((p) => p.id));
      const visibleCount = playerOptions.filter((p) => !prev.has(p.id)).length;
      if (visibleCount === 1 && !prev.has(id)) {
        return new Set();
      }
      const next = new Set(allIds);
      next.delete(id);
      return next;
    });
  }, [playerOptions]);

  const handleTargetChipClick = React.useCallback((id: number) => {
    setLocalTargetIds((prev) => {
      if (prev !== null && prev.length === 1 && prev[0] === id) {
        return null;
      }
      return [id];
    });
  }, []);

  const handleBuffChipClick = React.useCallback((name: string) => {
    setHiddenBuffNames((prev) => {
      const visibleCount = buffOptions.filter((b) => !prev.has(b)).length;
      if (visibleCount === 1 && !prev.has(name)) {
        return new Set();
      }
      const next = new Set(buffOptions);
      next.delete(name);
      return next;
    });
  }, [buffOptions]);

  const echartsOption = React.useMemo(() => {
    if (!displayData) return null;

    const players = Object.values(displayData).filter((p) => !hiddenPlayerIds.has(p.playerId));
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

    const filteredUptimeSeries = showStacked
      ? uptimeSeries!.filter((s) => !hiddenBuffNames.has(s.label))
      : [];

    const uptimeSeriesEcharts = filteredUptimeSeries.map((dataset, index) => {
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
    });

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

    const legend = {
      show: true,
      top: 4,
      left: 12,
      right: 12,
      type: 'scroll' as const,
      data: dpsSeries.map((s) => s.name),
    };

    return {
      grid,
      xAxis,
      yAxis,
      legend,
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
      ...(dataZoom ? { dataZoom } : {}),
      series: allSeries,
    };
  }, [displayData, damageOverTimeData, phaseTransitionInfo, theme, stacked, uptimeSeries, resolvePlayerName, hiddenPlayerIds, hiddenBuffNames]);

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

  const showStacked = stacked && uptimeSeries && uptimeSeries.length > 0;
  const hasActiveFilters = hiddenPlayerIds.size > 0 || localTargetIds !== null || hiddenBuffNames.size > 0;
  const filterRowCount = showFilters ? (showStacked && buffOptions.length > 0 ? 3 : 2) : 0;
  const filterHeight = filterRowCount * 34;
  const resolvedHeight = (showStacked ? height + 220 : height) + filterHeight;

  return (
    <Card sx={{ height: resolvedHeight, transition: 'height 0.3s ease' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">
            Damage Over Time
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Filters">
              <IconButton
                size="small"
                onClick={() => setShowFilters((s) => !s)}
                sx={{
                  color: hasActiveFilters || showFilters ? 'primary.main' : 'text.secondary',
                  border: hasActiveFilters ? '1px solid' : '1px solid transparent',
                  borderColor: hasActiveFilters ? 'primary.main' : 'transparent',
                  borderRadius: 1,
                }}
              >
                <FilterListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save as image">
              <IconButton size="small" onClick={handleSaveAsImage} sx={{ color: 'text.secondary' }}>
                <SaveAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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
          </Box>
        </Box>

        {/* Filter Row */}
        <Collapse in={showFilters}>
          <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {/* Player chips */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontWeight: 600, minWidth: 48 }}>
                Players
              </Typography>
              <Chip
                label="All"
                size="small"
                variant={hiddenPlayerIds.size === 0 ? 'filled' : 'outlined'}
                color={hiddenPlayerIds.size === 0 ? 'primary' : 'default'}
                onClick={() => setHiddenPlayerIds(new Set())}
                sx={{ height: 24, fontSize: '0.7rem' }}
              />
              {playerOptions.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  size="small"
                  variant={hiddenPlayerIds.has(p.id) ? 'outlined' : 'filled'}
                  color={hiddenPlayerIds.has(p.id) ? 'default' : 'primary'}
                  onClick={() => handlePlayerChipClick(p.id)}
                  sx={{ height: 24, fontSize: '0.7rem', opacity: hiddenPlayerIds.has(p.id) ? 0.5 : 1 }}
                />
              ))}
            </Box>
            {/* Target chips */}
            {availableTargets.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontWeight: 600, minWidth: 48 }}>
                  Targets
                </Typography>
                <Chip
                  label="All"
                  size="small"
                  variant={localTargetIds === null ? 'filled' : 'outlined'}
                  color={localTargetIds === null ? 'primary' : 'default'}
                  onClick={() => setLocalTargetIds(null)}
                  sx={{ height: 24, fontSize: '0.7rem' }}
                />
                {availableTargets.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.name}
                    size="small"
                    variant={localTargetIds !== null && !localTargetIds.includes(t.id) ? 'outlined' : 'filled'}
                    color={localTargetIds !== null && !localTargetIds.includes(t.id) ? 'default' : 'primary'}
                    onClick={() => handleTargetChipClick(t.id)}
                    sx={{ height: 24, fontSize: '0.7rem', opacity: localTargetIds !== null && !localTargetIds.includes(t.id) ? 0.5 : 1 }}
                  />
                ))}
              </Box>
            )}
            {/* Buff chips */}
            {showStacked && buffOptions.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontWeight: 600, minWidth: 48 }}>
                  Buffs
                </Typography>
                <Chip
                  label="All"
                  size="small"
                  variant={hiddenBuffNames.size === 0 ? 'filled' : 'outlined'}
                  color={hiddenBuffNames.size === 0 ? 'primary' : 'default'}
                  onClick={() => setHiddenBuffNames(new Set())}
                  sx={{ height: 24, fontSize: '0.7rem' }}
                />
                {buffOptions.map((b) => (
                  <Chip
                    key={b}
                    label={b}
                    size="small"
                    variant={hiddenBuffNames.has(b) ? 'outlined' : 'filled'}
                    color={hiddenBuffNames.has(b) ? 'default' : 'primary'}
                    onClick={() => handleBuffChipClick(b)}
                    sx={{ height: 24, fontSize: '0.7rem', opacity: hiddenBuffNames.has(b) ? 0.5 : 1 }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Collapse>

        {/* Lazy loader — only mounts when stacked mode is activated */}
        {stacked && (
          <StackedUptimeLoader fight={fight} context={context} onData={handleUptimeData} />
        )}

        {/* Chart */}
        <Box ref={chartWrapperRef} sx={{ flex: 1, minHeight: 0 }}>
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
