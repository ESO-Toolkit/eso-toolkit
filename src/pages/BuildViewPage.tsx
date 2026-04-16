/**
 * BuildViewPage — read-only, shareable view of a build.
 *
 * Accessible via direct link: /bv?b=<encoded>
 * Uses the same glassmorphism design system as the build editor but in
 * read-only presentation mode.
 */

import {
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  FitnessCenter as FitnessIcon,
  LocalFireDepartment as WarfareIcon,
  OpenInNew as OpenInNewIcon,
  YouTube as YouTubeIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Skeleton,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ESO_CONSUMABLE_LOOKUP } from '../data/esoConsumables';
import { getEnchantName } from '../data/esoEnchants';
import { ESO_POTION_LOOKUP } from '../data/esoPotions';
import { getTraitName } from '../data/esoTraits';
import { staggerContainer, fadeInUp } from '../features/build-editor/components/motion/variants';
import { GlassPanel } from '../features/build-editor/components/primitives/GlassPanel';
import { StatBreakdown } from '../features/build-editor/components/primitives/StatBreakdown';
import { StatGauge } from '../features/build-editor/components/primitives/StatGauge';
import { CP_PASSIVES_BY_TREE } from '../features/build-editor/data/championPassives';
import { CLASS_SKILL_LINES } from '../features/build-editor/data/esoStaticData';
import { calculateBuildStats } from '../features/build-editor/engine/stat-engine';
import { BE_TOKENS } from '../features/build-editor/theme/buildEditorTokens';
import { CLASS_COLOR_MAP } from '../features/build-editor/theme/classColorMap';
import type { Build, BuildSetup, CombatRole } from '../features/build-editor/types/build.types';
import { BuildViewShell } from '../features/build-viewer/components/BuildViewShell';
import { ViewAttributeBar } from '../features/build-viewer/components/ViewAttributeBar';
import { getItemInfo, getSetItemsBySlot } from '../features/loadout-manager/data/itemIdMap';
import { getSkillById, preloadSkillData } from '../features/loadout-manager/data/skillLineSkills';
import type { SlotType } from '../features/loadout-manager/data/slotTypes';
import {
  getItemIconUrl,
  fetchItemIconUrl,
  deriveItemNameForSlot,
} from '../features/loadout-manager/utils/itemIconResolver';
import { CHAMPION_POINT_ABILITIES, ChampionPointAbilityId } from '../types/champion-points';
import { decodeBuildFromURL } from '../utils/buildEncoding';
import { getEsoHubSkillLineUrl } from '../utils/esoHubLinks';

// ─── Icon CDNs ────────────────────────────────────────────────────────────────

const SKILL_ICON_URL = 'https://eso-hub.com/storage/icons/';

/** Resolve an icon value to a full URL, handling both short names and full URLs. */
const resolveIconUrl = (icon: string): string =>
  icon.startsWith('http') ? icon : `${SKILL_ICON_URL}${icon}.png`;

/**
 * Ensure the skill cache is populated before rendering skill slots.
 * The cache initializes synchronously so this is a no-op after the first call.
 */
