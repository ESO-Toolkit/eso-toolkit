/**
 * EquipmentPicker — prop-driven version of EquipmentSection.
 *
 * Renders the same tile-grid layout (Apparel → Accessories → Weapons) with
 * GearSlotCard tiles and GearPickerDialog. No Redux coupling — takes gear
 * via props and calls onChange on mutation.
 * EquipmentSection wraps this with useSelector / dispatch.
 */

import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useMemo, useState } from 'react';

import { getItemInfo } from '../../../loadout-manager/data/itemIdMap';
import type { ArmorWeight, GearConfig } from '../../../loadout-manager/types/loadout.types';
import { EQUIP_SLOTS, type EquipSlotDef } from '../../data/esoStaticData';
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

// ── Tile ────────────────────────────────────────────────────────────────────

interface TileProps {
  def: EquipSlotDef;
  gear: GearConfig;
  disabledSlots: Partial<Record<number, string>>;
  onOpen: (def: EquipSlotDef) => void;
  onClear: (slot: number) => void;
  onWeightChange?: (slot: number, weight: ArmorWeight) => void;
}

const Tile: React.FC<TileProps> = ({
  def,
  gear,
  disabledSlots,
  onOpen,
  onClear,
  onWeightChange,
}) => {
  const piece = gear[def.slot];
  const itemId = piece?.id != null ? Number(piece.id) : null;
  const info = itemId ? getItemInfo(itemId) : null;
  const disabledReason = disabledSlots[def.slot];

  return (
    <GearSlotCard
      slotDef={def}
      itemId={itemId}
      itemName={info?.name ?? null}
      setName={info?.setName ?? null}
      isDisabled={Boolean(disabledReason)}
      disabledReason={disabledReason}
      weight={piece?.weight}
      onWeightChange={
        onWeightChange ? (w: ArmorWeight) => onWeightChange(def.slot, w) : undefined
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
        fontSize: '0.6rem',
        fontFamily: 'Space Grotesk, Inter, system-ui',
        color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.38)',
        alignSelf: 'stretch',
        textAlign: 'center',
        pb: 0.5,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
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
}

// ── Main Component ──────────────────────────────────────────────────────────

export const EquipmentPicker: React.FC<EquipmentPickerProps> = ({
  gear,
  onChange,
  onWeightChange,
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

  const tileRow = (slots: number[]): React.ReactNode => (
    <Stack
      direction="row"
      spacing={1}
      justifyContent="center"
      useFlexGap
      sx={{ flexWrap: 'wrap', rowGap: 1 }}
    >
      {slots.map((idx) => (
        <Tile
          key={idx}
          def={slotDef(idx)}
          gear={gear}
          disabledSlots={disabledSlots}
          onOpen={handleOpen}
          onClear={handleClear}
          onWeightChange={onWeightChange}
        />
      ))}
    </Stack>
  );

  return (
    <>
      <Stack spacing={2} alignItems="center">
        {/* ── Apparel ──────────────── */}
        <SectionLabel label="Apparel" />
        {tileRow([0, 3, 2])} {/* Head · Shoulders · Chest */}
        {tileRow([16, 6, 8, 9])} {/* Hands · Waist · Legs · Feet */}
        {/* ── Accessories ──────────── */}
        <Box sx={{ pt: 0.5 }} />
        <SectionLabel label="Accessories" />
        {tileRow([1, 11, 12])} {/* Neck · Ring 1 · Ring 2 */}
        {/* ── Weapons ──────────────── */}
        <Box sx={{ pt: 0.5 }} />
        <SectionLabel label="Weapons" />
        {tileRow([4, 5])} {/* Front bar */}
        {tileRow([20, 21])} {/* Back bar */}
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
