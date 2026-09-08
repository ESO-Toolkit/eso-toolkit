import CloseIcon from '@mui/icons-material/Close';
import TimelineIcon from '@mui/icons-material/Timeline';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import { EChart } from '../../../components/EChart';
import { useEChartsTheme } from '../../../hooks/useEChartsTheme';
import type { BuffLookupData } from '../../../utils/BuffLookupUtils';
import { hexToRgb } from '../../../utils/echartsTheme';
import { escapeHtml } from '../../../utils/escape-html';
import { msToSeconds } from '../../../utils/fightDuration';

import type { BuffUptime } from './BuffUptimeProgressBar';
import { buildUptimeTimelineSeries, type UptimeTimelineSeries } from './utils/buildUptimeTimeline';

const TIMELINE_COLORS = [
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

export type UptimeTimelineCategory = 'buff' | 'debuff' | 'statusEffect';

interface EffectUptimeTimelineModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  category: UptimeTimelineCategory;
  uptimes: BuffUptime[];
  lookup: BuffLookupData | null;
  fightStartTime: number | null | undefined;
  fightEndTime: number | null | undefined;
  targetFilter?: Set<number> | null;
  prefetchedSeries?: UptimeTimelineSeries[];
}

export const EffectUptimeTimelineModal: React.FC<EffectUptimeTimelineModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  category,
  uptimes,
  lookup,
  fightStartTime,
  fightEndTime,
  targetFilter,
  prefetchedSeries,
}) => {
  const theme = useTheme();
  const { theme: echartsTheme } = useEChartsTheme();

  const series = React.useMemo<UptimeTimelineSeries[]>(() => {
    if (prefetchedSeries) {
      return prefetchedSeries;
    }

    return buildUptimeTimelineSeries({
      uptimes,
      lookup,
      fightStartTime,
      fightEndTime,
      targetFilter,
    });
  }, [prefetchedSeries, uptimes, lookup, fightStartTime, fightEndTime, targetFilter]);

  const fightDurationMs = React.useMemo(() => {
    if (
      fightStartTime == null ||
      fightEndTime == null ||
      !Number.isFinite(fightStartTime) ||
      !Number.isFinite(fightEndTime) ||
      fightEndTime <= fightStartTime
    ) {
      return 0;
    }

    return fightEndTime - fightStartTime;
  }, [fightStartTime, fightEndTime]);

  const formatSeconds = React.useCallback((value: number) => {
    if (Number.isNaN(value)) return '0.0s';
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    if (minutes > 0) return `${minutes}m ${seconds.toFixed(1)}s`;
    return `${seconds.toFixed(1)}s`;
  }, []);

  const chartOption = React.useMemo(() => {
    const duration = msToSeconds(fightDurationMs);

    const echartsSeries = series.map((dataset, index) => {
      const color = TIMELINE_COLORS[index % TIMELINE_COLORS.length];
      return {
        name: dataset.label,
        type: 'line' as const,
        data: dataset.points.map((p: { x: number; y: number }) => [
          p.x,
          p.y > 0 ? index + 0.85 : index,
        ]),
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

    return {
      color: TIMELINE_COLORS.slice(0, series.length),
      xAxis: {
        type: 'value',
        min: 0,
        max: duration || undefined,
        name: 'Fight Time',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: echartsTheme.mutedColor },
        axisLabel: {
          color: echartsTheme.mutedColor,
          fontSize: 11,
          formatter: (v: number) => formatSeconds(v),
        },
        axisLine: { lineStyle: { color: echartsTheme.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: -0.2,
        max: Math.max(series.length, 1),
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      legend: { show: false },
      tooltip: {
        trigger: 'axis',
        appendToBody: true,
        formatter: (
          params: Array<{
            seriesName: string;
            seriesIndex: number;
            value: number[];
            color: string;
          }>,
        ) => {
          if (!params[0]) return '';
          const time = formatSeconds(params[0].value[0]);
          const active = params.filter((p) => {
            // Use the series index ECharts provides rather than resolving by
            // name — two series can share a display name, and findIndex-by-name
            // would always pick the first, mislabeling the duplicate.
            return p.value[1] > p.seriesIndex + 0.4;
          });
          if (active.length === 0) {
            return `<div style="font-size:13px"><div style="color:${echartsTheme.mutedColor}">Time: ${time}</div><div>No active effects</div></div>`;
          }
          const lines = active.map(
            (p) =>
              `<div style="display:flex;align-items:center;gap:6px">` +
              `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>` +
              `${escapeHtml(p.seriesName)}: <b>Active</b></div>`,
          );
          return `<div style="font-size:13px"><div style="color:${echartsTheme.mutedColor};margin-bottom:4px">Time: ${time}</div>${lines.join('')}</div>`;
        },
      },
      series: echartsSeries,
    };
  }, [series, fightDurationMs, formatSeconds, echartsTheme]);

  const categoryBadge = React.useMemo(() => {
    switch (category) {
      case 'buff':
        return { label: 'Friendly Buffs', color: 'success' as const };
      case 'debuff':
        return { label: 'Enemy Debuffs', color: 'error' as const };
      case 'statusEffect':
      default:
        return { label: 'Status Effects', color: 'primary' as const };
    }
  }, [category]);

  const hasData = series.length > 0;
  const titleId = 'effect-uptime-timeline-title';
  const subtitleId = subtitle ? 'effect-uptime-timeline-description' : undefined;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby={titleId}
      aria-describedby={subtitleId}
    >
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 3,
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TimelineIcon sx={{ color: theme.palette.mode === 'dark' ? '#38bdf8' : '#0f172a' }} />
            <Typography id={titleId} component="h2" variant="h6">
              {title}
            </Typography>
            <Chip label={categoryBadge.label} color={categoryBadge.color} size="small" />
          </Stack>
          {subtitle && (
            <Typography id={subtitleId} variant="body2" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Tooltip title="Close">
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Close timeline"
            sx={{
              color: 'text.secondary',
              width: 44,
              height: 44,
              '&:focus-visible': {
                outline: `3px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
              '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.10)' },
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none',
                '&:hover': { transform: 'none' },
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <DialogContent
        sx={{
          minHeight: { xs: 280, sm: 360, md: 420 },
          minWidth: 0,
          overflowX: 'hidden',
          '@media (prefers-reduced-motion: reduce)': {
            '& *': { animation: 'none !important', transition: 'none !important' },
          },
        }}
      >
        {hasData ? (
          <>
            <Box
              role="list"
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 0.5,
                mb: 1.5,
                px: 0.5,
                py: 0.5,
                borderRadius: '10px',
                background: echartsTheme.darkMode
                  ? 'rgba(15, 23, 42, 0.4)'
                  : 'rgba(248, 250, 252, 0.6)',
                border: echartsTheme.darkMode
                  ? '1px solid rgba(255, 255, 255, 0.06)'
                  : '1px solid rgba(148, 163, 184, 0.12)',
              }}
            >
              {series.map((s, index) => {
                const color = TIMELINE_COLORS[index % TIMELINE_COLORS.length];
                const rgb = hexToRgb(color);
                return (
                  <Box
                    key={s.id}
                    role="listitem"
                    aria-label={s.label}
                    sx={{
                      height: 24,
                      borderRadius: '12px',
                      px: 0.75,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: echartsTheme.darkMode
                        ? 'rgba(226, 232, 240, 0.85)'
                        : 'rgba(30, 41, 59, 0.85)',
                      background: `rgba(${rgb}, ${echartsTheme.darkMode ? 0.08 : 0.04})`,
                      border: `1px solid rgba(${rgb}, ${echartsTheme.darkMode ? 0.25 : 0.15})`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: color,
                        flexShrink: 0,
                        boxShadow: echartsTheme.darkMode ? `0 0 4px ${color}` : 'none',
                      }}
                    />
                    {s.label}
                  </Box>
                );
              })}
            </Box>
            <Box role="img" aria-label="Effect uptime timeline chart">
              <Box sx={{ width: '100%', minWidth: 0, minHeight: { xs: 240, sm: 300, md: 380 } }}>
                <EChart option={chartOption} height={380} group="fightReport" />
              </Box>
            </Box>
          </>
        ) : (
          <Box
            sx={{
              minHeight: { xs: 240, sm: 280, md: 320 },
              height: { xs: 240, sm: 280, md: 320 },
              px: { xs: 1, sm: 2 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
              borderRadius: 2,
              border: `1px solid ${
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'
              }`,
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No uptime timeline data available for the current selection.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
