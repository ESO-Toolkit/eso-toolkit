/**
 * Equipment Section — all gear slots organized by Apparel / Accessories / Weapons.
 * Reuses the existing ItemPickerDialog from loadout-manager.
 */

import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { ItemPickerDialog } from '../../../loadout-manager/components/ItemPickerDialog';
import { getItemInfo } from '../../../loadout-manager/data/itemIdMap';
import { EQUIP_SLOTS, type EquipSlotDef } from '../../data/esoStaticData';
import { setGearSlot } from '../../store/buildEditorSlice';

// ─── Slot icons (placeholder boxes) ──────────────────────────────────────────

const SLOT_ICON_MAP: Record<string, string> = {
  head: '⛑',
  chest: '🧥',
  shoulders: '🪖',
  waist: '🎗',
  hand: '🧤',
  legs: '👖',
  feet: '👢',
  neck: '📿',
  ring: '💍',
  weapon: '⚔️',
  offhand: '🛡',
};

// ─── Single Slot Row ──────────────────────────────────────────────────────────

interface SlotRowProps {
  slotDef: EquipSlotDef;
  itemId?: number | null;
  onOpen: (slotDef: EquipSlotDef) => void;
  onClear: (slot: number) => void;
}

const SlotRow: React.FC<SlotRowProps> = ({ slotDef, itemId, onOpen, onClear }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const info = itemId ? getItemInfo(itemId) : null;

  return (
    <Box
      onClick={() => onOpen(slotDef)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.25,
        px: 1.75,
        borderRadius: 1.5,
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'all 0.14s',
        '&:hover': {
          background: isDark ? alpha('#38bdf8', 0.07) : alpha('#0f172a', 0.04),
          borderColor: isDark ? alpha('#38bdf8', 0.2) : alpha('#0f172a', 0.12),
        },
      }}
    >
      {/* Slot thumbnail */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.04),
          border: `1px solid ${isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1)}`,
          fontSize: 18,
          flexShrink: 0,
          color: info ? 'text.primary' : 'text.disabled',
        }}
      >
        {SLOT_ICON_MAP[slotDef.slotType] ?? '📦'}
      </Box>

      {/* Name */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {info ? (
          <>
            <Typography variant="body2" fontWeight={600} noWrap>
              {info.name}
            </Typography>
            <Typography variant="caption" color="text.disabled" noWrap>
              {slotDef.name}
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.disabled">
            {slotDef.name}
          </Typography>
        )}
      </Box>

      {/* Clear */}
      {itemId && (
        <Tooltip title="Remove item">
          <IconButton
            size="small"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onClear(slotDef.slot);
            }}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

// ─── Category Group ───────────────────────────────────────────────────────────

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
      sx={{ fontWeight: 700, letterSpacing: 1.5, mb: 0.5, display: 'block' }}
    >
      {title}
    </Typography>
    <Stack divider={<Divider sx={{ opacity: 0.35 }} />}>
      {slots.map((s) => {
        const piece = gear[s.slot];
        const itemId = piece?.id != null ? Number(piece.id) : null;
        return (
          <SlotRow
            key={s.slot}
            slotDef={s}
            itemId={itemId}
            onOpen={onOpen}
            onClear={onClear}
          />
        );
      })}
    </Stack>
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

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
      <Stack spacing={3}>
        <SlotGroup
          title="Apparel"
          slots={apparel}
          gear={setup.gear}
          onOpen={handleOpen}
          onClear={handleClear}
        />
        <SlotGroup
          title="Accessories"
          slots={accessories}
          gear={setup.gear}
          onOpen={handleOpen}
          onClear={handleClear}
        />
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
            setup.gear[pickerSlot.slot]?.id != null
              ? Number(setup.gear[pickerSlot.slot].id)
              : null
          }
        />
      )}
    </>
  );
};
