import type { SvgIconComponent } from '@mui/icons-material';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import BarChartIcon from '@mui/icons-material/BarChart';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import BoltIcon from '@mui/icons-material/Bolt';
import CoronavirusIcon from '@mui/icons-material/Coronavirus';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import LoopIcon from '@mui/icons-material/Loop';
import ScienceIcon from '@mui/icons-material/Science';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import React from 'react';

import { glassCardSurfaceSx, SUMMARY_ACCENTS } from '../../theme/glassCardSurface';
import { AbilityTypeDamageBreakdown, ReportDamageBreakdown } from '../../types/reportSummaryTypes';

import {
  accentTableSx,
  gradientTitleSx,
  listRowHoverSx,
  metricPillSx,
  rankBadgeSx,
  sectionIconBadgeSx,
} from './summaryStyles';

/** Icon + accent color per damage-type label (keyed by both long and short names). */
const DAMAGE_TYPE_PRESENTATION: Record<string, { Icon: SvgIconComponent; color: string }> = {
  Magic: { Icon: AutoAwesomeIcon, color: '#818CF8' },
  Martial: { Icon: SportsMartialArtsIcon, color: '#C08457' },
  Physical: { Icon: SportsMartialArtsIcon, color: '#C08457' },
  Direct: { Icon: GpsFixedIcon, color: '#FBBF24' },
  'Direct Damage': { Icon: GpsFixedIcon, color: '#FBBF24' },
  'Damage over Time': { Icon: LoopIcon, color: '#34D399' },
  DOT: { Icon: LoopIcon, color: '#34D399' },
  'Area of Effect': { Icon: BlurOnIcon, color: '#F87171' },
  AOE: { Icon: BlurOnIcon, color: '#F87171' },
  Poison: { Icon: ScienceIcon, color: '#84CC16' },
  Fire: { Icon: LocalFireDepartmentIcon, color: '#FB923C' },
  Frost: { Icon: AcUnitIcon, color: '#60A5FA' },
  Shock: { Icon: BoltIcon, color: '#A78BFA' },
  'Status Effects': { Icon: AutoFixHighIcon, color: '#FBBF24' },
  Bleed: { Icon: WaterDropIcon, color: '#EF4444' },
  Disease: { Icon: CoronavirusIcon, color: '#A78BFA' },
};

const DEFAULT_PRESENTATION = { Icon: BlurOnIcon, color: '#94A3B8' };

/** Renders a damage-type breakdown as labelled rows with a thin themed bar. */
const DamageTypeList: React.FC<{ items: AbilityTypeDamageBreakdown[] }> = ({ items }) => (
  <Paper variant="outlined">
    <List disablePadding>
      {items.map((type, index) => {
        const { Icon, color } = DAMAGE_TYPE_PRESENTATION[type.abilityType] ?? DEFAULT_PRESENTATION;
        return (
          <React.Fragment key={type.abilityType}>
            <ListItem
              sx={(theme) => ({
                py: 1.5,
                gap: 1.5,
                ...listRowHoverSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.damage),
              })}
            >
              <Icon sx={{ color, flexShrink: 0 }} aria-hidden />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {type.abilityType}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {type.percentage.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, type.percentage))}
                  aria-label={`${type.abilityType} share of damage`}
                  sx={{
                    my: 0.5,
                    height: 6,
                    borderRadius: 3,
                    '& .MuiLinearProgress-bar': { backgroundColor: color },
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {formatDamage(type.totalDamage)} • {formatNumber(type.hitCount)} hits
                </Typography>
              </Box>
            </ListItem>
            {index < items.length - 1 && <Divider />}
          </React.Fragment>
        );
      })}
    </List>
  </Paper>
);

interface DamageBreakdownSectionProps {
  damageBreakdown?: ReportDamageBreakdown;
  isLoading: boolean;
  error?: string;
}

