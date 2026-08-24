import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorIcon from '@mui/icons-material/ErrorOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/WarningAmberOutlined';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import React from 'react';

import type {
  AllocatedStar,
  ChampionPointsViewModel,
  ChampionTreeKey,
} from '@/features/loadout-manager/utils/esotkCompanionChampionPoints';
import { UNKNOWN_TREE } from '@/features/loadout-manager/utils/esotkCompanionChampionPoints';
import type {
  CoachingInsight,
  CoachingSeverity,
} from '@/features/loadout-manager/utils/esotkCompanionCoaching';
import type {
  CompanionEffect,
  CompanionScribedSkill,
  CompanionStats,
} from '@/features/loadout-manager/utils/esotkCompanionParser';
import { MundusStones } from '@/types/abilities';
import { ChampionPointTree } from '@/types/champion-points';
import { detectFoodFromAuras } from '@/utils/foodDetectionUtils';
import { buildVariantSx } from '@/utils/playerCardStyleUtils';
import {
  detectPotionType,
  describePotionType,
  type PotionType,
} from '@/utils/potionDetectionUtils';

export interface CompanionBuildPanelProps {
  /** Champion-point view-model from the ESOTK Companion add-on, or null if none captured. */
  championPoints: ChampionPointsViewModel | null;
  /** Stat-aware coaching insights (self penetration + crit chance, point-in-time). */
  coaching: CoachingInsight[];
  /** Final sheet stats captured by the add-on. */
  stats?: CompanionStats;
  /** Long-term/self effects captured by the add-on. */
  effects?: CompanionEffect[];
  /** Scribed skills captured directly from the add-on action bar snapshot. */
  scribing?: CompanionScribedSkill[];
  /**
   * How far (ms) the matched capture sits outside this fight's window. When it's more than a
   * minute away the build was borrowed from an adjacent pull, so we flag it as approximate.
   */
  distanceMs?: number;
}

/** Only badge a borrowed build once the capture is at least this far from the fight window. */
const BORROWED_BUILD_THRESHOLD_MS = 60_000;

const SECTION_TITLE_SX = {
  fontWeight: 'bold',
  mb: 1,
  fontFamily: 'Space Grotesk Variable, sans-serif',
} as const;

/**
 * The captured sheet reads once on leaving combat (buffs fading), so most stats are a
 * volatile point-in-time value. Only max-resource pools are stable at that instant; keep
 * them in their own group so a reader doesn't compare a volatile chip across players.
 */
const STABLE_STAT_IDS = new Set(['maxMagicka', 'maxStamina', 'maxHealth']);

/** Caption/tooltip conveying that the volatile group is point-in-time, not comparable across players. */
const CAPTURED_SHEET_TOOLTIP =
  'Character sheet at capture — read on leaving combat (buffs fading). The volatile group is a point-in-time reading, not comparable across players; the stable group (max resources) is steady.';

// Display order + the chip style variant each tree maps to (matches PlayerCard's CP chips).
const TREE_ORDER: { tree: ChampionTreeKey; label: string; variant: string }[] = [
  { tree: ChampionPointTree.Warfare, label: 'Warfare', variant: 'championBlue' },
  { tree: ChampionPointTree.Fitness, label: 'Fitness', variant: 'championRed' },
  { tree: ChampionPointTree.Craft, label: 'Craft', variant: 'championGreen' },
  { tree: UNKNOWN_TREE, label: 'Other', variant: 'default' },
];

const SEVERITY_META: Record<
  CoachingSeverity,
  { color: 'success' | 'info' | 'warning' | 'error'; Icon: typeof CheckCircleIcon }
> = {
  good: { color: 'success', Icon: CheckCircleIcon },
  info: { color: 'info', Icon: InfoIcon },
  warn: { color: 'warning', Icon: WarningIcon },
  error: { color: 'error', Icon: ErrorIcon },
};

