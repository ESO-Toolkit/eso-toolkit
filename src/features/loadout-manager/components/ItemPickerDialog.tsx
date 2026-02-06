/**
 * Item Picker Dialog Component
 * Provides a typeahead experience for selecting gear items per slot.
 */

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Autocomplete, { AutocompleteInputChangeReason } from '@mui/material/Autocomplete';
import type { FilterOptionsState } from '@mui/material/useAutocomplete';
import React from 'react';

import { useLogger } from '@/hooks/useLogger';

import {
  getItemInfo,
  getItemsBySlot,
  type ItemInfo,
  type SlotType,
  validateItemForSlot,
} from '../data/itemIdMap';
import { getSlotCoverageStats } from '../utils/itemSlotValidator';

interface ItemPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (itemId: number) => void;
  targetSlot: SlotType;
  slotName: string;
  currentItemId?: number | null;
}

const MIN_SEARCH_LENGTH = 2;
const MAX_RESULTS = 150;

type GearItemOption = { itemId: number; info: ItemInfo };

export const ItemPickerDialog: React.FC<ItemPickerDialogProps> = ({
  open,
  onClose,
  onSelect,
  targetSlot,
  slotName,
  currentItemId,
}) => {
  const logger = useLogger('ItemPickerDialog');
  const [inputValue, setInputValue] = React.useState('');
  const coverageStats = React.useMemo(() => getSlotCoverageStats(), []);

  const slotItems = React.useMemo(() => getItemsBySlot(targetSlot), [targetSlot]);
  const slotCoverageCount = coverageStats.bySlot[targetSlot] ?? 0;
  const slotCoveragePercent =
    coverageStats.totalItems > 0 ? (slotCoverageCount / coverageStats.totalItems) * 100 : 0;
  const slotCoverageShare =
    coverageStats.itemsWithSlots > 0 ? (slotCoverageCount / coverageStats.itemsWithSlots) * 100 : 0;

  const currentItem = React.useMemo<GearItemOption | null>(() => {
    if (!currentItemId) {
      return null;
    }

    const slotMatch = slotItems.find((item) => item.itemId === currentItemId);
    if (slotMatch) {
      return slotMatch;
    }

    const info = getItemInfo(currentItemId);
    return info ? { itemId: currentItemId, info } : null;
  }, [currentItemId, slotItems]);

  const options = React.useMemo(() => {
    if (currentItem && !slotItems.some((item) => item.itemId === currentItem.itemId)) {
      return [currentItem, ...slotItems];
    }
    return slotItems;
  }, [slotItems, currentItem]);

  React.useEffect(() => {
    if (open) {
      setInputValue(currentItem?.info.name ?? '');
    } else {
      setInputValue('');
    }
  }, [open, currentItem]);

  const filterOptions = React.useCallback(
    (available: GearItemOption[], state: FilterOptionsState<GearItemOption>) => {
      const query = state.inputValue.trim().toLowerCase();
      if (query.length < MIN_SEARCH_LENGTH) {
        return [];
      }

      const filtered = available.filter((item) =>
        `${item.info.name} ${item.info.setName}`.toLowerCase().includes(query),
      );

      return filtered.slice(0, MAX_RESULTS);
    },
    [],
  );

  const handleOptionSelect = React.useCallback(
    (_event: React.SyntheticEvent, option: GearItemOption | null) => {
      if (!option) {
        return;
      }

      const validation = validateItemForSlot(option.itemId, targetSlot);
      if (!validation.valid) {
        const validationError = new Error(
          typeof validation.error === 'string' ? validation.error : 'Invalid item selection',
        );
        logger.error('Invalid item selection', validationError, {
          itemId: option.itemId,
          targetSlot,
        });
        return;
      }

      onSelect(option.itemId);
      onClose();
    },
    [logger, onSelect, onClose, targetSlot],
  );

  const handleInputChange = React.useCallback(
    (_event: React.SyntheticEvent, value: string, _reason: AutocompleteInputChangeReason) => {
      setInputValue(value);
    },
    [],
  );

  const handleDialogClose = React.useCallback(() => {
    setInputValue(currentItem?.info.name ?? '');
    onClose();
  }, [currentItem?.info.name, onClose]);

  const noOptionsText =
    inputValue.trim().length < MIN_SEARCH_LENGTH
      ? `Enter at least ${MIN_SEARCH_LENGTH} characters to search`
      : 'No gear matches your search';

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Select {slotName} Item</Typography>
          <Button size="small" onClick={handleDialogClose} startIcon={<CloseIcon />}>
            Close
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <Alert severity={slotCoverageCount > 0 ? 'warning' : 'error'} icon={false}>
            <Typography variant="body2">
              {slotCoverageCount > 0 ? (
                <>
                  Only <strong>{slotCoverageCount.toLocaleString()}</strong> confirmed{' '}
                  {slotName.toLowerCase()} items are available ({slotCoveragePercent.toFixed(2)}% of
                  the full database, {slotCoverageShare.toFixed(1)}% of known-slot items). We’re
                  limiting selections to avoid invalid Wizards Wardrobe exports.
                </>
              ) : (
                <>
                  No confirmed {slotName.toLowerCase()} items exist in the dataset yet. You can keep
                  existing selections, but exports will likely fail until slot metadata is
                  available.
                </>
              )}
            </Typography>
          </Alert>

          <Alert severity="info" icon={false}>
            <Typography variant="body2">
              Search the confirmed gear catalog for the <strong>{slotName}</strong> slot. Type at
              least {MIN_SEARCH_LENGTH} characters to see matching items.
            </Typography>
          </Alert>

          <Autocomplete
            fullWidth
            disablePortal
            options={options}
            value={null}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onChange={handleOptionSelect}
            filterOptions={filterOptions}
            getOptionLabel={(option) => option.info.name}
            isOptionEqualToValue={(option, value) => option.itemId === value.itemId}
            noOptionsText={noOptionsText}
            renderOption={(props, option) => (
              <li {...props} key={option.itemId}>
                <Stack spacing={0.5} width="100%">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={600}>{option.info.name}</Typography>
                    <Chip label={option.info.setName} size="small" color="success" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {option.info.type} {slotName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Item ID: {option.itemId}
                  </Typography>
                </Stack>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label={`Search ${slotName} items`}
                placeholder={`Type at least ${MIN_SEARCH_LENGTH} characters`}
              />
            )}
            blurOnSelect
            clearOnBlur={false}
            handleHomeEndKeys
          />

          {currentItem && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Currently Equipped
              </Typography>
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={600}>{currentItem.info.name}</Typography>
                  <Chip label={currentItem.info.setName} size="small" color="primary" />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Item ID: {currentItem.itemId}
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleDialogClose} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
