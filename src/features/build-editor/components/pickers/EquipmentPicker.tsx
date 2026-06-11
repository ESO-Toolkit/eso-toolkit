/**
 * EquipmentPicker — prop-driven equipment layout for the build editor.
 *
 * Renders a vertical list of gear slots grouped by category:
 * Apparel → Accessories → Weapons (Front) → Weapons (Back)
 *
 * Each slot is a horizontal card (GearSlotCard) with inline chips
 * for weight, trait, and enchant.
 *
 * No Redux coupling — takes gear via props and calls onChange on mutation.
 * EquipmentSection wraps this with useSelector / dispatch.
 */

import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getItemInfo } from '../../../loadout-manager/data/itemIdMap';
import type {
  ArmorWeight,
  GearConfig,
  GearPiece,
} from '../../../loadout-manager/types/loadout.types';
import {
  deriveItemNameForSlot,
  fetchIsTwoHandedWeapon,
  isTwoHandedWeapon,
} from '../../../loadout-manager/utils/itemIconResolver';
import { EQUIP_SLOTS, type EquipSlotDef } from '../../data/esoStaticData';
import { getLockedArmorWeight } from '../../data/setArmorWeights';
import { GearSlotCard } from '../primitives/GearSlotCard';

import { GearPickerDialog } from './GearPicker';

// ── 2H weapon logic ─────────────────────────────────────────────────────────
//
// Greatswords, Battle Axes, Mauls, Bows, and all Staves occupy BOTH bar
// slots in ESO, so the off-hand is locked + auto-cleared when a 2H is in
// the main-hand. Classification comes from the UESP icon token (via
// `isTwoHandedWeapon`) — name-keyword matching doesn't work because
// itemIdMap stores generic names like "<Set> Weapon".

const FRONT_MAIN = 4;
const FRONT_OFF = 5;
const BACK_MAIN = 20;
const BACK_OFF = 21;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the GearPiece for a slot when the user picks a new item `itemId`.
 *
 * Carries over ONLY the user's trait/enchant (and, for apparel, weight). It
 * deliberately does NOT spread the previous piece: a stale `link` field encodes
 * the OLD item id, and consumers like GearSelector resolve the slot's item id
 * from `link` BEFORE `id` — so keeping it would leave the slot pointing at the
 * previous item after a replace. The fresh `id` is the single source of truth.
 *
 * Weight: a set locked to one armor weight in-game wins (mythic / overland drop)
 * so exports + stats stay correct even though the chip is read-only; otherwise
 * the user's chosen weight carries over, but only for apparel (jewelry / weapons
 * have no armor weight).
 */
export function buildReplacementPiece(
  prev: GearPiece | undefined,
  itemId: number,
  category: EquipSlotDef['category'],
): GearPiece {
  const next: GearPiece = { id: itemId };
  if (prev?.trait !== undefined) next.trait = prev.trait;
  if (prev?.enchant !== undefined) next.enchant = prev.enchant;

  // Weight is an APPAREL-only concept. A locked set's jewelry/weapon (e.g. a
  // Mother's Sorrow ring or staff) must NOT get armor-weight metadata — the lock
  // is about the set's ARMOR pieces. Downstream (URL encoding, roster display)
  // treats any piece.weight as real, so only stamp it on apparel slots.
  if (category === 'apparel') {
    const locked = getLockedArmorWeight(getItemInfo(itemId)?.setName);
    if (locked) next.weight = locked;
    else if (prev?.weight !== undefined) next.weight = prev.weight;
  }
  return next;
}

const slotDef = (idx: number): EquipSlotDef =>
  EQUIP_SLOTS.find((s) => s.slot === idx) ?? {
    slot: idx,
    name: `Slot ${idx}`,
    category: 'apparel',
    slotType: 'chest',
  };

// ── Slot Row ────────────────────────────────────────────────────────────────

interface SlotRowProps {
  def: EquipSlotDef;
  piece: GearPiece | undefined;
  disabledReason: string | undefined;
  onOpen: (def: EquipSlotDef) => void;
  onClear: (slot: number) => void;
  onWeightChange?: (slot: number, weight: ArmorWeight) => void;
  onTraitChange?: (slot: number, trait: string | undefined) => void;
  onEnchantChange?: (slot: number, enchant: string | undefined) => void;
}

