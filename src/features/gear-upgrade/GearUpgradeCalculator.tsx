import {
  AutoAwesomeOutlined,
  AutoFixHighOutlined,
  EmojiEventsOutlined,
  InfoOutlined,
  ShieldMoonOutlined,
  TrendingUpOutlined,
  TuneOutlined,
  WorkspacePremiumOutlined,
} from '@mui/icons-material';
import {
  Box,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import React, { useMemo, useState } from 'react';

import { CRIT_OPTIMAL_MIN, PEN_OPTIMAL_MIN_PVE } from '@/data/skill-lines/calculator-data';

import { GUIDE_INTRO, UPGRADE_CATALOG, WEAPON_TRAIT_GUIDE } from './engine/gear-upgrade-catalog';
import { computeUpgrades } from './engine/gearUpgradeEngine';
import type { BuildBaseline, MundusStone, UpgradeResult } from './engine/types';

const BASE_CRIT_DAMAGE_CAP = 125;
const RAISED_CRIT_DAMAGE_CAP = 155; // +30 from Nightblade's Above and Beyond
const DEFAULT_FRONT_BAR_SHARE = 0.8; // most builds do the bulk of damage on the front bar

// Below this, an upgrade is effectively a no-op for this build (e.g. penetration
// when already at the resistance cap) — shown as "at cap" rather than "+0.00%".
const NEGLIGIBLE_PCT = 0.01;

const NUMERAL_FONT = 'Space Grotesk, Inter, system-ui';
const GUIDE_ACCENT = '#f5a524'; // warm amber for the qualitative weapon-trait section

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

// Trial boss / 21M dummy resistance — the same 18,200 the pen target is set to cancel.
const TRIAL_TARGET_RESISTANCE = 18200;

/**
 * Preset stat values, fully raid-buffed on a trial boss (the state the optimizer
 * assumes). The two anchors below come straight from the repo's calculator
 * constants so they can't drift:
 *   • Penetration  → PEN_OPTIMAL_MIN_PVE (18,200) — the trial pen target/cap.
 *   • Crit Damage  → CRIT_OPTIMAL_MIN (125) — the in-game crit-damage cap a
 *                    min-maxed build sits at (Shadow + Major/Minor Force + sets).
 *
 * Weapon/Spell Damage, Max stat, and Crit Chance are NOT carried by ESO Logs
 * (that's the gap the ESOTK Companion add-on fills), so they're representative
 * end-game raid-buffed values, not log-derived — tune freely per build.
 */
const MAGICKA_DPS: BuildBaseline = {
  weaponOrSpellDamage: 7500,
  maxStat: 42000,
  critChancePct: 70,
  critDamagePct: CRIT_OPTIMAL_MIN,
  penetration: PEN_OPTIMAL_MIN_PVE,
  targetResistance: TRIAL_TARGET_RESISTANCE,
  mundus: 'thief',
  critDamageCapPct: BASE_CRIT_DAMAGE_CAP,
  frontBarDamageShare: DEFAULT_FRONT_BAR_SHARE,
};

const STAMINA_DPS: BuildBaseline = {
  weaponOrSpellDamage: 7800,
  maxStat: 38000,
  critChancePct: 75,
  critDamagePct: CRIT_OPTIMAL_MIN,
  penetration: PEN_OPTIMAL_MIN_PVE,
  targetResistance: TRIAL_TARGET_RESISTANCE,
  mundus: 'thief',
  critDamageCapPct: BASE_CRIT_DAMAGE_CAP,
  frontBarDamageShare: DEFAULT_FRONT_BAR_SHARE,
};

// Fresh CP160, self-buffed, not yet min-maxed: under the pen cap and well below
// the crit-damage cap, so quality/enchant/pen upgrades rank highly.
const NEW_CHARACTER: BuildBaseline = {
  weaponOrSpellDamage: 3500,
  maxStat: 32000,
  critChancePct: 35,
  critDamagePct: 60,
  penetration: 8000,
  targetResistance: TRIAL_TARGET_RESISTANCE,
  mundus: 'thief',
  critDamageCapPct: BASE_CRIT_DAMAGE_CAP,
  frontBarDamageShare: DEFAULT_FRONT_BAR_SHARE,
};

// Mid-progression DPS: under the pen and crit-damage caps, so the first view a
// visitor sees has pen / crit / quality / enchant upgrades all in play — the
// state where a "what should I upgrade next?" tool is most useful. The fully
// capped Magicka/Stamina presets are one tap away for min-maxers.
const MID_DPS: BuildBaseline = {
  weaponOrSpellDamage: 5500,
  maxStat: 36000,
  critChancePct: 55,
  critDamagePct: 100,
  penetration: 15000,
  targetResistance: TRIAL_TARGET_RESISTANCE,
  mundus: 'thief',
  critDamageCapPct: BASE_CRIT_DAMAGE_CAP,
  frontBarDamageShare: DEFAULT_FRONT_BAR_SHARE,
};

const DEFAULT_BASELINE: BuildBaseline = MID_DPS;

/** One-tap starting points so users aren't faced with a blank stat form. */
const PRESETS: { label: string; baseline: BuildBaseline }[] = [
  { label: 'Mid-game DPS', baseline: MID_DPS },
  { label: 'Magicka DPS', baseline: MAGICKA_DPS },
  { label: 'Stamina DPS', baseline: STAMINA_DPS },
  { label: 'New character', baseline: NEW_CHARACTER },
];

const MUNDUS_OPTIONS: { value: MundusStone; label: string }[] = [
  { value: 'thief', label: 'The Thief (Crit Chance)' },
  { value: 'shadow', label: 'The Shadow (Crit Damage)' },
  { value: 'warrior', label: 'The Warrior (Weapon Dmg)' },
  { value: 'apprentice', label: 'The Apprentice (Spell Dmg)' },
  { value: 'lover', label: 'The Lover (Penetration)' },
  { value: 'mage', label: 'The Mage (Max Stat)' },
  { value: 'other', label: 'Other (no damage stat)' },
];

interface StatField {
  key: keyof BuildBaseline;
  label: string;
  help: string;
}

const CHARACTER_FIELDS: StatField[] = [
  { key: 'weaponOrSpellDamage', label: 'Weapon/Spell Dmg', help: 'Your higher of the two.' },
  { key: 'maxStat', label: 'Max Mag/Stam', help: 'The resource your damage scales off.' },
  { key: 'critChancePct', label: 'Crit Chance %', help: 'Total, including the 10% base.' },
  { key: 'critDamagePct', label: 'Crit Damage %', help: 'Total, including the 50% base.' },
  { key: 'penetration', label: 'Penetration', help: 'Your offensive penetration.' },
  { key: 'targetResistance', label: 'Target Resistance', help: 'Trial boss ≈ 18,200.' },
];

const CATEGORY_META: Record<UpgradeResult['group'], { label: string; icon: React.ReactNode }> = {
  trait: { label: 'Trait', icon: <AutoAwesomeOutlined fontSize="small" /> },
  quality: { label: 'Quality', icon: <WorkspacePremiumOutlined fontSize="small" /> },
  enchant: { label: 'Enchant', icon: <AutoFixHighOutlined fontSize="small" /> },
};

type CategoryFilter = 'all' | UpgradeResult['group'];

const CONFIDENCE_LABEL = {
  high: 'Verified',
  medium: 'Estimate',
  low: 'Rough estimate',
} as const;

/** Magnitude → accent colour, so the big wins read instantly. */
function gainColor(theme: Theme, pct: number): string {
  if (pct < NEGLIGIBLE_PCT) return theme.palette.text.disabled;
  if (pct >= 1) return theme.palette.success.main;
  if (pct >= 0.3) return theme.palette.primary.main;
  return theme.palette.text.secondary;
}

/**
 * Shared panel surface, matching the Ultimate Calculator / Aurora restyle: a
 * recessed cyan-glass mid-layer in dark mode, with a faint cyan border, a glossy
 * top inset highlight, and a soft drop shadow so nested cards read as raised.
 */
const panelSx = (theme: Theme): SxProps<Theme> => ({
  p: { xs: 2, sm: 2.5 },
  borderRadius: 2.8, // 28px — top-level panel tier
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

/** Raised inner card (14px tier) that lifts off the recessed panel. */
const cardSx = (theme: Theme): SxProps<Theme> => ({
  borderRadius: 1.4,
  border: `1px solid ${
    theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.16)' : theme.palette.divider
  }`,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(56,189,248,0.09) 0%, rgba(56,189,248,0.02) 100%)'
      : 'rgba(255,255,255,0.6)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 6px 16px rgba(0,0,0,0.34)'
      : '0 2px 8px rgba(15,23,42,0.05)',
});

/** Accent "eyebrow" that opens each section, with an icon chip. */
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

export const GearUpgradeCalculator: React.FC = () => {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const [baseline, setBaseline] = useState<BuildBaseline>(DEFAULT_BASELINE);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const results = useMemo(() => computeUpgrades(UPGRADE_CATALOG, baseline), [baseline]);
  const maxPct = useMemo(
    () => results.reduce((m, r) => Math.max(m, r.dmgIncreasePct), 0),
    [results],
  );
  const visible = useMemo(
    () => (filter === 'all' ? results : results.filter((r) => r.group === filter)),
    [results, filter],
  );
  const topPick = results.find((r) => r.dmgIncreasePct >= NEGLIGIBLE_PCT) ?? null;

  const setStat = (key: keyof BuildBaseline, raw: string): void => {
    const value = Number(raw);
    if (Number.isNaN(value)) return;
    setBaseline((prev) => ({ ...prev, [key]: value }));
  };

  const raisedCap = (baseline.critDamageCapPct ?? BASE_CRIT_DAMAGE_CAP) > BASE_CRIT_DAMAGE_CAP;

  const inputSx: SxProps<Theme> = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.25,
      backgroundColor:
        theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.7)',
    },
  };

  const helperSx = { sx: { mx: 0, fontSize: '0.68rem', lineHeight: 1.3 } };

  const renderField = ({ key, label, help }: StatField): React.ReactNode => (
    <TextField
      key={key}
      label={label}
      type="number"
      size="small"
      fullWidth
      value={baseline[key]}
      onChange={(e) => setStat(key, e.target.value)}
      helperText={help}
      sx={inputSx}
      slotProps={{ htmlInput: { inputMode: 'numeric', min: 0 }, formHelperText: helperSx }}
    />
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      <Stack spacing={{ xs: 2, sm: 2.5 }}>
        <Box>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
          >
            Gear Upgrade Optimizer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            What should you upgrade <em>next</em>? Enter your stats and every trait, quality, and
            enchant change is ranked by the damage it adds to your build — biggest win first.
          </Typography>
        </Box>

        {/* Inputs */}
        <Paper elevation={0} sx={panelSx(theme)}>
          <SectionHeader
            icon={<TuneOutlined />}
            title="Your build"
            accent={accent}
            action={
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {PRESETS.map((p) => (
                  <Chip
                    key={p.label}
                    label={p.label}
                    size="small"
                    variant="outlined"
                    onClick={() => setBaseline(p.baseline)}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Stack>
            }
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
              gap: { xs: 1.5, sm: 2 },
            }}
          >
            {CHARACTER_FIELDS.map(renderField)}
            <TextField
              select
              label="Mundus Stone"
              size="small"
              fullWidth
              value={baseline.mundus}
              onChange={(e) =>
                setBaseline((prev) => ({ ...prev, mundus: e.target.value as MundusStone }))
              }
              helperText="Boosted by the Divines trait."
              sx={inputSx}
              slotProps={{ formHelperText: helperSx }}
            >
              {MUNDUS_OPTIONS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Front-bar damage %"
              type="number"
              size="small"
              fullWidth
              value={Math.round((baseline.frontBarDamageShare ?? DEFAULT_FRONT_BAR_SHARE) * 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isNaN(v)) return;
                setBaseline((prev) => ({ ...prev, frontBarDamageShare: clamp01(v / 100) }));
              }}
              helperText="Weapon upgrades only count on their bar."
              sx={inputSx}
              slotProps={{
                htmlInput: { inputMode: 'numeric', min: 0, max: 100 },
                formHelperText: helperSx,
              }}
            />
          </Box>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Checkbox
                size="small"
                checked={raisedCap}
                onChange={(e) =>
                  setBaseline((prev) => ({
                    ...prev,
                    critDamageCapPct: e.target.checked
                      ? RAISED_CRIT_DAMAGE_CAP
                      : BASE_CRIT_DAMAGE_CAP,
                  }))
                }
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                Raised crit-damage cap (e.g. Nightblade&apos;s Above and Beyond, 125% → 155%)
              </Typography>
            }
          />
        </Paper>

        {/* Top pick hero */}
        {topPick && (
          <Paper
            elevation={0}
            sx={{
              ...panelSx(theme),
              border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.16)}, ${alpha(
                theme.palette.success.main,
                0.03,
              )})`,
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                aria-hidden
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  flexShrink: 0,
                  color: theme.palette.success.main,
                  background: alpha(theme.palette.success.main, 0.16),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                }}
              >
                <EmojiEventsOutlined />
              </Box>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    fontWeight: 700,
                    fontSize: 10,
                  }}
                >
                  Your best next upgrade
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {topPick.change} · {topPick.slotLabel}
                </Typography>
              </Box>
              <Typography
                className="u-tabular"
                sx={{
                  fontFamily: NUMERAL_FONT,
                  fontWeight: 800,
                  fontSize: { xs: '1.6rem', sm: '2rem' },
                  letterSpacing: '-0.01em',
                  color: theme.palette.success.main,
                  whiteSpace: 'nowrap',
                }}
              >
                +{topPick.dmgIncreasePct.toFixed(2)}%
              </Typography>
            </Stack>
          </Paper>
        )}

        {/* Ranked priority list */}
        <Paper elevation={0} sx={panelSx(theme)}>
          <SectionHeader
            icon={<TrendingUpOutlined />}
            title="Upgrade priority"
            accent={accent}
            action={
              <ToggleButtonGroup
                size="small"
                exclusive
                value={filter}
                onChange={(_, next: CategoryFilter | null) => next && setFilter(next)}
                aria-label="Filter upgrades by type"
                sx={{ '& .MuiToggleButton-root': { textTransform: 'none', px: 1.25, py: 0.4 } }}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="trait">Traits</ToggleButton>
                <ToggleButton value="quality">Quality</ToggleButton>
                <ToggleButton value="enchant">Enchants</ToggleButton>
              </ToggleButtonGroup>
            }
          />

          <Stack spacing={1} component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {visible.map((row) => {
              const negligible = row.dmgIncreasePct < NEGLIGIBLE_PCT;
              const color = gainColor(theme, row.dmgIncreasePct);
              const barPct = maxPct > 0 ? Math.max(2, (row.dmgIncreasePct / maxPct) * 100) : 0;
              return (
                <Box
                  key={row.id}
                  component="li"
                  sx={{ ...cardSx(theme), p: { xs: 1.25, sm: 1.5 } }}
                >
                  <Stack
                    direction="row"
                    spacing={1.25}
                    sx={{ alignItems: 'center', mb: negligible ? 0 : 0.85 }}
                  >
                    <Tooltip title={CATEGORY_META[row.group].label} arrow>
                      <Box
                        aria-hidden
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: 1.5,
                          flexShrink: 0,
                          color: accent,
                          background: alpha(accent, 0.12),
                          border: `1px solid ${alpha(accent, 0.22)}`,
                          '& svg': { fontSize: 16 },
                        }}
                      >
                        {CATEGORY_META[row.group].icon}
                      </Box>
                    </Tooltip>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25 }}>
                        {row.change}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                          fontSize: 9.5,
                          fontWeight: 700,
                        }}
                      >
                        {row.slotLabel}
                      </Typography>
                    </Box>
                    {row.note && (
                      <Tooltip title={row.note} arrow enterTouchDelay={0} leaveTouchDelay={4000}>
                        <InfoOutlined
                          tabIndex={0}
                          sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }}
                          aria-label={`About ${row.change}`}
                        />
                      </Tooltip>
                    )}
                    <Typography
                      className="u-tabular"
                      sx={{
                        fontFamily: NUMERAL_FONT,
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {negligible ? 'at cap' : `+${row.dmgIncreasePct.toFixed(2)}%`}
                    </Typography>
                  </Stack>

                  {!negligible && (
                    <Box
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: alpha(theme.palette.text.primary, 0.08),
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${barPct}%`,
                          height: '100%',
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.45)})`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>

          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{ flexWrap: 'wrap', mt: 2, mb: 1, alignItems: 'center' }}
          >
            {(['high', 'medium', 'low'] as const).map((c) => (
              <Chip
                key={c}
                size="small"
                variant="outlined"
                label={CONFIDENCE_LABEL[c]}
                color={c === 'high' ? 'success' : c === 'medium' ? 'warning' : 'default'}
              />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            The ranking math is exact. Per-upgrade stat amounts are a first-pass estimate (CP160,
            Legendary) pending verification against the in-game tooltip data — tap the ⓘ on a row
            for its sourcing.
          </Typography>
        </Paper>

        {/* Qualitative weapon-trait guide */}
        <Paper elevation={0} sx={panelSx(theme)}>
          <SectionHeader
            icon={<ShieldMoonOutlined />}
            title="Front-bar weapon traits"
            accent={GUIDE_ACCENT}
            action={
              <Tooltip title={GUIDE_INTRO} arrow enterTouchDelay={0} leaveTouchDelay={5000}>
                <InfoOutlined sx={{ fontSize: 18, color: 'text.disabled', cursor: 'help' }} />
              </Tooltip>
            }
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These hinge on status-effect uptime and rotation, so they&apos;re a guide rather than a
            single number.
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1,
            }}
          >
            {WEAPON_TRAIT_GUIDE.map((row) => (
              <Box
                key={row.scenario}
                sx={{
                  ...cardSx(theme),
                  p: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25 }}>
                    {row.scenario}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.weaponType}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={row.recommendation}
                  sx={{
                    fontWeight: 700,
                    color: GUIDE_ACCENT,
                    background: `${GUIDE_ACCENT}1f`,
                    border: `1px solid ${GUIDE_ACCENT}33`,
                  }}
                />
              </Box>
            ))}
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
};
