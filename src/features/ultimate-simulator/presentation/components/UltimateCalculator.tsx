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
  BoltOutlined,
  ExpandMore,
  InfoOutlined,
  InsightsOutlined,
  KeyboardArrowUp,
  QueryStatsOutlined,
  RestartAltOutlined,
  TuneOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  LinearProgress,
  Link,
  ListSubheader,
  MenuItem,
  Paper,
  Portal,
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
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';

import { totalReductionFraction } from '../../core/cost';
import { DECISIVE_PROC_CHANCE, type DecisiveQuality } from '../../shared/constants';
import { ULTIMATE_ABILITIES } from '../../shared/constants/catalog';
import {
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
 * Short, single-line labels for the context segmented control. The full
 * descriptive strings (COMBAT_CONTEXT_LABELS) wrapped to two uneven lines in a
 * three-up control; here the primary word stays on one line with a small hint
 * underneath. Cosmetic only — the underlying CombatContext values are unchanged.
 */
const CONTEXT_META: Record<CombatContext, { label: string; hint: string }> = {
  soloPve: { label: 'Solo', hint: 'Parse · PvE' },
  groupPve: { label: 'Group', hint: 'Trial · PvE' },
  pvp: { label: 'PvP', hint: 'Cyrodiil · BG' },
};

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
      // Thin neutral ring so light dots (normal/white, legendary/gold) stay
      // visible against a light surface; harmless on dark.
      border: '1px solid rgba(120,130,150,0.45)',
      boxShadow: glow ? `0 0 6px ${color}66` : 'none',
      flexShrink: 0,
    }}
  />
);

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
 * Shared surface style for the redesigned panels. Dark mode leans into a
 * layered, cyan-tinted depth system: panels are a recessed mid-layer (deeper
 * gradient, faint cyan border, a glossy top inset highlight, and a soft drop
 * shadow) so the raised cards inside them read as sitting above the surface.
 */
