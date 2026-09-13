import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Paper,
} from '@mui/material';
import React from 'react';

import { EChart } from '../../../components/EChart';
import { MetricPill } from '../../../components/MetricPill';
import { PlayerIcon } from '../../../components/PlayerIcon';
import { StatChecklist } from '../../../components/StatChecklist';
import { useRoleColors } from '../../../hooks';
import { usePhaseMarkLines, useInactiveMarkAreas } from '../../../hooks/useEChartsAnnotations';
import { useEChartsTheme } from '../../../hooks/useEChartsTheme';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { buildGoalMarkLine } from '../../../utils/echartsAnnotationUtils';
import { glowLineStyle, gradientAreaStyle, steppedLineDefaults } from '../../../utils/echartsTheme';
import { msToSeconds } from '../../../utils/fightDuration';
import { resolveActorName } from '../../../utils/resolveActorName';
import type { PlayerPenetrationData } from '../../../workers/calculations/CalculatePenetration';

const isFiniteMetric = (value: number | null): value is number =>
  typeof value === 'number' && Number.isFinite(value);

interface PlayerPenetrationDetailsViewProps {
  id: string;
  player: PlayerDetailsWithRole;
  name: string;
  expanded: boolean;
  isLoading: boolean;
  penetrationData: PlayerPenetrationData | null;
  penetrationSources: PlayerPenetrationData['penetrationSources'];
  playerBasePenetration: number | null;
  fightDurationMs: number;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  phaseTransitionInfo?: PhaseTransitionInfo;
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
  fightDurationMs,
  onExpandChange,
  phaseTransitionInfo,
}) => {
  const roleColors = useRoleColors();
  const metrics = React.useMemo(() => {
    if (
      penetrationData?.availability !== 'complete' ||
      !isFiniteMetric(penetrationData.max) ||
      !isFiniteMetric(penetrationData.effective) ||
      !isFiniteMetric(penetrationData.timeAtCapPercentage)
    ) {
      return null;
    }

    return {
      max: penetrationData.max,
      effective: penetrationData.effective,
      timeAtCapPercentage: penetrationData.timeAtCapPercentage,
    };
  }, [penetrationData]);

  const availabilityMessage = React.useMemo(() => {
    if (!penetrationData || penetrationData.availability === 'complete') return null;

    if (penetrationData.availability === 'partial') {
      return 'Penetration data is partial because one or more samples were invalid. Numeric penetration grades are hidden.';
    }

    switch (penetrationData.unavailableReason) {
      case 'invalid-fight-window':
        return 'Penetration data is unavailable because the fight window is invalid.';
      case 'fight-duration-exceeds-supported-limit':
        return 'Penetration data is unavailable because the fight duration exceeds the supported limit.';
      case 'invalid-penetration-samples':
        return 'Penetration data is unavailable because one or more penetration samples were invalid.';
      default:
        return 'Penetration data is unavailable because no active combat samples were recorded.';
    }
  }, [penetrationData]);

  // Transform penetration sources to StatChecklistSource format for consistency
  const statChecklistSources = React.useMemo(() => {
    return penetrationSources.map((source) => ({
      name: source.name,
      wasActive: source.wasActive,
      description: source.description,
      // Penetration sources don't currently preserve source type information
      // They rely on description text detection for unimplemented sources
    }));
  }, [penetrationSources]);

  const { theme } = useEChartsTheme();

  const chartData = React.useMemo(() => {
    return (
      penetrationData?.dataPoints.map((point) => [point.relativeTime, point.penetration]) || []
    );
  }, [penetrationData?.dataPoints]);

  const phaseMarkLines = usePhaseMarkLines(phaseTransitionInfo, expanded);
  const inactiveMarkAreas = useInactiveMarkAreas(penetrationData?.inactiveCombatIntervals);

  const chartOption = React.useMemo(() => {
    const lineColor = '#1976d2';
    const fightDuration = Number.isFinite(fightDurationMs) ? msToSeconds(fightDurationMs) : 0;

    const goalLine = buildGoalMarkLine(18200, 'Goal: 18,200', '#ff6b6b');
    const baseLine =
      playerBasePenetration !== null && Number.isFinite(playerBasePenetration)
        ? buildGoalMarkLine(
            playerBasePenetration,
            `Base: ${playerBasePenetration.toLocaleString()}`,
            '#2196f3',
            { position: 'insideStartTop' },
          )
        : null;
    const markLineData = baseLine ? [goalLine, baseLine] : [goalLine];
    if (phaseMarkLines?.data) {
      markLineData.push(...phaseMarkLines.data);
    }

    return {
      xAxis: {
        type: 'value',
        min: 0,
        max: fightDuration,
        name: 'Time (seconds)',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: theme.mutedColor },
        axisLabel: {
          color: theme.mutedColor,
          fontSize: 11,
          formatter: (v: number) => `${v.toFixed(1)}s`,
        },
        axisLine: { lineStyle: { color: theme.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 20000,
        name: 'Penetration',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: { color: theme.mutedColor },
        axisLabel: {
          color: theme.mutedColor,
          fontSize: 11,
          formatter: (v: number) => v.toLocaleString(),
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: theme.gridLineColor, type: 'dotted' } },
      },
      legend: { show: false },
      tooltip: {
        trigger: 'axis',
        appendToBody: true,
        formatter: (params: Array<{ value: number[] }>) => {
          const p = params[0];
          if (!p) return '';
          const time = Number(p.value[0]).toFixed(1);
          const pen = Number(p.value[1]);
          const color = pen >= 18200 ? '#22c55e' : '#ef4444';
          return `<div style="font-size:13px">
            <div style="color:${theme.mutedColor}">Time: ${time}s</div>
            <div style="font-weight:600;color:${color}">${pen.toLocaleString()} penetration</div>
          </div>`;
        },
      },
      series: [
        {
          type: 'line',
          data: chartData,
          ...steppedLineDefaults(),
          lineStyle: {
            color: lineColor,
            width: 2,
            ...glowLineStyle(lineColor, theme.intensity, theme.perfTier),
          },
          areaStyle: gradientAreaStyle(lineColor, theme.intensity, theme.perfTier),
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            data: markLineData,
          },
          ...(inactiveMarkAreas ? { markArea: inactiveMarkAreas } : {}),
        },
      ],
    };
  }, [chartData, fightDurationMs, playerBasePenetration, phaseMarkLines, inactiveMarkAreas, theme]);

  if (!penetrationData) {
    return (
      <Accordion
        expanded={expanded}
        onChange={onExpandChange}
        variant="outlined"
        className="u-hover-lift u-fade-in-up"
        sx={{
          background:
            'linear-gradient(135deg, rgb(110 214 240 / 25%) 0%, rgb(131 208 227 / 15%) 50%, rgb(35 122 144 / 8%) 100%)',
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
            <Typography
              variant="h6"
              sx={{
                fontSize: '1.75rem',
                textShadow: roleColors.getAccordionTextShadow(),
              }}
            >
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
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 'bold',
                fontSize: '1.75rem',
                textShadow: roleColors.getAccordionTextShadow(),
              }}
            >
              {resolveActorName(player)}
            </Typography>
          </Box>
          {!isLoading && metrics && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2.5, alignItems: 'center' }}>
              <MetricPill
                label="Max"
                value={metrics.max}
                intent={metrics.max > 18200 ? 'success' : 'danger'}
                size="md"
              />
              <MetricPill
                label="Active"
                value={metrics.effective.toFixed(0)}
                intent={metrics.effective > 18200 ? 'info' : 'warning'}
                size="md"
              />
              <MetricPill
                label="At Cap"
                value={metrics.timeAtCapPercentage.toFixed(0)}
                suffix="%"
                intent={
                  metrics.timeAtCapPercentage >= 80
                    ? 'success'
                    : metrics.timeAtCapPercentage >= 50
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
            {!isLoading && metrics && (
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
                  value={metrics.max}
                  intent={metrics.max > 18200 ? 'success' : 'danger'}
                  size="sm"
                />
                <MetricPill
                  label="Active"
                  value={metrics.effective.toFixed(0)}
                  intent={metrics.effective > 18200 ? 'info' : 'warning'}
                  size="sm"
                />
                <MetricPill
                  label="At Cap"
                  value={metrics.timeAtCapPercentage.toFixed(0)}
                  suffix="%"
                  intent={
                    metrics.timeAtCapPercentage >= 80
                      ? 'success'
                      : metrics.timeAtCapPercentage >= 50
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                />
              </Box>
            )}

            {availabilityMessage && (
              <Alert
                severity={penetrationData.availability === 'partial' ? 'warning' : 'info'}
                role="status"
                sx={{ mb: 3 }}
              >
                {availabilityMessage}
              </Alert>
            )}

            {penetrationData.availability !== 'unavailable' && (
              <>
                {/* Penetration Sources Checklist */}
                <StatChecklist
                  sources={statChecklistSources}
                  title="Penetration Sources"
                  loading={isLoading}
                />

                {/* Penetration vs Time Chart */}
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
                    Penetration vs Time
                  </Typography>
                  <Box role="img" aria-label="Penetration over time chart">
                    <EChart option={chartOption} height={300} group="fightReport" />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', mt: 1, display: 'block' }}
                  >
                    Shows penetration changes over the duration of the fight. Data voxelized to
                    1-second intervals (highest value per interval). Data points:{' '}
                    {penetrationData.dataPoints.length}
                  </Typography>
                </Paper>
              </>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
