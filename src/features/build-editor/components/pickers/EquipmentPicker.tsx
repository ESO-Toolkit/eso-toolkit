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
import React, { useCallback, useMemo, useState } from 'react';

import { getItemInfo } from '../../../loadout-manager/data/itemIdMap';
import type { ArmorWeight, GearConfig } from '../../../loadout-manager/types/loadout.types';
import { EQUIP_SLOTS, type EquipSlotDef } from '../../data/esoStaticData';
import { getAvailableWeights } from '../../data/gearSetRegistry';
import { GearSlotCard } from '../primitives/GearSlotCard';

import { GearPickerDialog } from './GearPicker';

// ── 2H weapon logic ─────────────────────────────────────────────────────────

const TWO_HANDED_KEYWORDS = ['greatsword', 'battle axe', 'battleaxe', 'maul', 'bow', 'staff'];

const FRONT_MAIN = 4;
const FRONT_OFF = 5;
const BACK_MAIN = 20;
const BACK_OFF = 21;

function isTwoHanded(itemId: number | null | undefined): boolean {
  if (!itemId) return false;
  const info = getItemInfo(itemId);
  if (!info) return false;
  return TWO_HANDED_KEYWORDS.some((kw) => info.name.toLowerCase().includes(kw));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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
  gear: GearConfig;
  disabledSlots: Partial<Record<number, string>>;
  onOpen: (def: EquipSlotDef) => void;
  onClear: (slot: number) => void;
  onWeightChange?: (slot: number, weight: ArmorWeight) => void;
  onTraitChange?: (slot: number, trait: string | undefined) => void;
  onEnchantChange?: (slot: number, enchant: string | undefined) => void;
}

const SlotRow: React.FC<SlotRowProps> = ({
  def,
  gear,
  disabledSlots,
  onOpen,
  onClear,
  onWeightChange,
  onTraitChange,
  onEnchantChange,
}) => {
  const piece = gear[def.slot];
  const itemId = piece?.id != null ? Number(piece.id) : null;
  const info = itemId ? getItemInfo(itemId) : null;
  const disabledReason = disabledSlots[def.slot];

  const availableWeights = info?.setName ? getAvailableWeights(info.setName) : undefined;

  return (
    <GearSlotCard
      slotDef={def}
      itemId={itemId}
      itemName={info?.name ?? null}
      setName={info?.setName ?? null}
      isDisabled={Boolean(disabledReason)}
      disabledReason={disabledReason}
      weight={piece?.weight}
      availableWeights={availableWeights}
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

  const disabledSlots = useMemo<Partial<Record<number, string>>>(() => {
    const result: Partial<Record<number, string>> = {};
    const fId = gear[FRONT_MAIN]?.id != null ? Number(gear[FRONT_MAIN].id) : null;
    const bId = gear[BACK_MAIN]?.id != null ? Number(gear[BACK_MAIN].id) : null;
    if (isTwoHanded(fId)) result[FRONT_OFF] = 'Front bar weapon uses both hands';
    if (isTwoHanded(bId)) result[BACK_OFF] = 'Back bar weapon uses both hands';
    return result;
  }, [gear]);

  const handleOpen = useCallback(
    (def: EquipSlotDef): void => {
      if (!disabledSlots[def.slot]) setPickerSlot(def);
    },
    [disabledSlots],
  );
  const handleClose = useCallback((): void => setPickerSlot(null), []);

  const handleSelect = useCallback(
    (itemId: number): void => {
      if (!pickerSlot) return;
      const next: GearConfig = { ...gear, [pickerSlot.slot]: { id: itemId } };
      // Auto-clear off-hand when a 2H weapon is selected
      if (
        (pickerSlot.slot === FRONT_MAIN || pickerSlot.slot === BACK_MAIN) &&
        isTwoHanded(itemId)
      ) {
        const offSlot = pickerSlot.slot === FRONT_MAIN ? FRONT_OFF : BACK_OFF;
        next[offSlot] = { id: undefined };
      }
      onChange(next);
      setPickerSlot(null);
    },
    [gear, onChange, pickerSlot],
  );

  const handleClear = useCallback(
    (slot: number): void => {
      onChange({ ...gear, [slot]: { id: undefined } });
    },
    [gear, onChange],
  );

  const renderSlots = (slots: number[]): React.ReactNode =>
    slots.map((idx) => (
      <SlotRow
        key={idx}
        def={slotDef(idx)}
        gear={gear}
        disabledSlots={disabledSlots}
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
