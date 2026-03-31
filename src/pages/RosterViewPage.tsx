/**
 * RosterViewPage — read-only, shareable view of a roster.
 *
 * Accessible via direct link: /rv?r=<encoded> or /rv?id=<hubRosterId>
 * The ?r= format uses the same compact encoding as RosterBuilderPage.
 * The ?id= format fetches roster data from the Roster Hub API by ID.
 */

import {
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Shield as ShieldIcon,
  Favorite as FavoriteIcon,
  AutoAwesome as DPSIcon,
  Extension as ExtensionIcon,
  OpenInNew as OpenInNewIcon,
  SwapHoriz as PerFightIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Alert,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useState } from 'react';

import { BuildDetailPanel } from '../components/roster/build-detail-panel';
import { getAddonManagerDeepLink } from '../features/build-hub/api/packs-api';
import { preloadSkillData } from '../features/loadout-manager/data/skillLineSkills';
import { rosterHubApi } from '../features/roster-hub/api/roster-hub-api';
import type {
  RecommendedAddonEntry,
  RecommendedAddons,
} from '../features/roster-hub/types/roster-hub.types';
import {
  RaidRoster,
  TankSetup,
  HealerSetup,
  DPSSlot,
  MONSTER_SETS,
  ARENA_WEAPON_SETS,
} from '../types/roster';
import {
  TrialBuildOverrides,
  getTrialById,
  encounterHasOverrides,
} from '../types/trial-encounters';
import { encodeBuildToURL } from '../utils/buildEncoding';
import { buildVariantSx, getGearChipProps } from '../utils/playerCardStyleUtils';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';
import { decodeRosterFromURL } from '../utils/rosterEncoding';
import { dpsSlotToBuild, tankSlotToBuild, healerSlotToBuild } from '../utils/rosterSlotToBuild';
import { getSetDisplayName } from '../utils/setNameUtils';

const DISCORD_BOT_API_URL =
  (import.meta.env.VITE_DISCORD_BOT_API_URL as string | undefined) ??
  'https://eso-toolkit-discord-bot.eso-toolkit.workers.dev';

// ============================================================
// Local display helpers
// ============================================================

/** Slot-aware fallback variant when getGearChipProps can't detect set type by name. */
type SlotHint = 'body' | 'monster' | 'mythic' | 'arena';

interface GearSetEntry {
  name: string;
  /** Inferred piece count — drives getGearChipProps (same logic as PlayerCard). */
  count: number;
  /** Which slot this came from — used as fallback when name-based detection fails. */
  slotHint: SlotHint;
}

type GearSetInput = {
  set1?: import('../types/abilities').KnownSetIDs;
  set2?: import('../types/abilities').KnownSetIDs;
  monsterSet?: import('../types/abilities').KnownSetIDs;
  additionalSets?: import('../types/abilities').KnownSetIDs[];
} | null;

/** Fallback variant for each slot type (matches PlayerCard color language). */
const SLOT_HINT_VARIANT: Record<SlotHint, string> = {
  body: 'green',
  monster: 'purple',
  mythic: 'gold',
  arena: 'blue',
};

/**
 * Build a deduplicated list of gear set entries, sorted by count descending
 * (same order as PlayerCard: 5-piece → 2-piece → 1-piece).
 *
 * Each entry carries an inferred piece count so getGearChipProps (the same
 * function PlayerCard uses) produces identical chip colors. When the name-based
 * detection in getGearChipProps can't identify the set (returns silver), the
 * slotHint ensures correct coloring based on which slot the set was placed in.
 */
const formatGearSetsWithType = (sets: GearSetInput): GearSetEntry[] => {
  if (!sets) return [];
  const seen = new Set<string>();
  const entries: GearSetEntry[] = [];

  /** Classify a set ID into (count, slotHint) based on curated roster lists. */
  const classify = (
    id: import('../types/abilities').KnownSetIDs,
    defaultCount: number,
    defaultHint: SlotHint,
  ): [number, SlotHint] => {
    if (ARENA_WEAPON_SETS.includes(id)) return [1, 'arena'];
    if (MONSTER_SETS.includes(id)) return [defaultCount <= 2 ? defaultCount : 1, 'monster'];
    return [defaultCount, defaultHint];
  };

  const add = (
    id: import('../types/abilities').KnownSetIDs | undefined,
    defaultCount: number,
    defaultHint: SlotHint,
  ): void => {
    if (id == null) return;
    const name = getSetDisplayName(id);
    if (!name || seen.has(name)) return;
    seen.add(name);
    const [count, slotHint] = classify(id, defaultCount, defaultHint);
    entries.push({ name, count, slotHint });
  };

  // set1/set2 are the 5-piece body set slots (but may hold arena/monster IDs)
  add(sets.set1, 5, 'body');
  add(sets.set2, 5, 'body');
  // monsterSet is the head+shoulders slot
  add(sets.monsterSet, 2, 'monster');
  // additionalSets
  sets.additionalSets?.forEach((id) => add(id, 5, 'body'));

  // Sort by count descending (same as PlayerCard), then alphabetically.
  return entries.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
};

/** String-only version for text contexts (clipboard copy, etc.). */
const formatGearSets = (sets: GearSetInput): string[] =>
  formatGearSetsWithType(sets).map((e) => e.name);

/**
 * Get chip sx for a gear set entry.
 * Uses getGearChipProps (PlayerCard logic) first. If name-based detection
 * returns the default silver, falls back to the slot-aware variant so sets
 * from known slots always get the correct color.
 */
