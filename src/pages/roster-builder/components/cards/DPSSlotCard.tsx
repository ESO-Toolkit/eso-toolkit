/**
 * DPS Slot Card Component
 * Displays and allows editing of a single DPS slot
 * Supports drag-and-drop reordering
 */

import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  TextField,
  Autocomplete,
  Chip,
  Alert,
} from '@mui/material';
import { DragIndicator as DragIndicatorIcon } from '@mui/icons-material';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import React from 'react';

import { DPSSlot, JailDDType } from '../../../types/roster';
import { getJailDDTitle } from '../../utils/constants';

interface DPSSlotCardProps {
  slot: DPSSlot;
  availableGroups: string[];
  onChange: (updates: Partial<DPSSlot>) => void;
  onConvertToJail: (slotNumber: number, jailType: JailDDType) => void;
  onConvertToDPS: (slotNumber: number) => void;
}

export const DPSSlotCard: React.FC<DPSSlotCardProps> = ({
  slot,
  availableGroups,
  onChange,
  onConvertToJail,
  onConvertToDPS,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.slotNumber,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{ bgcolor: 'action.hover', cursor: isDragging ? 'grabbing' : 'default' }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton
            size="small"
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab' }}
            aria-label={`Drag to reorder DPS ${slot.slotNumber}`}
          >
            <DragIndicatorIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight="bold">
            DPS {slot.slotNumber}
            {slot.jailDDType && (
              <Chip
                label={getJailDDTitle(slot.jailDDType, slot.customDescription)}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
        </Box>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 40%', minWidth: 180 }}>
              <TextField
                fullWidth
                size="small"
                label="Player Name"
                value={slot.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 25%', minWidth: 150 }}>
              <TextField
                fullWidth
                size="small"
                label="Role Notes"
                placeholder="e.g., Portal L, Z'en"
                value={slot.roleNotes || ''}
                onChange={(e) => onChange({ roleNotes: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 25%', minWidth: 120 }}>
              <Autocomplete
                freeSolo
                size="small"
                options={[...availableGroups].sort()}
                value={slot.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => <TextField {...params} label="Group" />}
              />
            </Box>
          </Box>

          {/* Player Labels/Tags */}
          <Autocomplete
            multiple
            freeSolo
            size="small"
            options={[]}
            value={slot.labels || []}
            onChange={(_, value) => onChange({ labels: value })}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Labels / Tags"
                placeholder="Add custom labels (Press Enter)"
              />
            )}
          />

          {/* Convert to Jail DD or back to regular DPS */}
          {!slot.jailDDType ? (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: 'block' }}
              >
                Convert to Jail DD:
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'banner')}
                >
                  Banner
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'zenkosh')}
                >
                  Zenkosh
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'wm')}
                >
                  WM
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'wm-mk')}
                >
                  WM/MK
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'mk')}
                >
                  MK
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'custom')}
                >
                  Custom
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => onConvertToDPS(slot.slotNumber)}
              >
                Convert Back to Regular DPS
              </Button>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