const CRIT_RATING_FOR_100_PERCENT = 21_918;
const MUNDUS_IDS = new Set(
  Object.values(MundusStones).filter((value): value is number => typeof value === 'number'),
);
const MUNDUS_NAME_RX =
  /^(?:Boon:|Bonus\s*\(2\):)?\s*The\s+(Warrior|Mage|Serpent|Thief|Lady|Steed|Lord|Apprentice|Ritual|Lover|Atronach|Shadow|Tower)\b/i;

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

function critPercent(rating: number): string {
  const pct = Math.min(100, Math.round((rating / CRIT_RATING_FOR_100_PERCENT) * 1000) / 10);
  return `${pct}%`;
}

function effectAuras(effects: CompanionEffect[] | undefined): Array<{ name: string; id: number }> {
  return effects?.map((effect) => ({ name: effect.name ?? '', id: effect.id })) ?? [];
}

function detectMundus(effects: CompanionEffect[] | undefined): { name: string; id: number } | null {
  for (const effect of effects ?? []) {
    const name = effect.name ?? '';
    if (!MUNDUS_IDS.has(effect.id) && !MUNDUS_NAME_RX.test(name)) continue;
    return {
      id: effect.id,
      name: name.replace(/^(?:Boon:|Bonus\s*\(2\):)\s*/i, '').trim() || `Mundus ${effect.id}`,
    };
  }
  return null;
}

function statRows(
  stats: CompanionStats | undefined,
): Array<{ id: string; label: string; value: string }> {
  if (!stats) return [];
  const rows: Array<{ id: string; label: string; value: string }> = [];
  const add = (
    id: string,
    label: string,
    value: number | undefined,
    formatter = formatNumber,
  ): void => {
    if (typeof value === 'number') rows.push({ id, label, value: formatter(value) });
  };

  add('spellDamage', 'Spell Damage', stats.spellDamage);
  add('weaponDamage', 'Weapon Damage', stats.weaponDamage);
  add('spellCrit', 'Spell Crit', stats.spellCrit, critPercent);
  add('weaponCrit', 'Weapon Crit', stats.weaponCrit, critPercent);
  add('spellPen', 'Spell Pen', stats.spellPen);
  add('physicalPen', 'Physical Pen', stats.physicalPen);
  add('maxMagicka', 'Max Magicka', stats.maxMagicka);
  add('maxStamina', 'Max Stamina', stats.maxStamina);
  add('maxHealth', 'Max Health', stats.maxHealth);
  add('magickaRegen', 'Mag Regen', stats.magickaRegen);
  add('staminaRegen', 'Stam Regen', stats.staminaRegen);
  add('healthRegen', 'Health Regen', stats.healthRegen);
  add('physicalResist', 'Physical Resist', stats.physicalResist);
  add('spellResist', 'Spell Resist', stats.spellResist);
  add('critResist', 'Crit Resist', stats.critResist);

  return rows;
}

function scribedSkillRows(
  scribing: CompanionScribedSkill[] | undefined,
): Array<{ id: string; label: string; title: string }> {
  return (scribing ?? [])
    .map((skill) => {
      const scripts = Object.values(skill.scripts)
        .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
        .map((script) => script.name || `Script ${script.id}`);
      if (scripts.length === 0) return null;

      const skillName = skill.name || `Ability ${skill.abilityId}`;
      const barSlotParts = [
        skill.bar,
        skill.slot !== undefined ? `slot ${skill.slot}` : undefined,
      ].filter(Boolean);
      const barSlot = barSlotParts.length > 0 ? ` (${barSlotParts.join(' ')})` : '';
      return {
        id: `${skill.abilityId}:${skill.bar ?? ''}:${skill.slot ?? ''}`,
        label: `${skillName}: ${scripts.join(' / ')}`,
        title: `Scribed skill captured by ESOTK Companion${barSlot} (Ability ID: ${skill.abilityId})`,
      };
    })
    .filter((row): row is { id: string; label: string; title: string } => Boolean(row));
}

function StarChips({
  stars,
  variant,
  theme,
}: {
  stars: AllocatedStar[];
  variant: string;
  theme: Theme;
}): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {stars.map((star) => (
        <Chip
          key={star.id}
          size="small"
          label={`${star.name} ${star.points}`}
          title={`${star.name} — ${star.points} points (ID: ${star.id})`}
          sx={{
            ...(variant === 'default' ? {} : buildVariantSx(variant, theme)),
            '& .MuiChip-label': { fontSize: '0.58rem' },
          }}
        />
      ))}
    </Box>
  );
}