const getSetChipSx = (
  entry: GearSetEntry,
  theme: import('@mui/material/styles').Theme,
): import('@mui/system').SxProps<import('@mui/material/styles').Theme> => {
  const result = getGearChipProps(entry.name, entry.count, theme);
  // getGearChipProps returns silver for unrecognised names — detect and override
  const sx = result.sx as Record<string, unknown> | undefined;
  const bg = sx?.background as string | undefined;
  const isSilverFallback = bg?.includes('236, 240, 241') || bg?.includes('100, 116, 139');
  if (isSilverFallback) {
    return buildVariantSx(SLOT_HINT_VARIANT[entry.slotHint], theme);
  }
  return result.sx ?? {};
};

const formatSkillLines = (
  sl?: {
    line1?: string;
    line2?: string;
    line3?: string;
    isFlex?: boolean;
    notes?: string;
  } | null,
): string => {
  if (!sl) return '';
  if (sl.isFlex) return 'Flexible';
  return [sl.line1, sl.line2, sl.line3].filter(Boolean).join(' / ');
};

// ============================================================
// Individual role-card sub-components
// ============================================================

interface TankCardProps {
  tank: TankSetup;
  slotNum: number;
  label: string;
  color: string;
  isDarkMode: boolean;
}

const TankCard: React.FC<TankCardProps> = ({ tank, slotNum, label, color, isDarkMode }) => {
  const theme = useTheme();
  const gearSets = formatGearSetsWithType(tank.gearSets);
  const skillLines = formatSkillLines(tank.skillLines);
  const hasContent =
    tank.playerName ||
    tank.labels?.length ||
    gearSets.length > 0 ||
    skillLines ||
    tank.ultimate ||
    tank.notes;

  const [viewLoading, setViewLoading] = useState(false);
  const handleViewBuild = useCallback(async () => {
    setViewLoading(true);
    try {
      const build = tankSlotToBuild(tank, slotNum);
      const encoded = await encodeBuildToURL(build);
      if (encoded) {
        const basePath = window.location.pathname.replace(/\/rv(\/.*)?$/, '');
        window.open(
          `${window.location.origin}${basePath}/bv?b=${encoded}`,
          '_blank',
          'noopener,noreferrer',
        );
      }
    } finally {
      setViewLoading(false);
    }
  }, [tank, slotNum]);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '14px',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${color}30`,
        backdropFilter: 'blur(12px)',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          px: 2,
          pt: 1.5,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${color}20`,
            border: `1px solid ${color}30`,
            flexShrink: 0,
          }}
        >
          <ShieldIcon sx={{ fontSize: '0.95rem', color }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              lineHeight: 1,
              mb: 0.25,
            }}
          >
            {tank.roleLabel || label}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '-0.01em',
              color: tank.playerName ? 'text.primary' : 'text.disabled',
              fontStyle: tank.playerName ? 'normal' : 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tank.playerName || 'Unassigned'}
          </Typography>
        </Box>
        {((tank.labels && tank.labels.length > 0) || (tank.groups && tank.groups.length > 0)) && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {tank.labels?.map((lbl) => (
              <Chip
                key={lbl}
                label={lbl}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  background: `${color}18`,
                  color,
                  border: `1px solid ${color}30`,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
            {tank.groups?.map((g) => (
              <Chip
                key={g}
                label={g}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 500,
                  background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: 'text.disabled',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
          </Box>
        )}
        {hasContent && (
          <Tooltip title="View build in Build Viewer" arrow placement="top">
            <IconButton
              size="small"
              onClick={() => void handleViewBuild()}
              disabled={viewLoading}
              aria-label={`View ${label} build`}
              sx={{
                color,
                opacity: 0.65,
                '&:hover': { opacity: 1, backgroundColor: `${color}18` },
              }}
            >
              {viewLoading ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <OpenInNewIcon sx={{ fontSize: '0.85rem' }} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Card body */}
      <Box sx={{ px: 2, py: 1.25, flex: 1 }}>
        {!hasContent && (
          <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', fontStyle: 'italic' }}>
            Empty slot
          </Typography>
        )}

        {gearSets.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Gear
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {gearSets.map((entry) => (
                <Chip
                  key={entry.name}
                  label={entry.name}
                  size="small"
                  sx={getSetChipSx(entry, theme)}
                />
              ))}
            </Box>
          </Box>
        )}

        {skillLines && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Skill Lines
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {skillLines}
            </Typography>
          </Box>
        )}

        {tank.ultimate && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Ultimate
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {tank.ultimate}
            </Typography>
          </Box>
        )}

        {tank.notes && (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              fontStyle: 'italic',
              mt: 0.5,
            }}
          >
            {tank.notes}
          </Typography>
        )}
        <BuildDetailPanel
          food={tank.food}
          skills={tank.skills}
          passives={tank.passives}
          cpPoints={tank.cpPoints}
          gear={tank.gear}
          isDarkMode={isDarkMode}
          color={color}
        />
      </Box>
    </Paper>
  );
};

interface HealerCardProps {
  healer: HealerSetup;
  slotNum: number;
  label: string;
  color: string;
  isDarkMode: boolean;
}

