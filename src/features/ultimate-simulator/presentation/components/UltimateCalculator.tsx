/**
 * Ultimate Calculator — all-class ultimate generation & time-to-ult tool.
 *
 * Headline numbers come from the exact closed-form engine (instant, no wobble).
 * The user picks context / class / role, toggles the ult sources their build
 * runs, sets Decisive + fight length, and picks the ultimate they want to cast;
 * the panel shows ult/sec, time to first ult, casts per fight, a per-source
 * breakdown, and an optional Monte Carlo distribution. Every catalog number is
 * research-sourced (each source links its provenance).
 */

import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import { totalReductionFraction } from '../../core/cost';
import { DECISIVE_PROC_CHANCE, type DecisiveQuality } from '../../shared/constants';
import {
  ULTIMATE_ABILITIES,
} from '../../shared/constants/catalog';
import {
  COMBAT_CONTEXT_LABELS,
  ESO_CLASSES,
  ESO_CLASS_LABELS,
  SOURCE_CATEGORY_LABELS,
  type CombatContext,
  type CombatRole,
  type EsoClass,
  type SourceCategory,
} from '../../shared/types/catalog';
import { useUltimateCalculator } from '../useUltimateCalculator';

import { LogCalibrationPanel } from './LogCalibrationPanel';

const QUALITY_OPTIONS: { value: DecisiveQuality; label: string }[] = [
  { value: 'normal', label: 'Normal (white)' },
  { value: 'fine', label: 'Fine (green)' },
  { value: 'superior', label: 'Superior (blue)' },
  { value: 'epic', label: 'Epic (purple)' },
  { value: 'legendary', label: 'Legendary (gold)' },
];

const ROLE_OPTIONS: { value: CombatRole; label: string }[] = [
  { value: 'dps', label: 'DPS' },
  { value: 'healer', label: 'Healer' },
  { value: 'tank', label: 'Tank' },
];

const CONTEXT_OPTIONS: CombatContext[] = ['soloPve', 'groupPve', 'pvp'];

