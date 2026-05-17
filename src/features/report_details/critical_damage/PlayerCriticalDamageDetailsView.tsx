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
import {
  CriticalDamageSource,
  CriticalDamageSourceWithActiveState,
} from '../../../utils/CritDamageUtils';
import { glowLineStyle, gradientAreaStyle, steppedLineDefaults } from '../../../utils/echartsTheme';
import { msToSeconds } from '../../../utils/fightDuration';
import { resolveActorName } from '../../../utils/resolveActorName';

interface CriticalDamageDataPoint {
  timestamp: number;
  criticalDamage: number;
  relativeTime: number; // Time since fight start in seconds
}

interface CriticalDamageAlert {
  abilityId: number;
  abilityName: string;
  timestamp: number;
  relativeTime: number;
  expectedCriticalDamage: number;
  actualCriticalDamage: number;
  normalDamage: number;
  actualCriticalMultiplier: number;
  expectedCriticalMultiplier: number;
  discrepancyPercent: number;
}

export interface PlayerCriticalDamageData {
  playerId: number;
  playerName: string;
  dataPoints: CriticalDamageDataPoint[];
  effectiveCriticalDamage: number;
  maximumCriticalDamage: number;
  timeAtCapPercentage: number;
  criticalDamageAlerts: CriticalDamageAlert[];
  inactiveCombatIntervals: Array<{ start: number; end: number }>;
}

interface CriticalMultiplierInfo {
  abilityName: string;
  abilityId: number;
  criticalDamage: number;
  normalDamage: number;
  criticalMultiplier: number;
  foundPair: boolean;
  criticalTimestamp: number;
  accountedCritDamagePercent: number;
  unaccountedCritDamagePercent: number;
  activeSources: CriticalDamageSource[];
}

interface PlayerCriticalDamageDetailsViewProps {
  id: number;
  player: PlayerDetailsWithRole;
  name: string;
  expanded: boolean;
  isLoading: boolean;
  criticalDamageData: PlayerCriticalDamageData | null;
  criticalDamageSources: CriticalDamageSourceWithActiveState[];
  toggleableSourceNames?: Set<string>;
  onSourceToggle?: (sourceId: string, nextValue: boolean) => void;
  criticalMultiplier: CriticalMultiplierInfo | null;
  fightDurationMs: number;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  phaseTransitionInfo?: PhaseTransitionInfo;
}

