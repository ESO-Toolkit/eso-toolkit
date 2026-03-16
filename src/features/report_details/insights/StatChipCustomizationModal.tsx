/**
 * Modal dialog for customizing which stat chips are visible on player cards.
 *
 * Users can toggle individual chips on/off and drag them to reorder. The order
 * of checked chips determines the display order on player cards. Changes are
 * persisted to localStorage and take effect immediately across all player cards.
 */

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

import type { StatChipId } from './statChipConfig';
import { STAT_CHIP_IDS, STAT_CHIP_META } from './statChipConfig';
import { StatChipIcon } from './StatChipIcon';

// ---------------------------------------------------------------------------
// SortableChipRow — a single draggable row inside the customization list
// ---------------------------------------------------------------------------

interface SortableChipRowProps {
  chipId: StatChipId;
  checked: boolean;
  onToggle: (chipId: StatChipId) => void;
}

const SortableChipRow: React.FC<SortableChipRowProps> = ({ chipId, checked, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chipId,
  });

  const meta = STAT_CHIP_META[chipId];

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        py: 0.25,
        borderRadius: 1,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? 'grabbing' : 'default',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      {/* Drag handle */}
      <IconButton
        size="small"
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          color: 'text.disabled',
          p: 0.25,
          '&:active': { cursor: 'grabbing' },
        }}
        aria-label={`Drag to reorder ${meta.label}`}
        tabIndex={-1}
      >
        <DragIndicatorIcon fontSize="small" />
      </IconButton>

      {/* Checkbox */}
      <Checkbox size="small" checked={checked} onChange={() => onToggle(chipId)} sx={{ p: 0.25 }} />

      {/* Label */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
        <StatChipIcon chipId={chipId} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {meta.label}
        </Typography>
        {meta.roleFilter && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            ({meta.roleFilter.join(', ')})
          </Typography>
        )}
      </Box>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// StatChipCustomizationModal
// ---------------------------------------------------------------------------

interface StatChipCustomizationModalProps {
  open: boolean;
  onClose: () => void;
  visibleChips: StatChipId[];
  onSave: (chips: StatChipId[]) => void;
}

/** Build the initial ordered list: visible chips first (in user order), then the rest. */
function buildInitialOrder(visibleChips: StatChipId[]): StatChipId[] {
  const visibleSet = new Set(visibleChips);
  const rest = (STAT_CHIP_IDS as readonly StatChipId[]).filter((id) => !visibleSet.has(id));
  return [...visibleChips, ...rest];
}

export const StatChipCustomizationModal: React.FC<StatChipCustomizationModalProps> = React.memo(
  ({ open, onClose, visibleChips, onSave }) => {
    // orderedIds holds the full list of all chips in user-defined order.
    // visibleSet tracks which chips are checked (will appear on cards).
    const [orderedIds, setOrderedIds] = useState<StatChipId[]>(() =>
      buildInitialOrder(visibleChips),
    );
    const [visibleSet, setVisibleSet] = useState<Set<StatChipId>>(() => new Set(visibleChips));

    // Reset draft whenever the modal opens with (potentially) new props.
    React.useEffect(() => {
      if (open) {
        setOrderedIds(buildInitialOrder(visibleChips));
        setVisibleSet(new Set(visibleChips));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on open
    }, [open]);

    // DnD sensors
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setOrderedIds((prev) => {
          const oldIndex = prev.indexOf(active.id as StatChipId);
          const newIndex = prev.indexOf(over.id as StatChipId);
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
    }, []);

    const handleToggle = useCallback((chipId: StatChipId) => {
      setVisibleSet((prev) => {
        const next = new Set(prev);
        if (next.has(chipId)) {
          next.delete(chipId);
        } else {
          next.add(chipId);
        }
        return next;
      });
    }, []);

    const handleSave = useCallback(() => {
      // Preserve the user's drag order; only emit the checked chips.
      const ordered = orderedIds.filter((id) => visibleSet.has(id));
      onSave(ordered);
      onClose();
    }, [orderedIds, visibleSet, onSave, onClose]);

    const handleSelectAll = useCallback(() => {
      setVisibleSet(new Set(STAT_CHIP_IDS));
    }, []);

    const handleSelectNone = useCallback(() => {
      setVisibleSet(new Set());
    }, []);

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: '1.1rem',
            pb: 0.5,
          }}
        >
          Customize Stat Chips
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose which stats to display on player cards and drag to reorder. Preferences are saved
            to your browser.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Button size="small" variant="text" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button size="small" variant="text" onClick={handleSelectNone}>
              Select None
            </Button>
          </Box>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {orderedIds.map((chipId) => (
                  <SortableChipRow
                    key={chipId}
                    chipId={chipId}
                    checked={visibleSet.has(chipId)}
                    onToggle={handleToggle}
                  />
                ))}
              </Box>
            </SortableContext>
          </DndContext>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" size="small">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" size="small">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

StatChipCustomizationModal.displayName = 'StatChipCustomizationModal';