const HealerCard: React.FC<HealerCardProps> = ({ healer, slotNum, label, color, isDarkMode }) => {
  const theme = useTheme();
  const gearSets = formatGearSetsWithType({
    set1: healer.set1,
    set2: healer.set2,
    monsterSet: healer.monsterSet,
    additionalSets: healer.additionalSets,
  });
  const skillLines = formatSkillLines(healer.skillLines);
  const hasContent =
    healer.playerName ||
    healer.labels?.length ||
    gearSets.length > 0 ||
    healer.arenaWeapon ||
    skillLines ||
    healer.ultimate ||
    healer.healerBuff ||
    healer.notes;

  const [viewLoading, setViewLoading] = useState(false);
  const handleViewBuild = useCallback(async () => {
    setViewLoading(true);
    try {
      const build = healerSlotToBuild(healer, slotNum);
      const encoded = await encodeBuildToURL(build);
      if (encoded) {
        const basePath = window.location.pathname.replace(/\/rv(\/.*)?$/, '');
        window.open(
          `${window.location.origin}${basePath}/bv?b=${encoded}`,
          '_blank',
          'noopener,noreferrer',
        );
      }
    } finally {
      setViewLoading(false);
    }
  }, [healer, slotNum]);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '14px',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${color}30`,
        backdropFilter: 'blur(12px)',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          px: 2,
          pt: 1.5,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${color}20`,
            border: `1px solid ${color}30`,
            flexShrink: 0,
          }}
        >
          <FavoriteIcon sx={{ fontSize: '0.95rem', color }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              lineHeight: 1,
              mb: 0.25,
            }}
          >
            {healer.roleLabel || label}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '-0.01em',
              color: healer.playerName ? 'text.primary' : 'text.disabled',
              fontStyle: healer.playerName ? 'normal' : 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {healer.playerName || 'Unassigned'}
          </Typography>
        </Box>
        {((healer.labels && healer.labels.length > 0) ||
          (healer.groups && healer.groups.length > 0)) && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {healer.labels?.map((lbl) => (
              <Chip
                key={lbl}
                label={lbl}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  background: `${color}18`,
                  color,
                  border: `1px solid ${color}30`,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
            {healer.groups?.map((g) => (
              <Chip
                key={g}
                label={g}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 500,
                  background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: 'text.disabled',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
          </Box>
        )}
        {hasContent && (
          <Tooltip title="View build in Build Viewer" arrow placement="top">
            <IconButton
              size="small"
              onClick={() => void handleViewBuild()}
              disabled={viewLoading}
              aria-label={`View ${healer.roleLabel ?? label} build`}
              sx={{
                color,
                opacity: 0.65,
                '&:hover': { opacity: 1, backgroundColor: `${color}18` },
              }}
            >
              {viewLoading ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <OpenInNewIcon sx={{ fontSize: '0.85rem' }} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Card body */}
      <Box sx={{ px: 2, py: 1.25, flex: 1 }}>
        {!hasContent && (
          <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', fontStyle: 'italic' }}>
            Empty slot
          </Typography>
        )}

        {(gearSets.length > 0 || healer.arenaWeapon) && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Gear
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {gearSets.map((entry) => (
                <Chip
                  key={entry.name}
                  label={entry.name}
                  size="small"
                  sx={getSetChipSx(entry, theme)}
                />
              ))}
              {healer.arenaWeapon && (
                <Chip label={healer.arenaWeapon} size="small" sx={buildVariantSx('blue', theme)} />
              )}
            </Box>
          </Box>
        )}

        {healer.healerBuff && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Buff
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {healer.healerBuff}
            </Typography>
          </Box>
        )}

        {healer.championPoint && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              CP Slot
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {healer.championPoint}
            </Typography>
          </Box>
        )}

        {skillLines && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Skill Lines
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {skillLines}
            </Typography>
          </Box>
        )}

        {healer.ultimate && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Ultimate
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {healer.ultimate}
            </Typography>
          </Box>
        )}

        {healer.notes && (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              fontStyle: 'italic',
              mt: 0.5,
            }}
          >
            {healer.notes}
          </Typography>
        )}
        <BuildDetailPanel
          food={healer.food}
          skills={healer.skills}
          passives={healer.passives}
          cpPoints={healer.cpPoints}
          gear={healer.gear}
          isDarkMode={isDarkMode}
          color={color}
        />
      </Box>
    </Paper>
  );
};

interface DPSRowProps {
  slot: DPSSlot;
  color: string;
  isDarkMode: boolean;
}

const DPS_JAIL_LABELS: Record<string, string> = {
  banner: 'Banner',
  zenkosh: 'ZenKosh',
  wm: 'WM',
  'wm-mk': 'WM/MK',
  mk: 'MK',
  custom: 'Custom',
};

