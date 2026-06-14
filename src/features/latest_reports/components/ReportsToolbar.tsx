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
 * Desktop: a single sticky row with three clusters — CLIENT (text search),
 * SERVER (zone + date, each marked with a filter icon), and VIEW (layout +
 * density) — separated by a divider so the two-tier (client vs server) model is
 * taught by layout.
 *
 * Mobile: two rows — full-width search, then a "Filters" trigger (opens the
 * bottom-sheet) plus the density toggle. View toggle is hidden (cards forced).
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
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
      }}
    >
      {/* CLIENT cluster */}
      <ReportSearchField value={searchValue} onChange={onSearchChange} inputRef={searchInputRef} />

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 28, alignSelf: 'center' }} />

      {/* SERVER cluster */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <ZoneFilterSelect value={filters.zoneId} onChange={onZoneChange} />
        <DateRangeFilter value={dateValue} onChange={onDateChange} />
      </Box>

      {/* VIEW cluster (pushed right) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
        <ViewToggle value={viewMode} onChange={onViewModeChange} />
        <DensityToggle value={density} onChange={onDensityChange} />
      </Box>
    </Box>
  );
};
