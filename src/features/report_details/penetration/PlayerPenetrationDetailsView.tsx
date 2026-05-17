import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from '@mui/material';
import React from 'react';

import { ChartIntensityToggle } from '../../../components/ChartIntensityToggle';
import { EChart } from '../../../components/EChart';
import { MetricPill } from '../../../components/MetricPill';
import { PlayerIcon } from '../../../components/PlayerIcon';
import { StatChecklist } from '../../../components/StatChecklist';
import { useRoleColors } from '../../../hooks';
import {
  usePhaseMarkLines,
  useInactiveMarkAreas,
} from '../../../hooks/useEChartsAnnotations';
import { useEChartsTheme } from '../../../hooks/useEChartsTheme';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { buildGoalMarkLine } from '../../../utils/echartsAnnotationUtils';
import { glowLineStyle, gradientAreaStyle, steppedLineDefaults } from '../../../utils/echartsTheme';
import { msToSeconds } from '../../../utils/fightDuration';
import { resolveActorName } from '../../../utils/resolveActorName';

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
  inactiveCombatIntervals: Array<{ start: number; end: number }>;
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

  // Transform penetration sources to StatChecklistSource format for consistency
  const statChecklistSources = React.useMemo(() => {
    return penetrationSources.map((source) => ({
      name: source.name,
      wasActive: source.wasActive,
      description: source.description,
      link: source.link,
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

  const phaseMarkLines = usePhaseMarkLines(phaseTransitionInfo);
  const inactiveMarkAreas = useInactiveMarkAreas(penetrationData?.inactiveCombatIntervals);

  const chartOption = React.useMemo(() => {
    const lineColor = '#1976d2';
    const fightDuration = msToSeconds(fightDurationMs);

    const goalLine = buildGoalMarkLine(18200, 'Goal: 18,200', '#ff6b6b');
    const baseLine = buildGoalMarkLine(
      playerBasePenetration,
      `Base: ${playerBasePenetration.toLocaleString()}`,
      '#2196f3',
      { position: 'insideStartTop' },
    );

    const markLineData = [goalLine, baseLine];
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
        axisLabel: { color: theme.mutedColor, fontSize: 11, formatter: (v: number) => `${v.toFixed(1)}s` },
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
        axisLabel: { color: theme.mutedColor, fontSize: 11, formatter: (v: number) => v.toLocaleString() },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: theme.gridLineColor, type: 'dotted' } },
      },
      legend: { show: false },
      tooltip: {
        trigger: 'axis',
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
              fontWeight="bold"
              sx={{
                fontSize: '1.75rem',
                textShadow: roleColors.getAccordionTextShadow(),
              }}
            >
              {resolveActorName(player)}
            </Typography>
          </Box>
          {!isLoading && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2.5, alignItems: 'center' }}>
              <MetricPill
                label="Max"
                value={penetrationData.max}
                intent={penetrationData.max > 18200 ? 'success' : 'danger'}
                size="md"
              />
              <MetricPill
                label="Active"
                value={penetrationData.effective.toFixed(0)}
                intent={penetrationData.effective > 18200 ? 'info' : 'warning'}
                size="md"
              />
              <MetricPill
                label="At Cap"
                value={penetrationData.timeAtCapPercentage.toFixed(0)}
                suffix="%"
                intent={
                  penetrationData.timeAtCapPercentage >= 80
                    ? 'success'
                    : penetrationData.timeAtCapPercentage >= 50
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
            {!isLoading && (
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
                  value={penetrationData.max}
                  intent={penetrationData.max > 18200 ? 'success' : 'danger'}
                  size="sm"
                />
                <MetricPill
                  label="Active"
                  value={penetrationData.effective.toFixed(0)}
                  intent={penetrationData.effective > 18200 ? 'info' : 'warning'}
                  size="sm"
                />
                <MetricPill
                  label="At Cap"
                  value={penetrationData.timeAtCapPercentage.toFixed(0)}
                  suffix="%"
                  intent={
                    penetrationData.timeAtCapPercentage >= 80
                      ? 'success'
                      : penetrationData.timeAtCapPercentage >= 50
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                />
              </Box>
            )}

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
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography
                  variant="h6"
                  sx={{
                    textShadow:
                      '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  Penetration vs Time
                </Typography>
                <ChartIntensityToggle />
              </Box>
              <EChart
                option={chartOption}
                height={300}
                group="fightReport"
              />
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