/** A labeled group of captured-sheet stat chips (volatile vs stable). */
function SheetStatGroup({
  caption,
  rows,
  volatile: isVolatile,
}: {
  caption: string;
  rows: Array<{ id: string; label: string; value: string }>;
  volatile: boolean;
}): React.ReactElement | null {
  if (rows.length === 0) return null;
  return (
    <Box sx={{ mb: 0.75 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
        {caption}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {rows.map((row) => (
          <Chip
            key={row.id}
            size="small"
            variant="outlined"
            label={`${row.label}: ${row.value}`}
            title={
              isVolatile
                ? `${row.label} — point-in-time character-sheet reading captured by ESOTK Companion (buffs fading)`
                : `${row.label} captured by ESOTK Companion`
            }
            sx={{ '& .MuiChip-label': { fontSize: '0.58rem' } }}
          />
        ))}
      </Box>
    </Box>
  );
}

/**
 * Renders the build data captured by the ESOTK Companion add-on that ESO Logs can't see:
 * the full champion-point allocation (grouped by tree), the character sheet at capture
 * (point-in-time, volatile chips separated from stable), and plain stat-reading coaching
 * (self penetration, crit chance). Presentational only — feed it the view-model from
 * `buildChampionPointsViewModel` and insights from `computeStatCoaching`.
 *
 * Renders nothing when there's no companion data, so it's safe to always mount.
 */
export const CompanionBuildPanel: React.FC<CompanionBuildPanelProps> = ({
  championPoints,
  coaching,
  stats,
  effects,
  scribing,
  distanceMs,
}) => {
  const theme = useTheme();
  const rows = React.useMemo(() => statRows(stats), [stats]);
  const volatileRows = React.useMemo(() => rows.filter((r) => !STABLE_STAT_IDS.has(r.id)), [rows]);
  const stableRows = React.useMemo(() => rows.filter((r) => STABLE_STAT_IDS.has(r.id)), [rows]);
  const capturedScribing = React.useMemo(() => scribedSkillRows(scribing), [scribing]);
  const auras = React.useMemo(() => effectAuras(effects), [effects]);
  const food = React.useMemo(() => detectFoodFromAuras(auras), [auras]);
  const mundus = React.useMemo(() => detectMundus(effects), [effects]);
  const potionType = React.useMemo<PotionType>(() => detectPotionType(auras, 0), [auras]);
  const hasPotion = potionType !== 'none' && potionType !== 'unknown';

  const hasCp =
    championPoints !== null &&
    (championPoints.allocated.length > 0 || championPoints.slotted.length > 0);
  const hasCoaching = coaching.length > 0;
  const hasStats = rows.length > 0;
  const hasConsumables = Boolean(food || mundus || hasPotion);
  const hasScribing = capturedScribing.length > 0;
  if (!hasCp && !hasCoaching && !hasStats && !hasConsumables && !hasScribing) return null;

  // When no capture landed inside this fight's window, the build was borrowed from the
  // nearest adjacent pull — flag it so it isn't read as the exact build used in this fight.
  const borrowedMinutes =
    distanceMs && distanceMs >= BORROWED_BUILD_THRESHOLD_MS ? Math.round(distanceMs / 60_000) : 0;

  return (
    <Box sx={{ mt: 1 }} data-testid="companion-build-panel">
      {borrowedMinutes > 0 && (
        <Tooltip
          title={`No ESOTK Companion capture landed inside this fight — showing the nearest snapshot, about ${borrowedMinutes} min away. It may not reflect the build used in this fight.`}
          placement="top-start"
        >
          <Chip
            size="small"
            variant="outlined"
            color="warning"
            icon={<WarningIcon />}
            label={`Nearest capture · ${borrowedMinutes} min away`}
            sx={{ mb: 1, '& .MuiChip-label': { fontSize: '0.58rem' } }}
          />
        </Tooltip>
      )}
      {hasCp && championPoints && (
        <Box sx={{ mb: hasConsumables || hasScribing || hasStats || hasCoaching ? 2 : 0 }}>
          <Typography variant="body2" sx={SECTION_TITLE_SX}>
            Champion Points
            {championPoints.total !== undefined && (
              <Typography
                component="span"
                variant="caption"
                sx={{ ml: 1, color: 'text.secondary' }}
              >
                {championPoints.total.toLocaleString()} CP ·{' '}
                {championPoints.totalAllocated.toLocaleString()} allocated
              </Typography>
            )}
          </Typography>

          {TREE_ORDER.map(({ tree, label, variant }) => {
            const stars = championPoints.byTree[tree];
            if (!stars || stars.length === 0) return null;
            return (
              <Box key={label} sx={{ mb: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}
                >
                  {label}
                </Typography>
                <StarChips stars={stars} variant={variant} theme={theme} />
              </Box>
            );
          })}

          {championPoints.slotted.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}
              >
                Slotted
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {championPoints.slotted.map((s) => (
                  <Chip
                    key={s.slot}
                    size="small"
                    variant="outlined"
                    label={s.name}
                    title={`Slot ${s.slot}: ${s.name} (ID: ${s.id})`}
                    sx={{ '& .MuiChip-label': { fontSize: '0.58rem' } }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {hasConsumables && (
        <Box sx={{ mb: hasScribing || hasStats || hasCoaching ? 2 : 0 }}>
          <Typography variant="body2" sx={SECTION_TITLE_SX}>
            Captured Buffs
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {food && (
              <Chip
                size="small"
                label={`Food: ${food.name || food.id}`}
                title={`Food buff captured by ESOTK Companion (ID: ${food.id})`}
                sx={{ '& .MuiChip-label': { fontSize: '0.58rem' } }}
              />
            )}
            {mundus && (
              <Chip
                size="small"
                label={`Mundus: ${mundus.name.replace(/^The\s+/i, '')}`}
                title={`Mundus captured by ESOTK Companion (ID: ${mundus.id})`}
                sx={{ '& .MuiChip-label': { fontSize: '0.58rem' } }}
              />
            )}
            {hasPotion && (
              <Chip
                size="small"
                label={`Potion: ${describePotionType(potionType)}`}
                title="Potion-type buff cluster captured by ESOTK Companion"
                sx={{ '& .MuiChip-label': { fontSize: '0.58rem' } }}
              />
            )}
          </Box>
        </Box>
      )}

      {hasScribing && (
        <Box sx={{ mb: hasStats || hasCoaching ? 2 : 0 }}>
          <Typography variant="body2" sx={SECTION_TITLE_SX}>
            Captured Scribing
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {capturedScribing.map((row) => (
              <Chip
                key={row.id}
                size="small"
                variant="outlined"
                label={row.label}
                title={row.title}
                sx={{ '& .MuiChip-label': { fontSize: '0.58rem' } }}
              />
            ))}
          </Box>
        </Box>
      )}

      {hasStats && (
        <Box sx={{ mb: hasCoaching ? 2 : 0 }}>
          <Typography
            variant="body2"
            sx={{ ...SECTION_TITLE_SX, display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            Sheet at Capture
            <Tooltip title={CAPTURED_SHEET_TOOLTIP} placement="top-start">
              <InfoIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          </Typography>
          <SheetStatGroup caption="Volatile (buff-dependent)" rows={volatileRows} volatile />
          <SheetStatGroup caption="Stable" rows={stableRows} volatile={false} />
        </Box>
      )}

      {hasCoaching && (
        <Box>
          <Typography variant="body2" sx={SECTION_TITLE_SX}>
            Build Coaching
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {coaching.map((insight) => {
              const { color, Icon } = SEVERITY_META[insight.severity];
              return (
                <Tooltip key={insight.id} title={insight.detail} placement="top-start">
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                    <Icon fontSize="small" color={color} sx={{ mt: '1px', flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                        {insight.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', display: 'block' }}
                      >
                        {insight.detail}
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};
