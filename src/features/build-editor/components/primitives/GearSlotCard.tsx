/**
 * GearSlotCard — Horizontal row card for a single equipment slot.
 *
 * Layout: [icon] | slot name + set name | trait chip · enchant chip | [×]
 *
 * Empty state shows a dashed outline with the slot silhouette and name.
 * Filled state shows item icon, set name, and inline clickable chips
 * for weight, trait, and enchant.
 */

import {
  AutoFixHigh as TraitIcon,
  Close as CloseIcon,
  LocalFireDepartment as EnchantIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { Box, ButtonBase, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ArmorWeight } from '../../../loadout-manager/types/loadout.types';
import { fetchItemIconUrl, getItemIconUrl } from '../../../loadout-manager/utils/itemIconResolver';
import type { EquipSlotDef } from '../../data/esoStaticData';
import {
  getEnchantShortName,
  getEnchantsForSlot,
  getTraitName,
  getTraitsForSlot,
} from '../../data/gear-traits-enchants';

import { TraitEnchantPicker } from './TraitEnchantPicker';

// ── SVG slot silhouettes ────────────────────────────────────────────────────

const SLOT_SVG_PATHS: Record<string, string> = {
  head: 'M12 2C9 2 6.5 4 6 7c-.3 1.5 0 3 .5 4 .3.7.5 1.2.5 2v1h10v-1c0-.8.2-1.3.5-2 .5-1 .8-2.5.5-4C17.5 4 15 2 12 2z',
  chest: 'M6 6l-3 3v9h6v-5h6v5h6V9l-3-3h-4l-2 2-2-2H6z',
  shoulders: 'M4 8c0-2 2-4 4-4h1v4H5v6h4v2H4V8zm16 0c0-2-2-4-4-4h-1v4h4v6h-4v2h5V8z',
  hand: 'M7 3v7l-2 1v5l3 4h8l3-4v-5l-2-1V3h-3v6h-1V2h-3v7h-1V3H7z',
  waist: 'M3 10h18v4H3v-4zm8 0v4h2v-4h-2z',
  legs: 'M7 4h4v7l-2 9H6l1-9V4zm6 0h4v7l1 9h-3l-2-9V4z',
  feet: 'M6 8l-2 6v4h7v-3l1-3 1 3v3h7v-4l-2-6h-4l-1 2h-2L10 8H6z',
  neck: 'M12 4a4 4 0 0 0-4 4c0 1.7 1.3 3.2 3 3.8V14h2v-2.2c1.7-.6 3-2.1 3-3.8a4 4 0 0 0-4-4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-1 5h2v4h-2v-4z',
  ring: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10z',
  weapon: 'M6 20l2-2 8-8 2 2 2-2-4-4-2 2-2-2 2-2-2-2-2 2-8 8z',
  offhand:
    'M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4zm0 2.2L18 9v3c0 3.5-2.6 6.8-6 7.8V5.2z',
};

const SlotSvgIcon: React.FC<{ slotType: string; size?: number; color?: string }> = ({
  slotType,
  size = 24,
  color = 'currentColor',
}) => {
  const path = SLOT_SVG_PATHS[slotType];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d={path} />
    </svg>
  );
};

// ── Constants ───────────────────────────────────────────────────────────────

const ICON_SIZE = 36;

const WEIGHT_COLORS: Record<ArmorWeight, string> = {
  light: '#60a5fa',
  medium: '#4ade80',
  heavy: '#f87171',
};

const WEIGHT_FULL_LABELS: Record<ArmorWeight, string> = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
};

const WEIGHT_CYCLE: ArmorWeight[] = ['light', 'medium', 'heavy'];

// ── Inline Chip ─────────────────────────────────────────────────────────────

interface InlineChipProps {
  icon: React.ReactNode;
  label: string;
  activeColor: string;
  isSet: boolean;
  onClick: (e: React.MouseEvent) => void;
  anchorRef?: React.Ref<HTMLButtonElement>;
}