export const PlayerCriticalDamageDetailsView: React.FC<PlayerCriticalDamageDetailsViewProps> = ({
  id,
  name: _name,
  expanded,
  isLoading,
  criticalDamageData,
  criticalDamageSources,
  toggleableSourceNames,
  onSourceToggle,
  criticalMultiplier,
  fightDurationMs,
  player,
  onExpandChange,
  phaseTransitionInfo,
}) => {
  const roleColors = useRoleColors();

  // Transform critical damage sources to StatChecklistSource format
  const statChecklistSources = React.useMemo(() => {
    return criticalDamageSources.map((source) => {
      const sourceId = source.name;
      const isInteractive = toggleableSourceNames?.has(sourceId) ?? false;

      return {
        id: sourceId,
        name: source.name,
        wasActive: source.wasActive,
        description: source.description,
        sourceType: source.source,
        interactive: isInteractive,
        // Add link if it's a known ability that can be looked up
        link:
          'ability' in source
            ? `https://www.esoui.com/downloads/info7-ESOUIAddOnCollection.html`
            : undefined,
      };
    });
  }, [criticalDamageSources, toggleableSourceNames]);

  const { theme } = useEChartsTheme();

  const chartData = React.useMemo(() => {
    return (
      criticalDamageData?.dataPoints.map((point) => [point.relativeTime, point.criticalDamage]) || []
    );
  }, [criticalDamageData?.dataPoints]);

  const phaseMarkLines = usePhaseMarkLines(phaseTransitionInfo);
  const inactiveMarkAreas = useInactiveMarkAreas(criticalDamageData?.inactiveCombatIntervals);

  const chartOption = React.useMemo(() => {
    const lineColor = '#d32f2f';
    const fightDuration = msToSeconds(fightDurationMs);

    const targetLine = buildGoalMarkLine(125, 'Target: 125%', '#2e7d32');
    const markLineData = [targetLine];
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
        min: 50,
        max: 150,
        name: 'Critical Damage (%)',
        nameLocation: 'middle',
        nameGap: 36,
        nameTextStyle: { color: theme.mutedColor },
        axisLabel: { color: theme.mutedColor, fontSize: 11, formatter: (v: number) => `${v}%` },
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
          const crit = Number(p.value[1]);
          const color = crit >= 125 ? '#22c55e' : '#ef4444';
          return `<div style="font-size:13px">
            <div style="color:${theme.mutedColor}">Time: ${time}s</div>
            <div style="font-weight:600;color:${color}">${crit}% critical damage</div>
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
  }, [chartData, fightDurationMs, phaseMarkLines, inactiveMarkAreas, theme]);

  if (!criticalDamageData) {
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
          sx={{
            '& .MuiAccordionSummary-content': {
              margin: '12px 0',
            },
            '&.Mui-expanded .MuiAccordionSummary-content': {
              margin: '12px 0',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexGrow: 1 }}>
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
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>No critical damage data available for this player.</Typography>
        </AccordionDetails>
      </Accordion>
    );
  }

  const maxCriticalDamage = Math.max(
    ...criticalDamageData.dataPoints.map((point) => point.criticalDamage),
    0,
  );

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
        id={`panel-${id}-header`}
        sx={{
          '& .MuiAccordionSummary-content': {
            margin: '12px 0',
          },
          '&.Mui-expanded .MuiAccordionSummary-content': {
            margin: '12px 0',
          },
        }}
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
                value={maxCriticalDamage}
                suffix="%"
                intent={maxCriticalDamage >= 125 ? 'success' : 'danger'}
                size="md"
              />
              <MetricPill
                label="Active"
                value={criticalDamageData.effectiveCriticalDamage.toFixed(1)}
                suffix="%"
                intent={
                  criticalDamageData.effectiveCriticalDamage >= 125
                    ? 'success'
                    : criticalDamageData.effectiveCriticalDamage >= 100
                      ? 'warning'
                      : 'danger'
                }
                size="md"
              />
              <MetricPill
                label="At Cap"
                value={criticalDamageData.timeAtCapPercentage.toFixed(0)}
                suffix="%"
                intent={
                  criticalDamageData.timeAtCapPercentage >= 80
                    ? 'success'
                    : criticalDamageData.timeAtCapPercentage >= 50
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
                  value={maxCriticalDamage}
                  suffix="%"
                  intent={maxCriticalDamage >= 125 ? 'success' : 'danger'}
                  size="sm"
                />
                <MetricPill
                  label="Active"
                  value={criticalDamageData.effectiveCriticalDamage.toFixed(1)}
                  suffix="%"
                  intent={
                    criticalDamageData.effectiveCriticalDamage >= 125
                      ? 'success'
                      : criticalDamageData.effectiveCriticalDamage >= 100
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                />
                <MetricPill
                  label="At Cap"
                  value={criticalDamageData.timeAtCapPercentage.toFixed(0)}
                  suffix="%"
                  intent={
                    criticalDamageData.timeAtCapPercentage >= 80
                      ? 'success'
                      : criticalDamageData.timeAtCapPercentage >= 50
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                />
              </Box>
            )}

            {/* Critical Damage Sources Checklist */}
            <StatChecklist
              sources={statChecklistSources}
              title="Critical Damage Sources"
              loading={isLoading}
              onToggleSource={onSourceToggle}
            />

            {/* Critical Multiplier Information */}
            {criticalMultiplier && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  background:
                    'linear-gradient(135deg, rgba(175, 82, 222, 0.15) 0%, rgba(175, 82, 222, 0.08) 50%, rgba(175, 82, 222, 0.04) 100%)',
                  border: '1px solid rgba(175, 82, 222, 0.3)',
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
                  Critical Multiplier Analysis
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Ability:</strong> {criticalMultiplier.abilityName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Normal Damage (Avg):</strong>{' '}
                  {criticalMultiplier.normalDamage.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Critical Damage (Avg):</strong>{' '}
                  {criticalMultiplier.criticalDamage.toLocaleString()}
                </Typography>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Critical Multiplier:</strong>{' '}
                  {criticalMultiplier.criticalMultiplier.toFixed(2)}x (Critical damage is{' '}
                  {(criticalMultiplier.criticalMultiplier * 100).toFixed(0)}% of normal damage)
                </Typography>

                <Typography variant="body2" sx={{ mb: 1, color: '#2e7d32', fontWeight: 'bold' }}>
                  <strong>Accounted Critical Damage:</strong>{' '}
                  {(criticalMultiplier.accountedCritDamagePercent + 50).toFixed(1)}% total
                  <span style={{ color: '#666', marginLeft: '4px' }}>
                    (50% base + {criticalMultiplier.accountedCritDamagePercent.toFixed(1)}% bonus)
                  </span>
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mb: 2,
                    color:
                      criticalMultiplier.unaccountedCritDamagePercent > 0 ? '#d32f2f' : '#2e7d32',
                    fontWeight: 'bold',
                  }}
                >
                  <strong>Unaccounted Critical Damage:</strong>{' '}
                  {criticalMultiplier.unaccountedCritDamagePercent.toFixed(1)}%
                  {criticalMultiplier.unaccountedCritDamagePercent > 0 &&
                    ' (This could be from unknown sources like gear sets, mundus stones, or other effects)'}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2, fontStyle: 'italic' }}
                >
                  Critical damage bonuses are additive before being applied as a multiplier. For
                  example, if you have 75% critical damage total (50% base + 25% from sources), your
                  critical hits will do 175% of normal damage (1.75x multiplier). This analysis
                  compares the actual multiplier observed in combat against what we expect from
                  known additive sources.
                </Typography>
              </Paper>
            )}

            {/* Critical Damage vs Time Chart */}
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
                  Critical Damage vs Time
                </Typography>
                <ChartIntensityToggle />
              </Box>
              <EChart
                option={chartOption}
                height={300}
                group="fightReport"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Shows critical damage changes over the duration of the fight. Data downsampled to
                0.5-second intervals (highest value per interval). Data points:{' '}
                {criticalDamageData.dataPoints.length}
              </Typography>
            </Paper>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