const DamageBreakdownSectionComponent: React.FC<DamageBreakdownSectionProps> = ({
  damageBreakdown,
  isLoading,
  error,
}) => {
  const [typeView, setTypeView] = React.useState<'combined' | 'split'>('combined');

  if (error) {
    return (
      <Card
        elevation={0}
        sx={(theme) => glassCardSurfaceSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.damage)}
      >
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Damage Breakdown
          </Typography>
          <Alert severity="error">Failed to load damage data: {error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !damageBreakdown) {
    return (
      <Card
        elevation={0}
        sx={(theme) => glassCardSurfaceSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.damage)}
      >
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Damage Breakdown
          </Typography>
          <DamageBreakdownSkeleton />
        </CardContent>
      </Card>
    );
  }

  // Calculate highest damage for relative progress bars
  const highestDamage =
    damageBreakdown.playerBreakdown.length > 0 ? damageBreakdown.playerBreakdown[0].totalDamage : 1;

  if (damageBreakdown.playerBreakdown.length === 0) {
    return (
      <Card
        elevation={0}
        sx={(theme) => glassCardSurfaceSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.damage)}
      >
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Damage Breakdown
          </Typography>
          <Alert severity="info">No player damage was recorded for this report.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={(theme) => glassCardSurfaceSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.damage)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={sectionIconBadgeSx(SUMMARY_ACCENTS.damage)}>
            <BarChartIcon />
          </Box>
          <Typography
            variant="h5"
            component="h2"
            sx={(theme) => gradientTitleSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.damage)}
          >
            Damage Breakdown
          </Typography>
          <Chip
            label={formatDamage(damageBreakdown.totalDamage)}
            sx={(theme) => metricPillSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.damage)}
          />
          <Chip
            label={`${formatNumber(damageBreakdown.dps)} DPS`}
            sx={(theme) => metricPillSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.info)}
          />
        </Box>

        {/* Top Players List */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            Top Damage Dealers
          </Typography>
          <Paper variant="outlined">
            <List>
              {damageBreakdown.playerBreakdown.slice(0, 5).map((player, index) => (
                <React.Fragment key={player.playerId}>
                  <ListItem
                    sx={(theme) =>
                      listRowHoverSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.damage)
                    }
                  >
                    <Box
                      component="span"
                      sx={(theme) => rankBadgeSx(index + 1, theme.palette.mode === 'dark')}
                    >
                      {index + 1}
                    </Box>
                    <ListItemText
                      sx={{ ml: 1.5 }}
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {player.playerName}
                        </Typography>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'block', mt: 1 }}>
                          <Box
                            sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                            component="span"
                          >
                            <Typography variant="body2" component="span">
                              {formatDamage(player.totalDamage)} • {formatNumber(player.dps)} DPS
                            </Typography>
                            <Typography variant="body2" component="span">
                              {player.damagePercentage.toFixed(1)}% of total
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (player.totalDamage / highestDamage) * 100)}
                            aria-label={`${player.playerName} relative damage`}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getPerformanceGradientColor(
                                  player.damagePercentage,
                                ),
                              },
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < Math.min(4, damageBreakdown.playerBreakdown.length - 1) && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>

        {/* Damage Type Breakdown */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
              mb: 1,
            }}
          >
            <Typography variant="h6" component="h3">
              Damage by Type
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={typeView}
              onChange={(_event, value) => value && setTypeView(value)}
              aria-label="Damage by type view"
            >
              <ToggleButton value="combined">Combined</ToggleButton>
              <ToggleButton value="split">Split (100%)</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {typeView === 'combined' ? (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1.5 }}
              >
                Categories overlap (a fire DOT counts as Fire, Magic and Damage over Time), so
                percentages can add up to more than 100%.
              </Typography>
              <DamageTypeList items={damageBreakdown.abilityTypeBreakdown} />
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" gutterBottom>
                  By delivery
                </Typography>
                <DamageTypeList items={damageBreakdown.deliveryBreakdown ?? []} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" gutterBottom>
                  By school
                </Typography>
                <DamageTypeList items={damageBreakdown.schoolBreakdown ?? []} />
              </Box>
            </Box>
          )}
        </Box>

        {/* Player Details Table */}
        <Box>
          <Typography variant="h6" component="h3" gutterBottom id="player-performance-heading">
            Player Performance Details
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table
              size="small"
              aria-labelledby="player-performance-heading"
              sx={(theme) => accentTableSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.damage)}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell align="right">Total Damage</TableCell>
                  <TableCell align="right">DPS</TableCell>
                  <TableCell align="right">% of Total</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    Performance
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {damageBreakdown.playerBreakdown.map((player) => (
                  <TableRow key={player.playerId}>
                    <TableCell component="th" scope="row">
                      {player.playerName}
                    </TableCell>
                    <TableCell align="right">{formatDamage(player.totalDamage)}</TableCell>
                    <TableCell align="right">{formatNumber(player.dps)}</TableCell>
                    <TableCell align="right">{player.damagePercentage.toFixed(1)}%</TableCell>
                    <TableCell
                      align="right"
                      sx={{ width: { sm: 120 }, display: { xs: 'none', sm: 'table-cell' } }}
                    >
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (player.totalDamage / highestDamage) * 100)}
                        aria-label={`${player.playerName} relative damage`}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getPerformanceGradientColor(player.damagePercentage),
                          },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

const DamageBreakdownSkeleton: React.FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Skeleton variant="rectangular" width={120} height={32} />
        <Skeleton variant="rectangular" width={100} height={32} />
      </Box>

      <Typography variant="h6" gutterBottom>
        <Skeleton width="40%" />
      </Typography>
      <Skeleton variant="rectangular" height={200} sx={{ mb: 4 }} />

      <Typography variant="h6" gutterBottom>
        <Skeleton width="50%" />
      </Typography>
      <Skeleton variant="rectangular" height={200} sx={{ mb: 4 }} />

      <Typography variant="h6" gutterBottom>
        <Skeleton width="45%" />
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={48} />
        ))}
      </Box>
    </Box>
  );
};

export const DamageBreakdownSection = React.memo(DamageBreakdownSectionComponent);
DamageBreakdownSection.displayName = 'DamageBreakdownSection';

// Helper functions
function formatDamage(damage: number): string {
  if (damage >= 1000000) {
    return `${(damage / 1000000).toFixed(1)}M`;
  } else if (damage >= 1000) {
    return `${(damage / 1000).toFixed(1)}K`;
  }
  return damage.toString();
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(Math.round(num));
}

function getPerformanceGradientColor(percentage: number): string {
  // Smoothly interpolate from red (0%) → orange (~10%) → green (20%+)
  // HSL hue: 0 = red, ~30 = orange, ~60 = yellow, 120 = green
  const clamped = Math.max(0, Math.min(20, percentage));
  const hue = (clamped / 20) * 120;
  return `hsl(${hue}, 80%, 45%)`;
}
