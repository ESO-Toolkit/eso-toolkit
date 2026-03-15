/**
 * Skills Section — front bar + back bar with SkillSlotCells.
 * Horizontal skill bars with @dnd-kit drag-reorder.
 */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Divider, Stack, Typography } from '@mui/material';
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import type { SkillsConfig } from '../../../loadout-manager/types/loadout.types';
import { setSkills } from '../../store/buildEditorSlice';
import { SkillSlotCell } from '../primitives/SkillSlotCell';

const SKILL_SLOTS = [3, 4, 5, 6, 7];
const ULTIMATE_SLOT = 8;
const ALL_SLOTS = [...SKILL_SLOTS, ULTIMATE_SLOT];

// ─── Sortable Skill Slot wrapper ─────────────────────────────────────────────

interface SortableSkillSlotProps {
  slotIndex: number;
  barIndex: 0 | 1;
  abilityId: number | undefined;
  onSelect: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onRemove: (barIndex: 0 | 1, slotIndex: number) => void;
}

const SortableSkillSlot: React.FC<SortableSkillSlotProps> = ({
  slotIndex,
  barIndex,
  abilityId,
  onSelect,
  onRemove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${barIndex}-${slotIndex}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <SkillSlotCell
        slotIndex={slotIndex}
        barIndex={barIndex}
        abilityId={abilityId}
        onSelect={onSelect}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

// ─── Skill Bar ───────────────────────────────────────────────────────────────

interface SkillBarProps {
  label: string;
  barIndex: 0 | 1;
  bar: { [slotIndex: number]: number };
  onSelect: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onRemove: (barIndex: 0 | 1, slotIndex: number) => void;
  onReorder: (barIndex: 0 | 1, oldSlotIndex: number, newSlotIndex: number) => void;
}

const SkillBar: React.FC<SkillBarProps> = ({
  label,
  barIndex,
  bar,
  onSelect,
  onRemove,
  onReorder,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortableIds = useMemo(() => ALL_SLOTS.map((s) => `${barIndex}-${s}`), [barIndex]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldSlotIndex = Number((active.id as string).split('-')[1]);
        const newSlotIndex = Number((over.id as string).split('-')[1]);
        onReorder(barIndex, oldSlotIndex, newSlotIndex);
      }
    },
    [barIndex, onReorder],
  );

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 700, mb: 0.75, display: 'block' }}
      >
        {label}
      </Typography>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <Stack spacing={0.5}>
            {ALL_SLOTS.map((slot) => (
              <SortableSkillSlot
                key={slot}
                slotIndex={slot}
                barIndex={barIndex}
                abilityId={bar[slot]}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
    </Box>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const SkillsSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const handleSelect = useCallback(
    (barIndex: 0 | 1, slotIndex: number, abilityId: number): void => {
      const updated: SkillsConfig = {
        ...setup.skills,
        [barIndex]: { ...setup.skills[barIndex], [slotIndex]: abilityId },
      };
      dispatch(setSkills(updated));
    },
    [dispatch, setup.skills],
  );

  const handleRemove = useCallback(
    (barIndex: 0 | 1, slotIndex: number): void => {
      const bar = { ...setup.skills[barIndex] };
      delete bar[slotIndex];
      dispatch(setSkills({ ...setup.skills, [barIndex]: bar }));
    },
    [dispatch, setup.skills],
  );

  const handleReorder = useCallback(
    (barIndex: 0 | 1, oldSlotIndex: number, newSlotIndex: number): void => {
      // Swap the abilities between the two slot positions
      const bar = { ...setup.skills[barIndex] };
      const oldAbility = bar[oldSlotIndex];
      const newAbility = bar[newSlotIndex];

      if (oldAbility !== undefined) {
        bar[newSlotIndex] = oldAbility;
      } else {
        delete bar[newSlotIndex];
      }

      if (newAbility !== undefined) {
        bar[oldSlotIndex] = newAbility;
      } else {
        delete bar[oldSlotIndex];
      }

      dispatch(setSkills({ ...setup.skills, [barIndex]: bar }));
    },
    [dispatch, setup.skills],
  );

  return (
    <Stack spacing={2.5}>
      <SkillBar
        label="Frontbar"
        barIndex={0}
        bar={setup.skills[0]}
        onSelect={handleSelect}
        onRemove={handleRemove}
        onReorder={handleReorder}
      />
      <Divider sx={{ opacity: 0.3 }} />
      <SkillBar
        label="Backbar"
        barIndex={1}
        bar={setup.skills[1]}
        onSelect={handleSelect}
        onRemove={handleRemove}
        onReorder={handleReorder}
      />
    </Stack>
  );
};
