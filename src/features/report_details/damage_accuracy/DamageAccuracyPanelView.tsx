import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import type { FightFragment } from '../../../graphql/gql/graphql';
import { useReportMasterData } from '../../../hooks/useReportMasterData';
import type {
  AbilityAccuracyStats,
  FightAccuracyReport,
  PlayerAccuracyReport,
} from '../../../utils/damageAccuracyEngine';

interface DamageAccuracyPanelViewProps {
  report: FightAccuracyReport;
  fight: FightFragment | null | undefined;
  error: string | null;
}

function getAccuracyColor(accuracy: number): 'success' | 'warning' | 'error' | 'default' {
  if (accuracy >= 90) return 'success';
  if (accuracy >= 70) return 'warning';
  if (accuracy >= 50) return 'error';
  return 'default';
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}

function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

/**
 * Presentational component that renders the full damage accuracy report.
 */
export const DamageAccuracyPanelView: React.FC<DamageAccuracyPanelViewProps> = ({
  report,
  fight,
  error,
}) => {
  const theme = useTheme();
  const { reportMasterData } = useReportMasterData();
  const abilitiesById = reportMasterData?.abilitiesById;
  const [expandedPlayers, setExpandedPlayers] = React.useState<Record<string, boolean>>({});

  const handlePlayerExpand = React.useCallback((playerId: string) => {
    setExpandedPlayers((prev) => ({ ...prev, [playerId]: !prev[playerId] }));
  }, []);

  if (error) {
    return <Alert severity="error">Accuracy computation failed: {error}</Alert>;
  }

  const fightDuration = fight ? Math.round((fight.endTime - fight.startTime) / 1000) : 0;

  return (
    <Box>
      {/* Fight Summary Card */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
              : theme.palette.background.paper,
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Damage Accuracy Report
          </Typography>
          <Chip
            label={`${formatPercent(report.overallAccuracy)} Overall`}
            color={getAccuracyColor(report.overallAccuracy)}
            variant="outlined"
            size="medium"
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <StatBox label="Total Events" value={formatNumber(report.totalEvents)} />
          <StatBox label="Players Analyzed" value={String(report.playerReports.length)} />
          <StatBox label="Crit Predictions" value={formatNumber(report.totalPredictions)} />
          <StatBox label="Computation Time" value={`${report.computationTimeMs.toFixed(0)}ms`} />
        </Box>
      </Paper>

      {/* Per-Player Accordions */}
      {report.playerReports.map((playerReport) => (
        <PlayerAccuracyAccordion
          key={playerReport.playerId}
          playerReport={playerReport}
          expanded={expandedPlayers[String(playerReport.playerId)] ?? false}
          onToggle={() => handlePlayerExpand(String(playerReport.playerId))}
          abilitiesById={abilitiesById}
          fightDuration={fightDuration}
        />
      ))}

      {report.playerReports.length === 0 && (
        <Alert severity="info">No damage events found for friendly players in this fight.</Alert>
      )}
    </Box>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Box>
  );
};

interface PlayerAccuracyAccordionProps {
  playerReport: PlayerAccuracyReport;
  expanded: boolean;
  onToggle: () => void;
  abilitiesById: Record<number, { name?: string | null; icon?: string | null }> | undefined;
  fightDuration: number;
}

const PlayerAccuracyAccordion: React.FC<PlayerAccuracyAccordionProps> = ({
  playerReport,
  expanded,
  onToggle,
  abilitiesById,
}) => {
  const theme = useTheme();

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      sx={{
        mb: 1,
        '&:before': { display: 'none' },
        background:
          theme.palette.mode === 'dark'
            ? 'rgba(15,23,42,0.4)'
            : theme.palette.background.paper,
        backdropFilter: 'blur(10px)',
        borderRadius: '8px !important',
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 150 }}>
            {playerReport.playerName}
          </Typography>
          <Chip
            label={formatPercent(playerReport.overallAccuracy)}
            color={getAccuracyColor(playerReport.overallAccuracy)}
            size="small"
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {formatNumber(playerReport.totalEventsAnalyzed)} events &middot;{' '}
            {playerReport.abilityStats.length} abilities
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {/* Modifier Summary */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 1,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Modifier Ranges
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 2,
            }}
          >
            <ModifierRange
              label="Penetration"
              min={playerReport.modifierSummary.penetrationRange.min}
              max={playerReport.modifierSummary.penetrationRange.max}
              mean={playerReport.modifierSummary.penetrationRange.mean}
              format={formatNumber}
              maxPossible={18200}
            />
            <ModifierRange
              label="Crit Damage Bonus"
              min={playerReport.modifierSummary.critDamageBonusRange.min * 100}
              max={playerReport.modifierSummary.critDamageBonusRange.max * 100}
              mean={playerReport.modifierSummary.critDamageBonusRange.mean * 100}
              format={(v) => formatPercent(v)}
              maxPossible={125}
            />
            <ModifierRange
              label="Damage Reduction"
              min={playerReport.modifierSummary.damageReductionRange.min}
              max={playerReport.modifierSummary.damageReductionRange.max}
              mean={playerReport.modifierSummary.damageReductionRange.mean}
              format={(v) => formatPercent(v)}
              maxPossible={50}
            />
            <ModifierRange
              label="Damage Done Multiplier"
              min={(playerReport.modifierSummary.damageDoneMultiplierRange.min - 1) * 100}
              max={(playerReport.modifierSummary.damageDoneMultiplierRange.max - 1) * 100}
              mean={(playerReport.modifierSummary.damageDoneMultiplierRange.mean - 1) * 100}
              format={(v) => `+${formatPercent(v)}`}
              maxPossible={30}
            />
            <ModifierRange
              label="Tooltip Scaling"
              min={(playerReport.modifierSummary.tooltipScalingRange.min - 1) * 100}
              max={(playerReport.modifierSummary.tooltipScalingRange.max - 1) * 100}
              mean={(playerReport.modifierSummary.tooltipScalingRange.mean - 1) * 100}
              format={(v) => `+${formatPercent(v)}`}
              maxPossible={30}
            />
          </Box>
        </Paper>

        {/* Ability Table */}
        <AbilityAccuracyTable
          abilities={playerReport.abilityStats}
          abilitiesById={abilitiesById}
        />
      </AccordionDetails>
    </Accordion>
  );
};

