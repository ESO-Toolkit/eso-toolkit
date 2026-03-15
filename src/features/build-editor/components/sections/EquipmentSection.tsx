/**
 * Equipment Section — paperdoll-style grid of GearSlotCards.
 * Still opens the shared ItemPickerDialog from loadout-manager.
 */

import { Box, Divider, Stack, Typography } from '@mui/material';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { ItemPickerDialog } from '../../../loadout-manager/components/ItemPickerDialog';
import { getItemInfo } from '../../../loadout-manager/data/itemIdMap';
import { EQUIP_SLOTS, type EquipSlotDef } from '../../data/esoStaticData';
import { setGearSlot } from '../../store/buildEditorSlice';
import { GearSlotCard } from '../primitives/GearSlotCard';

interface SlotGroupProps {
  title: string;
  slots: EquipSlotDef[];
  gear: Record<number, { id?: string | number }>;
  onOpen: (slotDef: EquipSlotDef) => void;
  onClear: (slot: number) => void;
}

const SlotGroup: React.FC<SlotGroupProps> = ({ title, slots, gear, onOpen, onClear }) => (
  <Box>
    <Typography
      variant="overline"
      color="text.disabled"
      sx={{ fontWeight: 700, letterSpacing: 1.5, mb: 0.5, display: 'block', fontSize: 10 }}
    >
      {title}
    </Typography>
    <Stack spacing={0.5}>
      {slots.map((s) => {
        const piece = gear[s.slot];
        const itemId = piece?.id != null ? Number(piece.id) : null;
        const info = itemId ? getItemInfo(itemId) : null;
        return (
          <GearSlotCard
            key={s.slot}
            slotDef={s}
            itemName={info?.name ?? null}
            onOpen={() => onOpen(s)}
            onClear={() => onClear(s.slot)}
          />
        );
      })}
    </Stack>
  </Box>
);

export const EquipmentSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const [pickerSlot, setPickerSlot] = useState<EquipSlotDef | null>(null);

  const handleOpen = (slotDef: EquipSlotDef): void => setPickerSlot(slotDef);
  const handleClose = (): void => setPickerSlot(null);

  const handleSelect = (itemId: number): void => {
    if (pickerSlot) {
      dispatch(setGearSlot({ slot: pickerSlot.slot, itemId }));
    }
    handleClose();
  };

  const handleClear = (slot: number): void => {
    dispatch(setGearSlot({ slot, itemId: null }));
  };

  const apparel = EQUIP_SLOTS.filter((s) => s.category === 'apparel');
  const accessories = EQUIP_SLOTS.filter((s) => s.category === 'accessories');
  const weapons = EQUIP_SLOTS.filter((s) => s.category === 'weapons');

  return (
    <>
      <Stack spacing={2}>
        <SlotGroup
          title="Apparel"
          slots={apparel}
          gear={setup.gear}
          onOpen={handleOpen}
          onClear={handleClear}
        />
        <Divider sx={{ opacity: 0.3 }} />
        <SlotGroup
          title="Accessories"
          slots={accessories}
          gear={setup.gear}
          onOpen={handleOpen}
          onClear={handleClear}
        />
        <Divider sx={{ opacity: 0.3 }} />
        <SlotGroup
          title="Weapons"
          slots={weapons}
          gear={setup.gear}
          onOpen={handleOpen}
          onClear={handleClear}
        />
      </Stack>

      {pickerSlot && (
        <ItemPickerDialog
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
