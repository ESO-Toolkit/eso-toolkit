import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import { ChartIntensityToggle } from '../../../components/ChartIntensityToggle';
import { EChart } from '../../../components/EChart';
import { MetricPill } from '../../../components/MetricPill';
import { PlayerIcon } from '../../../components/PlayerIcon';
import { useRoleColors } from '../../../hooks';
import { usePhaseMarkLines } from '../../../hooks/useEChartsAnnotations';
import { useEChartsTheme } from '../../../hooks/useEChartsTheme';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { buildGoalMarkLine } from '../../../utils/echartsAnnotationUtils';
import { glowLineStyle, gradientAreaStyle, steppedLineDefaults } from '../../../utils/echartsTheme';
import { resistanceToDamageReduction } from '../../../utils/damageReductionUtils';
import { resolveActorName } from '../../../utils/resolveActorName';

export interface DamageReductionDataPoint {
  timestamp: number;
  damageReduction: number;
  totalResistance: number;
  staticResistance: number;
  dynamicResistance: number;
  relativeTime: number;
}

export interface PlayerDamageReductionData {
  playerId: number;
  playerName: string;
  dataPoints: Array<DamageReductionDataPoint>;
  damageReductionSources: Array<{
    source: string;
    name: string;
    isActive: boolean;
    resistanceValue: number;
  }>;
  staticResistance: number;
  maxDynamicResistance: number;
  averageDynamicResistance: number;
}

interface PlayerDamageReductionDetailsProps {
  id: string;
  name: string;
  player?: PlayerDetailsWithRole;
  expanded: boolean;
  onExpandChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  damageReductionData?: PlayerDamageReductionData;
  isLoading?: boolean;
  phaseTransitionInfo?: PhaseTransitionInfo;
}

/**
 * Individual player damage reduction details component with accordion layout
 */
