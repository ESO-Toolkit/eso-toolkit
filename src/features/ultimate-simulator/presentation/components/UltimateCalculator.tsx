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
  AutoFixHighOutlined,
  BoltOutlined,
  InfoOutlined,
  InsightsOutlined,
  QueryStatsOutlined,
  TuneOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  Link,
  ListSubheader,
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
  alpha,
  useTheme,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import React from 'react';

import { totalReductionFraction } from '../../core/cost';
import { DECISIVE_PROC_CHANCE, type DecisiveQuality } from '../../shared/constants';
import { ULTIMATE_ABILITIES } from '../../shared/constants/catalog';
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

/**
 * Canonical per-class accent colors (mirrors the repo's class palette in
 * build-editor/data/esoStaticData.ts). Cosmetic only — used for swatches in the
 * class + ultimate dropdowns, not for any gameplay number.
 */
const CLASS_COLORS: Record<EsoClass, string> = {
  arcanist: '#43a047',
  dragonknight: '#e05c00',
  necromancer: '#7c4dff',
  nightblade: '#e53935',
  sorcerer: '#00acc1',
  templar: '#ffb300',
  warden: '#26a69a',
};

/** Owner color for an ultimate option (class color, or accent for shared ults). */
const ownerColor = (owner: string, fallback: string): string =>
  owner in CLASS_COLORS ? CLASS_COLORS[owner as EsoClass] : fallback;

/**
 * Decisive weapon-quality tier colors (the white/green/blue/purple/gold the
 * labels already name) — a cosmetic restatement, not new data.
 */
const QUALITY_COLORS: Record<DecisiveQuality, string> = {
  normal: '#c7c7c7',
  fine: '#4caf50',
  superior: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ffc107',
};

/** A small color dot used in dropdown options (decorative — aria-hidden). */
const Swatch: React.FC<{ color: string; square?: boolean; size?: number; glow?: boolean }> = ({
  color,
  square,
  size = 10,
  glow,
}) => (
  <Box
    aria-hidden
    component="span"
    sx={{
      width: size,
      height: size,
      borderRadius: square ? 0.5 : '50%',
      bgcolor: color,
      boxShadow: glow ? `0 0 6px ${color}66` : 'none',
      flexShrink: 0,
    }}
  />
);

/**
 * Build-archetype presets — each flips ONLY existing boolean/selection state
 * (context / role / class / source on-off) via the hook's setters. Crucially it
 * NEVER sets an uptime: a toggled-on source inherits its own research-sourced
 * catalog-default uptime, so no unsourced number is ever introduced.
 */
interface BuildPreset {
  readonly id: string;
  readonly label: string;
  readonly context: CombatContext;
  readonly role: CombatRole;
  /** Source ids to force on (others left at their catalog defaults). */
  readonly enableSources: readonly string[];
  /** Source ids to force off. */
  readonly disableSources: readonly string[];
}

const BUILD_PRESETS: readonly BuildPreset[] = [
  {
    id: 'trial-dps',
    label: 'Trial group DPS',
    context: 'groupPve',
    role: 'dps',
    enableSources: ['major-heroism'],
    disableSources: [],
  },
  {
    id: 'solo-parse',
    label: 'Solo parse',
    context: 'soloPve',
    role: 'dps',
    enableSources: [],
    disableSources: ['minor-heroism', 'major-heroism'],
  },
  {
    id: 'pvp',
    label: 'PvP',
    context: 'pvp',
    role: 'dps',
    enableSources: ['minor-heroism'],
    disableSources: [],
  },
];

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

/**
 * Shared surface style for the redesigned panels — opts into the app's
 * signature glass-gradient card look (the same gradient MuiPaper uses) instead
 * of the flat `variant="outlined"` surface, so the Ultimate tab reads as a
 * sibling of the rest of the toolkit rather than a bare MUI form.
 */
const panelSx = (theme: Theme): SxProps<Theme> => ({
  p: { xs: 2, sm: 2.5 },
  borderRadius: 3.5,
  border: `1px solid ${theme.palette.divider}`,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
      : 'linear-gradient(180deg, rgb(40 145 200 / 6%) 0%, rgba(248, 250, 252, 0.9) 100%)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 30px rgba(0, 0, 0, 0.25)'
      : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
});

/** Accent "eyebrow" label that opens each section, with an icon chip. */
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  accent: string;
  action?: React.ReactNode;
}> = ({ icon, title, accent, action }) => (
  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}>
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Box
        aria-hidden
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 2,
          color: accent,
          background: `${accent}1f`,
          border: `1px solid ${accent}33`,
          '& svg': { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 0.1, lineHeight: 1.2 }}>
        {title}
      </Typography>
    </Stack>
    {action}
  </Stack>
);