const SlotRowComponent: React.FC<SlotRowProps> = ({
  def,
  piece,
  disabledReason,
  onOpen,
  onClear,
  onWeightChange,
  onTraitChange,
  onEnchantChange,
}) => {
  const itemId = piece?.id != null ? Number(piece.id) : null;
  const info = itemId ? getItemInfo(itemId) : null;
  const itemName = itemId ? deriveItemNameForSlot(itemId, def.slotType) : null;

  // Sets that only exist in one armor weight in-game (mythics, overland/
  // dungeon/trial drops) are locked — the chip shows their fixed weight and
  // can't be cycled. Crafted + monster sets return null here = free choice.
  const lockedWeight = getLockedArmorWeight(info?.setName);

  return (
    <GearSlotCard
      slotDef={def}
      itemId={itemId}
      itemName={itemName}
      setName={info?.setName ?? null}
      isDisabled={Boolean(disabledReason)}
      disabledReason={disabledReason}
      weight={lockedWeight ?? piece?.weight}
      lockedWeight={lockedWeight}
      onWeightChange={onWeightChange ? (w: ArmorWeight) => onWeightChange(def.slot, w) : undefined}
      trait={piece?.trait}
      onTraitChange={
        onTraitChange ? (t: string | undefined) => onTraitChange(def.slot, t) : undefined
      }
      enchant={piece?.enchant}
      onEnchantChange={
        onEnchantChange ? (e: string | undefined) => onEnchantChange(def.slot, e) : undefined
      }
      onOpen={() => onOpen(def)}
      onClear={() => onClear(def.slot)}
    />
  );
};

// Memoized so only the slot whose piece / disabledReason actually changed
// re-renders. Immer's structural sharing keeps `piece` reference-stable when
// unrelated gear slots mutate, so a single gear edit now triggers at most 2
// SlotRow renders (the edited slot + its off-hand partner when 2H toggles)
// instead of 14.
const SlotRow = React.memo(SlotRowComponent);

// ── Section header ──────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string }> = ({ label }) => {
  const isDark = useTheme().palette.mode === 'dark';
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1.6,
        fontSize: '0.55rem',
        fontFamily: 'Space Grotesk, Inter, system-ui',
        color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.32)',
        py: 0.25,
      }}
    >
      {label}
    </Typography>
  );
};

// ── Props ───────────────────────────────────────────────────────────────────

export interface EquipmentPickerProps {
  gear: GearConfig;
  onChange: (gear: GearConfig) => void;
  onWeightChange?: (slot: number, weight: ArmorWeight) => void;
  onTraitChange?: (slot: number, trait: string | undefined) => void;
  onEnchantChange?: (slot: number, enchant: string | undefined) => void;
}

// ── Slot groups ─────────────────────────────────────────────────────────────

const APPAREL_SLOTS = [0, 3, 2, 16, 6, 8, 9]; // Head, Shoulders, Body, Hands, Waist, Legs, Feet
const ACCESSORY_SLOTS = [1, 11, 12]; // Neck, Ring 1, Ring 2
const FRONT_WEAPON_SLOTS = [4, 5]; // Main-Hand, Off-Hand
const BACK_WEAPON_SLOTS = [20, 21]; // Back bar Main-Hand, Off-Hand

// ── Main Component ──────────────────────────────────────────────────────────

