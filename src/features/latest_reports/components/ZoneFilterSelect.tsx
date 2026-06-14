import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { Autocomplete, Box, CircularProgress, InputAdornment, TextField } from '@mui/material';
import React, { useMemo } from 'react';

import { useZoneOptions, type ZoneOption } from '../hooks/useZoneOptions';

interface ZoneFilterSelectProps {
  value: number | null;
  onChange: (zoneId: number | null) => void;
  /** Compact width for inline toolbar use; full width inside the mobile sheet. */
  fullWidth?: boolean;
}

/**
 * Server-side zone filter. Backed by `worldData.zones`, grouped into
 * Trials / Arenas / Dungeons. Dungeons are not individually filterable by the
 * report list API, so they appear as a single "All Dungeons" option (zoneID 10);
 * the `FilterAltIcon` marks the control as a server filter — changing it
 * re-queries the API, distinct from the client-side text search.
 */
export const ZoneFilterSelect: React.FC<ZoneFilterSelectProps> = ({
  value,
  onChange,
  fullWidth = false,
}) => {
  const { zones, loading, error } = useZoneOptions();

  const selected = useMemo<ZoneOption | null>(
    () => zones.find((zone) => zone.id === value) ?? null,
    [zones, value],
  );

  return (
    <Autocomplete<ZoneOption, false, false, false>
      options={zones}
      value={selected}
      loading={loading}
      onChange={(_event, option) => onChange(option ? option.id : null)}
      getOptionLabel={(option) => option.label}
      groupBy={(option) => option.category}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      size="small"
      sx={{ minWidth: fullWidth ? '100%' : 220, width: fullWidth ? '100%' : undefined }}
      renderInput={(params) => {
        const inputSlotProps = params.slotProps?.input ?? {};
        return (
          <TextField
            {...params}
            label="Zone"
            placeholder={error ? 'Zones unavailable' : 'All zones'}
            error={Boolean(error)}
            helperText={error ? 'Could not load zones' : undefined}
            slotProps={{
              ...params.slotProps,
              input: {
                ...inputSlotProps,
                startAdornment: (
                  <>
                    <InputAdornment position="start" sx={{ ml: 0.5 }}>
                      <FilterAltIcon
                        fontSize="small"
                        color={value !== null ? 'primary' : 'action'}
                      />
                    </InputAdornment>
                    {inputSlotProps.startAdornment}
                  </>
                ),
                endAdornment: (
                  <>
                    {loading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
                        <CircularProgress size={16} aria-label="Loading zones" />
                      </Box>
                    ) : null}
                    {inputSlotProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        );
      }}
    />
  );
};