const InlineChip: React.FC<InlineChipProps> = ({
  icon,
  label,
  activeColor,
  isSet,
  onClick,
  anchorRef,
}) => {
  const isDark = useTheme().palette.mode === 'dark';

  return (
    <ButtonBase
      ref={anchorRef}
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.35,
        px: 0.6,
        py: 0.2,
        borderRadius: 1,
        fontSize: 10,
        fontWeight: isSet ? 600 : 400,
        fontFamily: 'Space Grotesk, Inter, system-ui',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: isSet ? activeColor : isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
        background: isSet ? (isDark ? `${activeColor}14` : `${activeColor}0C`) : 'transparent',
        border: `1px solid ${
          isSet
            ? isDark
              ? `${activeColor}30`
              : `${activeColor}25`
            : isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.08)'
        }`,
        transition: 'all 150ms ease',
        '&:hover': {
          background: isDark ? `${activeColor}20` : `${activeColor}14`,
          borderColor: isDark ? `${activeColor}50` : `${activeColor}40`,
        },
      }}
    >
      {icon}
      {label}
    </ButtonBase>
  );
};

// ── Props ───────────────────────────────────────────────────────────────────

interface GearSlotCardProps {
  slotDef: EquipSlotDef;
  itemId?: number | null;
  itemName?: string | null;
  setName?: string | null;
  isDisabled?: boolean;
  disabledReason?: string;
  weight?: ArmorWeight;
  /**
   * When set, the equipped set only exists in this armor weight in-game
   * (mythic / overland drop). The weight chip renders as a read-only badge
   * instead of a clickable cycle control.
   */
  lockedWeight?: ArmorWeight | null;
  onWeightChange?: (weight: ArmorWeight) => void;
  trait?: string;
  onTraitChange?: (trait: string | undefined) => void;
  enchant?: string;
  onEnchantChange?: (enchant: string | undefined) => void;
  onOpen: () => void;
  onClear: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

const GearSlotCardComponent: React.FC<GearSlotCardProps> = ({
  slotDef,
  itemId,
  itemName,
  setName,
  isDisabled = false,
  disabledReason,
  weight,
  lockedWeight,
  onWeightChange,
  trait,
  onTraitChange,
  enchant,
  onEnchantChange,
  onOpen,
  onClear,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const hasItem = Boolean(itemId && (itemName || setName));

  // Icon resolution
  const [iconUrl, setIconUrl] = useState<string | null>(() =>
    itemId ? getItemIconUrl(itemId) : null,
  );
  const [iconFailed, setIconFailed] = useState(false);

  // Trait/enchant popover state
  const [pickerMode, setPickerMode] = useState<'trait' | 'enchant' | null>(null);
  const traitAnchorRef = useRef<HTMLButtonElement>(null);
  const enchantAnchorRef = useRef<HTMLButtonElement>(null);

  const traitItems = useMemo(() => getTraitsForSlot(slotDef.category), [slotDef.category]);
  const enchantItems = useMemo(() => getEnchantsForSlot(slotDef.category), [slotDef.category]);

  const traitLabel = trait ? getTraitName(trait, slotDef.category) : undefined;
  const enchantLabel = enchant ? getEnchantShortName(enchant, slotDef.category) : undefined;

  const handleOpenTrait = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPickerMode('trait');
  }, []);

