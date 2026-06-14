import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';

import type { LatestReportsFilters } from '../hooks/useLatestReportsUrlState';

import { DateRangeFilter, type DateRangeValue } from './DateRangeFilter';
import { ZoneFilterSelect } from './ZoneFilterSelect';

interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: LatestReportsFilters;
  /** Commit the drafted server filters (zone + date). Resets page upstream. */
  onApply: (next: { zoneId: number | null; date: DateRangeValue }) => void;
}

/**
 * Bottom-sheet filter editor for mobile. Edits are staged as DRAFTS and only
 * committed on "Apply", so the list does not re-query on every tap and the sheet
 * does not disturb the list scroll position until the user is done.
 */
export const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  open,
  onClose,
  filters,
  onApply,
}) => {
  const [draftZoneId, setDraftZoneId] = useState<number | null>(filters.zoneId);
  const [draftDate, setDraftDate] = useState<DateRangeValue>({
    range: filters.range,
    customFrom: filters.customFrom,
    customTo: filters.customTo,
  });

  // Re-seed drafts from the live filters whenever the sheet (re)opens.
  useEffect(() => {
    if (open) {
      setDraftZoneId(filters.zoneId);
      setDraftDate({
        range: filters.range,
        customFrom: filters.customFrom,
        customTo: filters.customTo,
      });
    }
  }, [open, filters.zoneId, filters.range, filters.customFrom, filters.customTo]);

  const handleApply = (): void => {
    onApply({ zoneId: draftZoneId, date: draftDate });
    onClose();
  };

  const handleReset = (): void => {
    setDraftZoneId(null);
    setDraftDate({ range: 'all', customFrom: null, customTo: null });
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            px: 2,
            pt: 1,
            pb: 'calc(16px + env(safe-area-inset-bottom))',
            maxHeight: '85vh',
          },
        },
      }}
    >
      <Box
        sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mb: 1 }}
        aria-hidden
      />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
          Filters
        </Typography>
        <IconButton onClick={onClose} aria-label="Close filters" edge="end">
          <CloseIcon />
        </IconButton>
      </Box>

      <Stack spacing={2.5} sx={{ py: 1 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            Zone
          </Typography>
          <ZoneFilterSelect value={draftZoneId} onChange={setDraftZoneId} fullWidth />
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            Date range
          </Typography>
          <DateRangeFilter value={draftDate} onChange={setDraftDate} inline />
        </Box>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ display: 'flex', gap: 1.5, pb: 1 }}>
        <Button variant="outlined" fullWidth onClick={handleReset}>
          Reset
        </Button>
        <Button variant="contained" fullWidth onClick={handleApply}>
          Apply
        </Button>
      </Box>
    </Drawer>
  );
};
