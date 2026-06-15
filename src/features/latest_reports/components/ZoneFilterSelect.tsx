import FilterAltIcon from '@mui/icons-material/FilterAlt';
import {
  Autocomplete,
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
  useTheme,
} from '@mui/material';
import React, { useMemo } from 'react';

import { useZoneOptions, type ZoneOption } from '../hooks/useZoneOptions';
import { glassMenuPaperSx, glassOutlinedFieldSx } from '../latestReportsStyles';

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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
      slotProps={{
        paper: { sx: glassMenuPaperSx(isDark) },
        listbox: {
          sx: {
            '& .MuiAutocomplete-groupLabel': {
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: isDark ? 'rgba(148,163,184,0.75)' : 'rgba(100,116,139,0.85)',
              lineHeight: 2.2,
              backgroundColor: 'transparent',
            },
            '& .MuiAutocomplete-option': {
              fontSize: '0.85rem',
              borderRadius: 1,
              mx: 0.5,
              '&[aria-selected="true"]': {
                color: isDark ? '#60a5fa' : '#1d4ed8',
                fontWeight: 600,
              },
              '&.Mui-focused': {
                background: isDark ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.06)',
              },
            },
          },
        },
      }}
      sx={{
        minWidth: fullWidth ? '100%' : 220,
        width: fullWidth ? '100%' : undefined,
        ...glassOutlinedFieldSx(isDark),
      }}
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
