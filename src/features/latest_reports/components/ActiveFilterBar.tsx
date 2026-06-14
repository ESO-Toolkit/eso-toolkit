import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, Chip, Tooltip } from '@mui/material';
import React, { useRef } from 'react';

import { formatDateRangeLabel } from '../../reports/reportFormatting';
import type { LatestReportsFilters } from '../hooks/useLatestReportsUrlState';
import type { ZoneOption } from '../hooks/useZoneOptions';

interface ActiveFilterBarProps {
  filters: LatestReportsFilters;
  zones: ZoneOption[];
  /** Count of loaded reports matching the current text query (scope chip). */
  visibleCount: number;
  /** Whether the (debounced) text query is non-empty. */
  searchActive: boolean;
  /** True while the raw query is still settling into the debounced value. */
  searchDebouncing?: boolean;
  onRemoveZone: () => void;
  onRemoveDate: () => void;
  onClearAll: () => void;
  /** Focus target after the last server-filter chip is removed. */
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * Row of removable chips for the ACTIVE SERVER filters (zone, date), plus a
 * non-removable status chip showing how many loaded reports the text search
 * currently matches, plus a "Clear all" action.
 *
 * Focus management: removing a chip moves focus to the next remaining chip,
 * else the previous chip, else the search input — so keyboard users never land
 * on `document.body` after a removal.
 */
export const ActiveFilterBar: React.FC<ActiveFilterBarProps> = ({
  filters,
  zones,
  visibleCount,
  searchActive,
  searchDebouncing = false,
  onRemoveZone,
  onRemoveDate,
  onClearAll,
  searchInputRef,
}) => {
  const zoneChipRef = useRef<HTMLDivElement>(null);
  const dateChipRef = useRef<HTMLDivElement>(null);

  const zoneActive = filters.zoneId !== null;
  const dateActive = filters.range !== 'all';
  const anyServerFilter = zoneActive || dateActive;

  if (!anyServerFilter && !searchActive) {
    return null;
  }

  const zoneName = zoneActive
    ? (zones.find((zone) => zone.id === filters.zoneId)?.label ?? `Zone ${filters.zoneId}`)
    : null;

  const dateLabel = dateActive
    ? formatDateRangeLabel(filters.range, filters.customFrom, filters.customTo)
    : null;

  const focusAfterZoneRemoval = (): void => {
    // After zone removal, prefer the date chip, else the search input.
    if (dateActive && dateChipRef.current) dateChipRef.current.focus();
    else searchInputRef.current?.focus();
  };

  const focusAfterDateRemoval = (): void => {
    if (zoneActive && zoneChipRef.current) zoneChipRef.current.focus();
    else searchInputRef.current?.focus();
  };

  return (
    <Box
      role="group"
      aria-label="Active filters"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        py: 1,
      }}
    >
      {zoneActive && (
        <Chip
          ref={zoneChipRef}
          icon={<FilterAltIcon />}
          label={`Zone: ${zoneName}`}
          color="primary"
          variant="filled"
          onDelete={() => {
            onRemoveZone();
            focusAfterZoneRemoval();
          }}
          aria-label={`Remove zone filter ${zoneName}`}
          sx={chipSx}
        />
      )}

      {dateActive && (
        <Chip
          ref={dateChipRef}
          icon={<FilterAltIcon />}
          label={`Date: ${dateLabel}`}
          color="primary"
          variant="filled"
          onDelete={() => {
            onRemoveDate();
            focusAfterDateRemoval();
          }}
          aria-label={`Remove date filter ${dateLabel}`}
          sx={chipSx}
        />
      )}

      {searchActive && (
        <Tooltip
          title="Results from this page only. Use Zone and Date filters to load different reports."
          arrow
        >
          <Chip
            icon={<SearchIcon />}
            // Trailing ellipsis while the debounce settles, so a transient
            // "Searching 0" mid-type does not read as "no matches". The match
            // count is announced to screen readers by the page-level live region
            // (in LatestReports), so this chip is intentionally visual-only to
            // avoid double-announcing.
            label={`Searching ${visibleCount}${searchDebouncing ? '…' : ''}`}
            color="info"
            variant="outlined"
            sx={{ ...chipSx, cursor: 'help' }}
          />
        </Tooltip>
      )}

      {anyServerFilter && (
        <Button
          size="small"
          variant="text"
          onClick={() => {
            onClearAll();
            // Clearing removes every chip (this button included), so move focus
            // back to the search input rather than letting it fall to <body>.
            searchInputRef.current?.focus();
          }}
          sx={{ ml: 'auto', textTransform: 'none' }}
        >
          Clear all
        </Button>
      )}
    </Box>
  );
};

const chipSx = {
  fontWeight: 500,
  // WCAG 2.2 target size: enlarge the delete affordance to >= 24px.
  '& .MuiChip-deleteIcon': { fontSize: 22, mr: '4px' },
} as const;