export const PlayerDamageReductionDetails: React.FC<PlayerDamageReductionDetailsProps> = ({
  id,
  name,
  player,
  expanded,
  onExpandChange,
  damageReductionData,
  isLoading,
  phaseTransitionInfo,
}) => {
  const theme = useTheme();
  const roleColors = useRoleColors();

  const { theme: echartsTheme } = useEChartsTheme();

  const chartData = React.useMemo(() => {
    if (!damageReductionData?.dataPoints) return [];
    return damageReductionData.dataPoints.map((point) => [point.relativeTime, point.damageReduction]);
  }, [damageReductionData?.dataPoints]);

  const staticChartData = React.useMemo(() => {
    if (!damageReductionData?.dataPoints) return [];
    const staticDR = resistanceToDamageReduction(damageReductionData.staticResistance);
    return damageReductionData.dataPoints.map((point) => [point.relativeTime, staticDR]);
  }, [damageReductionData?.dataPoints, damageReductionData?.staticResistance]);

  const phaseMarkLines = usePhaseMarkLines(phaseTransitionInfo, expanded);

  const chartOption = React.useMemo(() => {
    const lineColor = '#2196f3';
    const staticColor = '#ff9800';
    const staticDR = damageReductionData
      ? resistanceToDamageReduction(damageReductionData.staticResistance)
      : 0;

    const targetLine = buildGoalMarkLine(50, 'Target: 50%', '#ff9800');
    const staticLine = buildGoalMarkLine(
      staticDR,
      `Static: ${staticDR.toFixed(1)}%`,
      '#ff5722',
      { position: 'insideStartTop' },
    );
    const markLineData = [targetLine, staticLine];
    if (phaseMarkLines?.data) {
      markLineData.push(...phaseMarkLines.data);
    }

    return {
      xAxis: {
        type: 'value',
        name: 'Fight Time (seconds)',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: echartsTheme.mutedColor },
        axisLabel: { color: echartsTheme.mutedColor, fontSize: 11 },
        axisLine: { lineStyle: { color: echartsTheme.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 60,
        name: 'Damage Reduction (%)',
        nameLocation: 'middle',
        nameGap: 36,
        nameTextStyle: { color: echartsTheme.mutedColor },
        axisLabel: { color: echartsTheme.mutedColor, fontSize: 11, formatter: (v: number) => `${v}%` },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: echartsTheme.gridLineColor, type: 'dotted' } },
      },
      legend: {
        show: true,
        top: 0,
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: Array<{ seriesName: string; value: number[] }>) => {
          if (!params[0]) return '';
          const time = Number(params[0].value[0]).toFixed(1);
          const lines = params.map(
            (p) => `<div>${p.seriesName}: <b>${Number(p.value[1]).toFixed(1)}%</b></div>`,
          );
          return `<div style="font-size:13px"><div style="color:${echartsTheme.mutedColor}">Time: ${time}s</div>${lines.join('')}</div>`;
        },
      },
      series: [
        {
          name: 'Damage Reduction %',
          type: 'line',
          data: chartData,
          ...steppedLineDefaults(),
          lineStyle: {
            color: lineColor,
            width: 2,
            ...glowLineStyle(lineColor, echartsTheme.intensity, echartsTheme.perfTier),
          },
          areaStyle: gradientAreaStyle(lineColor, echartsTheme.intensity, echartsTheme.perfTier),
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            data: markLineData,
          },
        },
        {
          name: 'Static Reduction',
          type: 'line',
          data: staticChartData,
          showSymbol: false,
          lineStyle: {
            color: staticColor,
            width: 1,
            type: 'dashed',
          },
          emphasis: { disabled: true },
        },
      ],
    };
  }, [chartData, staticChartData, damageReductionData, phaseMarkLines, echartsTheme]);

  if (isLoading || !damageReductionData) {
    return (
      <Accordion
        disabled
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
        <AccordionSummary>
          <Typography
            variant="h6"
            sx={{
              fontSize: '1.75rem',
              textShadow: roleColors.getAccordionTextShadow(),
            }}
          >
            {name}
          </Typography>
        </AccordionSummary>
      </Accordion>
    );
  }

  const {
    damageReductionSources,
    maxDynamicResistance,
    staticResistance,
    averageDynamicResistance,
  } = damageReductionData;

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
            {player && <PlayerIcon player={player} />}
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{
                fontSize: '1.75rem',
                textShadow: roleColors.getAccordionTextShadow(),
              }}
            >
              {player ? resolveActorName(player) : name}
            </Typography>
          </Box>
          {!isLoading && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2.5, alignItems: 'center' }}>
              <MetricPill
                label="Max"
                value={`${resistanceToDamageReduction(maxDynamicResistance + staticResistance).toFixed(1)}%`}
                intent={
                  resistanceToDamageReduction(maxDynamicResistance + staticResistance) >= 50
                    ? 'success'
                    : 'danger'
                }
                size="md"
              />
              <MetricPill
                label="Average"
                value={`${resistanceToDamageReduction(averageDynamicResistance + staticResistance).toFixed(1)}%`}
                intent={
                  resistanceToDamageReduction(averageDynamicResistance + staticResistance) >= 40
                    ? 'info'
                    : 'warning'
                }
                size="md"
              />
              <MetricPill
                label="Static"
                value={`${resistanceToDamageReduction(staticResistance).toFixed(1)}%`}
                intent={
                  resistanceToDamageReduction(staticResistance) >= 30
                    ? 'success'
                    : resistanceToDamageReduction(staticResistance) >= 20
                      ? 'warning'
                      : 'danger'
                }
                size="md"
              />
            </Box>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          backgroundColor: theme.palette.background.default,
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
          pt: 2,
        }}
      >
        <Stack spacing={3}>
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
                value={`${resistanceToDamageReduction(maxDynamicResistance + staticResistance).toFixed(1)}%`}
                intent={
                  resistanceToDamageReduction(maxDynamicResistance + staticResistance) >= 50
                    ? 'success'
                    : 'danger'
                }
                size="sm"
              />
              <MetricPill
                label="Average"
                value={`${resistanceToDamageReduction(averageDynamicResistance + staticResistance).toFixed(1)}%`}
                intent={
                  resistanceToDamageReduction(averageDynamicResistance + staticResistance) >= 40
                    ? 'info'
                    : 'warning'
                }
                size="sm"
              />
              <MetricPill
                label="Static"
                value={`${resistanceToDamageReduction(staticResistance).toFixed(1)}%`}
                intent={
                  resistanceToDamageReduction(staticResistance) >= 30
                    ? 'success'
                    : resistanceToDamageReduction(staticResistance) >= 20
                      ? 'warning'
                      : 'danger'
                }
                size="sm"
              />
            </Box>
          )}

          {/* Summary Statistics */}
          <Card
            sx={{
              background:
                'linear-gradient(135deg, rgba(175, 82, 222, 0.15) 0%, rgba(175, 82, 222, 0.08) 50%, rgba(175, 82, 222, 0.04) 100%)',
              border: '1px solid rgba(175, 82, 222, 0.3)',
              borderRadius: 2,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  textShadow:
                    '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
                }}
              >
                Damage Reduction Summary
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    Max Reduction
                  </Typography>
                  <Typography variant="h5" color="secondary">
                    {resistanceToDamageReduction(staticResistance + maxDynamicResistance).toFixed(
                      1,
                    )}
                    %
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {staticResistance + maxDynamicResistance} resistance
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    Average Reduction
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {resistanceToDamageReduction(
                      averageDynamicResistance + staticResistance,
                    ).toFixed(1)}
                    %
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(averageDynamicResistance + staticResistance).toFixed(0)} resistance
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    Static Reduction
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {resistanceToDamageReduction(staticResistance).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {staticResistance.toLocaleString()} resistance
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    Dynamic Reduction
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {resistanceToDamageReduction(maxDynamicResistance).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {maxDynamicResistance.toLocaleString()} resistance
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* Damage Reduction Sources */}
            <Card
              sx={{
                flex: '1 1 300px',
                background:
                  'linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(0, 122, 255, 0.08) 50%, rgba(0, 122, 255, 0.04) 100%)',
                border: '1px solid rgba(0, 122, 255, 0.3)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    textShadow:
                      '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  Damage Reduction Sources
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {damageReductionSources.length > 0 ? (
                    damageReductionSources.map((source, index) => {
                      const resistanceValue = source.resistanceValue;
                      const damageReductionPercent = resistanceToDamageReduction(resistanceValue);
                      // Create a unique key based on source properties
                      const sourceKey = `${source.source}-${source.name}-${index}`;

                      return (
                        <Box
                          key={sourceKey}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1,
                            backgroundColor: theme.palette.background.default,
                            borderRadius: 1,
                            opacity: source.isActive ? 1 : 0.5,
                            color: source.isActive ? 'inherit' : 'text.secondary',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: source.isActive ? 'inherit' : 'text.secondary',
                                fontStyle: source.isActive ? 'normal' : 'italic',
                              }}
                            >
                              {source.name}
                            </Typography>
                            <Chip
                              label={source.source}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: '0.6rem',
                                height: '20px',
                                opacity: source.isActive ? 1 : 0.6,
                                color: source.isActive ? 'inherit' : 'text.secondary',
                              }}
                            />
                            {!source.isActive && (
                              <Chip
                                label="inactive"
                                size="small"
                                variant="outlined"
                                color="default"
                                sx={{
                                  fontSize: '0.6rem',
                                  height: '20px',
                                  opacity: 0.6,
                                }}
                              />
                            )}
                            {source.source === 'not_implemented' && (
                              <Chip
                                label="not implemented"
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{
                                  fontSize: '0.6rem',
                                  height: '20px',
                                  opacity: 0.8,
                                }}
                              />
                            )}
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              sx={{
                                color: source.isActive ? 'inherit' : 'text.secondary',
                              }}
                            >
                              {damageReductionPercent.toFixed(1)}%
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                opacity: source.isActive ? 1 : 0.6,
                              }}
                            >
                              {resistanceValue.toLocaleString()} resistance
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No active damage reduction sources found
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Damage Reduction vs Time Chart - Only render when expanded for performance */}
          {expanded ? (
            <Card
              sx={{
                background:
                  'linear-gradient(135deg, rgba(76, 217, 100, 0.15) 0%, rgba(76, 217, 100, 0.08) 50%, rgba(76, 217, 100, 0.04) 100%)',
                border: '1px solid rgba(76, 217, 100, 0.3)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      textShadow:
                        '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    Damage Reduction Over Time
                  </Typography>
                  <ChartIntensityToggle />
                </Box>
                <EChart
                  option={chartOption}
                  height={300}
                  group="fightReport"
                />
              </CardContent>
            </Card>
          ) : (
            <Card
              sx={{
                background:
                  'linear-gradient(135deg, rgba(76, 217, 100, 0.08) 0%, rgba(76, 217, 100, 0.04) 50%, rgba(76, 217, 100, 0.02) 100%)',
                border: '1px solid rgba(76, 217, 100, 0.2)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                cursor: 'pointer',
              }}
              onClick={() => onExpandChange({} as React.SyntheticEvent, true)}
            >
              <CardContent sx={{ py: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="body2">
                    Click to expand and view damage reduction timeline chart
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