const fmt = (n: number, digits = 1): string =>
  Number.isFinite(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '∞';

const fmtSeconds = (n: number): string => {
  if (!Number.isFinite(n)) return 'never';
  if (n < 60) return `${fmt(n, 1)}s`;
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return `${m}m ${s}s`;
};

/** A big headline stat. */
const StatBlock: React.FC<{
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}> = ({ label, value, sub, accent }) => {
  const theme = useTheme();
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Typography
        variant="h4"
        sx={{ fontWeight: 700, lineHeight: 1.1, color: accent ?? theme.palette.text.primary }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
};

export interface UltimateCalculatorProps {
  className?: string;
}

export const UltimateCalculator: React.FC<UltimateCalculatorProps> = ({ className }) => {
  const theme = useTheme();
  const calc = useUltimateCalculator();
  const {
    state,
    expected,
    timeToUlt,
    effectiveCost,
    baseCost,
    appliedReductions,
    availableSourceEntries,
    exceedsSanity,
    sanityMax,
    maxPool,
    distribution,
  } = calc;

  const accent = theme.palette.mode === 'dark' ? 'rgb(56, 189, 248)' : 'rgb(40, 145, 200)';

  // Group available sources by category for a tidy toggle list.
  const grouped = React.useMemo(() => {
    const map = new Map<SourceCategory, typeof availableSourceEntries>();
    for (const s of availableSourceEntries) {
      const arr = (map.get(s.category) ?? []) as typeof availableSourceEntries;
      map.set(s.category, [...arr, s]);
    }
    return Array.from(map.entries());
  }, [availableSourceEntries]);

  const reductionFraction = totalReductionFraction(appliedReductions);

  // Order the ultimate picker so the current class's ults (and global/weapon
  // ones, usable by everyone) surface first; other classes' ults follow.
  const orderedUltimates = React.useMemo(() => {
    const rank = (owner: string): number => {
      if (owner === state.esoClass) return 0;
      if (owner === 'global' || owner === 'weapon') return 1;
      return 2;
    };
    return [...ULTIMATE_ABILITIES].sort((a, b) => rank(a.owner) - rank(b.owner));
  }, [state.esoClass]);

  return (
    <Box className={className} sx={{ width: '100%' }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Ultimate Calculator
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        How fast do you build ultimate, and how often can you cast it? Pick your context and build,
        and get exact ultimate&nbsp;/&nbsp;second, time to your first ultimate, and casts per fight.
        All numbers use Update&nbsp;50 mechanics.
      </Typography>

      {/* ===================== HEADLINE (full width, results-first) ===================== */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2.5,
          borderRadius: 3,
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(15,23,42,0.25))'
              : 'linear-gradient(135deg, rgba(40,145,200,0.10), rgba(248,250,252,0.6))',
        }}
      >
        <Stack
          direction="row"
          spacing={{ xs: 3, sm: 6 }}
          sx={{ flexWrap: 'wrap', rowGap: 2, justifyContent: { xs: 'flex-start', sm: 'space-around' } }}
        >
          <StatBlock
            label="Ultimate / second"
            value={fmt(expected.ultimatePerSecond, 2)}
            sub={`${fmt(expected.totalUltimate, 0)} over ${state.fightDurationSeconds}s`}
            accent={accent}
          />
          <StatBlock
            label="Time to first ult"
            value={fmtSeconds(timeToUlt.secondsToFirstCast)}
            sub={`${effectiveCost} ult cost`}
          />
          <StatBlock
            label="Casts / fight"
            value={Number.isFinite(timeToUlt.castsPerFight) ? String(timeToUlt.castsPerFight) : '∞'}
            sub={`every ${fmtSeconds(timeToUlt.secondsPerCast)}`}
          />
          <StatBlock
            label="Generated by 60s"
            value={fmt(expected.ultimatePerSecond * 60, 0)}
            sub={`ult (pool caps at ${maxPool})`}
          />
        </Stack>
        {exceedsSanity && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {fmt(expected.ultimatePerSecond, 2)} ult/s is above the practical sustained ceiling (~
            {sanityMax}/s, roughly the best a Warden achieves). Double-check the enabled sources and
            uptimes — this may be optimistic.
          </Alert>
        )}
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2.5 }}>
        {/* ============================ INPUTS ============================ */}
        <Paper variant="outlined" sx={{ p: 2.5, flex: '1 1 420px', minWidth: 0, borderRadius: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Your build
          </Typography>

          {/* Context / class / role */}
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Context
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={state.context}
                onChange={(_, v) => v && calc.setContext(v as CombatContext)}
                sx={{ mt: 0.5 }}
              >
                {CONTEXT_OPTIONS.map((c) => (
                  <ToggleButton key={c} value={c} sx={{ textTransform: 'none' }}>
                    {COMBAT_CONTEXT_LABELS[c]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Stack direction="row" spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel id="ult-class-label">Class</InputLabel>
                <Select
                  labelId="ult-class-label"
                  label="Class"
                  value={state.esoClass}
                  onChange={(e) => calc.setClass(e.target.value as EsoClass)}
                >
                  {ESO_CLASSES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {ESO_CLASS_LABELS[c]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel id="ult-role-label">Role</InputLabel>
                <Select
                  labelId="ult-role-label"
                  label="Role"
                  value={state.role}
                  onChange={(e) => calc.setRole(e.target.value as CombatRole)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Fight duration (seconds)"
              type="number"
              size="small"
              value={state.fightDurationSeconds}
              onChange={(e) => calc.setFightDuration(Number(e.target.value))}
              slotProps={{ htmlInput: { min: 1, step: 5 } }}
            />

            {/* Decisive */}
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={state.decisiveEnabled}
                    onChange={(e) => calc.setDecisiveEnabled(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Decisive weapon trait
                  </Typography>
                }
              />
              {state.decisiveEnabled && (
                <Stack spacing={1.5} sx={{ mt: 1, pl: 1 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="decisive-quality-label">Weapon quality</InputLabel>
                    <Select
                      labelId="decisive-quality-label"
                      label="Weapon quality"
                      value={state.decisiveQuality}
                      onChange={(e) => calc.setDecisiveQuality(e.target.value as DecisiveQuality)}
                    >
                      {QUALITY_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label} — {(DECISIVE_PROC_CHANCE[opt.value] * 100).toFixed(1)}%
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Tooltip
                    arrow
                    title="A two-handed melee weapon (greatsword, battle axe, maul) provides twice the Decisive bonus — it rolls for the extra ultimate twice per gain instead of once."
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={state.decisiveTwoHanded}
                          onChange={(e) => calc.setDecisiveTwoHanded(e.target.checked)}
                        />
                      }
                      label={<Typography variant="body2">Two-handed (rolls twice)</Typography>}
                    />
                  </Tooltip>
                </Stack>
              )}
            </Box>

            <Divider textAlign="left">
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Ultimate sources
              </Typography>
            </Divider>

            {/* Source toggles, grouped by category */}
            {grouped.map(([category, entries]) => (
              <Box key={category}>
                <Typography
                  variant="caption"
                  sx={{ color: accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  {SOURCE_CATEGORY_LABELS[category]}
                </Typography>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                  {entries.map((s) => {
                    const enabled = calc.isEnabled(s.id, s.defaultEnabled);
                    return (
                      <Box
                        key={s.id}
                        sx={{
                          borderRadius: 2,
                          p: 1,
                          border: `1px solid ${
                            enabled
                              ? theme.palette.mode === 'dark'
                                ? 'rgba(56,189,248,0.3)'
                                : 'rgba(40,145,200,0.25)'
                              : 'transparent'
                          }`,
                          backgroundColor: enabled
                            ? theme.palette.mode === 'dark'
                              ? 'rgba(56,189,248,0.06)'
                              : 'rgba(40,145,200,0.04)'
                            : 'transparent',
                        }}
                      >
                        <Stack
                          direction="row"
                          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <FormControlLabel
                            sx={{ mr: 0, flex: 1 }}
                            control={
                              <Switch
                                size="small"
                                checked={enabled}
                                onChange={(e) => calc.toggleSource(s.id, e.target.checked)}
                              />
                            }
                            label={
                              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                <Typography variant="body2">{s.label}</Typography>
                                {s.confidence !== 'high' && (
                                  <Chip
                                    label={s.confidence}
                                    size="small"
                                    sx={{ height: 16, fontSize: 10 }}
                                  />
                                )}
                              </Stack>
                            }
                          />
                          {s.provenance && (
                            <Link
                              href={s.provenance}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="caption"
                              sx={{ flexShrink: 0 }}
                            >
                              source
                            </Link>
                          )}
                        </Stack>
                        {enabled && (
                          <Box sx={{ pl: 5, pr: 1 }}>
                            <Stack
                              direction="row"
                              sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                            >
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Uptime
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {Math.round((state.uptimeOverrides[s.id] ?? s.uptime) * 100)}%
                              </Typography>
                            </Stack>
                            <Slider
                              size="small"
                              value={Math.round((state.uptimeOverrides[s.id] ?? s.uptime) * 100)}
                              onChange={(_, v) => calc.setUptime(s.id, (v as number) / 100)}
                              min={0}
                              max={100}
                              aria-label={`${s.label} uptime`}
                            />
                            {s.description && (
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', display: 'block', mt: -0.5 }}
                              >
                                {s.description}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ))}

            <Button onClick={calc.reset} size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
              Reset to defaults
            </Button>
          </Stack>
        </Paper>

        {/* ============================ RESULTS ============================ */}
        <Stack spacing={2.5} sx={{ flex: '1 1 480px', minWidth: 0 }}>
          {/* Ultimate picker / cost */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Which ultimate?
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 220, flex: 1 }}>
                <InputLabel id="ult-ability-label">Ultimate</InputLabel>
                <Select
                  labelId="ult-ability-label"
                  label="Ultimate"
                  value={state.customUltimateCost != null ? 'custom' : state.ultimateAbilityId}
                  onChange={(e) => {
                    if (e.target.value === 'custom') calc.setCustomUltimateCost(baseCost);
                    else calc.setUltimateAbility(e.target.value);
                  }}
                >
                  {orderedUltimates.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.label} — {a.baseCost}
                      {a.confidence !== 'high' ? ' *' : ''}
                    </MenuItem>
                  ))}
                  <MenuItem value="custom">Custom cost…</MenuItem>
                </Select>
              </FormControl>
              {state.customUltimateCost != null && (
                <TextField
                  label="Custom cost"
                  type="number"
                  size="small"
                  value={state.customUltimateCost}
                  onChange={(e) => calc.setCustomUltimateCost(Number(e.target.value))}
                  slotProps={{ htmlInput: { min: 0, max: 500, step: 5 } }}
                  sx={{ width: 140 }}
                />
              )}
              <TextField
                label="Starting ultimate"
                type="number"
                size="small"
                value={state.startingUltimate}
                onChange={(e) => calc.setStartingUltimate(Number(e.target.value))}
                slotProps={{ htmlInput: { min: 0, max: 500, step: 5 } }}
                sx={{ width: 150 }}
                helperText="Banked at fight start"
              />
            </Stack>
            {reductionFraction > 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
                Cost reduced {Math.round(reductionFraction * 100)}% ({baseCost} → {effectiveCost}) by{' '}
                {appliedReductions
                  .filter((r) => r.enabled)
                  .map((r) => r.label)
                  .join(', ')}
                .
              </Typography>
            )}
          </Paper>

          {/* Per-source breakdown */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Where it comes from
              </Typography>
              <Button size="small" onClick={calc.computeDistribution}>
                {distribution ? 'Recompute spread' : 'Show spread'}
              </Button>
            </Stack>
            <Table size="small" aria-label="per-source ultimate breakdown">
              <TableHead>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Base</TableCell>
                  <TableCell align="right">Decisive</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">ult/s</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expected.contributions.map((c) => {
                  const tot = c.baseUltimate + c.decisiveUltimate;
                  return (
                    <TableRow key={c.sourceId}>
                      <TableCell>{c.label}</TableCell>
                      <TableCell align="right">{fmt(c.baseUltimate, 0)}</TableCell>
                      <TableCell align="right">{fmt(c.decisiveUltimate, 1)}</TableCell>
                      <TableCell align="right">{fmt(tot, 1)}</TableCell>
                      <TableCell align="right">
                        {fmt(state.fightDurationSeconds > 0 ? tot / state.fightDurationSeconds : 0, 2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmt(expected.baseUltimate, 0)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmt(expected.decisiveUltimate, 1)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }} data-testid="ult-grand-total">
                    {fmt(expected.totalUltimate, 1)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmt(expected.ultimatePerSecond, 2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {distribution && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Per-fight spread (Monte Carlo, {distribution.runs.toLocaleString()} runs) — Decisive
                  is random, so a single fight varies around the mean:
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
                  <Typography variant="body2">
                    Mean <strong>{fmt(distribution.meanTotal, 1)}</strong> ± {fmt(distribution.ci95HalfWidth, 2)} (95% CI)
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Range {fmt(distribution.minTotal, 0)}–{fmt(distribution.maxTotal, 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Std dev {fmt(distribution.stdDevTotal, 1)}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Paper>

          {/* Verify against your own ESO Logs report */}
          <LogCalibrationPanel modeledPerSecond={expected.ultimatePerSecond} />
        </Stack>
      </Box>
    </Box>
  );
};
