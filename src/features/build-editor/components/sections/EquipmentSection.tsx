/**
 * Equipment Section — tile-grid layout matching the loadout-manager GearSelector.
 *
 * Apparel, accessories, and weapons are arranged in centered horizontal rows
 * of square icon tiles.  2H weapons auto-disable the matching off-hand slot.
 */

import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { getItemInfo } from '../../../loadout-manager/data/itemIdMap';
import { EQUIP_SLOTS, type EquipSlotDef } from '../../data/esoStaticData';
import { setGearSlot } from '../../store/buildEditorSlice';
import { GearPickerDialog } from '../pickers/GearPicker';
import { GearSlotCard } from '../primitives/GearSlotCard';

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

/** Look up a slot definition by its numeric index. */
const slotDef = (idx: number): EquipSlotDef => EQUIP_SLOTS.find((s) => s.slot === idx)!;

/** Build a tile for a single slot. */
interface TileProps {
  def: EquipSlotDef;
  gear: Record<number, { id?: string | number }>;
  disabledSlots: Partial<Record<number, string>>;
  onOpen: (def: EquipSlotDef) => void;
  onClear: (slot: number) => void;
}

const Tile: React.FC<TileProps> = ({ def, gear, disabledSlots, onOpen, onClear }) => {
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

// ── Main Component ──────────────────────────────────────────────────────────

export const EquipmentSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const [pickerSlot, setPickerSlot] = useState<EquipSlotDef | null>(null);

  const disabledSlots = useMemo<Partial<Record<number, string>>>(() => {
    const result: Partial<Record<number, string>> = {};
    const fId = setup.gear[FRONT_MAIN]?.id != null ? Number(setup.gear[FRONT_MAIN].id) : null;
    const bId = setup.gear[BACK_MAIN]?.id != null ? Number(setup.gear[BACK_MAIN].id) : null;
    if (isTwoHanded(fId)) result[FRONT_OFF] = 'Front bar weapon uses both hands';
    if (isTwoHanded(bId)) result[BACK_OFF] = 'Back bar weapon uses both hands';
    return result;
  }, [setup.gear]);

  const handleOpen = (def: EquipSlotDef): void => {
    if (!disabledSlots[def.slot]) setPickerSlot(def);
  };
  const handleClose = (): void => setPickerSlot(null);

  const handleSelect = (itemId: number): void => {
    if (!pickerSlot) return;
    dispatch(setGearSlot({ slot: pickerSlot.slot, itemId }));
    // Auto-clear off-hand when a 2H weapon is selected
    if ((pickerSlot.slot === FRONT_MAIN || pickerSlot.slot === BACK_MAIN) && isTwoHanded(itemId)) {
      const offSlot = pickerSlot.slot === FRONT_MAIN ? FRONT_OFF : BACK_OFF;
      dispatch(setGearSlot({ slot: offSlot, itemId: null }));
    }
    handleClose();
  };

  const handleClear = (slot: number): void => {
    dispatch(setGearSlot({ slot, itemId: null }));
  };

  /** Shorthand to render a row of tiles. */
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
          gear={setup.gear}
          disabledSlots={disabledSlots}
          onOpen={handleOpen}
          onClear={handleClear}
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
            setup.gear[pickerSlot.slot]?.id != null ? Number(setup.gear[pickerSlot.slot].id) : null
          }
        />
      )}
    </>
  );
};