/** A big headline stat tile in the hero strip. */
const StatBlock: React.FC<{
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  highlight?: boolean;
  /** Optional plain-language explanation shown on an info-icon tooltip. */
  info?: string;
}> = ({ label, value, sub, accent, highlight, info }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: '1 1 0',
        minWidth: { xs: 132, sm: 0 },
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1.5, sm: 1.25 },
        borderRadius: 3,
        position: 'relative',
        background: highlight
          ? theme.palette.mode === 'dark'
            ? 'linear-gradient(160deg, rgba(56,189,248,0.16) 0%, rgba(0,225,255,0.06) 100%)'
            : 'linear-gradient(160deg, rgba(56,189,248,0.16) 0%, rgba(0,225,255,0.05) 100%)'
          : theme.palette.mode === 'dark'
            ? 'rgba(148,163,184,0.05)'
            : 'rgba(255,255,255,0.5)',
        border: highlight
          ? `1px solid ${(accent ?? theme.palette.primary.main) + '55'}`
          : `1px solid ${theme.palette.divider}`,
        boxShadow:
          highlight && theme.palette.mode === 'dark'
            ? '0 0 28px rgba(56,189,248,0.12) inset'
            : 'none',
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.7,
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          {label}
        </Typography>
        {info && (
          <Tooltip arrow title={info}>
            <InfoOutlined
              sx={{
                fontSize: 13,
                color: 'text.secondary',
                opacity: 0.6,
                cursor: 'help',
                '&:hover': { opacity: 1 },
              }}
            />
          </Tooltip>
        )}
      </Stack>
      <Typography
        className="u-tabular"
        sx={{
          fontFamily: 'Space Grotesk, Inter, system-ui',
          fontWeight: 700,
          fontSize: { xs: '1.9rem', sm: '2.15rem' },
          lineHeight: 1.05,
          mt: 0.25,
          color: highlight ? (accent ?? theme.palette.primary.main) : theme.palette.text.primary,
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
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
    availableReductionEntries,
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

  // Sectioned ultimate list for the grouped picker: your class first, then the
  // shared weapon/guild ults everyone can run, then the rest.
  const ultimateGroups = React.useMemo(() => {
    const yours = orderedUltimates.filter((a) => a.owner === state.esoClass);
    const shared = orderedUltimates.filter((a) => a.owner === 'global' || a.owner === 'weapon');
    const others = orderedUltimates.filter(
      (a) => a.owner !== state.esoClass && a.owner !== 'global' && a.owner !== 'weapon',
    );
    return [
      { key: 'yours', label: `${ESO_CLASS_LABELS[state.esoClass]} ultimates`, items: yours },
      { key: 'shared', label: 'Weapon & guild (any class)', items: shared },
      { key: 'others', label: 'Other classes', items: others },
    ].filter((g) => g.items.length > 0);
  }, [orderedUltimates, state.esoClass]);

  // Render the closed Select control as plain label text (the menu options carry
  // swatches/chips, but the collapsed control must stay clean — and no test
  // asserts this surface, so a blank/cluttered control would pass CI silently).
  const renderSelectedUltimate = React.useCallback((value: unknown): string => {
    if (value === 'custom') return 'Custom cost…';
    const ability = ULTIMATE_ABILITIES.find((a) => a.id === value);
    return ability ? `${ability.label} — ${ability.baseCost}` : '';
  }, []);

  // Apply a build-archetype preset: flips ONLY context/role/class and boolean
  // source toggles. It never sets an uptime — a toggled-on source keeps its
  // research-sourced catalog default, so no unsourced number is introduced.
  const applyPreset = React.useCallback(
    (preset: BuildPreset) => {
      calc.setContext(preset.context);
      calc.setRole(preset.role);
      for (const id of preset.enableSources) calc.toggleSource(id, true);
      for (const id of preset.disableSources) calc.toggleSource(id, false);
    },
    [calc],
  );

  // Best-effort "active" highlight: a preset reads as active when the current
  // context + role match it (presentation hint only — not an exact build match).
  const activePresetId = React.useMemo(
    () =>
      BUILD_PRESETS.find((p) => p.context === state.context && p.role === state.role)?.id ?? null,
    [state.context, state.role],
  );

  return (
    <Box className={`${className ?? ''} u-fade-in`} sx={{ width: '100%' }}>
      {/* ===================== INTRO ===================== */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.75 }}>
        <Box
          aria-hidden
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 2.5,
            color: accent,
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(56,189,248,0.22), rgba(0,225,255,0.08))'
                : 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(0,225,255,0.06))',
            border: `1px solid ${accent}40`,
            boxShadow: theme.palette.mode === 'dark' ? '0 0 22px rgba(56,189,248,0.18)' : 'none',
            '& svg': { fontSize: 24 },
          }}
        >
          <BoltOutlined />
        </Box>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            Ultimate Calculator
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}
          >
            Update 50 · all classes
          </Typography>
        </Box>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5, maxWidth: 760 }}>
        How fast do you build ultimate, and how often can you cast it? Pick your context and build,
        and get exact ultimate&nbsp;/&nbsp;second, time to your first ultimate, and casts per fight.
      </Typography>

      {/* ===================== HEADLINE (full width, results-first) ===================== */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2.5,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56,189,248,0.10) 0%, rgba(15,23,42,0.55) 55%, rgba(3,7,18,0.6) 100%)'
              : 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(248,250,252,0.85) 60%, rgba(255,255,255,0.95) 100%)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 10px 40px rgba(0,0,0,0.3), 0 0 60px rgba(56,189,248,0.06)'
              : '0 6px 20px rgba(15,23,42,0.07)',
          // Soft accent glow bleeding from the top-left, behind the stats.
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -80,
            left: -60,
            width: 260,
            height: 260,
            borderRadius: '50%',
            background:
              theme.palette.mode === 'dark'
                ? 'radial-gradient(circle, rgba(56,189,248,0.18), transparent 70%)'
                : 'radial-gradient(circle, rgba(56,189,248,0.16), transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.25, sm: 1.5 }}
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: 'none', sm: 'block' }, borderColor: theme.palette.divider }}
            />
          }
          sx={{ position: 'relative' }}
        >
          <StatBlock
            label="Ultimate / second"
            value={fmt(expected.ultimatePerSecond, 2)}
            sub={`${fmt(expected.totalUltimate, 0)} over ${state.fightDurationSeconds}s`}
            accent={accent}
            highlight
            info="Average ultimate generated per second across the whole fight, from every enabled source plus Decisive."
          />
          <StatBlock
            label="Time to first ult"
            value={fmtSeconds(timeToUlt.secondsToFirstCast)}
            sub={`${effectiveCost} ult cost`}
            info={`How long until you can first fire the selected ultimate (effective cost ${effectiveCost}), counting any banked ultimate at fight start.`}
          />
          <StatBlock
            label="Casts / fight"
            value={Number.isFinite(timeToUlt.castsPerFight) ? String(timeToUlt.castsPerFight) : '∞'}
            sub={`every ${fmtSeconds(timeToUlt.secondsPerCast)}`}
            info={`How many times you can fire it in a ${state.fightDurationSeconds}s fight — total generation divided by its effective cost.`}
          />
          <StatBlock
            label="Generated by 60s"
            value={fmt(expected.ultimatePerSecond * 60, 0)}
            sub={`ult (pool caps at ${maxPool})`}
            info={`Ultimate built in the first minute at this rate. The pool itself can only hold ${maxPool} at once.`}
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
        <Paper elevation={0} sx={{ ...panelSx(theme), flex: '1 1 420px', minWidth: 0 }}>
          <SectionHeader icon={<TuneOutlined />} title="Your build" accent={accent} />

          {/* Quick-start presets — flip context/role + boolean source toggles only. */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75 }}>
              <AutoFixHighOutlined sx={{ fontSize: 15, color: accent }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  fontWeight: 700,
                }}
              >
                Quick start
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              {BUILD_PRESETS.map((p) => {
                const active = activePresetId === p.id;
                return (
                  <Chip
                    key={p.id}
                    label={p.label}
                    size="small"
                    clickable
                    onClick={() => applyPreset(p)}
                    variant={active ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: 600,
                      borderColor: active ? accent : undefined,
                      color: active ? accent : undefined,
                      backgroundColor: active
                        ? theme.palette.mode === 'dark'
                          ? 'rgba(56,189,248,0.12)'
                          : 'rgba(40,145,200,0.1)'
                        : undefined,
                      '&:hover': {
                        borderColor: accent,
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(56,189,248,0.08)'
                            : 'rgba(40,145,200,0.06)',
                      },
                    }}
                  />
                );
              })}
            </Stack>
          </Box>

          {/* Context / class / role */}
          <Stack spacing={2}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
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
                  renderValue={(v) => (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Swatch color={CLASS_COLORS[v as EsoClass]} size={9} />
                      <span>{ESO_CLASS_LABELS[v as EsoClass]}</span>
                    </Stack>
                  )}
                >
                  {ESO_CLASSES.map((c) => (
                    <MenuItem key={c} value={c}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Swatch color={CLASS_COLORS[c]} glow />
                        <span>{ESO_CLASS_LABELS[c]}</span>
                      </Stack>
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
                      renderValue={(v) => (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Swatch color={QUALITY_COLORS[v as DecisiveQuality]} square size={9} />
                          <span>
                            {QUALITY_OPTIONS.find((o) => o.value === v)?.label} —{' '}
                            {(DECISIVE_PROC_CHANCE[v as DecisiveQuality] * 100).toFixed(1)}%
                          </span>
                        </Stack>
                      )}
                    >
                      {QUALITY_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Swatch color={QUALITY_COLORS[opt.value]} square />
                            <span>
                              {opt.label} — {(DECISIVE_PROC_CHANCE[opt.value] * 100).toFixed(1)}%
                            </span>
                          </Stack>
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

            <Divider textAlign="left" sx={{ '&::before': { width: '0%' }, mt: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: accent,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                Ultimate sources
              </Typography>
            </Divider>

            {/* Source toggles, grouped by category */}
            {grouped.map(([category, entries]) => (
              <Box key={category}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75 }}>
                  <Box
                    aria-hidden
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: accent,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                    }}
                  >
                    {SOURCE_CATEGORY_LABELS[category]}
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  {entries.map((s) => {
                    const enabled = calc.isEnabled(s.id, s.defaultEnabled);
                    return (
                      <Box
                        key={s.id}
                        sx={{
                          borderRadius: 2.5,
                          px: 1.25,
                          py: 0.75,
                          position: 'relative',
                          overflow: 'hidden',
                          transition:
                            'background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                          border: `1px solid ${
                            enabled
                              ? theme.palette.mode === 'dark'
                                ? 'rgba(56,189,248,0.32)'
                                : 'rgba(40,145,200,0.28)'
                              : theme.palette.divider
                          }`,
                          background: enabled
                            ? theme.palette.mode === 'dark'
                              ? 'linear-gradient(135deg, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0.02) 100%)'
                              : 'linear-gradient(135deg, rgba(40,145,200,0.07) 0%, rgba(40,145,200,0.01) 100%)'
                            : 'transparent',
                          // Accent rail on the left edge marks an active source.
                          '&::before': enabled
                            ? {
                                content: '""',
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 3,
                                background: `linear-gradient(180deg, ${accent}, ${
                                  theme.palette.mode === 'dark' ? 'rgba(0,225,255,0.7)' : accent
                                })`,
                              }
                            : undefined,
                          '&:hover': {
                            borderColor: enabled
                              ? theme.palette.mode === 'dark'
                                ? 'rgba(56,189,248,0.5)'
                                : 'rgba(40,145,200,0.45)'
                              : theme.palette.mode === 'dark'
                                ? 'rgba(148,163,184,0.4)'
                                : 'rgba(15,23,42,0.18)',
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <FormControlLabel
                            sx={{ mr: 0, flex: 1, minWidth: 0 }}
                            control={
                              <Switch
                                size="small"
                                checked={enabled}
                                onChange={(e) => calc.toggleSource(s.id, e.target.checked)}
                              />
                            }
                            label={
                              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: enabled ? 600 : 400 }}
                                >
                                  {s.label}
                                </Typography>
                                {s.confidence !== 'high' && (
                                  <Chip
                                    label={s.confidence}
                                    size="small"
                                    sx={{
                                      height: 17,
                                      fontSize: 10,
                                      textTransform: 'capitalize',
                                    }}
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
                              sx={{ flexShrink: 0, fontWeight: 600 }}
                            >
                              source
                            </Link>
                          )}
                        </Stack>
                        {enabled && (
                          <Box sx={{ pl: 5, pr: 1, pb: 0.5 }}>
                            <Stack
                              direction="row"
                              sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.4,
                                  fontSize: 10,
                                }}
                              >
                                Uptime
                              </Typography>
                              <Typography
                                className="u-tabular"
                                variant="caption"
                                sx={{ color: accent, fontWeight: 700 }}
                              >
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
                              sx={{ py: 0.5 }}
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

            <Button
              onClick={calc.reset}
              size="small"
              variant="text"
              sx={{ alignSelf: 'flex-start' }}
            >
              Reset to defaults
            </Button>
          </Stack>
        </Paper>

        {/* ============================ RESULTS ============================ */}
        <Stack spacing={2.5} sx={{ flex: '1 1 480px', minWidth: 0 }}>
          {/* Ultimate picker / cost */}
          <Paper elevation={0} sx={panelSx(theme)}>
            <SectionHeader icon={<BoltOutlined />} title="Which ultimate?" accent={accent} />
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 220, flex: 1 }}>
                <InputLabel id="ult-ability-label">Ultimate</InputLabel>
                <Select
                  labelId="ult-ability-label"
                  label="Ultimate"
                  value={state.customUltimateCost != null ? 'custom' : state.ultimateAbilityId}
                  renderValue={renderSelectedUltimate}
                  MenuProps={{ slotProps: { paper: { sx: { maxHeight: 420 } } } }}
                  onChange={(e) => {
                    // Seed custom cost with the current EFFECTIVE cost (after any
                    // reductions), since a custom cost is treated as already
                    // effective — seeding with the unreduced base would make the
                    // number jump the moment you switch to Custom.
                    if (e.target.value === 'custom') calc.setCustomUltimateCost(effectiveCost);
                    else calc.setUltimateAbility(e.target.value);
                  }}
                >
                  {/* Grouped by owner. Children are emitted as ONE flat array
                      (ListSubheader + MenuItems per group) — wrapping a group in
                      a Fragment/Box would break MUI Select's direct-child value
                      scan and blank the closed control. */}
                  {ultimateGroups.flatMap((g) => [
                    <ListSubheader
                      key={`sub-${g.key}`}
                      disableSticky
                      sx={{
                        lineHeight: 2.2,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                        background: 'transparent',
                      }}
                    >
                      {g.label}
                    </ListSubheader>,
                    ...g.items.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'center', width: '100%' }}
                        >
                          <Swatch color={ownerColor(a.owner, accent)} size={8} />
                          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                            {a.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            className="u-tabular"
                            sx={{ color: 'text.secondary', fontWeight: 600 }}
                          >
                            {a.baseCost}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    )),
                  ])}
                  <MenuItem value="custom">
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Swatch color={theme.palette.text.disabled} size={8} />
                      <span>Custom cost…</span>
                    </Stack>
                  </MenuItem>
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
            {/* Cost-reduction toggles — only meaningful for a catalog ability; a
                custom cost is taken as already-effective so reductions don't apply. */}
            {state.customUltimateCost == null && availableReductionEntries.length > 0 && (
              <Stack spacing={0.5} sx={{ mt: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontWeight: 600,
                  }}
                >
                  Cost reductions
                </Typography>
                {availableReductionEntries.map((r) => (
                  <FormControlLabel
                    key={r.id}
                    control={
                      <Switch
                        size="small"
                        checked={calc.isEnabled(r.id, r.defaultEnabled)}
                        onChange={(e) => calc.toggleSource(r.id, e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {r.label} (−{Math.round(r.fraction * 100)}%)
                      </Typography>
                    }
                  />
                ))}
              </Stack>
            )}
            {state.customUltimateCost == null && reductionFraction > 0 && (
              <Box
                sx={{
                  mt: 1.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  background:
                    theme.palette.mode === 'dark' ? 'rgba(34,197,94,0.08)' : 'rgba(5,150,105,0.06)',
                  border: `1px solid ${
                    theme.palette.mode === 'dark' ? 'rgba(34,197,94,0.25)' : 'rgba(5,150,105,0.2)'
                  }`,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Cost reduced{' '}
                  <Box component="span" sx={{ color: theme.palette.success.main, fontWeight: 700 }}>
                    {Math.round(reductionFraction * 100)}%
                  </Box>{' '}
                  <Box component="span" className="u-tabular">
                    ({baseCost} → {effectiveCost})
                  </Box>{' '}
                  by{' '}
                  {appliedReductions
                    .filter((r) => r.enabled)
                    .map((r) => r.label)
                    .join(', ')}
                  .
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Per-source breakdown */}
          <Paper elevation={0} sx={panelSx(theme)}>
            <SectionHeader
              icon={<InsightsOutlined />}
              title="Where it comes from"
              accent={accent}
              action={
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<QueryStatsOutlined sx={{ fontSize: 16 }} />}
                  onClick={calc.computeDistribution}
                  sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  {distribution ? 'Recompute spread' : 'Show spread'}
                </Button>
              }
            />
            <Box sx={{ overflowX: 'auto', mx: -0.5 }}>
              <Table
                size="small"
                aria-label="per-source ultimate breakdown"
                sx={{
                  '& td, & th': { borderColor: theme.palette.divider },
                  '& .MuiTableCell-root': { fontVariantNumeric: 'tabular-nums' },
                  '& tbody tr:nth-of-type(odd) td': {
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(148,163,184,0.03)'
                        : 'rgba(15,23,42,0.015)',
                  },
                  '& tbody tr:hover td': {
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(56,189,248,0.06)'
                        : 'rgba(40,145,200,0.05)',
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'text.secondary',
                      }}
                    >
                      Source
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'text.secondary',
                      }}
                    >
                      Base
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'text.secondary',
                      }}
                    >
                      Decisive
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'text.secondary',
                      }}
                    >
                      Total
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'text.secondary',
                      }}
                    >
                      ult/s
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expected.contributions.map((c) => {
                    const tot = c.baseUltimate + c.decisiveUltimate;
                    // Presentation-only share of the grand total, shown as a
                    // mini bar so the dominant source reads at a glance.
                    const share = expected.totalUltimate > 0 ? tot / expected.totalUltimate : 0;
                    return (
                      <TableRow key={c.sourceId}>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Typography variant="body2">{c.label}</Typography>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: 'center', mt: 0.5 }}
                          >
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, share * 100)}
                              aria-hidden
                              sx={{
                                flex: 1,
                                height: 5,
                                borderRadius: 3,
                                backgroundColor: alpha(theme.palette.divider, 0.5),
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  background: `linear-gradient(90deg, ${accent}, ${
                                    theme.palette.mode === 'dark' ? 'rgba(0,225,255,0.85)' : accent
                                  })`,
                                },
                              }}
                            />
                            <Typography
                              variant="caption"
                              className="u-tabular"
                              sx={{ minWidth: 32, textAlign: 'right', color: 'text.secondary' }}
                            >
                              {Math.round(share * 100)}%
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{fmt(c.baseUltimate, 0)}</TableCell>
                        <TableCell align="right">{fmt(c.decisiveUltimate, 1)}</TableCell>
                        <TableCell align="right">{fmt(tot, 1)}</TableCell>
                        <TableCell align="right">
                          {fmt(
                            state.fightDurationSeconds > 0 ? tot / state.fightDurationSeconds : 0,
                            2,
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow
                    sx={{
                      '& td': {
                        borderTop: `2px solid ${accent}55`,
                        background:
                          theme.palette.mode === 'dark'
                            ? 'rgba(56,189,248,0.08) !important'
                            : 'rgba(40,145,200,0.06) !important',
                      },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {fmt(expected.baseUltimate, 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {fmt(expected.decisiveUltimate, 1)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: accent }}
                      data-testid="ult-grand-total"
                    >
                      {fmt(expected.totalUltimate, 1)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: accent }}>
                      {fmt(expected.ultimatePerSecond, 2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>

            {distribution && (
              <Box
                className="u-fade-in"
                sx={{
                  mt: 2,
                  p: 1.75,
                  borderRadius: 2.5,
                  background:
                    theme.palette.mode === 'dark'
                      ? 'rgba(148,163,184,0.05)'
                      : 'rgba(15,23,42,0.02)',
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Per-fight spread (Monte Carlo, {distribution.runs.toLocaleString()} runs) —
                  Decisive is random, so a single fight varies around the mean:
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 1.25, flexWrap: 'wrap', rowGap: 1.5 }}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontSize: 10,
                        display: 'block',
                      }}
                    >
                      Mean (95% CI)
                    </Typography>
                    <Typography
                      className="u-tabular"
                      variant="body2"
                      sx={{ fontWeight: 700, color: accent }}
                    >
                      {fmt(distribution.meanTotal, 1)} ± {fmt(distribution.ci95HalfWidth, 2)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontSize: 10,
                        display: 'block',
                      }}
                    >
                      Range
                    </Typography>
                    <Typography className="u-tabular" variant="body2" sx={{ fontWeight: 600 }}>
                      {fmt(distribution.minTotal, 0)}–{fmt(distribution.maxTotal, 0)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontSize: 10,
                        display: 'block',
                      }}
                    >
                      Std dev
                    </Typography>
                    <Typography className="u-tabular" variant="body2" sx={{ fontWeight: 600 }}>
                      {fmt(distribution.stdDevTotal, 1)}
                    </Typography>
                  </Box>
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
