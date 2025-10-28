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
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeSeriesScale,
  Title,
  Tooltip as ChartTooltip,
} from 'chart.js';
import type { ChartData, ChartDataset, ChartOptions, LegendItem, TooltipItem } from 'chart.js';
import React from 'react';

import { LineChart } from '../../../components/LazyCharts';
import type { BuffLookupData } from '../../../utils/BuffLookupUtils';

import type { BuffUptime } from './BuffUptimeProgressBar';
import { buildUptimeTimelineSeries, type UptimeTimelineSeries } from './utils/buildUptimeTimeline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeSeriesScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
);

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

interface LegendHiddenState {
  hiddenIds: Set<string>;
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
  const [hiddenState, setHiddenState] = React.useState<LegendHiddenState>({
    hiddenIds: new Set<string>(),
  });

  React.useEffect(() => {
    if (open) {
      setHiddenState({ hiddenIds: new Set<string>() });
    }
  }, [open, uptimes, prefetchedSeries]);

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

  const fightDurationSeconds = React.useMemo(() => {
    if (!fightStartTime || !fightEndTime || fightEndTime <= fightStartTime) {
      return 0;
    }

    return (fightEndTime - fightStartTime) / 1000;
  }, [fightStartTime, fightEndTime]);

  const chartData = React.useMemo<ChartData<'line'>>(() => {
    const datasets: Array<ChartDataset<'line'> & { customId: string }> = series.map(
      (dataset, index) => {
        const color = TIMELINE_COLORS[index % TIMELINE_COLORS.length];
        const isHidden = hiddenState.hiddenIds.has(dataset.id);

        return {
          label: dataset.label,
          data: dataset.points,
          parsing: false as const,
          stepped: 'after' as const,
          pointRadius: 0,
          borderColor: color,
          backgroundColor: `${color}33`,
          borderWidth: 2,
          fill: true,
          hidden: isHidden,
          tension: 0,
          customId: dataset.id,
        };
      },
    );

    return { datasets };
  }, [series, hiddenState.hiddenIds]);

  const formatSeconds = React.useCallback((value: number) => {
    if (Number.isNaN(value)) {
      return '0.0s';
    }
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds.toFixed(1)}s`;
    }
    return `${seconds.toFixed(1)}s`;
  }, []);

  const handleLegendClick = React.useCallback(
    (_event: unknown, legendItem: LegendItem, legend: { chart: ChartJS }) => {
      const datasetIndex = legendItem.datasetIndex;
      if (datasetIndex == null) {
        return;
      }

      const dataset = legend.chart.data.datasets?.[datasetIndex] as
        | (ChartDataset<'line'> & { customId?: string })
        | undefined;
      if (!dataset?.customId) {
        return;
      }

      setHiddenState((prev) => {
        const next = new Set(prev.hiddenIds);
        if (next.has(dataset.customId!)) {
          next.delete(dataset.customId!);
        } else {
          next.add(dataset.customId!);
        }
        return { hiddenIds: next };
      });
    },
    [],
  );

  const chartOptions = React.useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      interaction: {
        intersect: false,
        mode: 'nearest' as const,
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
          },
          onClick: handleLegendClick,
        },
        tooltip: {
          intersect: false,
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              if (!items || items.length === 0) {
                return '';
              }
              const first = items[0];
              const xValue = typeof first.parsed.x === 'number' ? first.parsed.x : 0;
              return `Time: ${formatSeconds(xValue)}`;
            },
            label: (context: TooltipItem<'line'>) => {
              const status = (context.parsed.y ?? 0) > 0 ? 'Active' : 'Inactive';
              return `${context.dataset.label ?? 'Effect'}: ${status}`;
            },
          },
        },
        title: {
          display: false,
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: fightDurationSeconds || undefined,
          ticks: {
            callback: (value) => {
              const numeric = typeof value === 'number' ? value : Number(value);
              return formatSeconds(numeric);
            },
          },
          title: {
            display: true,
            text: 'Fight Time',
          },
        },
        y: {
          min: 0,
          max: 1.1,
          ticks: {
            callback: (value) => (Number(value) >= 1 ? 'Active' : ''),
          },
          title: {
            display: true,
            text: 'Effect Activity',
          },
        },
      },
    }),
    [fightDurationSeconds, formatSeconds, handleLegendClick],
  );

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
            <TimelineIcon color="primary" />
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
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent sx={{ minHeight: 420 }}>
        {hasData ? (
          <Box sx={{ height: 380 }}>
            <LineChart data={chartData} options={chartOptions} />
          </Box>
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
