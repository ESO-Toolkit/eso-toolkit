import CloseIcon from '@mui/icons-material/Close';
import TimelineIcon from '@mui/icons-material/Timeline';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
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
import { glowLineStyle, gradientAreaStyle, steppedLineDefaults } from '../../../utils/echartsTheme';
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
    if (!fightStartTime || !fightEndTime || fightEndTime <= fightStartTime) {
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
        data: dataset.points.map((p: { x: number; y: number }) => [p.x, p.y]),
        ...steppedLineDefaults(),
        lineStyle: {
          color,
          width: 2,
          ...glowLineStyle(color, echartsTheme.intensity, echartsTheme.perfTier),
        },
        areaStyle: gradientAreaStyle(color, echartsTheme.intensity, echartsTheme.perfTier),
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
        axisLabel: { color: echartsTheme.mutedColor, fontSize: 11, formatter: (v: number) => formatSeconds(v) },
        axisLine: { lineStyle: { color: echartsTheme.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1.1,
        name: 'Effect Activity',
        nameLocation: 'middle',
        nameGap: 36,
        nameTextStyle: { color: echartsTheme.mutedColor },
        axisLabel: { color: echartsTheme.mutedColor, fontSize: 11, formatter: (v: number) => (v >= 1 ? 'Active' : '') },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: echartsTheme.gridLineColor, type: 'dotted' } },
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
          const time = formatSeconds(params[0].value[0]);
          const lines = params
            .map((p) => {
              const status = p.value[1] > 0 ? 'Active' : 'Inactive';
              return `<div style="display:flex;align-items:center;gap:6px">` +
                `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>` +
                `${p.seriesName}: <b>${status}</b></div>`;
            });
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
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TimelineIcon sx={{ color: theme.palette.mode === 'dark' ? '#38bdf8' : '#0f172a' }} />
            <Typography variant="h6">{title}</Typography>
            <Chip label={categoryBadge.label} color={categoryBadge.color} size="small" />
          </Stack>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Tooltip title="Close">
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Close"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.10)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent sx={{ minHeight: 420 }}>
        {hasData ? (
          <EChart
            option={chartOption}
            height={380}
            group="fightReport"
          />
        ) : (
          <Box
            sx={{
              height: 320,
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
            <Typography variant="body2" color="text.secondary">
              No uptime timeline data available for the current selection.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
