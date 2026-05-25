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
import TuneIcon from '@mui/icons-material/Tune';
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
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const accent = isDarkMode ? '#38bdf8' : '#3b82f6';

  const meta = STAT_CHIP_META[chipId];

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        py: 0.5,
        px: 1,
        borderRadius: '8px',
        transform: CSS.Transform.toString(transform),
        transition: transition
          ? `${transition}, background-color 150ms ease, border-color 150ms ease`
          : 'background-color 150ms ease, border-color 150ms ease',
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? 'grabbing' : 'default',
        border: '1px solid transparent',
        background: checked
          ? isDarkMode
            ? 'rgba(56, 189, 248, 0.12)'
            : 'rgba(59, 130, 246, 0.08)'
          : 'transparent',
        '&:hover': {
          background: checked
            ? isDarkMode
              ? 'rgba(56, 189, 248, 0.18)'
              : 'rgba(59, 130, 246, 0.12)'
            : isDarkMode
              ? 'rgba(56, 189, 248, 0.1)'
              : 'rgba(59, 130, 246, 0.06)',
          borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(59, 130, 246, 0.2)',
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
          color: isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.5)',
          p: 0.25,
          '&:active': { cursor: 'grabbing' },
          '&:hover': {
            color: accent,
          },
        }}
        aria-label={`Drag to reorder ${meta.label}`}
      >
        <DragIndicatorIcon fontSize="small" />
      </IconButton>

      {/* Checkbox */}
      <Checkbox
        size="small"
        checked={checked}
        onChange={() => onToggle(chipId)}
        slotProps={{ input: { 'aria-label': `Toggle ${meta.label}` } }}
        sx={{
          p: 0.25,
          color: isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.5)',
          '&.Mui-checked': {
            color: accent,
          },
        }}
      />

      {/* Label */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
        <StatChipIcon chipId={chipId} />
        <Typography
          variant="body2"
          sx={{
            fontWeight: checked ? 600 : 500,
            color: checked
              ? accent
              : isDarkMode
                ? '#e2e8f0'
                : '#1e293b',
          }}
        >
          {meta.label}
        </Typography>
        {meta.roleFilter && (
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              color: isDarkMode ? '#94a3b8' : '#64748b',
            }}
          >
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
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const accent = isDarkMode ? '#38bdf8' : '#3b82f6';

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
              borderRadius: '16px',
              border: isDarkMode
                ? '1px solid rgba(56, 189, 248, 0.2)'
                : '1px solid rgba(59, 130, 246, 0.15)',
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.97) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(51, 65, 85, 0.93) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%)',
              backdropFilter: 'blur(16px)',
              boxShadow: isDarkMode
                ? '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 80px rgba(56, 189, 248, 0.08)'
                : '0 12px 40px rgba(0, 0, 0, 0.1), 0 0 60px rgba(59, 130, 246, 0.05)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: '1.1rem',
            pb: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
          }}
        >
          <TuneIcon sx={{ fontSize: '1.2rem', color: accent }} />
          <Box
            component="span"
            sx={{
              background: `linear-gradient(135deg, ${accent}, ${isDarkMode ? '#7dd3fc' : '#60a5fa'})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Customize Stat Chips
          </Box>
        </DialogTitle>

        <DialogContent sx={{ '&.MuiDialogContent-root': { pt: 1 } }}>
          <Typography
            variant="body2"
            sx={{
              mb: 2,
              color: isDarkMode ? '#94a3b8' : '#64748b',
            }}
          >
            Choose which stats to display on player cards and drag to reorder. Preferences are saved
            to your browser.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Button
              size="small"
              onClick={handleSelectAll}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                borderRadius: '16px',
                px: 1.5,
                py: 0.25,
                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                border: isDarkMode
                  ? '1px solid rgba(56, 189, 248, 0.25)'
                  : '1px solid rgba(59, 130, 246, 0.2)',
                background: isDarkMode
                  ? 'rgba(56, 189, 248, 0.08)'
                  : 'rgba(59, 130, 246, 0.05)',
                '&:hover': {
                  background: isDarkMode
                    ? 'rgba(56, 189, 248, 0.18)'
                    : 'rgba(59, 130, 246, 0.12)',
                  borderColor: isDarkMode
                    ? 'rgba(56, 189, 248, 0.4)'
                    : 'rgba(59, 130, 246, 0.3)',
                },
              }}
            >
              Select All
            </Button>
            <Button
              size="small"
              onClick={handleSelectNone}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                borderRadius: '16px',
                px: 1.5,
                py: 0.25,
                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                border: isDarkMode
                  ? '1px solid rgba(56, 189, 248, 0.25)'
                  : '1px solid rgba(59, 130, 246, 0.2)',
                background: isDarkMode
                  ? 'rgba(56, 189, 248, 0.08)'
                  : 'rgba(59, 130, 246, 0.05)',
                '&:hover': {
                  background: isDarkMode
                    ? 'rgba(56, 189, 248, 0.18)'
                    : 'rgba(59, 130, 246, 0.12)',
                  borderColor: isDarkMode
                    ? 'rgba(56, 189, 248, 0.4)'
                    : 'rgba(59, 130, 246, 0.3)',
                },
              }}
            >
              Select None
            </Button>
          </Box>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 1.5,
            borderTop: isDarkMode
              ? '1px solid rgba(56, 189, 248, 0.1)'
              : '1px solid rgba(59, 130, 246, 0.08)',
          }}
        >
          <Button
            onClick={onClose}
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              px: 2,
              color: isDarkMode ? '#94a3b8' : '#64748b',
              border: isDarkMode
                ? '1px solid rgba(148, 163, 184, 0.2)'
                : '1px solid rgba(100, 116, 139, 0.15)',
              '&:hover': {
                background: isDarkMode
                  ? 'rgba(148, 163, 184, 0.1)'
                  : 'rgba(100, 116, 139, 0.06)',
                borderColor: isDarkMode
                  ? 'rgba(148, 163, 184, 0.35)'
                  : 'rgba(100, 116, 139, 0.25)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              px: 2.5,
              color: '#ffffff',
              background: accent,
              boxShadow: isDarkMode
                ? `0 2px 12px ${alpha(accent, 0.4)}`
                : `0 2px 8px ${alpha(accent, 0.3)}`,
              '&:hover': {
                background: isDarkMode
                  ? alpha('#38bdf8', 0.85)
                  : alpha('#3b82f6', 0.85),
                boxShadow: isDarkMode
                  ? `0 4px 20px ${alpha(accent, 0.5)}`
                  : `0 4px 16px ${alpha(accent, 0.4)}`,
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

StatChipCustomizationModal.displayName = 'StatChipCustomizationModal';