  const handleOpenEnchant = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPickerMode('enchant');
  }, []);

  const handleClosePicker = useCallback(() => setPickerMode(null), []);

  useEffect(() => {
    if (!itemId) {
      setIconUrl(null);
      setIconFailed(false);
      return;
    }
    let cancelled = false;
    setIconFailed(false);
    const sync = getItemIconUrl(itemId);
    if (sync) {
      setIconUrl(sync);
      return;
    }
    fetchItemIconUrl(itemId)
      .then((url) => {
        if (!cancelled) setIconUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const primaryLabel = setName ?? itemName ?? null;

  const handleClick = (): void => {
    if (!isDisabled) onOpen();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onOpen();
    }
  };

  // ── Empty slot ──────────────────────────────────────────────────────────

  if (!hasItem) {
    return (
      <Box
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={
          isDisabled
            ? `${slotDef.name} — ${disabledReason ?? 'Locked'}`
            : `${slotDef.name} — click to equip`
        }
        aria-disabled={isDisabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 1.25,
          py: 0.75,
          borderRadius: 2,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.3 : 1,
          border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
          background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)',
          transition: 'all 180ms ease',
          '&:focus-visible': {
            outline: '2px solid var(--be-accent, #38bdf8)',
            outlineOffset: '2px',
          },
          ...(!isDisabled && {
            '&:hover': {
              borderColor: isDark
                ? 'rgba(var(--be-accent-rgb, 56,189,248), 0.30)'
                : 'rgba(var(--be-accent-rgb, 15,23,42), 0.18)',
              background: isDark
                ? 'rgba(var(--be-accent-rgb, 56,189,248), 0.04)'
                : 'rgba(var(--be-accent-rgb, 15,23,42), 0.02)',
            },
          }),
        }}
      >
        {/* Slot icon */}
        <Box
          sx={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
          }}
        >
          <SlotSvgIcon
            slotType={slotDef.slotType}
            size={20}
            color={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)'}
          />
        </Box>

        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 400,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
          }}
        >
          {slotDef.name}
        </Typography>
      </Box>
    );
  }

  // ── Filled slot ─────────────────────────────────────────────────────────

  const isWeightLocked = Boolean(lockedWeight);
  const showWeight = slotDef.category === 'apparel' && (onWeightChange || isWeightLocked);
  const currentWeight = lockedWeight ?? weight ?? 'heavy';

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        aria-label={`${slotDef.name}: ${primaryLabel ?? ''} — click to change`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 1.25,
          py: 0.75,
          borderRadius: 2,
          cursor: 'pointer',
          border: `1.5px solid ${
            isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)'
              : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.12)'
          }`,
          background: isDark
            ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.04)'
            : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.02)',
          transition: 'all 180ms ease',
          '&:focus-visible': {
            outline: '2px solid var(--be-accent, #38bdf8)',
            outlineOffset: '2px',
          },
          '&:hover': {
            borderColor: isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.40)'
              : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.22)',
            background: isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
              : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.04)',
            boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
          },
          '&:hover .gear-row-remove': { opacity: 1 },
          '@media (hover: none)': {
            '& .gear-row-remove': { opacity: 1 },
          },
        }}
      >
        {/* Item icon */}
        <Box
          sx={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            background: isDark
              ? 'rgba(var(--be-accent-rgb, 56,189,248), 0.08)'
              : 'rgba(var(--be-accent-rgb, 15,23,42), 0.04)',
          }}
        >
          {iconUrl && !iconFailed ? (
            <img
              src={iconUrl}
              alt={primaryLabel ?? slotDef.name}
              onError={() => setIconFailed(true)}
              style={{
                width: ICON_SIZE - 4,
                height: ICON_SIZE - 4,
                objectFit: 'contain',
              }}
            />
          ) : (
            <SlotSvgIcon
              slotType={slotDef.slotType}
              size={20}
              color={
                isDark
                  ? 'rgba(var(--be-accent-rgb, 56,189,248), 0.60)'
                  : 'rgba(var(--be-accent-rgb, 15,23,42), 0.40)'
              }
            />
          )}
        </Box>

        {/* Info column */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: slot name + set name */}
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography
              sx={{
                fontSize: 9,
                fontWeight: 600,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {slotDef.name}
            </Typography>
            <Typography
              noWrap
              sx={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                lineHeight: 1.2,
                color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.80)',
              }}
            >
              {primaryLabel}
            </Typography>
          </Stack>

          {/* Row 2: weight + trait + enchant chips */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: 'center', mt: 0.4, flexWrap: 'wrap', rowGap: 0.35 }}
          >
            {/* Weight chip — apparel only. Read-only badge when the set is
                locked to a single armor weight; clickable cycle otherwise. */}
            {showWeight &&
              (isWeightLocked ? (
                <Tooltip
                  title={`${WEIGHT_FULL_LABELS[currentWeight]} Armor — this set only comes in ${WEIGHT_FULL_LABELS[currentWeight]}`}
                  placement="top"
                >
                  <Box
                    component="span"
                    aria-label={`Weight: ${WEIGHT_FULL_LABELS[currentWeight]} (fixed)`}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.3,
                      px: 0.6,
                      py: 0.2,
                      borderRadius: 1,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      lineHeight: 1,
                      cursor: 'default',
                      color: WEIGHT_COLORS[currentWeight],
                      background: isDark
                        ? `${WEIGHT_COLORS[currentWeight]}14`
                        : `${WEIGHT_COLORS[currentWeight]}0C`,
                      border: `1px solid ${
                        isDark
                          ? `${WEIGHT_COLORS[currentWeight]}30`
                          : `${WEIGHT_COLORS[currentWeight]}25`
                      }`,
                    }}
                  >
                    <LockIcon sx={{ fontSize: 9, opacity: 0.7 }} />
                    {WEIGHT_FULL_LABELS[currentWeight]}
                  </Box>
                </Tooltip>
              ) : (
                onWeightChange && (
                  <ButtonBase
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      const idx = WEIGHT_CYCLE.indexOf(currentWeight);
                      const next = WEIGHT_CYCLE[(idx + 1) % WEIGHT_CYCLE.length];
                      onWeightChange(next);
                    }}
                    onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
                    aria-label={`Weight: ${WEIGHT_FULL_LABELS[currentWeight]} — click to cycle`}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.3,
                      px: 0.6,
                      py: 0.2,
                      borderRadius: 1,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      lineHeight: 1,
                      color: WEIGHT_COLORS[currentWeight],
                      background: isDark
                        ? `${WEIGHT_COLORS[currentWeight]}14`
                        : `${WEIGHT_COLORS[currentWeight]}0C`,
                      border: `1px solid ${
                        isDark
                          ? `${WEIGHT_COLORS[currentWeight]}30`
                          : `${WEIGHT_COLORS[currentWeight]}25`
                      }`,
                      transition: 'all 150ms ease',
                      '&:hover': {
                        background: isDark
                          ? `${WEIGHT_COLORS[currentWeight]}28`
                          : `${WEIGHT_COLORS[currentWeight]}18`,
                      },
                    }}
                  >
                    {WEIGHT_FULL_LABELS[currentWeight]}
                  </ButtonBase>
                )
              ))}

            {/* Trait chip */}
            {onTraitChange && (
              <InlineChip
                anchorRef={traitAnchorRef}
                icon={<TraitIcon sx={{ fontSize: 10 }} />}
                label={traitLabel ?? 'Trait'}
                activeColor="#a78bfa"
                isSet={Boolean(trait)}
                onClick={handleOpenTrait}
              />
            )}

            {/* Enchant chip */}
            {onEnchantChange && (
              <InlineChip
                anchorRef={enchantAnchorRef}
                icon={<EnchantIcon sx={{ fontSize: 10 }} />}
                label={enchantLabel ?? 'Enchant'}
                activeColor="#fb923c"
                isSet={Boolean(enchant)}
                onClick={handleOpenEnchant}
              />
            )}
          </Stack>
        </Box>

        {/* Remove button */}
        <IconButton
          className="gear-row-remove"
          size="small"
          aria-label={`Remove ${primaryLabel ?? slotDef.name}`}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onClear();
          }}
          onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
          sx={{
            p: 0.25,
            opacity: 0,
            flexShrink: 0,
            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
            transition: 'opacity 150ms, color 150ms',
            '&:hover': {
              color: isDark ? '#ef4444' : '#dc2626',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

      {/* Trait/Enchant Picker Popovers */}
      <TraitEnchantPicker
        open={pickerMode === 'trait'}
        anchorEl={traitAnchorRef.current}
        onClose={handleClosePicker}
        mode="trait"
        items={traitItems}
        currentValue={trait}
        onSelect={(v) => onTraitChange?.(v)}
      />
      <TraitEnchantPicker
        open={pickerMode === 'enchant'}
        anchorEl={enchantAnchorRef.current}
        onClose={handleClosePicker}
        mode="enchant"
        items={enchantItems}
        currentValue={enchant}
        onSelect={(v) => onEnchantChange?.(v)}
      />
    </>
  );
};

// Memoized as defense-in-depth. The parent `SlotRow` is also memoized on
// `piece`/`disabledReason`, so the real render-skip happens there; this memo
// still guards against future callers that pass stable props.
export const GearSlotCard = React.memo(GearSlotCardComponent);
