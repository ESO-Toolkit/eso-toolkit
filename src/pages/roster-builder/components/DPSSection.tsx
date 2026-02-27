/**
 * DPS Section Component
 * Displays all 8 DPS slots with drag-and-drop reordering
 */

import { Typography, Stack, Box, Divider, Paper } from '@mui/material';
import { DndContext, SortableContext } from '@dnd-kit/core';
import { arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSensor, useSensors } from '@dnd-kit/core';
import { PointerSensor, KeyboardSensor, closestCenter } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import React from 'react';

import { DPSSlot, JailDDType } from '../../../types/roster';
import { DPSSlotCard } from './cards/DPSSlotCard';
import { getRoleColorSolid } from '../../../utils/roleColors';

interface DPSSectionProps {
  dpsSlots: DPSSlot[];
  availableGroups: string[];
  onChangeDPSSlot: (slotNumber: number, updates: Partial<DPSSlot>) => void;
  onConvertDPSToJail: (slotNumber: number, jailType: JailDDType) => void;
  onConvertJailToDPS: (slotNumber: number) => void;
  onDPSDragEnd: (event: { active: { id: number }; over?: { id: number } }) => void;
}

export const DPSSection: React.FC<DPSSectionProps> = ({
  dpsSlots,
  availableGroups,
  onChangeDPSSlot,
  onConvertDPSToJail,
  onConvertJailToDPS,
  onDPSDragEnd,
}) => {
  const themeMode = 'dark'; // Could get from theme context
  const dpsColor = getRoleColorSolid('dps', themeMode);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <Paper
      elevation={2}
      sx={{
        mb: 3,
        borderLeft: `4px solid ${dpsColor}`,
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: dpsColor }}>
          DPS Roster (8 Slots)
        </Typography>

        <Divider sx={{ my: 2 }} />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDPSDragEnd}
        >
          <SortableContext
            items={dpsSlots.map((slot) => slot.slotNumber)}
            strategy={verticalListSortingStrategy}
          >
            <Stack spacing={1.5} mb={3}>
              {dpsSlots.map((slot, index) => (
                <DPSSlotCard
                  key={slot.slotNumber}
                  slot={slot}
                  availableGroups={availableGroups}
                  onChange={(updates) => onChangeDPSSlot(slot.slotNumber, updates)}
                  onConvertToJail={onConvertDPSToJail}
                  onConvertToDPS={onConvertJailToDPS}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      </Box>
    </Paper>
  );
};