function useSkillCacheReady(): boolean {
  preloadSkillData();
  return true;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const CLASS_LABELS: Record<string, string> = {
  'any-class': 'Any Class',
  dragonknight: 'Dragonknight',
  sorcerer: 'Sorcerer',
  nightblade: 'Nightblade',
  templar: 'Templar',
  warden: 'Warden',
  necromancer: 'Necromancer',
  arcanist: 'Arcanist',
};

const ROLE_LABELS: Record<string, string> = {
  tank: 'Tank',
  healer: 'Healer',
  'magicka-dps': 'Magicka DPS',
  'stamina-dps': 'Stamina DPS',
  'hybrid-dps': 'Hybrid DPS',
};

const ROLE_EMOJI: Record<CombatRole, string> = {
  tank: '\u{1F6E1}',
  healer: '\u{1FA7A}',
  'magicka-dps': '\u{2728}',
  'stamina-dps': '\u{2694}',
  'hybrid-dps': '\u{1F300}',
};

const CLASS_EMOJI: Record<string, string> = {
  'any-class': '⚔️',
  dragonknight: '🐉',
  sorcerer: '⚡',
  nightblade: '🗡️',
  templar: '☀️',
  warden: '🌿',
  necromancer: '💀',
  arcanist: '📖',
};

const GEAR_SLOT_NAMES: Record<number, string> = {
  0: 'Head',
  1: 'Neck',
  2: 'Chest',
  3: 'Shoulders',
  4: 'Main Hand',
  5: 'Off Hand',
  6: 'Belt',
  8: 'Legs',
  9: 'Feet',
  11: 'Ring 1',
  12: 'Ring 2',
  16: 'Gloves',
  20: 'Back Main Hand',
  21: 'Back Off Hand',
};

const GEAR_SLOT_ORDER = [0, 2, 3, 16, 6, 8, 9, 1, 11, 12, 4, 5, 20, 21];

/** Slot-type emoji fallback shown when no icon URL is available (e.g. LibSets IDs). */
const GEAR_SLOT_ICONS: Record<number, string> = {
  0: '🪖', // Head
  1: '📿', // Neck
  2: '🧥', // Chest
  3: '🦺', // Shoulders
  4: '⚔️', // Main Hand
  5: '🛡️', // Off Hand
  6: '🩲', // Belt
  8: '👖', // Legs
  9: '👢', // Feet
  11: '💍', // Ring 1
  12: '💍', // Ring 2
  16: '🧤', // Gloves
  20: '⚔️', // Back Main Hand
  21: '🛡️', // Back Off Hand
};

/** Maps ESO equipment slot indices to the SlotType used in itemIdMap. */
const SLOT_INDEX_TO_TYPE: Record<number, SlotType> = {
  0: 'head',
  1: 'neck',
  2: 'chest',
  3: 'shoulders',
  4: 'weapon',
  5: 'offhand',
  6: 'waist',
  8: 'legs',
  9: 'feet',
  11: 'ring',
  12: 'ring',
  16: 'hand',
  20: 'weapon',
  21: 'offhand',
};

const MUNDUS_LABELS: Record<string, string> = {
  thief: 'The Thief',
  atronach: 'The Atronach',
  shadow: 'The Shadow',
  lover: 'The Lover',
  warrior: 'The Warrior',
  mage: 'The Mage',
  apprentice: 'The Apprentice',
  serpent: 'The Serpent',
  ritual: 'The Ritual',
  steed: 'The Steed',
  lady: 'The Lady',
  lord: 'The Lord',
  tower: 'The Tower',
};

// ─── Passive grid helper ──────────────────────────────────────────────────────

/**
 * Returns the optimal column count for the passive grid.
 * Last-row items always stretch to fill available space via a flex fallback row.
 * 6→3(3+3), 8→4(4+4), 5→3(3+2 stretched), 7→3(3+3+1 stretched)
 */
const getPassiveCols = (n: number): number => {
  if (n <= 3) return Math.max(n, 1);
  if (n % 4 === 0) return 4;
  if (n % 3 === 0) return 3;
  return 3;
};

// ─── Section label ────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{
  label: string;
  count?: string;
  icon?: React.ReactNode;
}> = ({ label, count, icon }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      {icon && (
        <Box
          sx={{
            color: 'var(--be-accent, #38bdf8)',
            fontSize: 16,
            display: 'flex',
            opacity: 0.7,
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        sx={{
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
          fontFamily: 'Space Grotesk, Inter, system-ui',
        }}
      >
        {label}
      </Typography>
      {count && (
        <Typography
          sx={{
            fontSize: '0.55rem',
            fontWeight: 600,
            color: 'var(--be-accent, #38bdf8)',
            opacity: 0.7,
            ml: 'auto',
          }}
        >
          {count}
        </Typography>
      )}
    </Box>
  );
};

// ─── Empty state placeholder ──────────────────────────────────────────────────

const EmptyState: React.FC<{ message?: string }> = ({ message = 'Not configured' }) => {
  const isDark = useTheme().palette.mode === 'dark';
  return (
    <Box
      sx={{
        py: 2.5,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
        border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
        background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.72rem',
          fontWeight: 500,
          fontStyle: 'italic',
          color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)',
          fontFamily: 'Space Grotesk, Inter, system-ui',
          letterSpacing: '0.02em',
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

// ─── Skill slot display ───────────────────────────────────────────────────────

const TILE_SIZE = 58;
const ULT_SIZE = 66;
const ULTIMATE_SLOT = 5;
const SLOT_LABELS: Record<number, string> = { 0: '1', 1: '2', 2: '3', 3: '4', 4: '5', 5: 'R' };

const SkillSlot: React.FC<{
  slotIndex: number;
  abilityId: number;
  isUltimate?: boolean;
}> = ({ slotIndex, abilityId, isUltimate = false }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const skill = abilityId ? getSkillById(abilityId) : null;
  const iconUrl = skill?.icon ? resolveIconUrl(skill.icon) : null;
  const size = isUltimate ? ULT_SIZE : TILE_SIZE;
  const label = SLOT_LABELS[slotIndex] ?? String(slotIndex);
  const esoHubUrl = skill?.category ? getEsoHubSkillLineUrl(skill.category) : undefined;

  /** Gold accent for ultimate, class accent for regular abilities */
  const accentA = (a: number): string =>
    isUltimate ? `rgba(255,179,0,${a})` : `rgba(var(--be-accent-rgb, 56,189,248),${a})`;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        flex: isUltimate ? undefined : 1,
        maxWidth: isUltimate ? ULT_SIZE : TILE_SIZE + 16,
        minWidth: isUltimate ? ULT_SIZE : TILE_SIZE,
      }}
    >
      <Tooltip
        title={
          skill
            ? `${skill.name}${skill.category ? ` \u00b7 ${skill.category}` : ''}`
            : `Slot ${label}${isUltimate ? ' (Ultimate)' : ''}`
        }
        arrow
        placement="top"
      >
        {esoHubUrl ? (
          <Box
            component="a"
            href={esoHubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            aria-label={`${skill?.name ?? ''} on ESO-Hub`}
            sx={{ display: 'inline-flex', lineHeight: 0 }}
          >
            <Box
              sx={{
                position: 'relative',
                width: size,
                height: size,
                borderRadius: isUltimate ? '14px' : '12px',
                overflow: 'hidden',
                flexShrink: 0,
                border: `${isUltimate ? 2 : 1.5}px solid ${accentA(0.45)}`,
                background: isDark ? accentA(0.08) : accentA(0.04),
                boxShadow: isDark
                  ? `0 0 14px ${accentA(0.12)}, inset 0 1px 0 rgba(255,255,255,0.04)`
                  : 'inset 0 1px 0 rgba(255,255,255,0.5)',
                transition: 'all 180ms ease',
                '&:hover': {
                  transform: 'scale(1.08)',
                  borderColor: accentA(0.7),
                  background: isDark ? accentA(0.14) : accentA(0.08),
                  boxShadow: isDark
                    ? `0 6px 20px rgba(0,0,0,0.30), 0 0 18px ${accentA(0.16)}`
                    : '0 6px 16px rgba(0,0,0,0.08)',
                },
              }}
            >
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={skill?.name ?? `Ability ${abilityId}`}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: isUltimate ? 16 : 13,
                      fontWeight: 800,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      letterSpacing: 0.4,
                      color: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.13)',
                      lineHeight: 1,
                      userSelect: 'none',
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              position: 'relative',
              width: size,
              height: size,
              borderRadius: isUltimate ? '14px' : '12px',
              overflow: 'hidden',
              flexShrink: 0,
              border: `${isUltimate ? 2 : 1.5}px solid ${
                skill ? accentA(0.45) : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'
              }`,
              background: skill
                ? isDark
                  ? accentA(0.08)
                  : accentA(0.04)
                : isDark
                  ? 'rgba(255,255,255,0.025)'
                  : 'rgba(0,0,0,0.015)',
              boxShadow: skill
                ? isDark
                  ? `0 0 14px ${accentA(0.12)}, inset 0 1px 0 rgba(255,255,255,0.04)`
                  : 'inset 0 1px 0 rgba(255,255,255,0.5)'
                : isDark
                  ? 'inset 0 1px 0 rgba(255,255,255,0.025)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.4)',
              transition: 'all 180ms ease',
              '&:hover': {
                transform: 'scale(1.08)',
                borderColor: accentA(0.7),
                background: isDark ? accentA(0.14) : accentA(0.08),
                boxShadow: isDark
                  ? `0 6px 20px rgba(0,0,0,0.30), 0 0 18px ${accentA(0.16)}`
                  : '0 6px 16px rgba(0,0,0,0.08)',
              },
            }}
          >
            {/* Skill icon */}
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={skill?.name ?? `Ability ${abilityId}`}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <Typography
                  sx={{
                    fontSize: isUltimate ? 16 : 13,
                    fontWeight: 800,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    letterSpacing: 0.4,
                    color: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.13)',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  {label}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Tooltip>

      {/* Skill name (only when resolved) */}
      {skill && (
        <Typography
          sx={{
            fontSize: '0.58rem',
            fontWeight: 600,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.45)',
            lineHeight: 1.15,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
            maxWidth: size + 8,
            userSelect: 'none',
          }}
        >
          {skill.name}
        </Typography>
      )}
    </Box>
  );
};

// ─── Gear slot display ────────────────────────────────────────────────────────

const GearSlotDisplay: React.FC<{
  slotIndex: number;
  itemId: number;
  trait?: string;
  enchant?: string;
}> = ({ slotIndex, itemId, trait, enchant }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const slotName = GEAR_SLOT_NAMES[slotIndex] ?? `Slot ${slotIndex}`;
  const itemInfo = getItemInfo(itemId);

  // itemIdMap contains two types of entries:
  //   1. Slot-specific items (e.g. 97217 = "Mother's Sorrow Ring", slot: 'ring') — have correct icons
  //   2. Generic set pieces (e.g. 2558 = "Mother's Sorrow Gear", no slot field) — LibSets set IDs
  //      whose numeric values collide with unrelated items in UESP's icon database.
  //
  // For type 2, resolve the correct slot-specific ID via getSetItemsBySlot so we get the right icon.
  const expectedSlot = SLOT_INDEX_TO_TYPE[slotIndex];
  const resolvedIconId = (() => {
    if (!itemInfo) return itemId; // not in itemIdMap → treat as real UESP ID
    if (itemInfo.slot) {
      // Dual-wield: a weapon-slot item legitimately belongs in an off-hand
      // slot (slot 5 / 21). ESO allows Sword/Dagger/Axe/Mace off-hands but
      // not shields in the main hand, so the asymmetry is intentional.
      const slotMatch =
        itemInfo.slot === expectedSlot ||
        !expectedSlot ||
        (itemInfo.slot === 'weapon' && expectedSlot === 'offhand');
      if (slotMatch) return itemId;
    }
    // Generic set ID or unsupported slot mismatch: find the slot-specific
    // item for this set + slot so we render the right icon.
    if (!expectedSlot) return null;
    const slotItems = getSetItemsBySlot(itemInfo.setName, expectedSlot);
    return slotItems[0] ?? null; // use first match (all CP160 variants share the same icon)
  })();

  const [iconUrl, setIconUrl] = useState<string | null>(() =>
    resolvedIconId != null ? getItemIconUrl(resolvedIconId) : null,
  );

  useEffect(() => {
    if (iconUrl || resolvedIconId == null) return;
    void fetchItemIconUrl(resolvedIconId).then((url) => {
      if (url) setIconUrl(url);
    });
  }, [resolvedIconId, iconUrl]);

  // Swap the generic " Weapon"/" Off-Hand"/" Gear" suffix for a specific
  // type (Sword, Dagger, Bow, …) parsed from the resolved icon URL. Uses
  // `iconUrl` state so the label stays in lockstep with whatever icon is
  // actually rendered — including the async UESP fallback, which updates
  // `iconUrl` after the fetch completes.
  //
  // `deriveItemNameForSlot` guards on the STORED itemId's slot metadata,
  // so generic set IDs (no slot field → arbitrary fallback icon from
  // `getSetItemsBySlot(...)[0]`) keep their generic label rather than
  // falsely asserting a weapon type the user may not have chosen.
  const displayName = deriveItemNameForSlot(itemId, expectedSlot, iconUrl);
  const setName = itemInfo?.setName;
  const traitLabel = trait ? getTraitName(trait) : null;
  const enchantLabel = enchant ? getEnchantName(enchant) : null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        py: 0.5,
        px: 1,
        borderRadius: 2,
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        transition: 'border-color 0.2s',
        '&:hover': {
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* Item icon */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={displayName}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Typography sx={{ fontSize: 16, lineHeight: 1, userSelect: 'none' }}>
            {GEAR_SLOT_ICONS[slotIndex] ?? '📦'}
          </Typography>
        )}
      </Box>

      {/* Slot label */}
      <Typography
        sx={{
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
          minWidth: 75,
          flexShrink: 0,
          fontFamily: 'Space Grotesk, Inter, system-ui',
        }}
      >
        {slotName}
      </Typography>

      {/* Item name + set name + trait/enchant */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          title={displayName}
          sx={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </Typography>
        {setName && setName !== displayName && (
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 500,
              color: 'var(--be-accent, #38bdf8)',
              opacity: 0.7,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {setName}
          </Typography>
        )}
        {(traitLabel || enchantLabel) && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, flexWrap: 'wrap' }}>
            {traitLabel && (
              <Typography
                component="span"
                sx={{
                  fontSize: '0.55rem',
                  fontWeight: 600,
                  px: 0.5,
                  py: 0.1,
                  borderRadius: 0.75,
                  background: isDark ? 'rgba(255,179,0,0.12)' : 'rgba(255,179,0,0.10)',
                  border: '1px solid rgba(255,179,0,0.25)',
                  color: isDark ? 'rgba(255,200,60,0.85)' : 'rgba(160,100,0,0.85)',
                  letterSpacing: '0.02em',
                  lineHeight: 1.6,
                  whiteSpace: 'nowrap',
                }}
              >
                {traitLabel}
              </Typography>
            )}
            {enchantLabel && (
              <Typography
                component="span"
                sx={{
                  fontSize: '0.55rem',
                  fontWeight: 600,
                  px: 0.5,
                  py: 0.1,
                  borderRadius: 0.75,
                  background: isDark
                    ? 'rgba(var(--be-accent-rgb, 56,189,248),0.10)'
                    : 'rgba(var(--be-accent-rgb, 56,189,248),0.08)',
                  border: '1px solid rgba(var(--be-accent-rgb, 56,189,248),0.22)',
                  color: isDark
                    ? 'rgba(var(--be-accent-rgb, 56,189,248),0.90)'
                    : 'rgba(var(--be-accent-rgb, 56,189,248),1.0)',
                  letterSpacing: '0.02em',
                  lineHeight: 1.6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 130,
                  display: 'block',
                }}
              >
                {enchantLabel}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── Setup display ────────────────────────────────────────────────────────────

const SetupDisplay: React.FC<{ setup: BuildSetup; build: Build; races?: string[] }> = ({
  setup,
  build: viewBuild,
  races = [],
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const totalAttributes =
    setup.attributes.magicka + setup.attributes.health + setup.attributes.stamina;

  const gearEntries = GEAR_SLOT_ORDER.filter((slot) => setup.gear[slot]?.id != null).map(
    (slot) => ({
      slot,
      id: setup.gear[slot].id as number,
      trait: setup.gear[slot].trait,
      enchant: setup.gear[slot].enchant,
    }),
  );

  const frontBar = Object.entries(setup.skills[0] ?? {})
    .map(([slot, id]) => ({ slot: Number(slot), id }))
    .sort((a, b) => a.slot - b.slot);
  const backBar = Object.entries(setup.skills[1] ?? {})
    .map(([slot, id]) => ({ slot: Number(slot), id }))
    .sort((a, b) => a.slot - b.slot);

  const cpSlots = [
    ...setup.cp.warfare.slots.filter((s): s is number => s !== null),
    ...setup.cp.fitness.slots.filter((s): s is number => s !== null),
    ...setup.cp.craft.slots.filter((s): s is number => s !== null),
  ];
  const cpPassiveCount =
    Object.keys(setup.cp.warfare.passives).length +
    Object.keys(setup.cp.fitness.passives).length +
    Object.keys(setup.cp.craft.passives).length;

  const foodName =
    setup.consumables.food.id != null
      ? (ESO_CONSUMABLE_LOOKUP[setup.consumables.food.id]?.name ??
        `Food #${setup.consumables.food.id}`)
      : null;
  const mundusLabel = setup.mundusStone
    ? (MUNDUS_LABELS[setup.mundusStone] ?? setup.mundusStone)
    : null;
  const curseLabel = setup.curse && setup.curse !== 'none' ? setup.curse : null;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      {/* Row 1: Attributes + Character */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <motion.div variants={fadeInUp} style={{ height: '100%' }}>
          <GlassPanel
            variant="default"
            sx={{
              p: 2,
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SectionLabel label="Attributes" count={`${totalAttributes} / 64`} />

            {/* Bars — flex so they spread to fill available height */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-evenly',
              }}
            >
              <ViewAttributeBar
                label="Magicka"
                color={BE_TOKENS.attributes.magicka}
                value={setup.attributes.magicka}
                max={64}
              />
              <ViewAttributeBar
                label="Health"
                color={BE_TOKENS.attributes.health}
                value={setup.attributes.health}
                max={64}
              />
              <ViewAttributeBar
                label="Stamina"
                color={BE_TOKENS.attributes.stamina}
                value={setup.attributes.stamina}
                max={64}
              />
            </Box>

            {/* Distribution summary */}
            {totalAttributes > 0 && (
              <Box sx={{ pt: 1.5, mt: 'auto' }}>
                <Typography
                  sx={{
                    fontSize: '0.52rem',
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
                    mb: 0.6,
                  }}
                >
                  Distribution
                </Typography>

                {/* Segmented bar */}
                <Box
                  sx={{
                    display: 'flex',
                    height: 10,
                    borderRadius: 5,
                    overflow: 'hidden',
                    gap: '2px',
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  {[
                    { value: setup.attributes.magicka, color: BE_TOKENS.attributes.magicka },
                    { value: setup.attributes.health, color: BE_TOKENS.attributes.health },
                    { value: setup.attributes.stamina, color: BE_TOKENS.attributes.stamina },
                  ]
                    .filter((seg) => seg.value > 0)
                    .map((seg, i) => (
                      <Box
                        key={i}
                        sx={{
                          flex: seg.value,
                          background: `linear-gradient(90deg, ${seg.color} 0%, ${alpha(seg.color, 0.7)} 100%)`,
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15)`,
                        }}
                      />
                    ))}
                </Box>

                {/* Legend row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
                  {[
                    {
                      label: 'Mag',
                      value: setup.attributes.magicka,
                      color: BE_TOKENS.attributes.magicka,
                    },
                    {
                      label: 'HP',
                      value: setup.attributes.health,
                      color: BE_TOKENS.attributes.health,
                    },
                    {
                      label: 'Stam',
                      value: setup.attributes.stamina,
                      color: BE_TOKENS.attributes.stamina,
                    },
                  ].map(({ label, value, color }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: color,
                          boxShadow: `0 0 4px ${alpha(color, 0.5)}`,
                          opacity: value > 0 ? 1 : 0.3,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.58rem',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                          color:
                            value > 0
                              ? color
                              : isDark
                                ? 'rgba(255,255,255,0.25)'
                                : 'rgba(0,0,0,0.25)',
                        }}
                      >
                        {label}{' '}
                        {value > 0 ? `${Math.round((value / totalAttributes) * 100)}%` : '—'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </GlassPanel>
        </motion.div>

        <motion.div variants={fadeInUp} style={{ height: '100%' }}>
          <GlassPanel variant="default" sx={{ p: 2, height: '100%', boxSizing: 'border-box' }}>
            <SectionLabel label="Character" />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* ── Recommended Races ── */}
              {races.length > 0 && (
                <>
                  <Box>
                    <Typography
                      sx={{
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                        mb: 0.6,
                      }}
                    >
                      Recommended Races
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {races.map((race) => (
                        <Chip
                          key={race}
                          label={race.replace(/-/g, ' ')}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                            color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                  <Divider
                    sx={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}
                  />
                </>
              )}

              {/* ── Mundus + Curse (2-col info chips) ── */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {[
                  { label: 'Mundus', color: '#ffd54f', value: mundusLabel },
                  { label: 'Curse', color: '#ce93d8', value: curseLabel },
                ].map(({ label, color, value }) => {
                  const isSet = value != null;
                  return (
                    <Box
                      key={label}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.35,
                        px: 1.25,
                        py: 0.9,
                        borderRadius: 2,
                        border: `1px ${isSet ? 'solid' : 'dashed'} ${
                          isSet
                            ? alpha(color, isDark ? 0.28 : 0.2)
                            : isDark
                              ? 'rgba(255,255,255,0.09)'
                              : 'rgba(0,0,0,0.08)'
                        }`,
                        background: isSet
                          ? isDark
                            ? alpha(color, 0.07)
                            : alpha(color, 0.05)
                          : 'transparent',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            flexShrink: 0,
                            background: isSet ? color : 'transparent',
                            border: isSet ? 'none' : `1.5px dashed ${alpha(color, 0.5)}`,
                            boxShadow: isSet ? `0 0 5px ${alpha(color, 0.55)}` : 'none',
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: '0.52rem',
                            fontWeight: 700,
                            letterSpacing: '0.09em',
                            textTransform: 'uppercase',
                            color: isSet
                              ? isDark
                                ? alpha(color, 0.75)
                                : alpha(color, 0.85)
                              : isDark
                                ? 'rgba(255,255,255,0.28)'
                                : 'rgba(0,0,0,0.28)',
                          }}
                        >
                          {label}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: isSet ? '0.76rem' : '0.72rem',
                          fontWeight: isSet ? 600 : 400,
                          fontStyle: isSet ? 'normal' : 'italic',
                          color: isSet
                            ? isDark
                              ? 'rgba(255,255,255,0.88)'
                              : 'rgba(0,0,0,0.82)'
                            : isDark
                              ? 'rgba(255,255,255,0.22)'
                              : 'rgba(0,0,0,0.22)',
                          lineHeight: 1.2,
                          pl: 0.25,
                        }}
                      >
                        {value ?? 'Not set'}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <Divider
                sx={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}
              />

              {/* ── Consumables ── */}
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.52rem',
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
                    mb: 0.75,
                  }}
                >
                  Consumables
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                  {/* Food row — always shown */}
                  {(() => {
                    const isSet = foodName != null;
                    const color = '#ffb300';
                    return (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          py: 0.65,
                          px: 1.1,
                          borderRadius: 1.5,
                          border: `1px ${isSet ? 'solid' : 'dashed'} ${
                            isSet
                              ? alpha(color, isDark ? 0.28 : 0.2)
                              : isDark
                                ? 'rgba(255,255,255,0.09)'
                                : 'rgba(0,0,0,0.07)'
                          }`,
                          background: isSet
                            ? isDark
                              ? alpha(color, 0.07)
                              : alpha(color, 0.04)
                            : 'transparent',
                        }}
                      >
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            flexShrink: 0,
                            background: isSet ? color : 'transparent',
                            border: isSet ? 'none' : `1.5px dashed ${alpha(color, 0.5)}`,
                            boxShadow: isSet ? `0 0 6px ${alpha(color, 0.55)}` : 'none',
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: '0.52rem',
                            fontWeight: 700,
                            letterSpacing: '0.09em',
                            textTransform: 'uppercase',
                            color: isSet
                              ? isDark
                                ? 'rgba(255,255,255,0.42)'
                                : 'rgba(0,0,0,0.42)'
                              : isDark
                                ? 'rgba(255,255,255,0.22)'
                                : 'rgba(0,0,0,0.22)',
                            minWidth: 36,
                          }}
                        >
                          Food
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: isSet ? '0.78rem' : '0.72rem',
                            fontWeight: isSet ? 600 : 400,
                            fontStyle: isSet ? 'normal' : 'italic',
                            color: isSet
                              ? isDark
                                ? 'rgba(255,255,255,0.88)'
                                : 'rgba(0,0,0,0.82)'
                              : isDark
                                ? 'rgba(255,255,255,0.22)'
                                : 'rgba(0,0,0,0.22)',
                            flex: 1,
                          }}
                        >
                          {foodName ?? 'Not set'}
                        </Typography>
                      </Box>
                    );
                  })()}

                  {/* Potion rows — always show at least one slot */}
                  {setup.consumables.potions.length > 0
                    ? setup.consumables.potions.map((p) => {
                        const color = '#26c6da';
                        const potionLookup = ESO_POTION_LOOKUP[p.id];
                        const potionName = p.name || potionLookup?.name || 'Unknown Potion';
                        const potionEffects =
                          p.effects.length > 0
                            ? p.effects
                            : potionLookup
                              ? [...potionLookup.effects]
                              : [];
                        return (
                          <Box
                            key={p.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              py: 0.65,
                              px: 1.1,
                              borderRadius: 1.5,
                              border: `1px solid ${alpha(color, isDark ? 0.28 : 0.2)}`,
                              background: isDark ? alpha(color, 0.07) : alpha(color, 0.04),
                            }}
                          >
                            <Box
                              sx={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                flexShrink: 0,
                                background: color,
                                boxShadow: `0 0 6px ${alpha(color, 0.55)}`,
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: '0.52rem',
                                fontWeight: 700,
                                letterSpacing: '0.09em',
                                textTransform: 'uppercase',
                                color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)',
                                minWidth: 36,
                              }}
                            >
                              Potion
                            </Typography>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.82)',
                                }}
                              >
                                {potionName}
                              </Typography>
                              {potionEffects.length > 0 && (
                                <Typography
                                  sx={{
                                    fontSize: '0.6rem',
                                    color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {potionEffects.join(' · ')}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })
                    : (() => {
                        const color = '#26c6da';
                        return (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              py: 0.65,
                              px: 1.1,
                              borderRadius: 1.5,
                              border: `1px dashed ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'}`,
                              background: 'transparent',
                            }}
                          >
                            <Box
                              sx={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                flexShrink: 0,
                                background: 'transparent',
                                border: `1.5px dashed ${alpha(color, 0.5)}`,
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: '0.52rem',
                                fontWeight: 700,
                                letterSpacing: '0.09em',
                                textTransform: 'uppercase',
                                color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)',
                                minWidth: 36,
                              }}
                            >
                              Potion
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.72rem',
                                fontWeight: 400,
                                fontStyle: 'italic',
                                color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)',
                                flex: 1,
                              }}
                            >
                              Not set
                            </Typography>
                          </Box>
                        );
                      })()}
                </Box>
              </Box>
            </Box>
          </GlassPanel>
        </motion.div>
      </Box>

      {/* Row 2: Skills */}
      <motion.div variants={fadeInUp}>
        <GlassPanel variant="primary" sx={{ p: 2, mb: 2 }}>
          <SectionLabel label="Skills" />
          {frontBar.length > 0 || backBar.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[
                { label: 'Front Bar', bar: frontBar },
                { label: 'Back Bar', bar: backBar },
              ].map(
                ({ label, bar }) =>
                  bar.length > 0 && (
                    <Box key={label}>
                      {/* Bar header */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 1.5,
                          px: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            letterSpacing: 1.2,
                            textTransform: 'uppercase',
                            fontSize: '0.65rem',
                            fontFamily: 'Space Grotesk, Inter, system-ui',
                            background: isDark
                              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {label}
                        </Typography>
                        <Box
                          sx={{
                            px: 0.75,
                            py: 0.15,
                            borderRadius: '999px',
                            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              fontSize: '0.62rem',
                              fontWeight: 600,
                              fontFamily: 'Space Grotesk',
                            }}
                          >
                            {bar.filter(({ id }) => id).length} / 6
                          </Typography>
                        </Box>
                      </Box>

                      {/* Action bar tray — glass container */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          gap: { xs: 0.75, sm: 1.25 },
                          py: 1.5,
                          px: 1.5,
                          borderRadius: 3,
                          background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                          flexWrap: { xs: 'wrap', sm: 'nowrap' },
                          rowGap: 1,
                        }}
                      >
                        {/* Regular ability slots (0-4) */}
                        {bar
                          .filter(({ slot }) => slot !== ULTIMATE_SLOT)
                          .map(({ slot, id }) => (
                            <SkillSlot key={slot} slotIndex={slot} abilityId={id} />
                          ))}

                        {/* Gold gradient divider before ultimate */}
                        {bar.some(({ slot }) => slot === ULTIMATE_SLOT) && (
                          <Box
                            sx={{
                              width: 1.5,
                              height: ULT_SIZE * 0.7,
                              borderRadius: 1,
                              flexShrink: 0,
                              alignSelf: 'center',
                              background: isDark
                                ? 'linear-gradient(180deg, transparent 0%, rgba(255,179,0, 0.40) 50%, transparent 100%)'
                                : 'linear-gradient(180deg, transparent 0%, rgba(255,179,0, 0.25) 50%, transparent 100%)',
                            }}
                          />
                        )}

                        {/* Ultimate slot */}
                        {bar
                          .filter(({ slot }) => slot === ULTIMATE_SLOT)
                          .map(({ slot, id }) => (
                            <SkillSlot key={slot} slotIndex={slot} abilityId={id} isUltimate />
                          ))}
                      </Box>
                    </Box>
                  ),
              )}
            </Box>
          ) : (
            <EmptyState message="No skills configured" />
          )}
        </GlassPanel>
      </motion.div>

      {/* Row 3: Gear */}
      <motion.div variants={fadeInUp}>
        <GlassPanel variant="primary" sx={{ p: 2, mb: 2 }}>
          <SectionLabel
            label="Equipment"
            count={gearEntries.length > 0 ? `${gearEntries.length} pieces` : undefined}
          />
          {gearEntries.length > 0 ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 0.5,
              }}
            >
              {gearEntries.map(({ slot, id, trait, enchant }) => (
                <GearSlotDisplay
                  key={slot}
                  slotIndex={slot}
                  itemId={id}
                  trait={trait}
                  enchant={enchant}
                />
              ))}
            </Box>
          ) : (
            <EmptyState message="No equipment configured" />
          )}
        </GlassPanel>
      </motion.div>

      {/* Row 4: Champion Points (full width) */}
      <motion.div variants={fadeInUp}>
        <GlassPanel variant="default" sx={{ p: 2, mb: 2 }}>
          <SectionLabel label="Champion Points" />
          {cpSlots.length > 0 || cpPassiveCount > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <CPTreeDetail
                label="Warfare"
                color="#42a5f5"
                icon={<WarfareIcon sx={{ fontSize: 14 }} />}
                slots={setup.cp.warfare.slots}
                passives={setup.cp.warfare.passives}
                passivesList={CP_PASSIVES_BY_TREE.warfare}
              />
              <CPTreeDetail
                label="Fitness"
                color="#ef5350"
                icon={<FitnessIcon sx={{ fontSize: 14 }} />}
                slots={setup.cp.fitness.slots}
                passives={setup.cp.fitness.passives}
                passivesList={CP_PASSIVES_BY_TREE.fitness}
              />
              <CPTreeDetail
                label="Craft"
                color="#66bb6a"
                icon={null}
                slots={setup.cp.craft.slots}
                passives={setup.cp.craft.passives}
                passivesList={CP_PASSIVES_BY_TREE.craft}
              />
            </Box>
          ) : (
            <EmptyState message="No champion points configured" />
          )}
        </GlassPanel>
      </motion.div>

      {/* Row 5: Passives (full width) */}
      <motion.div variants={fadeInUp}>
        <GlassPanel variant="primary" sx={{ p: 2, mb: 2 }}>
          <SectionLabel
            label="Passives"
            count={setup.passives.length > 0 ? `${setup.passives.length} selected` : undefined}
          />
          {setup.passives.length > 0 ? (
            (() => {
              const n = setup.passives.length;
              const cols = getPassiveCols(n);
              const remainder = n % cols;
              const fullItems =
                remainder > 0 ? setup.passives.slice(0, n - remainder) : setup.passives;
              const lastRowItems = remainder > 0 ? setup.passives.slice(n - remainder) : [];

              const renderPassiveItem = (
                passiveId: number,
                key: string | number,
              ): React.ReactNode => {
                const skill = getSkillById(passiveId);
                const iconUrl = skill?.icon ? resolveIconUrl(skill.icon) : null;
                return (
                  <Box
                    key={key}
                    sx={{
                      display: 'flex',
                      flex: 1,
                      alignItems: 'center',
                      gap: 1,
                      py: 0.6,
                      px: 1,
                      borderRadius: 2,
                      background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                      transition: 'border-color 0.15s',
                      '&:hover': {
                        borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '6px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={skill?.name ?? `Passive ${passiveId}`}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: 'var(--be-accent, #38bdf8)',
                            opacity: 0.4,
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.68)',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {skill?.name ?? `Passive #${passiveId}`}
                    </Typography>
                  </Box>
                );
              };

              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {/* Full rows — uniform grid */}
                  {fullItems.length > 0 && (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr 1fr',
                          sm: `repeat(${Math.min(cols, 3)}, 1fr)`,
                          md: `repeat(${cols}, 1fr)`,
                        },
                        gap: 0.75,
                      }}
                    >
                      {fullItems.map((id) => renderPassiveItem(id, id))}
                    </Box>
                  )}
                  {/* Partial last row — flex so items share width equally */}
                  {lastRowItems.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      {lastRowItems.map((id) => renderPassiveItem(id, `last-${id}`))}
                    </Box>
                  )}
                </Box>
              );
            })()
          ) : (
            <EmptyState message="No passives selected" />
          )}
        </GlassPanel>
      </motion.div>

      {/* Row 6: Stats (full width) */}
      <motion.div variants={fadeInUp}>
        <GlassPanel variant="primary" sx={{ p: 2, mb: 2 }}>
          <SectionLabel label="Stats" />
          <ViewStats setup={setup} build={viewBuild} />
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
};

