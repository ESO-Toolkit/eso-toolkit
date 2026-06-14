import TuneIcon from '@mui/icons-material/Tune';
import { Badge, Box, Button, Divider } from '@mui/material';
import React from 'react';

import type { LatestReportsFilters } from '../hooks/useLatestReportsUrlState';
import type { ReportDensity, ReportViewMode } from '../hooks/useReportViewPrefs';

import { DateRangeFilter, type DateRangeValue } from './DateRangeFilter';
import { DensityToggle } from './DensityToggle';
import { ReportSearchField } from './ReportSearchField';
import { ViewToggle } from './ViewToggle';
import { ZoneFilterSelect } from './ZoneFilterSelect';

interface ReportsToolbarProps {
  isDesktop: boolean;
  filters: LatestReportsFilters;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onZoneChange: (zoneId: number | null) => void;
  onDateChange: (value: DateRangeValue) => void;
  viewMode: ReportViewMode;
  onViewModeChange: (mode: ReportViewMode) => void;
  density: ReportDensity;
  onDensityChange: (density: ReportDensity) => void;
  /** Mobile: number of active server filters, shown as a badge on the trigger. */
  activeServerFilterCount: number;
  /** Mobile: open the filter bottom-sheet. */
  onOpenMobileFilters: () => void;
  searchInputRef: React.Ref<HTMLInputElement>;
}

/**
 * The filter/search toolbar. `role="search"` landmark.
 *
 * Desktop: two deliberate tiers. Row 1 = the filters — a grow-to-fill text
 * search, a vertical divider, then the SERVER cluster (zone + date, each marked
 * with a filter icon). A hairline separates Row 2 = the view controls (layout +
 * density), right-aligned. Keeping view controls on their own row avoids the
 * awkward lone-wrap (and dead space) that a single packed row produces once the
 * panel is narrower than all controls combined.
 *
 * Mobile: full-width search, then a "Filters" trigger (opens the bottom-sheet)
 * plus the density toggle. View toggle is hidden (cards forced).
 */
export const ReportsToolbar: React.FC<ReportsToolbarProps> = ({
  isDesktop,
  filters,
  searchValue,
  onSearchChange,
  onZoneChange,
  onDateChange,
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
  activeServerFilterCount,
  onOpenMobileFilters,
  searchInputRef,
}) => {
  const dateValue: DateRangeValue = {
    range: filters.range,
    customFrom: filters.customFrom,
    customTo: filters.customTo,
  };

  if (!isDesktop) {
    return (
      <Box
        role="search"
        aria-label="Filter reports"
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}
      >
        <ReportSearchField
          value={searchValue}
          onChange={onSearchChange}
          fullWidth
          inputRef={searchInputRef}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={activeServerFilterCount} color="primary" overlap="rectangular">
            <Button
              variant="outlined"
              startIcon={<TuneIcon />}
              onClick={onOpenMobileFilters}
              sx={{ textTransform: 'none' }}
            >
              Filters
            </Button>
          </Badge>
          <Box sx={{ flex: 1 }} />
          <DensityToggle value={density} onChange={onDensityChange} />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      role="search"
      aria-label="Filter reports"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}
    >
      {/* Row 1 — filters: search grows to fill, then the server cluster.
          Wraps gracefully (zone/date drop below search) on narrow desktops. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {/* CLIENT cluster */}
        <ReportSearchField
          value={searchValue}
          onChange={onSearchChange}
          inputRef={searchInputRef}
          grow
        />

        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.5, height: 28, alignSelf: 'center' }}
        />

        {/* SERVER cluster */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <ZoneFilterSelect value={filters.zoneId} onChange={onZoneChange} />
          <DateRangeFilter value={dateValue} onChange={onDateChange} />
        </Box>
      </Box>

      {/* Hairline separator + Row 2 — view controls, right-aligned. */}
      <Divider sx={{ borderColor: 'divider', opacity: 0.6 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
        <ViewToggle value={viewMode} onChange={onViewModeChange} />
        <DensityToggle value={density} onChange={onDensityChange} />
      </Box>
    </Box>
  );
};
