/**
 * Modal dialog for customizing which stat chips are visible on player cards.
 *
 * Users can toggle individual chips on/off. Changes are persisted to localStorage
 * and take effect immediately across all player cards.
 */

import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

import type { StatChipId } from './statChipConfig';
import { STAT_CHIP_IDS, STAT_CHIP_META } from './statChipConfig';

interface StatChipCustomizationModalProps {
  open: boolean;
  onClose: () => void;
  visibleChips: StatChipId[];
  onSave: (chips: StatChipId[]) => void;
}

export const StatChipCustomizationModal: React.FC<StatChipCustomizationModalProps> = React.memo(
  ({ open, onClose, visibleChips, onSave }) => {
    // Local draft state so changes aren't applied until Save
    const [draft, setDraft] = useState<Set<StatChipId>>(new Set(visibleChips));

    // Reset draft when modal opens with new props
    React.useEffect(() => {
      if (open) {
        setDraft(new Set(visibleChips));
      }
    }, [open, visibleChips]);

    const handleToggle = useCallback((chipId: StatChipId) => {
      setDraft((prev) => {
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
      // Preserve the canonical order from STAT_CHIP_IDS
      const ordered = STAT_CHIP_IDS.filter((id) => draft.has(id));
      onSave([...ordered]);
      onClose();
    }, [draft, onSave, onClose]);

    const handleSelectAll = useCallback(() => {
      setDraft(new Set(STAT_CHIP_IDS));
    }, []);

    const handleSelectNone = useCallback(() => {
      setDraft(new Set());
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
            Choose which stats to display on player cards. Preferences are saved to your browser.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Button size="small" variant="text" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button size="small" variant="text" onClick={handleSelectNone}>
              Select None
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {STAT_CHIP_IDS.map((chipId) => {
              const meta = STAT_CHIP_META[chipId];
              return (
                <FormControlLabel
                  key={chipId}
                  sx={{
                    mx: 0,
                    py: 0.25,
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    },
                  }}
                  control={
                    <Checkbox
                      size="small"
                      checked={draft.has(chipId)}
                      onChange={() => handleToggle(chipId)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <span>{meta.emoji}</span>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {meta.label}
                      </Typography>
                      {meta.roleFilter && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: '0.65rem' }}
                        >
                          ({meta.roleFilter.join(', ')})
                        </Typography>
                      )}
                    </Box>
                  }
                />
              );
            })}
          </Box>
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