// ─── View Stats (read-only) ───────────────────────────────────────────────────

const ViewStats: React.FC<{ setup: BuildSetup; build: Build }> = ({ setup, build: vBuild }) => {
  const stats = React.useMemo(
    () => calculateBuildStats(setup, vBuild, setup.statOverrides),
    [setup, vBuild],
  );

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
          gap: 2,
          justifyItems: 'center',
          py: 1,
          mb: 2,
        }}
      >
        <StatGauge label="Penetration" result={stats.penetration} />
        <StatGauge label="Crit Damage" result={stats.critDamage} isPercent />
        <StatGauge label="Crit Chance" result={stats.critChance} isPercent />
        <StatGauge label="Armor" result={stats.armor} />
      </Box>
      <StatBreakdown label="Penetration" result={stats.penetration} />
      <StatBreakdown label="Critical Damage" result={stats.critDamage} isPercent />
      <StatBreakdown label="Critical Chance" result={stats.critChance} isPercent />
      <StatBreakdown label="Armor" result={stats.armor} />
    </Box>
  );
};

// ─── CP tree detail ───────────────────────────────────────────────────────────

const CPTreeDetail: React.FC<{
  label: string;
  color: string;
  icon: React.ReactNode;
  slots: (number | null)[];
  passives: Record<string, number>;
  passivesList: readonly { id: string; name: string; maxPoints: number; description: string }[];
}> = ({ label, color, icon, slots, passives, passivesList }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const activeSlots = slots.filter((s): s is number => s !== null);
  const passiveEntries = Object.entries(passives).filter(([, v]) => v > 0);

  if (activeSlots.length === 0 && passiveEntries.length === 0) return null;

  return (
    <Box
      sx={{
        borderRadius: 2,
        background: isDark ? alpha(color, 0.04) : alpha(color, 0.03),
        border: `1px solid ${alpha(color, isDark ? 0.15 : 0.1)}`,
        overflow: 'hidden',
      }}
    >
      {/* Tree header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.75,
          borderBottom: `1px solid ${alpha(color, 0.12)}`,
          background: isDark ? alpha(color, 0.07) : alpha(color, 0.05),
        }}
      >
        {icon && <Box sx={{ color, opacity: 0.8, display: 'flex', fontSize: 14 }}>{icon}</Box>}
        <Typography
          sx={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.62rem',
            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
            ml: 0.5,
          }}
        >
          {activeSlots.length > 0 &&
            `${activeSlots.length} perk${activeSlots.length !== 1 ? 's' : ''}`}
          {activeSlots.length > 0 && passiveEntries.length > 0 && ' · '}
          {passiveEntries.length > 0 &&
            `${passiveEntries.length} passive${passiveEntries.length !== 1 ? 's' : ''}`}
        </Typography>
      </Box>

      <Box sx={{ px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {/* Slottable perks */}
        {activeSlots.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {activeSlots.map((id, i) => {
              const name =
                CHAMPION_POINT_ABILITIES[id as ChampionPointAbilityId]?.name ?? `Perk #${id}`;
              return (
                <Chip
                  key={i}
                  label={name}
                  size="small"
                  sx={{
                    fontSize: '0.65rem',
                    height: 22,
                    fontWeight: 700,
                    bgcolor: alpha(color, isDark ? 0.18 : 0.12),
                    color: isDark ? alpha(color, 0.95) : color,
                    border: 'none',
                  }}
                />
              );
            })}
          </Box>
        )}

        {/* Passive stars */}
        {passiveEntries.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {passiveEntries.map(([key, points]) => {
              const passive = passivesList.find((p) => p.id === key);
              const name = passive?.name ?? key;
              return (
                <Chip
                  key={key}
                  label={`${name} ${points}`}
                  size="small"
                  sx={{
                    fontSize: '0.62rem',
                    height: 20,
                    fontWeight: 600,
                    bgcolor: 'transparent',
                    color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                    border: `1px solid ${alpha(color, isDark ? 0.22 : 0.18)}`,
                  }}
                />
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const BuildViewPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();
  const skillCacheReady = useSkillCacheReady();
  const navigate = useNavigate();

  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeSetup, setActiveSetup] = useState(0);
  const [encodedParam, setEncodedParam] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('b') ?? '';
    setEncodedParam(encoded);

    if (!encoded) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    void decodeBuildFromURL(encoded)
      .then((decoded) => {
        if (decoded) {
          setBuild(decoded);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, []);

  const handleCopyLink = (): void => {
    const url = `${window.location.origin}${window.location.pathname}?b=${encodedParam}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setSnackbar({ open: true, message: 'Link copied!', severity: 'success' }))
      .catch(() => setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' }));
  };

  const handleOpenInEditor = (): void => {
    navigate(`/build-editor?b=${encodeURIComponent(encodedParam)}`);
  };

  // ── Loading ──
  if (loading || !skillCacheReady) {
    return (
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6, px: { xs: 2, sm: 3 } }}>
        <Skeleton
          variant="rectangular"
          height={400}
          sx={{ borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
        />
      </Container>
    );
  }

  // ── Not found ──
  if (notFound || !build) {
    return (
      <Container maxWidth="sm" sx={{ pt: 8, pb: 6 }}>
        <GlassPanel variant="default" sx={{ p: 3 }}>
          <Alert severity="error" sx={{ borderRadius: '12px', mb: 2 }}>
            No build found in the URL. Please check the link and try again.
          </Alert>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              window.location.href = '/build-editor';
            }}
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            Open Build Editor
          </Button>
        </GlassPanel>
      </Container>
    );
  }

  const classLabel = CLASS_LABELS[build.esoClass] ?? build.esoClass;
  const roleLabel = ROLE_LABELS[build.role] ?? build.role;
  const classTheme = CLASS_COLOR_MAP[build.esoClass];
  /** Rich skill line data for the hero section — includes icons from esoStaticData */
  const classSkillLineData = build.classSkillLines
    .filter(Boolean)
    .map((slId) => {
      const def = CLASS_SKILL_LINES.find((d) => d.id === slId);
      return def ?? null;
    })
    .filter(Boolean) as typeof CLASS_SKILL_LINES;

  return (
    <Container maxWidth="lg" sx={{ pt: 3, pb: 6, px: { xs: 2, sm: 3 } }}>
      <BuildViewShell esoClass={build.esoClass}>
        <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2, sm: 3, md: 4 } }}>
          <motion.div
            variants={staggerContainer}
            initial={prefersReduced ? 'visible' : 'hidden'}
            animate="visible"
          >
            {/* ── Banner image ── */}
            {build.guide.bannerImageUrl && (
              <motion.div variants={fadeInUp}>
                <Box
                  sx={{
                    width: '100%',
                    height: { xs: 140, sm: 200 },
                    borderRadius: 2.5,
                    overflow: 'hidden',
                    mb: 3,
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '50%',
                      background:
                        'linear-gradient(to top, rgba(8, 14, 26, 0.7) 0%, transparent 100%)',
                      pointerEvents: 'none',
                    },
                  }}
                >
                  <img
                    src={build.guide.bannerImageUrl}
                    alt={`${build.name} banner`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </Box>
              </motion.div>
            )}

            {/* ── Header ── */}
            <motion.div variants={fadeInUp}>
              <Box
                sx={{
                  viewTransitionName: 'build-hero',
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  {/* Class + Role badges */}
                  <Box
                    sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}
                  >
                    {/* Class identity badge — prominent pill with glow */}
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1.5,
                        py: 0.55,
                        borderRadius: '999px',
                        background: `linear-gradient(135deg, ${alpha(classTheme.accent, isDark ? 0.24 : 0.15)} 0%, ${alpha(classTheme.accent, isDark ? 0.1 : 0.06)} 100%)`,
                        border: `1.5px solid ${alpha(classTheme.accent, isDark ? 0.48 : 0.32)}`,
                        boxShadow: `0 2px 14px ${alpha(classTheme.accent, 0.24)}, inset 0 1px 0 ${alpha(classTheme.accent, 0.18)}`,
                      }}
                    >
                      <Typography
                        sx={{ fontSize: '0.88rem', lineHeight: 1, flexShrink: 0 }}
                        aria-hidden
                      >
                        {CLASS_EMOJI[build.esoClass] ?? '⚔️'}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                          color: classTheme.accent,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          lineHeight: 1,
                        }}
                      >
                        {classLabel}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${ROLE_EMOJI[build.role] ?? ''} ${roleLabel}`}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.60)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                      }}
                    />
                    <Chip
                      label={build.gameMode.toUpperCase()}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        bgcolor: 'transparent',
                        color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                      }}
                    />
                  </Box>

                  {/* Build name */}
                  <Typography
                    component="h1"
                    sx={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      fontSize: { xs: '1.5rem', sm: '1.8rem' },
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                      background: `linear-gradient(135deg, ${classTheme.accent} 0%, ${isDark ? '#f1f5f9' : '#0f172a'} 60%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {build.name || 'Unnamed Build'}
                  </Typography>

                  {build.shortDescription && (
                    <Typography
                      sx={{
                        fontSize: '0.85rem',
                        color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                        mt: 0.75,
                        maxWidth: 520,
                        lineHeight: 1.5,
                      }}
                    >
                      {build.shortDescription}
                    </Typography>
                  )}
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  <Button
                    size="small"
                    startIcon={<CopyIcon sx={{ fontSize: '0.85rem !important' }} />}
                    onClick={handleCopyLink}
                    sx={{
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                      backdropFilter: 'blur(8px)',
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: 'var(--be-accent, #38bdf8)',
                      },
                    }}
                  >
                    Copy Link
                  </Button>
                  <Button
                    size="small"
                    startIcon={<EditIcon sx={{ fontSize: '0.85rem !important' }} />}
                    endIcon={<OpenInNewIcon sx={{ fontSize: '0.7rem !important' }} />}
                    onClick={handleOpenInEditor}
                    sx={{
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: isDark ? '#fff' : '#fff',
                      background: `linear-gradient(135deg, ${classTheme.accent} 0%, ${alpha(classTheme.accent, 0.7)} 100%)`,
                      border: 'none',
                      boxShadow: `0 4px 16px ${alpha(classTheme.accent, 0.3)}`,
                      '&:hover': {
                        boxShadow: `0 6px 24px ${alpha(classTheme.accent, 0.45)}`,
                      },
                    }}
                  >
                    Edit Build
                  </Button>
                </Box>
              </Box>
            </motion.div>

            {/* ── Meta strip: timestamps + YouTube ── */}
            <motion.div variants={fadeInUp}>
              <GlassPanel
                variant="subtle"
                sx={{
                  p: 1.5,
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2.5,
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    sx={{
                      fontSize: '0.55rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                    }}
                  >
                    Created
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)',
                    }}
                  >
                    {new Date(build.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Typography>
                </Box>
                {build.updatedAt !== build.createdAt && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      sx={{
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                      }}
                    >
                      Updated
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)',
                      }}
                    >
                      {new Date(build.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Typography>
                  </Box>
                )}
                {build.guide.youtubeUrl && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<YouTubeIcon sx={{ color: '#ef4444' }} />}
                    href={build.guide.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                      '&:hover': {
                        borderColor: '#ef4444',
                        bgcolor: 'rgba(239, 68, 68, 0.06)',
                      },
                    }}
                  >
                    Video Guide
                  </Button>
                )}
              </GlassPanel>
            </motion.div>

            {/* ── Class Skill Lines ── */}
            <motion.div variants={fadeInUp}>
              <GlassPanel variant="primary" sx={{ p: 2, mb: 3 }}>
                <SectionLabel label="Class Skill Lines" />
                {classSkillLineData.length > 0 ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: `repeat(${classSkillLineData.length}, 1fr)`,
                      },
                      gap: 1.5,
                    }}
                  >
                    {classSkillLineData.map((sl) => {
                      const slColor = CLASS_COLOR_MAP[sl.ownerClass]?.accent ?? classTheme.accent;
                      return (
                        <Box
                          key={sl.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            py: 1.5,
                            px: 2,
                            borderRadius: 2.5,
                            background: isDark ? alpha(slColor, 0.07) : alpha(slColor, 0.04),
                            border: `1px solid ${alpha(slColor, isDark ? 0.22 : 0.14)}`,
                            transition: 'all 0.18s ease',
                            '&:hover': {
                              background: isDark ? alpha(slColor, 0.14) : alpha(slColor, 0.09),
                              borderColor: alpha(slColor, isDark ? 0.4 : 0.28),
                              transform: 'translateY(-1px)',
                              boxShadow: `0 4px 16px ${alpha(slColor, 0.16)}`,
                            },
                          }}
                        >
                          <Typography
                            sx={{ fontSize: '1.2rem', lineHeight: 1, flexShrink: 0 }}
                            aria-hidden
                          >
                            {sl.icon}
                          </Typography>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                fontFamily: 'Space Grotesk, Inter, system-ui',
                                color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)',
                                letterSpacing: '-0.01em',
                                lineHeight: 1.2,
                              }}
                            >
                              {sl.label}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.58rem',
                                fontWeight: 600,
                                color: slColor,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                mt: 0.15,
                              }}
                            >
                              {sl.ownerClass === build.esoClass
                                ? 'Class'
                                : sl.ownerClass.replace(/-/g, ' ')}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <EmptyState message="No class skill lines selected" />
                )}
              </GlassPanel>
            </motion.div>

            {/* ── Setup tabs ── */}
            {build.setups.length > 1 && (
              <motion.div variants={fadeInUp}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.75,
                    mb: 2.5,
                    flexWrap: 'wrap',
                  }}
                >
                  {build.setups.map((setup, i) => {
                    const isActive = i === activeSetup;
                    return (
                      <Button
                        key={setup.id}
                        size="small"
                        onClick={() => setActiveSetup(i)}
                        sx={{
                          borderRadius: '10px',
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          fontWeight: isActive ? 700 : 500,
                          px: 2,
                          py: 0.75,
                          color: isActive
                            ? '#fff'
                            : isDark
                              ? 'rgba(255,255,255,0.55)'
                              : 'rgba(0,0,0,0.50)',
                          background: isActive
                            ? `linear-gradient(135deg, ${classTheme.accent} 0%, ${alpha(classTheme.accent, 0.7)} 100%)`
                            : isDark
                              ? 'rgba(255,255,255,0.04)'
                              : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${
                            isActive
                              ? alpha(classTheme.accent, 0.5)
                              : isDark
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(0,0,0,0.06)'
                          }`,
                          boxShadow: isActive
                            ? `0 4px 16px ${alpha(classTheme.accent, 0.3)}`
                            : 'none',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: isActive
                              ? alpha(classTheme.accent, 0.7)
                              : 'var(--be-accent, #38bdf8)',
                          },
                        }}
                      >
                        {setup.name || `Setup ${i + 1}`}
                      </Button>
                    );
                  })}
                </Box>
              </motion.div>
            )}

            {/* ── Active setup ── */}
            <AnimatePresence mode="wait">
              {build.setups[activeSetup] && (
                <motion.div
                  key={activeSetup}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <SetupDisplay
                    setup={build.setups[activeSetup]}
                    build={build}
                    races={build.races}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Guide note ── */}
            {!build.guide.content && build.guide.youtubeUrl && (
              <motion.div variants={fadeInUp}>
                <GlassPanel variant="subtle" sx={{ p: 1.5, mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                      Full guide content is available when the build is loaded in the editor.
                    </Typography>
                  </Box>
                </GlassPanel>
              </motion.div>
            )}
          </motion.div>
        </Box>
      </BuildViewShell>

      {/* Snackbar */}
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