const DPSRow: React.FC<DPSRowProps> = ({ slot, color, isDarkMode }) => {
  const theme = useTheme();
  const skillLines = formatSkillLines(slot.skillLines);
  // Prefer the new set1/set2/monsterSet/additionalSets fields; fall back to the
  // deprecated gearSets array for rosters encoded before the Phase-1 migration.
  const gearSets =
    slot.set1 != null || slot.set2 != null || slot.monsterSet != null || slot.additionalSets?.length
      ? formatGearSetsWithType({
          set1: slot.set1,
          set2: slot.set2,
          monsterSet: slot.monsterSet,
          additionalSets: slot.additionalSets,
        })
      : slot.gearSets?.length
        ? formatGearSetsWithType({
            set1: slot.gearSets[0],
            set2: slot.gearSets[1],
            additionalSets: slot.gearSets.slice(2),
          })
        : [];

  const isEmpty = !slot.playerName && !slot.labels?.length;

  const [viewLoading, setViewLoading] = useState(false);
  const handleViewBuild = useCallback(async () => {
    setViewLoading(true);
    try {
      const build = dpsSlotToBuild(slot);
      const encoded = await encodeBuildToURL(build);
      if (encoded) {
        const basePath = window.location.pathname.replace(/\/rv(\/.*)?$/, '');
        window.open(
          `${window.location.origin}${basePath}/bv?b=${encoded}`,
          '_blank',
          'noopener,noreferrer',
        );
      }
    } finally {
      setViewLoading(false);
    }
  }, [slot]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1.25,
        px: 1.5,
        borderRadius: '14px',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${isEmpty ? (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)') : `${color}30`}`,
        borderLeft: isEmpty ? undefined : `2px solid ${color}40`,
        backdropFilter: 'blur(12px)',
        opacity: isEmpty ? 0.6 : 1,
        transition: 'background-color 0.15s ease, opacity 0.15s ease',
        '&:hover': {
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        },
      }}
    >
      {/* Slot number badge */}
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: isEmpty ? 'transparent' : `${color}20`,
          border: `1px solid ${isEmpty ? (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') : `${color}30`}`,
          mt: 0.125,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: isEmpty ? 'text.disabled' : color,
            lineHeight: 1,
          }}
        >
          {slot.slotNumber}
        </Typography>
      </Box>

      {/* Main info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          {/* Jail DD type badge */}
          {slot.jailDDType && (
            <Chip
              label={
                slot.jailDDType === 'custom'
                  ? (slot.customDescription ?? 'Custom')
                  : DPS_JAIL_LABELS[slot.jailDDType]
              }
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                fontWeight: 700,
                background: `${color}20`,
                color,
                border: `1px solid ${color}35`,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}

          {/* Player name */}
          <Typography
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '0.88rem',
              fontWeight: slot.playerName ? 600 : 400,
              letterSpacing: '-0.01em',
              color: slot.playerName ? 'text.primary' : 'text.disabled',
              fontStyle: slot.playerName ? 'normal' : 'italic',
            }}
          >
            {slot.playerName || (isEmpty ? 'Empty slot' : '')}
          </Typography>

          {/* Labels */}
          {slot.labels?.map((lbl) => (
            <Chip
              key={lbl}
              label={lbl}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                fontWeight: 600,
                background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                color: 'text.secondary',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ))}

          {/* Group(s) — prefer new groups[] array, fall back to deprecated group.groupName */}
          {(slot.groups?.length ? slot.groups : slot.group?.groupName ? [slot.group.groupName] : [])
            .length > 0 && (
            <Chip
              label={(slot.groups?.length ? slot.groups : [slot.group!.groupName]).join(', ')}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                fontWeight: 500,
                background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: 'text.disabled',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}
          {/* View Build button */}
          {!isEmpty && (
            <Tooltip title="View build in Build Viewer" arrow placement="top">
              <IconButton
                size="small"
                onClick={() => void handleViewBuild()}
                disabled={viewLoading}
                aria-label={`View DPS ${slot.slotNumber} build`}
                sx={{
                  color,
                  opacity: 0.55,
                  p: 0.25,
                  '&:hover': { opacity: 1, backgroundColor: `${color}18` },
                }}
              >
                {viewLoading ? (
                  <CircularProgress size={12} color="inherit" />
                ) : (
                  <OpenInNewIcon sx={{ fontSize: '0.78rem' }} />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Gear sets — own row with proper spacing like Tank/Healer */}
        {(gearSets.length > 0 || slot.arenaWeapon) && (
          <Box
            sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}
          >
            {gearSets.map((entry) => (
              <Chip
                key={entry.name}
                label={entry.name}
                size="small"
                sx={getSetChipSx(entry, theme)}
              />
            ))}
            {slot.arenaWeapon && (
              <Chip label={slot.arenaWeapon} size="small" sx={buildVariantSx('blue', theme)} />
            )}
          </Box>
        )}

        {/* Secondary info: skill lines, ultimate, CP, notes */}
        {(skillLines || slot.ultimate || slot.championPoint || slot.notes) && (
          <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {skillLines && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>
                {skillLines}
              </Typography>
            )}
            {slot.ultimate && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>
                Ult: {slot.ultimate}
              </Typography>
            )}
            {slot.championPoint && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>
                CP: {slot.championPoint}
              </Typography>
            )}
            {slot.notes && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', fontStyle: 'italic' }}>
                {slot.notes}
              </Typography>
            )}
          </Box>
        )}
        <BuildDetailPanel
          food={slot.food}
          skills={slot.skills}
          passives={slot.passives}
          cpPoints={slot.cpPoints}
          gear={slot.gear}
          isDarkMode={isDarkMode}
          color={color}
        />
      </Box>
    </Box>
  );
};

// ============================================================
// Section label component
// ============================================================

