import FilterListIcon from '@mui/icons-material/FilterList';
import LayersIcon from '@mui/icons-material/Layers';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import { Box, Typography, Card, CardContent, Collapse, IconButton, Tooltip } from '@mui/material';
import { getInstanceByDom } from 'echarts/core';
import React from 'react';

import { EChart } from '../../../components/EChart';
import type { FightFragment } from '../../../graphql/gql/graphql';
import { useEChartsTheme } from '../../../hooks/useEChartsTheme';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { useUptimeSeriesForStackedView } from '../../../hooks/useUptimeSeriesForStackedView';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { buildPhaseMarkLines } from '../../../utils/echartsAnnotationUtils';
import { glowLineStyle, gradientAreaStyle, hexToRgb } from '../../../utils/echartsTheme';
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
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#f97316',
  '#14b8a6',
  '#a855f7',
  '#f59e0b',
  '#0ea5e9',
  '#f43f5e',
  '#22c55e',
  '#e11d48',
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

  const handlePlayerChipClick = React.useCallback(
    (id: number) => {
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
    },
    [playerOptions],
  );

  const handleTargetChipClick = React.useCallback((id: number) => {
    setLocalTargetIds((prev) => {
      if (prev !== null && prev.length === 1 && prev[0] === id) {
        return null;
      }
      return [id];
    });
  }, []);

  const handleBuffChipClick = React.useCallback(
    (name: string) => {
      setHiddenBuffNames((prev) => {
        const visibleCount = buffOptions.filter((b) => !prev.has(b)).length;
        if (visibleCount === 1 && !prev.has(name)) {
          return new Set();
        }
        const next = new Set(buffOptions);
        next.delete(name);
        return next;
      });
    },
    [buffOptions],
  );

  const visibleBuffLegendEntries = React.useMemo(() => {
    if (!stacked || uptimeSeries.length === 0) return [];
    return uptimeSeries
      .filter((s) => !hiddenBuffNames.has(s.label))
      .map((s, index) => ({
        name: s.label,
        color: UPTIME_COLORS[index % UPTIME_COLORS.length],
      }));
  }, [stacked, uptimeSeries, hiddenBuffNames]);

  const visibleLegendEntries = React.useMemo(() => {
    if (!displayData) return [];
    return Object.values(displayData)
      .filter((p) => !hiddenPlayerIds.has(p.playerId))
      .map((p, index) => ({
        name: resolvePlayerName ? resolvePlayerName(p.playerId, p.playerName) : p.playerName,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      }));
  }, [displayData, hiddenPlayerIds, resolvePlayerName]);

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
        data: dataset.points.map((p: { x: number; y: number }) => [
          p.x,
          p.y > 0 ? index + 0.85 : index,
        ]),
        xAxisIndex: 1,
        yAxisIndex: 1,
        step: 'end' as const,
        showSymbol: false,
        symbolSize: 0,
        lineStyle: {
          color,
          width: 1,
          opacity: 0.7,
        },
        areaStyle: {
          color: color + '30',
          origin: index,
        },
        emphasis: {
          areaStyle: { color: color + '55' },
          lineStyle: { width: 1.5, opacity: 1 },
        },
      };
    });

    const allSeries = [...dpsSeries, ...uptimeSeriesEcharts];

    const buffCount = filteredUptimeSeries.length;
    const grid = showStacked
      ? [
          { left: 12, right: 20, top: 12, bottom: '46%', containLabel: true },
          { left: 12, right: 20, top: '58%', bottom: 60, containLabel: true },
        ]
      : { left: 12, right: 20, top: 12, bottom: 60, containLabel: true };

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
            min: -0.2,
            max: Math.max(buffCount, 1),
            axisLabel: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
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

    const legend = { show: false };

    return {
      grid,
      xAxis,
      yAxis,
      legend,
      tooltip: {
        trigger: 'axis',
        formatter: (
          params: Array<{ seriesName: string; value: number[]; color: string; axisIndex: number }>,
        ) => {
          if (!params[0]) return '';
          const time = Number(params[0].value[0]).toFixed(1);
          const dpsLines = params
            .filter(
              (p) => p.value[1] > 0 && !uptimeSeriesEcharts.some((s) => s.name === p.seriesName),
            )
            .sort((a, b) => b.value[1] - a.value[1])
            .map(
              (p) =>
                `<div style="display:flex;align-items:center;gap:6px">` +
                `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>` +
                `${p.seriesName.split(' (')[0]}: <b>${Math.round(p.value[1]).toLocaleString()} DPS</b></div>`,
            );
          const uptimeLines = showStacked
            ? params
                .filter(
                  (p) => uptimeSeriesEcharts.some((s) => s.name === p.seriesName) && p.value[1] > 0,
                )
                .map(
                  (p) =>
                    `<div style="display:flex;align-items:center;gap:6px">` +
                    `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>` +
                    `${p.seriesName}: <b>Active</b></div>`,
                )
            : [];
          const allLines = [
            ...dpsLines,
            ...(uptimeLines.length
              ? [
                  '<div style="border-top:1px solid rgba(128,128,128,0.3);margin:4px 0"></div>',
                  ...uptimeLines,
                ]
              : []),
          ];
          return `<div style="font-size:13px"><div style="color:${theme.mutedColor};margin-bottom:4px">Time: ${time}s</div>${allLines.join('')}</div>`;
        },
      },
      ...(dataZoom ? { dataZoom } : {}),
      series: allSeries,
    };
  }, [
    displayData,
    damageOverTimeData,
    phaseTransitionInfo,
    theme,
    stacked,
    uptimeSeries,
    resolvePlayerName,
    hiddenPlayerIds,
    hiddenBuffNames,
  ]);

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
  const hasActiveFilters =
    hiddenPlayerIds.size > 0 || localTargetIds !== null || hiddenBuffNames.size > 0;
  const chartHeight = showStacked ? height + 300 : height;

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">Damage Over Time</Typography>

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

        {/* Filter Panel */}
        <Collapse in={showFilters} timeout={250} easing="cubic-bezier(0.4, 0, 0.2, 1)">
          <Box
            sx={{
              mb: 1.5,
              p: 1.5,
              borderRadius: '14px',
              background: theme.darkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
              backdropFilter: 'blur(12px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
              border: theme.darkMode
                ? '1px solid rgba(56, 189, 248, 0.12)'
                : '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: theme.darkMode
                ? '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                : '0 2px 12px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {/* Players row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: theme.darkMode ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)',
                  minWidth: 52,
                }}
              >
                Players
              </Typography>
              <Box
                onClick={() => setHiddenPlayerIds(new Set())}
                sx={{
                  height: 30,
                  borderRadius: '15px',
                  px: 1.25,
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  color: hasActiveFilters
                    ? theme.darkMode
                      ? '#38bdf8'
                      : '#0ea5e9'
                    : theme.darkMode
                      ? 'rgba(148, 163, 184, 0.5)'
                      : 'rgba(100, 116, 139, 0.4)',
                  background: hasActiveFilters
                    ? theme.darkMode
                      ? 'rgba(56, 189, 248, 0.1)'
                      : 'rgba(14, 165, 233, 0.06)'
                    : 'transparent',
                  border: hasActiveFilters
                    ? `1.5px solid ${theme.darkMode ? 'rgba(56, 189, 248, 0.35)' : 'rgba(14, 165, 233, 0.25)'}`
                    : '1.5px solid transparent',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    color: theme.darkMode ? '#38bdf8' : '#0ea5e9',
                    background: theme.darkMode
                      ? 'rgba(56, 189, 248, 0.15)'
                      : 'rgba(14, 165, 233, 0.08)',
                  },
                }}
              >
                All
              </Box>
              {playerOptions.map((p, index) => {
                const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
                const rgb = hexToRgb(color);
                const isHidden = hiddenPlayerIds.has(p.id);
                const isSoloed = hiddenPlayerIds.size === playerOptions.length - 1 && !isHidden;
                return (
                  <Box
                    key={p.id}
                    onClick={() => handlePlayerChipClick(p.id)}
                    sx={{
                      height: 30,
                      borderRadius: '15px',
                      px: 1.25,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: isSoloed ? 700 : 600,
                      userSelect: 'none',
                      color: isHidden
                        ? theme.darkMode
                          ? 'rgba(148, 163, 184, 0.5)'
                          : 'rgba(100, 116, 139, 0.5)'
                        : theme.darkMode
                          ? '#e2e8f0'
                          : '#1e293b',
                      background: isSoloed
                        ? `rgba(${rgb}, ${theme.darkMode ? 0.25 : 0.12})`
                        : isHidden
                          ? 'transparent'
                          : `rgba(${rgb}, ${theme.darkMode ? 0.12 : 0.06})`,
                      border: isSoloed
                        ? `2px solid ${color}`
                        : isHidden
                          ? `1.5px solid rgba(${rgb}, 0.1)`
                          : `1.5px solid rgba(${rgb}, ${theme.darkMode ? 0.4 : 0.3})`,
                      boxShadow: isSoloed
                        ? `0 0 14px rgba(${rgb}, ${theme.darkMode ? 0.4 : 0.25})`
                        : 'none',
                      opacity: isHidden ? 0.4 : 1,
                      transform: isSoloed ? 'scale(1.05)' : isHidden ? 'scale(0.95)' : 'scale(1)',
                      filter: isHidden ? 'grayscale(0.7)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        background: `rgba(${rgb}, ${theme.darkMode ? 0.2 : 0.1})`,
                        boxShadow: `0 0 12px rgba(${rgb}, 0.3)`,
                        transform: 'translateY(-1px) scale(1.02)',
                        opacity: 1,
                        filter: 'none',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: color,
                        flexShrink: 0,
                        boxShadow: theme.darkMode && !isHidden ? `0 0 6px ${color}` : 'none',
                        transition: 'box-shadow 0.2s ease',
                      }}
                    />
                    {p.name}
                  </Box>
                );
              })}
            </Box>

            {/* Targets row */}
            {availableTargets.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: theme.darkMode ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)',
                    minWidth: 52,
                  }}
                >
                  Targets
                </Typography>
                <Box
                  onClick={() => setLocalTargetIds([])}
                  sx={{
                    height: 30,
                    borderRadius: '15px',
                    px: 1.25,
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    color:
                      localTargetIds !== null
                        ? theme.darkMode
                          ? '#38bdf8'
                          : '#0ea5e9'
                        : theme.darkMode
                          ? 'rgba(148, 163, 184, 0.5)'
                          : 'rgba(100, 116, 139, 0.4)',
                    background:
                      localTargetIds !== null
                        ? theme.darkMode
                          ? 'rgba(56, 189, 248, 0.1)'
                          : 'rgba(14, 165, 233, 0.06)'
                        : 'transparent',
                    border:
                      localTargetIds !== null
                        ? `1.5px solid ${theme.darkMode ? 'rgba(56, 189, 248, 0.35)' : 'rgba(14, 165, 233, 0.25)'}`
                        : '1.5px solid transparent',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      color: theme.darkMode ? '#38bdf8' : '#0ea5e9',
                      background: theme.darkMode
                        ? 'rgba(56, 189, 248, 0.15)'
                        : 'rgba(14, 165, 233, 0.08)',
                    },
                  }}
                >
                  All
                </Box>
                {availableTargets.map((t) => {
                  const isActive = localTargetIds === null || localTargetIds.includes(t.id);
                  const isSoloed =
                    localTargetIds !== null &&
                    localTargetIds.length === 1 &&
                    localTargetIds[0] === t.id;
                  const targetColor = theme.darkMode ? '#f43f5e' : '#e11d48';
                  const rgb = hexToRgb(targetColor);
                  return (
                    <Box
                      key={t.id}
                      onClick={() => handleTargetChipClick(t.id)}
                      sx={{
                        height: 30,
                        borderRadius: '15px',
                        px: 1.25,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: isSoloed ? 700 : 600,
                        userSelect: 'none',
                        color: !isActive
                          ? theme.darkMode
                            ? 'rgba(148, 163, 184, 0.5)'
                            : 'rgba(100, 116, 139, 0.5)'
                          : theme.darkMode
                            ? '#e2e8f0'
                            : '#1e293b',
                        background: isSoloed
                          ? `rgba(${rgb}, ${theme.darkMode ? 0.25 : 0.12})`
                          : !isActive
                            ? 'transparent'
                            : `rgba(${rgb}, ${theme.darkMode ? 0.1 : 0.05})`,
                        border: isSoloed
                          ? `2px solid ${targetColor}`
                          : !isActive
                            ? `1.5px solid rgba(${rgb}, 0.1)`
                            : `1.5px solid rgba(${rgb}, ${theme.darkMode ? 0.35 : 0.25})`,
                        boxShadow: isSoloed
                          ? `0 0 14px rgba(${rgb}, ${theme.darkMode ? 0.4 : 0.25})`
                          : 'none',
                        opacity: !isActive ? 0.4 : 1,
                        transform: isSoloed
                          ? 'scale(1.05)'
                          : !isActive
                            ? 'scale(0.95)'
                            : 'scale(1)',
                        filter: !isActive ? 'grayscale(0.7)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          background: `rgba(${rgb}, ${theme.darkMode ? 0.2 : 0.1})`,
                          boxShadow: `0 0 12px rgba(${rgb}, 0.3)`,
                          transform: 'translateY(-1px) scale(1.02)',
                          opacity: 1,
                          filter: 'none',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: targetColor,
                          flexShrink: 0,
                          boxShadow: theme.darkMode && isActive ? `0 0 5px ${targetColor}` : 'none',
                        }}
                      />
                      {t.name}
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Buffs row */}
            {showStacked && buffOptions.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: theme.darkMode ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)',
                    minWidth: 52,
                  }}
                >
                  Buffs
                </Typography>
                <Box
                  onClick={() => setHiddenBuffNames(new Set())}
                  sx={{
                    height: 30,
                    borderRadius: '15px',
                    px: 1.25,
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    color:
                      hiddenBuffNames.size > 0
                        ? theme.darkMode
                          ? '#38bdf8'
                          : '#0ea5e9'
                        : theme.darkMode
                          ? 'rgba(148, 163, 184, 0.5)'
                          : 'rgba(100, 116, 139, 0.4)',
                    background:
                      hiddenBuffNames.size > 0
                        ? theme.darkMode
                          ? 'rgba(56, 189, 248, 0.1)'
                          : 'rgba(14, 165, 233, 0.06)'
                        : 'transparent',
                    border:
                      hiddenBuffNames.size > 0
                        ? `1.5px solid ${theme.darkMode ? 'rgba(56, 189, 248, 0.35)' : 'rgba(14, 165, 233, 0.25)'}`
                        : '1.5px solid transparent',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      color: theme.darkMode ? '#38bdf8' : '#0ea5e9',
                      background: theme.darkMode
                        ? 'rgba(56, 189, 248, 0.15)'
                        : 'rgba(14, 165, 233, 0.08)',
                    },
                  }}
                >
                  All
                </Box>
                {buffOptions.map((b, index) => {
                  const color = UPTIME_COLORS[index % UPTIME_COLORS.length];
                  const rgb = hexToRgb(color);
                  const isHidden = hiddenBuffNames.has(b);
                  const isSoloed = hiddenBuffNames.size === buffOptions.length - 1 && !isHidden;
                  return (
                    <Box
                      key={b}
                      onClick={() => handleBuffChipClick(b)}
                      sx={{
                        height: 30,
                        borderRadius: '15px',
                        px: 1.25,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: isSoloed ? 700 : 600,
                        userSelect: 'none',
                        color: isHidden
                          ? theme.darkMode
                            ? 'rgba(148, 163, 184, 0.5)'
                            : 'rgba(100, 116, 139, 0.5)'
                          : theme.darkMode
                            ? '#e2e8f0'
                            : '#1e293b',
                        background: isSoloed
                          ? `rgba(${rgb}, ${theme.darkMode ? 0.25 : 0.12})`
                          : isHidden
                            ? 'transparent'
                            : `rgba(${rgb}, ${theme.darkMode ? 0.1 : 0.05})`,
                        border: isSoloed
                          ? `2px solid ${color}`
                          : isHidden
                            ? `1.5px solid rgba(${rgb}, 0.1)`
                            : `1.5px solid rgba(${rgb}, ${theme.darkMode ? 0.35 : 0.25})`,
                        boxShadow: isSoloed
                          ? `0 0 14px rgba(${rgb}, ${theme.darkMode ? 0.4 : 0.25})`
                          : 'none',
                        opacity: isHidden ? 0.4 : 1,
                        transform: isSoloed ? 'scale(1.05)' : isHidden ? 'scale(0.95)' : 'scale(1)',
                        filter: isHidden ? 'grayscale(0.7)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          background: `rgba(${rgb}, ${theme.darkMode ? 0.2 : 0.1})`,
                          boxShadow: `0 0 12px rgba(${rgb}, 0.3)`,
                          transform: 'translateY(-1px) scale(1.02)',
                          opacity: 1,
                          filter: 'none',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: color,
                          flexShrink: 0,
                          boxShadow: theme.darkMode && !isHidden ? `0 0 5px ${color}` : 'none',
                        }}
                      />
                      {b}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Collapse>

        {/* Legend — hidden when filter panel is open (it already shows players) */}
        {!showFilters && visibleLegendEntries.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 0.5,
              mb: 1,
              px: 0.5,
              py: 0.5,
              borderRadius: '10px',
              background: theme.darkMode ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.6)',
              border: theme.darkMode
                ? '1px solid rgba(255, 255, 255, 0.06)'
                : '1px solid rgba(148, 163, 184, 0.12)',
            }}
          >
            {visibleLegendEntries.map((entry) => {
              const rgb = hexToRgb(entry.color);
              return (
                <Box
                  key={entry.name}
                  sx={{
                    height: 26,
                    borderRadius: '13px',
                    px: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: theme.darkMode ? '#e2e8f0' : '#1e293b',
                    background: `rgba(${rgb}, ${theme.darkMode ? 0.1 : 0.05})`,
                    border: `1px solid rgba(${rgb}, ${theme.darkMode ? 0.3 : 0.2})`,
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor: entry.color,
                      flexShrink: 0,
                      boxShadow: theme.darkMode ? `0 0 5px ${entry.color}` : 'none',
                    }}
                  />
                  {entry.name}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Buff legend — only when stacked and filters closed */}
        {!showFilters && visibleBuffLegendEntries.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 0.5,
              mb: 1,
              px: 0.5,
              py: 0.5,
              borderRadius: '10px',
              background: theme.darkMode ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.6)',
              border: theme.darkMode
                ? '1px solid rgba(255, 255, 255, 0.06)'
                : '1px solid rgba(148, 163, 184, 0.12)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: theme.darkMode ? 'rgba(148, 163, 184, 0.6)' : 'rgba(100, 116, 139, 0.6)',
                px: 0.5,
              }}
            >
              Buffs
            </Typography>
            {visibleBuffLegendEntries.map((entry) => {
              const rgb = hexToRgb(entry.color);
              return (
                <Box
                  key={entry.name}
                  sx={{
                    height: 22,
                    borderRadius: '11px',
                    px: 0.75,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: theme.darkMode ? 'rgba(226, 232, 240, 0.85)' : 'rgba(30, 41, 59, 0.85)',
                    background: `rgba(${rgb}, ${theme.darkMode ? 0.08 : 0.04})`,
                    border: `1px solid rgba(${rgb}, ${theme.darkMode ? 0.25 : 0.15})`,
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: entry.color,
                      flexShrink: 0,
                      boxShadow: theme.darkMode ? `0 0 4px ${entry.color}` : 'none',
                    }}
                  />
                  {entry.name}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Lazy loader — only mounts when stacked mode is activated */}
        {stacked && (
          <StackedUptimeLoader fight={fight} context={context} onData={handleUptimeData} />
        )}

        {/* Chart */}
        <Box ref={chartWrapperRef} sx={{ height: chartHeight }}>
          <EChart option={echartsOption} height="100%" group="fightReport" />
        </Box>
      </CardContent>
    </Card>
  );
};