interface ModifierRangeProps {
  label: string;
  min: number;
  max: number;
  mean: number;
  format: (v: number) => string;
  maxPossible: number;
}

const ModifierRange: React.FC<ModifierRangeProps> = ({ label, min, max, mean, format, maxPossible }) => {
  const theme = useTheme();
  const progress = maxPossible > 0 ? (mean / maxPossible) * 100 : 0;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {format(mean)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ({format(min)} – {format(max)})
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, progress)}
        sx={{
          mt: 0.5,
          height: 4,
          borderRadius: 2,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        }}
      />
    </Box>
  );
};

interface AbilityAccuracyTableProps {
  abilities: AbilityAccuracyStats[];
  abilitiesById: Record<number, { name?: string | null; icon?: string | null }> | undefined;
}

const AbilityAccuracyTable: React.FC<AbilityAccuracyTableProps> = ({
  abilities,
  abilitiesById,
}) => {
  const theme = useTheme();

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        borderRadius: 1,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.15)' : 'transparent',
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ability</TableCell>
            <TableCell align="right">Events</TableCell>
            <TableCell align="right">Normal</TableCell>
            <TableCell align="right">Crits</TableCell>
            <TableCell align="right">
              <Tooltip title="Mean inferred tooltip damage from normal (non-crit) hits">
                <span>Avg Tooltip</span>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Coefficient of Variation (lower = more consistent). Values below 5% suggest our modifiers explain the damage well.">
                <span>CV%</span>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Overall accuracy score for this ability (0–100)">
                <span>Accuracy</span>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {abilities.map((ability) => {
            const abilityInfo = abilitiesById?.[ability.abilityGameID];
            const abilityName = abilityInfo?.name || `Ability ${ability.abilityGameID}`;

            return (
              <TableRow
                key={ability.abilityGameID}
                sx={{ '&:last-child td': { borderBottom: 0 } }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {abilityInfo?.icon && (
                      <Box
                        component="img"
                        src={abilityInfo.icon}
                        alt={abilityName}
                        sx={{ width: 20, height: 20, borderRadius: '4px' }}
                      />
                    )}
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {abilityName}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {ability.totalEvents}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {ability.normalHitCount}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {ability.critHitCount}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatNumber(ability.meanNormalTooltip)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <CVChip cv={ability.coefficientOfVariation * 100} />
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={formatPercent(ability.accuracyScore)}
                    color={getAccuracyColor(ability.accuracyScore)}
                    size="small"
                    variant="outlined"
                    sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 65 }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const CVChip: React.FC<{ cv: number }> = ({ cv }) => {
  // Low CV = good consistency (our modifiers explain the damage)
  // High CV = something is off
  let color: 'success' | 'warning' | 'error' | 'default';
  if (cv < 3) color = 'success';
  else if (cv < 8) color = 'warning';
  else color = 'error';

  return (
    <Chip
      label={formatPercent(cv)}
      color={color}
      size="small"
      variant="outlined"
      sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 55 }}
    />
  );
};