const panelSx = (theme: Theme): SxProps<Theme> => ({
  p: { xs: 2, sm: 2.5 },
  borderRadius: 2.8, // 28px — top-level panel tier (rounded; scale: panel 28 / card 14 / control 10)
  border: `1px solid ${
    theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.12)' : theme.palette.divider
  }`,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(14,22,42,0.74) 0%, rgba(3,9,20,0.82) 100%)'
      : 'linear-gradient(180deg, rgb(40 145 200 / 6%) 0%, rgba(248, 250, 252, 0.9) 100%)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 14px 36px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.05)'
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

/**
 * A supporting headline stat tile in the hero strip. The dominant
 * "Ultimate / second" metric is rendered separately (see PrimaryStat); these
 * are the compact secondary stats that sit beside it.
 */
const StatBlock: React.FC<{
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  /** Optional plain-language explanation shown on an info-icon tooltip. */
  info?: string;
}> = ({ label, value, sub, accent, info }) => {
  const theme = useTheme();
  const tileAccent = accent ?? theme.palette.primary.main;
  return (
    <Box
      sx={{
        minWidth: 0,
        px: { xs: 1.25, sm: 1.75 },
        py: { xs: 1.25, sm: 1.5 },
        borderRadius: 1.4, // 14px — card tier (nested inside 20px panels)
        position: 'relative',
        height: '100%',
        // Raised card: a cyan-tinted gradient that lifts off the recessed panel,
        // with a glossy top inset highlight and a soft drop shadow for depth.
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(56,189,248,0.09) 0%, rgba(56,189,248,0.02) 100%)'
            : 'rgba(255,255,255,0.6)',
        border: `1px solid ${
          theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.16)' : theme.palette.divider
        }`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 6px 16px rgba(0,0,0,0.34)'
            : '0 2px 8px rgba(15,23,42,0.05)',
        // Motion-safe hover: border + shadow only (no transform), so the tiles
        // feel responsive without violating prefers-reduced-motion.
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          borderColor: `${tileAccent}66`,
          boxShadow:
            theme.palette.mode === 'dark'
              ? `inset 0 1px 0 rgba(255,255,255,0.09), 0 8px 24px rgba(0,0,0,0.4), 0 0 18px ${tileAccent}1f`
              : '0 6px 18px rgba(15,23,42,0.08)',
        },
      }}
    >
      {/* Reserve two lines so the values below sit on the same baseline across
          all three cards, regardless of whether a label wraps. */}
      <Stack
        direction="row"
        spacing={0.4}
        sx={{ alignItems: 'flex-start', minHeight: { xs: 25, sm: 27 } }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontWeight: 700,
            fontSize: { xs: 9.5, sm: 10 },
            lineHeight: 1.3,
          }}
        >
          {label}
        </Typography>
        {info && (
          <Tooltip arrow title={info}>
            <InfoOutlined
              role="img"
              aria-label={`${label}: ${info}`}
              tabIndex={0}
              sx={{
                fontSize: 12,
                color: 'text.secondary',
                opacity: 0.6,
                cursor: 'help',
                borderRadius: '50%',
                flexShrink: 0,
                '&:hover': { opacity: 1 },
                '&:focus-visible': {
                  opacity: 1,
                  outline: `2px solid ${tileAccent}`,
                  outlineOffset: 2,
                },
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
          fontSize: { xs: '1.45rem', sm: '1.7rem' },
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
          mt: 0.75,
          color: theme.palette.text.primary,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
            mt: 0.25,
            fontSize: { xs: 10.5, sm: 11.5 },
            lineHeight: 1.3,
          }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  );
};

/**
 * Build the feature-scoped MUI theme that gives every Slider / Select /
 * TextField inside this tab (and its `LogCalibrationPanel` child) the
 * "all-cyan with depth" treatment, without touching the global theme. Built
 * from the parent theme via `createTheme(base, …)` so mode + palette carry
 * over; all cyan tokens are derived from the current mode here.
 *
 * Constraints honoured:
 *  - Color/shadow transitions only (no transform motion) — safe under
 *    prefers-reduced-motion.
 *  - Legible in BOTH dark and light mode (translucent fills + 1px borders that
 *    brighten to cyan on hover and show a cyan focus glow ring on focus).
 */
const buildCalcTheme = (base: Theme): Theme => {
  const dark = base.palette.mode === 'dark';
  // Cyan tokens per the design direction.
  const cyan = dark ? 'rgb(56,189,248)' : 'rgb(40,145,200)';
  const cyanBright = 'rgb(0,225,255)';
  const focusRing = '0 0 0 3px rgba(56,189,248,0.25)';
  // Slider filled-track gradient (dark leans into the bright cyan for glow).
  const trackGradient = dark
    ? `linear-gradient(90deg, ${cyan}, ${cyanBright})`
    : `linear-gradient(90deg, ${cyan}, rgb(56,189,248))`;
  // Translucent glass fill for inputs.
  // Inputs read as recessed wells (darker than the panel + an inset shadow) so
  // they're clearly distinct rather than blending into the surface.
  const inputFill = dark ? 'rgba(3,8,20,0.66)' : 'rgba(255,255,255,0.92)';
  const inputFillHover = dark ? 'rgba(3,8,20,0.82)' : 'rgba(255,255,255,1)';
  const inputBorder = dark ? 'rgba(56,189,248,0.32)' : 'rgba(40,145,200,0.34)';
  const inputBorderHover = dark ? 'rgba(56,189,248,0.6)' : 'rgba(40,145,200,0.65)';
  const inputInset = dark
    ? 'inset 0 2px 5px rgba(0,0,0,0.5)'
    : 'inset 0 1px 2px rgba(15,23,42,0.08)';
  const railColor = dark ? 'rgba(148,163,184,0.28)' : 'rgba(15,23,42,0.16)';

  return createTheme(base, {
    components: {
      MuiSlider: {
        styleOverrides: {
          root: {
            // Comfortable touch target without growing the visible rail.
            paddingTop: 10,
            paddingBottom: 10,
            color: cyan,
          },
          rail: {
            height: 6,
            borderRadius: 3,
            opacity: 1,
            backgroundColor: railColor,
            // Recessed groove so the filled track reads as raised + glowing.
            boxShadow: dark
              ? 'inset 0 1px 2px rgba(0,0,0,0.55)'
              : 'inset 0 1px 2px rgba(15,23,42,0.12)',
          },
          track: {
            height: 6,
            borderRadius: 3,
            border: 'none',
            backgroundImage: trackGradient,
            // Glowing, slightly glossy fill.
            boxShadow: dark
              ? '0 0 10px rgba(0,225,255,0.45), inset 0 1px 0 rgba(255,255,255,0.3)'
              : '0 1px 3px rgba(40,145,200,0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
          },
          thumb: {
            width: 18,
            height: 18,
            // Glossy domed thumb (radial highlight) instead of a flat dot.
            backgroundImage: dark
              ? 'radial-gradient(circle at 35% 30%, #ffffff 0%, #d6f6ff 45%, #8fe6ff 100%)'
              : 'radial-gradient(circle at 35% 30%, #ffffff 0%, #eaf9ff 60%, #d6f1ff 100%)',
            border: `2px solid ${cyan}`,
            boxShadow: dark
              ? '0 2px 6px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,225,255,0.35), 0 0 12px rgba(0,225,255,0.4)'
              : '0 2px 5px rgba(15,23,42,0.28), 0 0 0 1px rgba(40,145,200,0.25)',
            // Shadow-only transitions (reduced-motion safe — no scale/move).
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: dark
                ? '0 2px 8px rgba(0,0,0,0.6), 0 0 0 6px rgba(56,189,248,0.18), 0 0 16px rgba(0,225,255,0.55)'
                : '0 2px 8px rgba(15,23,42,0.3), 0 0 0 6px rgba(56,189,248,0.16)',
            },
            '&.Mui-active': {
              boxShadow: dark
                ? '0 2px 10px rgba(0,0,0,0.6), 0 0 0 9px rgba(56,189,248,0.22), 0 0 22px rgba(0,225,255,0.6)'
                : '0 2px 10px rgba(15,23,42,0.32), 0 0 0 9px rgba(56,189,248,0.2)',
            },
          },
          valueLabel: {
            // Cyan-glass bubble shown while dragging.
            backgroundColor: dark ? 'rgba(8,22,40,0.96)' : 'rgba(15,23,42,0.94)',
            border: `1px solid ${cyan}`,
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 11,
            lineHeight: 1.4,
            padding: '1px 7px',
            boxShadow: dark ? '0 0 14px rgba(0,225,255,0.45)' : '0 2px 8px rgba(15,23,42,0.25)',
            '&::before': { color: dark ? 'rgba(8,22,40,0.96)' : 'rgba(15,23,42,0.94)' },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: inputFill,
            boxShadow: inputInset,
            transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: inputBorder,
              transition: 'border-color 0.2s ease',
            },
            '&:hover': {
              backgroundColor: inputFillHover,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: inputBorderHover,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: cyan,
              borderWidth: 1,
            },
            '&.Mui-focused': {
              boxShadow: `${inputInset}, ${focusRing}`,
            },
          },
        },
      },
      // The open dropdown popover + its items — was stock MUI; now a pronounced
      // cyan-glass panel: tinted gradient surface, a glowing cyan edge, a thin
      // accent line across the top, and items that light up with a cyan fill +
      // a left accent rail on hover/selection so it reads clearly "premium".
      MuiMenu: {
        styleOverrides: {
          paper: {
            position: 'relative',
            borderRadius: 14,
            marginTop: 6,
            // Clip the rounded corners horizontally, but allow vertical scroll —
            // `overflow: hidden` here previously broke scrolling in tall menus
            // (e.g. the Ultimate picker). border-radius still clips with auto.
            overflowX: 'hidden',
            overflowY: 'auto',
            backdropFilter: 'blur(20px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
            boxShadow: dark
              ? '0 24px 60px rgba(0,0,0,0.65), 0 0 36px rgba(56,189,248,0.3), inset 0 1px 0 rgba(255,255,255,0.12)'
              : '0 20px 48px rgba(15,23,42,0.22), 0 0 24px rgba(40,145,200,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
            // The global theme forces `.MuiMenu-paper { background:#0f172a
            // !important }`, which a normal scoped override can't beat — so the
            // dropdown kept rendering the same dark navy and blending in. Win it
            // locally with higher specificity (&&) + !important: a distinctly
            // lighter, solid slate surface, scoped to this tab's menus only.
            '&&': {
              backgroundColor: `${dark ? 'rgb(45,64,99)' : 'rgb(250,253,255)'} !important`,
              backgroundImage: 'none !important',
              border: `1px solid ${
                dark ? 'rgba(56,189,248,0.6)' : 'rgba(40,145,200,0.4)'
              } !important`,
            },
            // A thin cyan sheen across the very top edge of the popover.
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: dark
                ? 'linear-gradient(90deg, transparent, rgba(0,225,255,0.7), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(40,145,200,0.6), transparent)',
              pointerEvents: 'none',
              zIndex: 1,
            },
          },
          list: { paddingTop: 7, paddingBottom: 7 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            marginLeft: 7,
            marginRight: 7,
            paddingTop: 9,
            paddingBottom: 9,
            transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
            '&:hover': {
              background: dark
                ? 'linear-gradient(90deg, rgba(56,189,248,0.20), rgba(56,189,248,0.06))'
                : 'linear-gradient(90deg, rgba(40,145,200,0.16), rgba(40,145,200,0.04))',
              boxShadow: `inset 3px 0 0 ${cyan}`,
            },
            '&.Mui-focusVisible': {
              background: dark
                ? 'linear-gradient(90deg, rgba(56,189,248,0.24), rgba(56,189,248,0.08))'
                : 'linear-gradient(90deg, rgba(40,145,200,0.18), rgba(40,145,200,0.05))',
              boxShadow: `inset 3px 0 0 ${cyan}`,
            },
            '&.Mui-selected': {
              color: dark ? 'rgb(186,236,255)' : 'rgb(20,110,160)',
              fontWeight: 600,
              background: dark
                ? 'linear-gradient(90deg, rgba(56,189,248,0.32), rgba(0,225,255,0.10))'
                : 'linear-gradient(90deg, rgba(40,145,200,0.22), rgba(40,145,200,0.06))',
              boxShadow: `inset 3px 0 0 ${cyan}, ${dark ? '0 0 16px rgba(56,189,248,0.18)' : 'none'}`,
              '&:hover': {
                background: dark
                  ? 'linear-gradient(90deg, rgba(56,189,248,0.4), rgba(0,225,255,0.14))'
                  : 'linear-gradient(90deg, rgba(40,145,200,0.28), rgba(40,145,200,0.1))',
              },
              '&.Mui-focusVisible': {
                background: dark
                  ? 'linear-gradient(90deg, rgba(56,189,248,0.36), rgba(0,225,255,0.12))'
                  : 'linear-gradient(90deg, rgba(40,145,200,0.26), rgba(40,145,200,0.08))',
              },
            },
          },
        },
      },
      // Control tier: buttons share the inputs' 10px radius (global default is
      // 8px, which read as inconsistent next to the 10px fields).
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
    },
  });
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

  // Feature-scoped theme: cyan-glass Sliders / Selects / inputs for this tab and
  // its LogCalibrationPanel child, derived from the parent theme (mode carries
  // over). Memoized on the base theme so it only rebuilds on theme/mode change.
  const calcTheme = React.useMemo(() => buildCalcTheme(theme), [theme]);

  const accent = theme.palette.mode === 'dark' ? 'rgb(56, 189, 248)' : 'rgb(40, 145, 200)';
  // `accent` is tuned for borders/glows and LARGE text (the hero number passes
  // WCAG large-text 3:1). For SMALL accent-colored text it fails AA in light mode
  // (rgb(40,145,200) ≈ 3.4:1), so use this darker token there (rgb(20,110,160) ≈
  // 5.3:1 on the panels). Dark mode already passes, so it keeps the bright accent.
  const accentText = theme.palette.mode === 'dark' ? 'rgb(56, 189, 248)' : 'rgb(20, 110, 160)';

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

  const prefersReducedMotion = React.useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // --- Mobile sticky results bar -------------------------------------------
  // On phones the hero scrolls far out of view while editing the build below,
  // so the headline number is invisible right when you're tweaking it. An
  // IntersectionObserver on the hero toggles a slim fixed bar that keeps ult/s
  // (and time-to-ult) live in view; tapping it jumps back to the results.
  const heroRef = React.useRef<HTMLDivElement>(null);
  const [showStickyResults, setShowStickyResults] = React.useState(false);
  React.useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entry]) => setShowStickyResults(!entry.isIntersecting), {
      threshold: 0,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const jumpToResults = React.useCallback(() => {
    heroRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [prefersReducedMotion]);

  // --- Collapsible source groups -------------------------------------------
  // Each category defaults open when it has an enabled source and folded away
  // when it's all-off, so the build form isn't one giant scroll; an explicit
  // user toggle overrides the default.
  const [groupOpen, setGroupOpen] = React.useState<Record<string, boolean>>({});
  const toggleGroup = React.useCallback(
    (key: string, currentlyOpen: boolean) => setGroupOpen((m) => ({ ...m, [key]: !currentlyOpen })),
    [],
  );

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

  return (
    <ThemeProvider theme={calcTheme}>
      <Box className={`${className ?? ''} u-fade-in`} sx={{ width: '100%' }}>
        {/* ===================== INTRO ===================== */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.75 }}>
          <Box
            aria-hidden
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
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
          <Box sx={{ minWidth: 0 }}>
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
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5, maxWidth: 640 }}>
          Set your context and build for exact ultimate&nbsp;/&nbsp;second, time to your first cast,
          and casts per fight.
        </Typography>

        {/* ===================== HEADLINE (full width, results-first) ===================== */}
        <Paper
          ref={heroRef}
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.75 },
            mb: 2.5,
            borderRadius: 2.8, // 28px — panel tier (unified with result panels)
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${
              theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.18)' : theme.palette.divider
            }`,
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(56,189,248,0.16) 0%, rgba(13,22,42,0.6) 50%, rgba(3,8,18,0.72) 100%)'
                : 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(248,250,252,0.85) 60%, rgba(255,255,255,0.95) 100%)',
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 18px 50px rgba(0,0,0,0.46), 0 0 80px rgba(56,189,248,0.10), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 6px 20px rgba(15,23,42,0.07)',
            // Two soft cyan glows (top-left + bottom-right) bleeding behind the
            // stats to give the panel atmospheric depth.
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -90,
              left: -70,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background:
                theme.palette.mode === 'dark'
                  ? 'radial-gradient(circle, rgba(0,225,255,0.22), transparent 70%)'
                  : 'radial-gradient(circle, rgba(56,189,248,0.16), transparent 70%)',
              pointerEvents: 'none',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -120,
              right: -80,
              width: 320,
              height: 320,
              borderRadius: '50%',
              background:
                theme.palette.mode === 'dark'
                  ? 'radial-gradient(circle, rgba(56,189,248,0.12), transparent 70%)'
                  : 'radial-gradient(circle, rgba(56,189,248,0.08), transparent 70%)',
              pointerEvents: 'none',
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 2, md: 3 },
              alignItems: { md: 'stretch' },
            }}
          >
            {/* PRIMARY — the dominant result, with a gauge vs the sustained ceiling. */}
            <Box
              sx={{
                flex: { md: '0 0 40%' },
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                px: { xs: 0.5, sm: 1 },
              }}
            >
              <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  Ultimate / second
                </Typography>
                <Tooltip
                  arrow
                  title="Average ultimate generated per second across the whole fight, from every enabled source plus Decisive."
                >
                  <InfoOutlined
                    role="img"
                    aria-label="Ultimate / second: average ultimate generated per second across the whole fight, from every enabled source plus Decisive."
                    tabIndex={0}
                    sx={{
                      fontSize: 14,
                      color: 'text.secondary',
                      opacity: 0.6,
                      cursor: 'help',
                      borderRadius: '50%',
                      '&:hover': { opacity: 1 },
                      '&:focus-visible': {
                        opacity: 1,
                        outline: `2px solid ${accent}`,
                        outlineOffset: 2,
                      },
                    }}
                  />
                </Tooltip>
              </Stack>
              <Stack direction="row" spacing={0.6} sx={{ alignItems: 'baseline', mt: 0.5 }}>
                <Typography
                  className="u-tabular"
                  sx={{
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    fontWeight: 700,
                    fontSize: { xs: '2.6rem', sm: '3.1rem' },
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: accent,
                  }}
                >
                  {fmt(expected.ultimatePerSecond, 2)}
                </Typography>
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  }}
                >
                  ult/s
                </Typography>
              </Stack>
              {/* Gauge: this rate against the practical sustained ceiling. */}
              <Box sx={{ mt: 1.25 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (expected.ultimatePerSecond / sanityMax) * 100)}
                  aria-hidden
                  sx={{
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: alpha(theme.palette.divider, 0.6),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: `linear-gradient(90deg, ${accent}, ${
                        theme.palette.mode === 'dark' ? 'rgba(0,225,255,0.9)' : accent
                      })`,
                    },
                  }}
                />
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 0.6 }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    <Box
                      component="span"
                      className="u-tabular"
                      sx={{ fontWeight: 700, color: accentText }}
                    >
                      {fmt(expected.totalUltimate, 0)}
                    </Box>{' '}
                    ult over {state.fightDurationSeconds}s
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.8 }}>
                    ceiling ~{sanityMax}/s
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {/* SECONDARY — supporting stats, 3-up across every breakpoint. */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'grid',
                gap: { xs: 1, sm: 1.25 },
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              }}
            >
              <StatBlock
                label="Time to first ult"
                value={fmtSeconds(timeToUlt.secondsToFirstCast)}
                sub={`${effectiveCost} ult cost`}
                accent={accent}
                info={`How long until you can first fire the selected ultimate (effective cost ${effectiveCost}), counting any banked ultimate at fight start.`}
              />
              <StatBlock
                label="Casts / fight"
                value={
                  Number.isFinite(timeToUlt.castsPerFight) ? String(timeToUlt.castsPerFight) : '∞'
                }
                sub={`every ${fmtSeconds(timeToUlt.secondsPerCast)}`}
                accent={accent}
                info={`How many times you can fire it in a ${state.fightDurationSeconds}s fight — total generation divided by its effective cost.`}
              />
              <StatBlock
                label="By 60s"
                value={fmt(expected.ultimatePerSecond * 60, 0)}
                sub={`ult · cap ${maxPool}`}
                accent={accent}
                info={`Ultimate built in the first minute at this rate. The pool itself can only hold ${maxPool} at once.`}
              />
            </Box>
          </Box>
          {exceedsSanity && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {fmt(expected.ultimatePerSecond, 2)} ult/s is above the practical sustained ceiling (~
              {sanityMax}/s, roughly the best a Warden achieves). Double-check the enabled sources
              and uptimes — this may be optimistic.
            </Alert>
          )}
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2.5 }}>
          {/* ============================ INPUTS ============================ */}
          <Paper elevation={0} sx={{ ...panelSx(theme), flex: '1 1 420px', minWidth: 0 }}>
            <SectionHeader icon={<TuneOutlined />} title="Your build" accent={accent} />

            {/* Context / class / role */}
            <Stack spacing={2}>
              <Box>
                <Typography
                  id="ult-context-label"
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
                  value={state.context}
                  onChange={(_, v) => v && calc.setContext(v as CombatContext)}
                  aria-labelledby="ult-context-label"
                  sx={{
                    mt: 0.75,
                    gap: 0.5,
                    p: 0.5,
                    borderRadius: 1.4, // 14px — card tier
                    border: `1px solid ${theme.palette.divider}`,
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(148,163,184,0.05)'
                        : 'rgba(255,255,255,0.55)',
                    // Segmented-control styling that mirrors the top Stats/Ultimate
                    // switcher: filled accent pill behind the active option.
                    '& .MuiToggleButtonGroup-grouped': {
                      border: 0,
                      borderRadius: '10px !important', // control tier (was 8, matches fields now)
                      flexDirection: 'column',
                      gap: 0,
                      py: 0.85,
                      minHeight: 48,
                      color: 'text.secondary',
                      transition:
                        'background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
                      '&:hover': {
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(56,189,248,0.06)'
                            : 'rgba(15,23,42,0.04)',
                      },
                      '&.Mui-selected': {
                        color: accentText,
                        background:
                          theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(0,225,255,0.06))'
                            : 'linear-gradient(135deg, rgba(56,189,248,0.16), rgba(0,225,255,0.05))',
                        boxShadow:
                          theme.palette.mode === 'dark'
                            ? 'inset 0 0 0 1px rgba(56,189,248,0.4), 0 0 16px rgba(56,189,248,0.12)'
                            : 'inset 0 0 0 1px rgba(40,145,200,0.4)',
                        '&:hover': {
                          background:
                            theme.palette.mode === 'dark'
                              ? 'linear-gradient(135deg, rgba(56,189,248,0.22), rgba(0,225,255,0.08))'
                              : 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(0,225,255,0.07))',
                        },
                      },
                    },
                  }}
                >
                  {CONTEXT_OPTIONS.map((c) => (
                    <ToggleButton key={c} value={c} sx={{ textTransform: 'none' }}>
                      <Typography
                        component="span"
                        sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.15 }}
                      >
                        {CONTEXT_META[c].label}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{ fontSize: 10, opacity: 0.85, lineHeight: 1.2, mt: 0.25 }}
                      >
                        {CONTEXT_META[c].hint}
                      </Typography>
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
                label="Fight duration"
                type="number"
                size="small"
                value={state.fightDurationSeconds}
                onChange={(e) => calc.setFightDuration(Number(e.target.value))}
                slotProps={{
                  htmlInput: { min: 1, step: 5 },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          sec
                        </Typography>
                      </InputAdornment>
                    ),
                  },
                }}
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
                  <Stack
                    spacing={1.5}
                    sx={{
                      mt: 1,
                      p: 1.5,
                      borderRadius: 1.4, // 14px — card tier
                      // Full border (was a left rail that read like a slider).
                      border: `1px solid ${
                        theme.palette.mode === 'dark'
                          ? 'rgba(56,189,248,0.28)'
                          : 'rgba(40,145,200,0.3)'
                      }`,
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 14px rgba(0,0,0,0.3)'
                          : '0 2px 8px rgba(15,23,42,0.05)',
                      background:
                        theme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(56,189,248,0.02))'
                          : 'rgba(40,145,200,0.04)',
                    }}
                  >
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
                    color: accentText,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  Ultimate sources
                </Typography>
              </Divider>

              {/* Source toggles, grouped by category */}
              {grouped.map(([category, entries]) => {
                const onCount = entries.reduce(
                  (n, s) => n + (calc.isEnabled(s.id, s.defaultEnabled) ? 1 : 0),
                  0,
                );
                // Default: open when something's enabled, folded when all-off;
                // an explicit user toggle (groupOpen) wins.
                const open = category in groupOpen ? groupOpen[category] : onCount > 0;
                return (
                  <Box key={category}>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onClick={() => toggleGroup(category, open)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleGroup(category, open);
                        }
                      }}
                      sx={{
                        alignItems: 'center',
                        mb: 0.75,
                        py: 0.25,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover .cat-label': { color: 'text.primary' },
                        '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 2 },
                      }}
                    >
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
                        className="cat-label"
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: 0.6,
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {SOURCE_CATEGORY_LABELS[category]}
                      </Typography>
                      {onCount > 0 && (
                        <Box
                          component="span"
                          aria-hidden
                          sx={{
                            ml: 0.25,
                            px: 0.6,
                            borderRadius: 1,
                            fontSize: 9.5,
                            fontWeight: 700,
                            lineHeight: 1.7,
                            color: accentText,
                            border: `1px solid ${accent}55`,
                            background:
                              theme.palette.mode === 'dark'
                                ? 'rgba(56,189,248,0.10)'
                                : 'rgba(40,145,200,0.08)',
                          }}
                        >
                          {onCount} on
                        </Box>
                      )}
                      <Box sx={{ flex: 1 }} />
                      <ExpandMore
                        aria-hidden
                        sx={{
                          fontSize: 18,
                          color: 'text.secondary',
                          transition: prefersReducedMotion ? 'none' : 'transform 0.2s ease',
                          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                        }}
                      />
                    </Stack>
                    <Collapse in={open} timeout={prefersReducedMotion ? 0 : 'auto'}>
                      <Stack spacing={1}>
                        {entries.map((s) => {
                          const enabled = calc.isEnabled(s.id, s.defaultEnabled);
                          return (
                            <Box
                              key={s.id}
                              sx={{
                                borderRadius: 1.4, // 14px — card tier
                                px: 1.5,
                                py: enabled ? 1.25 : 0.5,
                                pl: 1.75,
                                position: 'relative',
                                overflow: 'hidden',
                                transition:
                                  'background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                                // Enabled = a full cyan border + tint + glow (no
                                // left rail — it read like a vertical slider next
                                // to the real uptime slider). Disabled cards sit
                                // recessed/flush so active ones clearly stand out.
                                border: `1px solid ${
                                  enabled
                                    ? theme.palette.mode === 'dark'
                                      ? 'rgba(56,189,248,0.5)'
                                      : 'rgba(40,145,200,0.45)'
                                    : theme.palette.divider
                                }`,
                                background: enabled
                                  ? theme.palette.mode === 'dark'
                                    ? 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0.04) 100%)'
                                    : 'linear-gradient(135deg, rgba(40,145,200,0.08) 0%, rgba(40,145,200,0.02) 100%)'
                                  : theme.palette.mode === 'dark'
                                    ? 'rgba(2,6,16,0.35)'
                                    : 'rgba(15,23,42,0.015)',
                                boxShadow: enabled
                                  ? theme.palette.mode === 'dark'
                                    ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 6px 18px rgba(0,0,0,0.35), 0 0 18px rgba(56,189,248,0.12)'
                                    : '0 4px 12px rgba(15,23,42,0.07)'
                                  : theme.palette.mode === 'dark'
                                    ? 'inset 0 1px 2px rgba(0,0,0,0.3)'
                                    : 'none',
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
                                spacing={1}
                                sx={{
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  minHeight: 44,
                                }}
                              >
                                <FormControlLabel
                                  sx={{ mr: 0, flex: 1, minWidth: 0, gap: 0.75 }}
                                  control={
                                    <Switch
                                      checked={enabled}
                                      onChange={(e) => calc.toggleSource(s.id, e.target.checked)}
                                    />
                                  }
                                  label={
                                    <Stack
                                      direction="row"
                                      spacing={0.75}
                                      sx={{ alignItems: 'center' }}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: enabled ? 600 : 500, lineHeight: 1.3 }}
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
                                <Box
                                  sx={{
                                    mt: 0.75,
                                    pt: 1,
                                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                                  }}
                                >
                                  <Stack
                                    direction="row"
                                    sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: 'text.secondary',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        fontSize: 10,
                                        fontWeight: 700,
                                      }}
                                    >
                                      Uptime
                                    </Typography>
                                    <Typography
                                      className="u-tabular"
                                      variant="body2"
                                      sx={{ color: accentText, fontWeight: 700 }}
                                    >
                                      {Math.round((state.uptimeOverrides[s.id] ?? s.uptime) * 100)}%
                                    </Typography>
                                  </Stack>
                                  {/* Horizontal padding keeps the 18px thumb from
                                      colliding with the card edge at 0%/100%. */}
                                  <Box sx={{ px: '12px' }}>
                                    <Slider
                                      size="small"
                                      value={Math.round(
                                        (state.uptimeOverrides[s.id] ?? s.uptime) * 100,
                                      )}
                                      onChange={(_, v) => calc.setUptime(s.id, (v as number) / 100)}
                                      min={0}
                                      max={100}
                                      valueLabelDisplay="auto"
                                      valueLabelFormat={(v) => `${v}%`}
                                      aria-label={`${s.label} uptime`}
                                      sx={{ py: 0.5, display: 'block' }}
                                    />
                                  </Box>
                                  {s.description && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: 'text.secondary',
                                        display: 'block',
                                        mt: -0.25,
                                        lineHeight: 1.45,
                                      }}
                                    >
                                      {s.description}
                                    </Typography>
                                  )}
                                  {/* Pillager's per-cast amount scales with the cost of the
                                ULTIMATE OF WHOEVER WEARS THE SET (usually your healer) —
                                a different player's ult, NOT your own. You receive 10% of
                                their ult's cost. Deliberately decoupled from the main
                                "Which ultimate?" cost above to avoid implying it tracks
                                your own ultimate. */}
                                  {s.id === 'pillagers-profit-external' && (
                                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{ alignItems: 'center' }}
                                      >
                                        <TextField
                                          label="Wearer's ult cost"
                                          type="number"
                                          size="small"
                                          value={state.pillagerHealerUltCost}
                                          onChange={(e) =>
                                            calc.setPillagerHealerUltCost(Number(e.target.value))
                                          }
                                          slotProps={{ htmlInput: { min: 70, max: 500, step: 5 } }}
                                          sx={{ width: 160 }}
                                        />
                                        <Tooltip
                                          arrow
                                          title="The cost of the ULTIMATE CAST BY THE PILLAGER'S WEARER — usually your healer, not you. You receive 10% of their ult's cost (once per 45s). This is separate from the 'Which ultimate?' cost above, which is your own ult."
                                        >
                                          <InfoOutlined
                                            role="img"
                                            aria-label="About the wearer's ult cost: the cost of the ultimate cast by the Pillager's wearer (usually your healer), not your own. You receive 10% of it, once per 45 seconds."
                                            tabIndex={0}
                                            sx={{
                                              fontSize: 16,
                                              color: 'text.secondary',
                                              cursor: 'help',
                                              borderRadius: '50%',
                                              '&:focus-visible': {
                                                outline: `2px solid ${accent}`,
                                                outlineOffset: 2,
                                              },
                                            }}
                                          />
                                        </Tooltip>
                                        <Typography
                                          variant="caption"
                                          className="u-tabular"
                                          sx={{ color: 'text.secondary' }}
                                        >
                                          → {Math.round(state.pillagerHealerUltCost * 0.1)} ult /
                                          cast
                                        </Typography>
                                      </Stack>
                                      <Typography
                                        variant="caption"
                                        sx={{ color: 'text.secondary', display: 'block' }}
                                      >
                                        Whoever wears Pillager&apos;s (usually your healer) — not
                                        your own ultimate.
                                      </Typography>
                                    </Stack>
                                  )}
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Collapse>
                  </Box>
                );
              })}

              <Button
                onClick={calc.reset}
                size="small"
                variant="text"
                startIcon={<RestartAltOutlined sx={{ fontSize: 16 }} />}
                sx={{ alignSelf: 'flex-start', color: 'text.secondary', mt: 0.5 }}
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
                <FormControl size="small" sx={{ flex: '1 1 100%' }}>
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
                        <MenuItem
                          key={a.id}
                          value={a.id}
                          // Fold the approximate-cost note into the item's accessible
                          // name rather than a hover Tooltip — focus inside a Select
                          // menu doesn't reliably surface tooltips for keyboard/SR users.
                          aria-label={
                            a.confidence !== 'high'
                              ? `${a.label}, ${a.baseCost} ultimate (cost approximate — not fully confirmed for Update 50)`
                              : `${a.label}, ${a.baseCost} ultimate`
                          }
                        >
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
                              aria-hidden
                              variant="caption"
                              className="u-tabular"
                              sx={{ color: 'text.secondary', fontWeight: 600 }}
                            >
                              {a.baseCost}
                              {a.confidence !== 'high' ? (
                                <Box component="span" sx={{ color: accentText, ml: 0.25 }}>
                                  *
                                </Box>
                              ) : null}
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
                  slotProps={{
                    htmlInput: { min: 0, max: 500, step: 5 },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            ult
                          </Typography>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ width: 190 }}
                  helperText="Banked at start"
                />
              </Stack>
              {state.customUltimateCost == null && (
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mt: 1 }}
                >
                  <Box component="span" sx={{ color: accentText, fontWeight: 700 }}>
                    *
                  </Box>{' '}
                  marks a cost not fully confirmed for Update 50 — treat it as approximate.
                </Typography>
              )}
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
                    borderRadius: 1.4, // 14px — card tier (cost-reduction note)
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(34,197,94,0.08)'
                        : 'rgba(5,150,105,0.06)',
                    border: `1px solid ${
                      theme.palette.mode === 'dark' ? 'rgba(34,197,94,0.25)' : 'rgba(5,150,105,0.2)'
                    }`,
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Cost reduced{' '}
                    <Box
                      component="span"
                      sx={{ color: theme.palette.success.main, fontWeight: 700 }}
                    >
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
              <Box
                sx={{
                  overflowX: 'auto',
                  // Rounded glass container that clips the table's square corners.
                  borderRadius: '12px',
                  overflowY: 'hidden',
                  border: `1px solid ${
                    theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.14)' : theme.palette.divider
                  }`,
                }}
              >
                <Table
                  size="small"
                  aria-label="per-source ultimate breakdown"
                  sx={{
                    '& td, & th': { borderColor: theme.palette.divider },
                    // Drop the bottom border on the final row so it doesn't draw a
                    // line against the rounded container's clipped bottom edge.
                    '& tbody tr:last-of-type td': { borderBottom: 'none' },
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
                          display: { xs: 'none', sm: 'table-cell' },
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
                          display: { xs: 'none', sm: 'table-cell' },
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
                                      theme.palette.mode === 'dark'
                                        ? 'rgba(0,225,255,0.85)'
                                        : accent
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
                          <TableCell
                            align="right"
                            sx={{ display: { xs: 'none', sm: 'table-cell' } }}
                          >
                            {fmt(c.baseUltimate, 0)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ display: { xs: 'none', sm: 'table-cell' } }}
                          >
                            {fmt(c.decisiveUltimate, 1)}
                          </TableCell>
                          <TableCell align="right">{fmt(tot, 1)}</TableCell>
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
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}
                      >
                        {fmt(expected.baseUltimate, 0)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}
                      >
                        {fmt(expected.decisiveUltimate, 1)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: accentText }}
                        data-testid="ult-grand-total"
                      >
                        {fmt(expected.totalUltimate, 1)}
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
                    borderRadius: 1.4, // 14px — card tier (Monte Carlo spread box)
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
                  <Stack
                    direction="row"
                    spacing={3}
                    sx={{ mt: 1.25, flexWrap: 'wrap', rowGap: 1.5 }}
                  >
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
                        sx={{ fontWeight: 700, color: accentText }}
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

                  {/* Min–mean–max range bar: the whole track spans the observed
                    min→max, with the mean marked so the spread reads visually. */}
                  {distribution.maxTotal > distribution.minTotal && (
                    <Box sx={{ mt: 1.75 }}>
                      <Box
                        aria-hidden
                        sx={{
                          position: 'relative',
                          height: 8,
                          borderRadius: 4,
                          background: `linear-gradient(90deg, ${alpha(accent, 0.18)}, ${alpha(
                            accent,
                            0.5,
                          )})`,
                          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -3,
                            bottom: -3,
                            left: `${Math.min(
                              100,
                              Math.max(
                                0,
                                ((distribution.meanTotal - distribution.minTotal) /
                                  (distribution.maxTotal - distribution.minTotal)) *
                                  100,
                              ),
                            )}%`,
                            width: 2,
                            transform: 'translateX(-1px)',
                            background: theme.palette.mode === 'dark' ? '#fff' : accentText,
                            borderRadius: 2,
                            boxShadow: `0 0 6px ${accent}`,
                          }}
                        />
                      </Box>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: 'space-between', mt: 0.5 }}
                        className="u-tabular"
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', fontSize: 10 }}
                        >
                          {fmt(distribution.minTotal, 0)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: accentText, fontWeight: 700, fontSize: 10 }}
                        >
                          mean {fmt(distribution.meanTotal, 0)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', fontSize: 10 }}
                        >
                          {fmt(distribution.maxTotal, 0)}
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>

            {/* Verify against your own ESO Logs report */}
            <LogCalibrationPanel modeledPerSecond={expected.ultimatePerSecond} />
          </Stack>
        </Box>

        {/* Mobile sticky results bar — keeps the headline live while you edit the
            build below; tap to jump back to the results. Phones only (desktop
            shows the results column alongside the inputs). Portalled to <body>
            because the calculator root carries an (identity) transform from its
            fade-in animation, which would otherwise be the fixed-positioning
            containing block and pin the bar to the panel instead of the screen. */}
        {showStickyResults && (
          <Portal>
            <Box
              role="button"
              tabIndex={0}
              aria-label={`Live result ${fmt(expected.ultimatePerSecond, 2)} ultimate per second, first ultimate in ${fmtSeconds(
                timeToUlt.secondsToFirstCast,
              )}. Jump back to results.`}
              onClick={jumpToResults}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  jumpToResults();
                }
              }}
              className="u-fade-in-up"
              sx={{
                display: { xs: 'flex', md: 'none' },
                position: 'fixed',
                left: 10,
                right: 10,
                bottom: 10,
                zIndex: (t) => t.zIndex.appBar + 2,
                alignItems: 'center',
                gap: 1.25,
                px: 1.75,
                py: 1,
                borderRadius: 1.4, // 14px — card tier
                cursor: 'pointer',
                border: `1px solid ${
                  theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.6)' : 'rgba(40,145,200,0.45)'
                }`,
                // Frosted, elevated glass that sits clearly ABOVE the page rather
                // than matching its flat navy — a lighter, more transparent
                // surface (so the blur reads) plus a brighter cyan edge + glow.
                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(180deg, rgba(30,48,78,0.72) 0%, rgba(17,32,58,0.78) 100%)'
                    : 'linear-gradient(180deg, rgba(240,250,255,0.82) 0%, rgba(255,255,255,0.84) 100%)',
                backdropFilter: 'blur(22px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(22px) saturate(1.6)',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 18px 44px rgba(0,0,0,0.55), 0 0 34px rgba(56,189,248,0.32), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : '0 16px 36px rgba(15,23,42,0.2), 0 0 22px rgba(40,145,200,0.2)',
                '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 2 },
              }}
            >
              <BoltOutlined sx={{ fontSize: 20, color: accent, flexShrink: 0 }} />
              <Box sx={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
                <Typography
                  component="span"
                  className="u-tabular"
                  sx={{
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    fontWeight: 700,
                    fontSize: '1.3rem',
                    letterSpacing: '-0.02em',
                    color: accent,
                    lineHeight: 1,
                  }}
                >
                  {fmt(expected.ultimatePerSecond, 2)}
                </Typography>
                <Typography
                  component="span"
                  sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.72rem', ml: 0.5 }}
                >
                  ult/s
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider', my: 0.25 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', fontSize: 9.5, lineHeight: 1.2 }}
                >
                  to 1st ult
                </Typography>
                <Typography
                  className="u-tabular"
                  sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}
                >
                  {fmtSeconds(timeToUlt.secondsToFirstCast)}
                </Typography>
              </Box>
              <KeyboardArrowUp sx={{ fontSize: 22, color: 'text.secondary', flexShrink: 0 }} />
            </Box>
          </Portal>
        )}
      </Box>
    </ThemeProvider>
  );
};
