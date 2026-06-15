import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import PublicIcon from '@mui/icons-material/Public';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  SwipeableDrawer,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';

import type { LatestReportsFilters } from '../hooks/useLatestReportsUrlState';
import { sheetSectionSx } from '../latestReportsStyles';

import { DateRangeFilter, isInvalidDateRange, type DateRangeValue } from './DateRangeFilter';
import { ZoneFilterSelect } from './ZoneFilterSelect';

interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: LatestReportsFilters;
  /** Commit the drafted server filters (zone + date). Resets page upstream. */
  onApply: (next: { zoneId: number | null; date: DateRangeValue }) => void;
}

const SectionLabel: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1.25 }}>
    <Box sx={{ display: 'inline-flex', color: 'text.secondary' }}>{icon}</Box>
    <Typography
      variant="subtitle2"
      sx={{ fontWeight: 700, letterSpacing: '0.02em', color: 'text.primary' }}
    >
      {children}
    </Typography>
  </Stack>
);

/**
 * Bottom-sheet filter editor for mobile. Edits are staged as DRAFTS and only
 * committed on "Apply", so the list does not re-query on every tap and the sheet
 * does not disturb the list scroll position until the user is done.
 *
 * Uses a SwipeableDrawer so the sheet can be flicked down to dismiss (native
 * iOS/Android feel), with grouped sections, a live active-filter count, and
 * touch-first targets (≥ 48px).
 */
export const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  open,
  onClose,
  filters,
  onApply,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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

  const invalidRange = isInvalidDateRange(draftDate);
  const activeCount = (draftZoneId !== null ? 1 : 0) + (draftDate.range !== 'all' ? 1 : 0);
  const nothingActive = activeCount === 0;

  const handleApply = (): void => {
    if (invalidRange) return;
    onApply({ zoneId: draftZoneId, date: draftDate });
    onClose();
  };

  const handleReset = (): void => {
    setDraftZoneId(null);
    setDraftDate({ range: 'all', customFrom: null, customTo: null });
  };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      // Opening is driven by the toolbar trigger, not an edge swipe.
      onOpen={() => {}}
      disableSwipeToOpen
      disableDiscovery
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            px: 2,
            pt: 1,
            pb: 'calc(16px + env(safe-area-inset-bottom))',
            maxHeight: '88vh',
            background: isDark ? 'rgba(15,21,33,0.96)' : 'rgba(250,251,253,0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            borderBottom: 'none',
            boxShadow: isDark
              ? '0 -16px 48px rgba(0,0,0,0.55)'
              : '0 -16px 48px rgba(15,23,42,0.18)',
            // Flex column so the controls scroll while the action row stays pinned
            // on short / landscape viewports.
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Grab handle — also the visual swipe-to-dismiss affordance. */}
      <Box
        sx={{
          width: 40,
          height: 5,
          borderRadius: 3,
          bgcolor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)',
          mx: 'auto',
          mt: 0.5,
          mb: 1.25,
        }}
        aria-hidden
      />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            Filters
          </Typography>
          {activeCount > 0 && (
            <Chip
              size="small"
              color="primary"
              label={`${activeCount} active`}
              sx={{ fontWeight: 600, height: 22 }}
            />
          )}
        </Stack>
        <IconButton onClick={onClose} aria-label="Close filters" edge="end">
          <CloseIcon />
        </IconButton>
      </Box>

      <Stack spacing={1.75} sx={{ py: 0.5, overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
        <Box sx={sheetSectionSx(isDark)}>
          <SectionLabel icon={<PublicIcon fontSize="small" />}>Zone</SectionLabel>
          <ZoneFilterSelect value={draftZoneId} onChange={setDraftZoneId} fullWidth />
        </Box>

        <Box sx={sheetSectionSx(isDark)}>
          <SectionLabel icon={<CalendarMonthIcon fontSize="small" />}>Date range</SectionLabel>
          <DateRangeFilter value={draftDate} onChange={setDraftDate} inline />
        </Box>
      </Stack>

      {/* Pinned action bar with a soft top hairline so it reads as a footer. */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.25,
          pt: 1.5,
          mt: 0.5,
          flexShrink: 0,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
        }}
      >
        <Button
          variant="outlined"
          onClick={handleReset}
          disabled={nothingActive}
          startIcon={<RestartAltIcon />}
          sx={{
            minHeight: 48,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            px: 2.5,
          }}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={handleApply}
          disabled={invalidRange}
          sx={{
            minHeight: 48,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          {activeCount > 0 ? `Apply ${activeCount} filter${activeCount > 1 ? 's' : ''}` : 'Apply'}
        </Button>
      </Box>
    </SwipeableDrawer>
  );
};