const SectionLabel: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  isDarkMode: boolean;
}> = ({ icon, label, color, isDarkMode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${color}20`,
        border: `1px solid ${color}30`,
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        flex: 1,
        height: '1px',
        background: isDarkMode
          ? 'linear-gradient(90deg, rgba(255,255,255,0.07) 0%, transparent 100%)'
          : 'linear-gradient(90deg, rgba(0,0,0,0.07) 0%, transparent 100%)',
      }}
    />
  </Box>
);

// ============================================================
// Per-fight builds section
// ============================================================

interface PerFightSectionProps {
  roster: RaidRoster;
  trialOverrides: TrialBuildOverrides;
  isDarkMode: boolean;
}

const PerFightSection: React.FC<PerFightSectionProps> = ({
  roster,
  trialOverrides,
  isDarkMode,
}) => {
  const trial = getTrialById(trialOverrides.trialId);
  if (!trial) return null;

  const encountersWithOverrides = trial.encounters.filter((enc) =>
    encounterHasOverrides(trialOverrides.encounterBuilds[enc.id]),
  );

  const borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const bgColor = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  const accentColor = isDarkMode ? '#9c88ff' : '#6c5ce7';

  return (
    <Box sx={{ mb: 3 }}>
      <SectionLabel
        icon={<PerFightIcon sx={{ fontSize: '0.85rem', color: accentColor }} />}
        label={`Per-Fight Builds — ${trial.name}`}
        color={accentColor}
        isDarkMode={isDarkMode}
      />
      {trialOverrides.useSameBuildForAll ? (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: '10px',
            backgroundColor: bgColor,
            border: `1px solid ${borderColor}`,
          }}
        >
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            Same build used for all encounters.
          </Typography>
        </Paper>
      ) : encountersWithOverrides.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: '10px',
            backgroundColor: bgColor,
            border: `1px solid ${borderColor}`,
          }}
        >
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            No per-fight overrides configured.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {encountersWithOverrides.map((enc) => {
            const overrides = trialOverrides.encounterBuilds[enc.id];
            // Build player keys + labels from the roster composition
            const playerKeys: string[] = [];
            const labelMap: Record<string, string> = {};
            roster.tanks.forEach((_, i) => {
              const key = `tank:${i}`;
              playerKeys.push(key);
              labelMap[key] = i === 0 ? 'MT' : i === 1 ? 'OT' : `T${i + 1}`;
            });
            roster.healers.forEach((_, i) => {
              const key = `healer:${i}`;
              playerKeys.push(key);
              labelMap[key] = `H${i + 1}`;
            });

            return (
              <Paper
                key={enc.id}
                elevation={0}
                sx={{
                  p: 1.25,
                  borderRadius: '10px',
                  backgroundColor: bgColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: accentColor,
                    mb: 0.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {enc.name}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {playerKeys.map((key) => {
                    const o = overrides?.slots?.[key];
                    if (!o) return null;
                    const sets = [
                      o.set1
                        ? getSetDisplayName(o.set1 as import('../types/abilities').KnownSetIDs)
                        : null,
                      o.set2
                        ? getSetDisplayName(o.set2 as import('../types/abilities').KnownSetIDs)
                        : null,
                      o.monsterSet
                        ? getSetDisplayName(
                            o.monsterSet as import('../types/abilities').KnownSetIDs,
                          )
                        : null,
                    ].filter(Boolean);
                    if (!sets.length && !o.ultimate && !o.notes) return null;
                    return (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        <Typography
                          sx={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: 'text.disabled',
                            minWidth: 20,
                          }}
                        >
                          {labelMap[key]}:
                        </Typography>
                        {sets.map((s) => (
                          <Chip
                            key={s}
                            label={s}
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: '0.6rem',
                              fontWeight: 500,
                              backgroundColor: `${accentColor}18`,
                              color: accentColor,
                              border: `1px solid ${accentColor}30`,
                              '& .MuiChip-label': { px: 0.5 },
                            }}
                          />
                        ))}
                        {o.ultimate && (
                          <Typography
                            sx={{
                              fontSize: '0.68rem',
                              color: 'text.secondary',
                              fontStyle: 'italic',
                            }}
                          >
                            {o.ultimate}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                  {Object.entries(overrides?.slots ?? {})
                    .filter(([key]) => key.startsWith('dps:'))
                    .map(([key, slot]) => {
                      const dpsIdx = parseInt(key.split(':')[1], 10);
                      const sets = [
                        slot.set1
                          ? getSetDisplayName(slot.set1 as import('../types/abilities').KnownSetIDs)
                          : null,
                        slot.set2
                          ? getSetDisplayName(slot.set2 as import('../types/abilities').KnownSetIDs)
                          : null,
                        slot.monsterSet
                          ? getSetDisplayName(
                              slot.monsterSet as import('../types/abilities').KnownSetIDs,
                            )
                          : null,
                      ].filter(Boolean);
                      if (!sets.length && !slot.ultimate && !slot.notes) return null;
                      return (
                        <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                          <Typography
                            sx={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: 'text.disabled',
                              minWidth: 20,
                            }}
                          >
                            D{dpsIdx + 1}:
                          </Typography>
                          {sets.map((s) => (
                            <Chip
                              key={s}
                              label={s}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                fontWeight: 500,
                                backgroundColor: `${accentColor}18`,
                                color: accentColor,
                                border: `1px solid ${accentColor}30`,
                                '& .MuiChip-label': { px: 0.5 },
                              }}
                            />
                          ))}
                        </Box>
                      );
                    })}
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

// ============================================================
// Main page component
// ============================================================

export const RosterViewPage: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const roleColors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;

  // Preload skill cache so BuildDetailPanel can resolve ability names/icons
  useEffect(() => {
    void preloadSkillData();
  }, []);

  const [roster, setRoster] = useState<RaidRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [encodedParam, setEncodedParam] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'success' });
  const [recommendedAddons, setRecommendedAddons] = useState<RecommendedAddons | null>(null);
  const [addonsLoading, setAddonsLoading] = useState(false);

  // Default addons shown when no hub roster or no custom recommendations
  const DEFAULT_ADDONS: RecommendedAddonEntry[] = [
    {
      esouiId: 1855,
      name: "Code's Combat Alerts",
      note: 'Mechanic alerts for trials & dungeons',
      required: true,
    },
    {
      esouiId: 1355,
      name: 'RaidNotifier',
      note: 'Trial-specific warnings & ult sharing',
      required: true,
    },
    { esouiId: 1360, name: 'Combat Metrics', note: 'DPS meter & fight analysis', required: true },
    { esouiId: 2311, name: 'Hodor Reflexes', note: 'Group DPS & ultimate sharing', required: true },
    { esouiId: 1536, name: 'Action Duration Reminder', note: 'Buff/skill duration timers' },
    { esouiId: 3170, name: "Wizard's Wardrobe", note: 'Gear & skill setup management' },
  ];

  // Decode roster from ?r= or fetch by ?id= on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('r') ?? '';
    const hubId = params.get('id') ?? '';

    const onDecoded = (decoded: RaidRoster | null, rosterData: string): void => {
      if (decoded) {
        setRoster(decoded);
        setEncodedParam(rosterData);
      } else {
        setNotFound(true);
      }
      setLoading(false);
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'roster-preview-ready' }, window.location.origin);
      }
    };

    // If navigated from hub, fetch recommended addons
    const hubIdParam = params.get('hubId');
    if (hubIdParam) {
      setAddonsLoading(true);
      rosterHubApi
        .get(hubIdParam)
        .then(({ roster: hubRoster }) => {
          if (hubRoster.recommended_addons) {
            setRecommendedAddons(hubRoster.recommended_addons);
          }
        })
        .catch(() => {
          // Silently fall back to defaults
        })
        .finally(() => setAddonsLoading(false));
    }

    if (encoded) {
      setEncodedParam(encoded);
      void decodeRosterFromURL(encoded)
        .then((decoded) => onDecoded(decoded, encoded))
        .catch(() => {
          setNotFound(true);
          setLoading(false);
        });
    } else if (hubId) {
      // Direct-publish rosters (direct-* IDs) are stored in the bot's KV, not the hub API
      const fetchRosterData = hubId.startsWith('direct-')
        ? fetch(`${DISCORD_BOT_API_URL}/discord/roster/${encodeURIComponent(hubId)}/data`)
            .then((res) => {
              if (!res.ok) throw new Error('Not found');
              return res.json() as Promise<{ roster_data: string }>;
            })
            .then((json) => json.roster_data)
        : rosterHubApi.get(hubId).then((res) => res.roster.roster_data);

      void fetchRosterData
        .then((data) => decodeRosterFromURL(data).then((decoded) => onDecoded(decoded, data)))
        .catch(() => {
          setNotFound(true);
          setLoading(false);
        });
    } else {
      setNotFound(true);
      setLoading(false);
    }
  }, []);

  // Copy this shareable link to clipboard
  const handleCopyLink = (): void => {
    // Use current pathname so the link works in subdirectory deployments
    const url = `${window.location.origin}${window.location.pathname}?r=${encodedParam}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setSnackbar({ open: true, message: 'Link copied to clipboard!', severity: 'success' });
      })
      .catch(() => {
        setSnackbar({ open: true, message: 'Failed to copy link', severity: 'error' });
      });
  };

  // Open the roster in the builder for editing
  const handleOpenInBuilder = (): void => {
    // Strip /rv suffix to get base path
    const basePath = window.location.pathname.replace(/\/rv(\/.*)?$/, '');
    const url = `${window.location.origin}${basePath}/roster-builder?r=${encodedParam}`;
    // When rendered inside an iframe (embed preview), navigate the top-level window
    // so the builder loads as a full page rather than inside the iframe.
    if (window.top && window.parent !== window) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  };

  // Copy discord format text
  const handleCopyDiscord = (): void => {
    if (!roster) return;
    const text = buildDiscordText(roster);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSnackbar({
          open: true,
          message: 'Discord format copied!',
          severity: 'success',
        });
      })
      .catch(() => {
        setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' });
      });
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6, px: { xs: 2, sm: 3 } }}>
        <Skeleton variant="text" width="40%" height={48} sx={{ mb: 3, borderRadius: 2 }} />
        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}
        >
          {[...Array<number>(4)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  // ---- Not found state ----
  if (notFound || !roster) {
    return (
      <Container maxWidth="sm" sx={{ pt: 8, pb: 6 }}>
        <Alert
          severity="error"
          sx={{
            borderRadius: '14px',
            mb: 2,
          }}
        >
          No roster found in the URL. Please check the link and try again.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => {
            window.location.href = '/roster-builder';
          }}
          sx={{ borderRadius: '10px', textTransform: 'none' }}
        >
          Open Roster Builder
        </Button>
      </Container>
    );
  }

  const sortedDPS = [...roster.dpsSlots].sort((a, b) => a.slotNumber - b.slotNumber);

  return (
    <Container maxWidth="lg" sx={{ pt: 3, pb: 6, px: { xs: 2, sm: 3 } }}>
      {/* ── Page header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 0.25,
            }}
          >
            Roster (Read-Only)
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: { xs: '1.35rem', sm: '1.6rem' },
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              background: isDarkMode
                ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {roster.rosterName || 'Unnamed Roster'}
          </Typography>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            startIcon={<CopyIcon sx={{ fontSize: '0.85rem !important' }} />}
            onClick={handleCopyLink}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.12)',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            Copy Link
          </Button>
          <Button
            size="small"
            startIcon={<EditIcon sx={{ fontSize: '0.85rem !important' }} />}
            onClick={handleOpenInBuilder}
            endIcon={<OpenInNewIcon sx={{ fontSize: '0.75rem !important' }} />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: isDarkMode ? '#f1f5f9' : '#0f172a',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.12)'
                : '1px solid rgba(0,0,0,0.12)',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.09)',
              },
            }}
          >
            Edit Roster
          </Button>
        </Box>
      </Box>

      <Divider
        sx={{
          mb: 3,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }}
      />

      {/* ── Tanks section ── */}
      <Box sx={{ mb: 3 }}>
        <SectionLabel
          icon={<ShieldIcon sx={{ fontSize: '0.85rem', color: roleColors.tank }} />}
          label="Tanks"
          color={roleColors.tank}
          isDarkMode={isDarkMode}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
            alignItems: 'stretch',
          }}
        >
          {roster.tanks.map((tank, i) => (
            <TankCard
              key={i}
              tank={tank}
              slotNum={i + 1}
              label={i === 0 ? 'MT' : i === 1 ? 'OT' : `T${i + 1}`}
              color={roleColors.tank}
              isDarkMode={isDarkMode}
            />
          ))}
        </Box>
      </Box>

      {/* ── Healers section ── */}
      <Box sx={{ mb: 3 }}>
        <SectionLabel
          icon={<FavoriteIcon sx={{ fontSize: '0.85rem', color: roleColors.healer }} />}
          label="Healers"
          color={roleColors.healer}
          isDarkMode={isDarkMode}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
            alignItems: 'stretch',
          }}
        >
          {roster.healers.map((healer, i) => (
            <HealerCard
              key={i}
              healer={healer}
              slotNum={i + 1}
              label={`H${i + 1}`}
              color={roleColors.healer}
              isDarkMode={isDarkMode}
            />
          ))}
        </Box>
      </Box>

      {/* ── DPS section ── */}
      <Box sx={{ mb: 3 }}>
        <SectionLabel
          icon={<DPSIcon sx={{ fontSize: '0.85rem', color: roleColors.dps }} />}
          label="DPS"
          color={roleColors.dps}
          isDarkMode={isDarkMode}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sortedDPS.map((slot) => (
            <DPSRow
              key={slot.slotNumber}
              slot={slot}
              color={roleColors.dps}
              isDarkMode={isDarkMode}
            />
          ))}
        </Box>
      </Box>

      {/* ── Per-fight builds ── */}
      {roster.trialOverrides && (
        <PerFightSection
          roster={roster}
          trialOverrides={roster.trialOverrides}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ── Notes ── */}
      {roster.notes && (
        <Box sx={{ mb: 3 }}>
          <SectionLabel
            icon={
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
                }}
              />
            }
            label="Notes"
            color={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
            isDarkMode={isDarkMode}
          />
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '14px',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.82rem',
                color: 'text.secondary',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                lineHeight: 1.6,
              }}
            >
              {roster.notes}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* ── Recommended Addons section ── */}
      {(() => {
        const addons = recommendedAddons?.addons ?? DEFAULT_ADDONS;
        const isCustom = !!recommendedAddons;
        const packId = recommendedAddons?.packId ?? (isCustom ? undefined : 'trial-essentials');
        return (
          <Box sx={{ mb: 3 }}>
            <SectionLabel
              icon={<ExtensionIcon sx={{ fontSize: '0.85rem', color: '#c4a44a' }} />}
              label="Recommended Addons"
              color="#c4a44a"
              isDarkMode={isDarkMode}
            />
            <Paper
              elevation={0}
              sx={{
                borderRadius: '14px',
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
                border: `1px solid ${isDarkMode ? 'rgba(196,164,74,0.15)' : 'rgba(196,164,74,0.2)'}`,
                backdropFilter: 'blur(12px)',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ p: 2, pb: 1.5 }}>
                <Typography
                  sx={{
                    fontSize: '0.82rem',
                    color: 'text.secondary',
                    lineHeight: 1.6,
                    mb: addonsLoading ? 0 : 1.5,
                  }}
                >
                  {addonsLoading
                    ? 'Loading addon recommendations…'
                    : isCustom
                      ? 'The roster creator recommends these addons. Install them all with one click using Kalpa.'
                      : 'These addons are essential for trial content. Install them all with one click using Kalpa.'}
                </Typography>
              </Box>

              {/* Addon list */}
              {!addonsLoading &&
                addons.map((addon, i) => (
                  <Box
                    key={addon.esouiId}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1,
                      borderTop:
                        i === 0
                          ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`
                          : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                    }}
                  >
                    {/* Gold dot for required, gray for optional */}
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: addon.required
                          ? '#c4a44a'
                          : isDarkMode
                            ? 'rgba(255,255,255,0.2)'
                            : 'rgba(0,0,0,0.15)',
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)',
                          lineHeight: 1.3,
                        }}
                      >
                        {addon.name}
                      </Typography>
                      {addon.note && (
                        <Typography
                          sx={{
                            fontSize: '0.72rem',
                            color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                            lineHeight: 1.3,
                          }}
                        >
                          {addon.note}
                        </Typography>
                      )}
                    </Box>
                    {addon.required && (
                      <Chip
                        label="Required"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          letterSpacing: '0.03em',
                          bgcolor: 'rgba(196,164,74,0.12)',
                          color: '#c4a44a',
                          border: '1px solid rgba(196,164,74,0.25)',
                        }}
                      />
                    )}
                  </Box>
                ))}

              {/* Install CTA */}
              {!addonsLoading && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.5,
                    borderTop: `1px solid ${isDarkMode ? 'rgba(196,164,74,0.12)' : 'rgba(196,164,74,0.15)'}`,
                    background: isDarkMode ? 'rgba(196,164,74,0.04)' : 'rgba(196,164,74,0.06)',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                    }}
                  >
                    {addons.length} addon{addons.length !== 1 ? 's' : ''} &middot;{' '}
                    Install all at once
                  </Typography>
                  {packId ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<ExtensionIcon sx={{ fontSize: '0.85rem !important' }} />}
                      onClick={() => {
                        const deepLink = getAddonManagerDeepLink(packId);
                        window.location.href = deepLink;
                        // Fallback: if Kalpa is not installed, the browser silently fails.
                        // After a delay, copy the deep link to clipboard as a fallback.
                        setTimeout(() => {
                          void navigator.clipboard.writeText(deepLink).then(() => {
                            setSnackbar({
                              open: true,
                              message: 'Deep link copied — install Kalpa to use it',
                              severity: 'info',
                            });
                          });
                        }, 1500);
                      }}
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #c4a44a 0%, #d4b45a 100%)',
                        color: '#0b1220',
                        boxShadow: '0 2px 8px rgba(196,164,74,0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #d4b45a 0%, #e4c46a 100%)',
                          boxShadow: '0 4px 16px rgba(196,164,74,0.4)',
                        },
                      }}
                    >
                      Open in Kalpa
                    </Button>
                  ) : (
                    <Tooltip title="No pack ID — copy the addon list manually">
                      <Typography
                        sx={{
                          fontSize: '0.72rem',
                          color: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                          fontStyle: 'italic',
                        }}
                      >
                        No linked pack
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        );
      })()}

      {/* ── Discord copy row ── */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
        <Button
          size="small"
          startIcon={<CopyIcon sx={{ fontSize: '0.85rem !important' }} />}
          onClick={handleCopyDiscord}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            },
          }}
        >
          Copy Discord Format
        </Button>
      </Box>

      {/* ── Snackbar feedback ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ borderRadius: '10px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// ============================================================
// Discord text builder (mirrors generateDiscordFormat in RosterBuilderPage)
// ============================================================

function buildDiscordText(roster: RaidRoster): string {
  const lines: string[] = [];
  lines.push(`**${roster.rosterName}**`, '');

  const fmtUlt = (u: string | null): string => (u ? ` [${u}]` : '');
  const fmtSkillLines = (
    sl: { line1?: string; line2?: string; line3?: string; isFlex?: boolean } | undefined,
  ): string => {
    if (!sl) return '';
    if (sl.isFlex) return 'Flexible';
    return [sl.line1, sl.line2, sl.line3].filter(Boolean).join('/');
  };
  const fmtGear = (
    sets: {
      set1?: import('../types/abilities').KnownSetIDs;
      set2?: import('../types/abilities').KnownSetIDs;
      monsterSet?: import('../types/abilities').KnownSetIDs;
      additionalSets?: import('../types/abilities').KnownSetIDs[];
    } | null,
  ): string => formatGearSets(sets).join('/');

  // Tanks — skip completely empty slots (single-tank comps)
  roster.tanks.forEach((tank, i) => {
    const hasData =
      tank.playerName ||
      tank.labels?.length ||
      tank.gearSets?.set1 ||
      tank.gearSets?.set2 ||
      tank.notes;
    if (!hasData) return;
    const lbl = i === 0 ? 'MT' : i === 1 ? 'OT' : `T${i + 1}`;
    const pn = tank.playerName ? ` ${tank.playerName}` : '';
    const lbs = tank.labels?.length ? ` (${tank.labels.join(', ')})` : '';
    lines.push(`${lbl}:${pn}${lbs}`);
    const g = fmtGear(tank.gearSets);
    if (g) lines.push(g);
    const sl = fmtSkillLines(tank.skillLines);
    const ult = fmtUlt(tank.ultimate);
    if (sl || ult) lines.push(`${sl}${ult}`);
    if (tank.notes) lines.push(`Notes: ${tank.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬', '');

  // Healers — skip completely empty slots (single-healer comps)
  roster.healers.forEach((h, i) => {
    const hasData = h.playerName || h.labels?.length || h.set1 || h.set2 || h.notes;
    if (!hasData) return;
    const lbl = h.roleLabel || `H${i + 1}`;
    const pn = h.playerName ? ` ${h.playerName}` : '';
    const lbs = h.labels?.length ? ` [${h.labels.join(', ')}]` : '';
    lines.push(`${lbl}:${pn}${lbs}`);
    const g = fmtGear({
      set1: h.set1,
      set2: h.set2,
      monsterSet: h.monsterSet,
      additionalSets: h.additionalSets,
    });
    if (g) lines.push(g);
    if (h.healerBuff) lines.push(h.healerBuff);
    const sl = fmtSkillLines(h.skillLines);
    const ult = fmtUlt(h.ultimate);
    if (sl || ult) lines.push(`${sl}${ult}`);
    if (h.notes) lines.push(`Notes: ${h.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬', '');

  // DPS — skip fully empty slots
  const sorted = [...roster.dpsSlots].sort((a, b) => a.slotNumber - b.slotNumber);
  sorted.forEach((dd) => {
    if (!dd.playerName && !dd.labels?.length && !dd.jailDDType) return;
    const pn = dd.playerName ? ` ${dd.playerName}` : '';
    const jl = dd.jailDDType
      ? ` [${DPS_JAIL_LABELS[dd.jailDDType] ?? dd.customDescription ?? ''}]`
      : '';
    const lbs = dd.labels?.length ? ` (${dd.labels.join(', ')})` : '';
    lines.push(`${dd.slotNumber}${jl}:${pn}${lbs}`);
    // Prefer structured fields; fall back to legacy gearSets flat array
    const dpsGear =
      dd.set1 != null || dd.set2 != null || dd.monsterSet != null
        ? [
            ...formatGearSets({
              set1: dd.set1,
              set2: dd.set2,
              monsterSet: dd.monsterSet,
              additionalSets: dd.additionalSets,
            }),
            ...(dd.arenaWeapon ? [dd.arenaWeapon] : []),
          ].join('/')
        : (dd.gearSets ?? [])
            .map((id) => getSetDisplayName(id))
            .filter(Boolean)
            .join('/');
    if (dpsGear) lines.push(dpsGear);
    const sl = dd.skillLines ? fmtSkillLines(dd.skillLines) : '';
    const ult = dd.ultimate ? fmtUlt(dd.ultimate) : '';
    if (sl || ult) lines.push(`${sl}${ult}`);
  });
  lines.push('');

  if (roster.notes) {
    lines.push('**General Notes:**', roster.notes, '');
  }

  return lines.join('\n');
}