export const EquipmentPicker: React.FC<EquipmentPickerProps> = ({
  gear,
  onChange,
  onWeightChange,
  onTraitChange,
  onEnchantChange,
}) => {
  const [pickerSlot, setPickerSlot] = useState<EquipSlotDef | null>(null);

  const frontMainId = gear[FRONT_MAIN]?.id != null ? Number(gear[FRONT_MAIN].id) : null;
  const backMainId = gear[BACK_MAIN]?.id != null ? Number(gear[BACK_MAIN].id) : null;

  // 2H status tracked in state so the async UESP fallback can update the
  // gate after initial render — otherwise a build rehydrated from storage
  // with an uncached 2H weapon would render an enabled off-hand until some
  // unrelated re-render happened.
  //
  // Seed with the sync classifier so local-data hits (99%+ of items) are
  // correct on first render and don't need to wait for a microtask.
  const [twoHandedStatus, setTwoHandedStatus] = useState(() => ({
    front: isTwoHandedWeapon(frontMainId),
    back: isTwoHandedWeapon(backMainId),
  }));

  // Refs so handleOpen/handleClear can have empty (or near-empty) dep arrays.
  // Stable handler refs are required for the memoized SlotRow — otherwise
  // every gear edit produces fresh closures and defeats React.memo.
  const gearRef = useRef(gear);
  gearRef.current = gear;

  // Re-classify asynchronously whenever either main-hand changes, and
  // auto-clear the off-hand retroactively if async classification reveals
  // a 2H weapon the sync path missed (e.g. a newly-added weapon that
  // required a UESP fetch). Single source of truth for both the lock
  // state AND the auto-clear behavior.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchIsTwoHandedWeapon(frontMainId),
      fetchIsTwoHandedWeapon(backMainId),
    ]).then(([front, back]) => {
      if (cancelled) return;
      setTwoHandedStatus({ front, back });
      const currentGear = gearRef.current;
      const frontOffOccupied = currentGear[FRONT_OFF]?.id != null;
      const backOffOccupied = currentGear[BACK_OFF]?.id != null;
      if ((front && frontOffOccupied) || (back && backOffOccupied)) {
        const next: GearConfig = { ...currentGear };
        if (front && frontOffOccupied) next[FRONT_OFF] = { id: undefined };
        if (back && backOffOccupied) next[BACK_OFF] = { id: undefined };
        onChange(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [frontMainId, backMainId, onChange]);

  const disabledSlots = useMemo<Partial<Record<number, string>>>(() => {
    const result: Partial<Record<number, string>> = {};
    if (twoHandedStatus.front) result[FRONT_OFF] = 'Front bar weapon uses both hands';
    if (twoHandedStatus.back) result[BACK_OFF] = 'Back bar weapon uses both hands';
    return result;
  }, [twoHandedStatus]);

  const disabledSlotsRef = useRef(disabledSlots);
  disabledSlotsRef.current = disabledSlots;

  const handleOpen = useCallback((def: EquipSlotDef): void => {
    if (!disabledSlotsRef.current[def.slot]) setPickerSlot(def);
  }, []);
  const handleClose = useCallback((): void => setPickerSlot(null), []);

  const handleSelect = useCallback(
    (itemId: number): void => {
      if (!pickerSlot) return;
      const slot = pickerSlot.slot;
      const nextPiece = buildReplacementPiece(gearRef.current[slot], itemId, pickerSlot.category);
      const next: GearConfig = { ...gearRef.current, [slot]: nextPiece };
      // Sync fast-path auto-clear (local-data items). The useEffect above
      // handles the uncached case retroactively once the UESP fetch lands.
      if ((slot === FRONT_MAIN || slot === BACK_MAIN) && isTwoHandedWeapon(itemId)) {
        const offSlot = slot === FRONT_MAIN ? FRONT_OFF : BACK_OFF;
        next[offSlot] = { id: undefined };
      }
      onChange(next);
      setPickerSlot(null);
    },
    [onChange, pickerSlot],
  );

  const handleClear = useCallback(
    (slot: number): void => {
      onChange({ ...gearRef.current, [slot]: { id: undefined } });
    },
    [onChange],
  );

  const renderSlots = (slots: number[]): React.ReactNode =>
    slots.map((idx) => (
      <SlotRow
        key={idx}
        def={slotDef(idx)}
        piece={gear[idx]}
        disabledReason={disabledSlots[idx]}
        onOpen={handleOpen}
        onClear={handleClear}
        onWeightChange={onWeightChange}
        onTraitChange={onTraitChange}
        onEnchantChange={onEnchantChange}
      />
    ));

  return (
    <>
      <Stack spacing={0.5}>
        {/* ── Apparel ────────────────── */}
        <SectionLabel label="Apparel" />
        <Stack spacing={0.5}>{renderSlots(APPAREL_SLOTS)}</Stack>

        {/* ── Accessories ────────────── */}
        <Box sx={{ pt: 0.75 }} />
        <SectionLabel label="Accessories" />
        <Stack spacing={0.5}>{renderSlots(ACCESSORY_SLOTS)}</Stack>

        {/* ── Weapons — Front ────────── */}
        <Box sx={{ pt: 0.75 }} />
        <SectionLabel label="Front Bar" />
        <Stack spacing={0.5}>{renderSlots(FRONT_WEAPON_SLOTS)}</Stack>

        {/* ── Weapons — Back ─────────── */}
        <Box sx={{ pt: 0.25 }} />
        <SectionLabel label="Back Bar" />
        <Stack spacing={0.5}>{renderSlots(BACK_WEAPON_SLOTS)}</Stack>
      </Stack>

      {pickerSlot && (
        <GearPickerDialog
          open={Boolean(pickerSlot)}
          onClose={handleClose}
          onSelect={handleSelect}
          targetSlot={pickerSlot.slotType}
          slotName={pickerSlot.name}
          currentItemId={
            gear[pickerSlot.slot]?.id != null ? Number(gear[pickerSlot.slot].id) : null
          }
        />
      )}
    </>
  );
};
