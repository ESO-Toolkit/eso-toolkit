import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  Box,
  Button,
  Popover,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import React, { useId, useState } from 'react';

import { formatDateRangeLabel } from '../../reports/reportFormatting';
import {
  DATE_RANGE_PRESETS,
  dateRangePresetLabel,
  type DateRangePreset,
} from '../hooks/rangeToEpochMs';

export interface DateRangeValue {
  range: DateRangePreset;
  customFrom: string | null;
  customTo: string | null;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** Render inline (no Popover) for the mobile filter sheet. */
  inline?: boolean;
}

const PRESET_BUTTONS: ReadonlyArray<DateRangePreset> = DATE_RANGE_PRESETS;

/** The preset + custom-range picker body, shared by the inline and popover forms. */
const DateRangeBody: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  const fromId = useId();
  const toId = useId();

  const handlePreset = (next: DateRangePreset): void => {
    if (next === 'custom') {
      onChange({ ...value, range: 'custom' });
    } else {
      onChange({ range: next, customFrom: null, customTo: null });
    }
  };

  return (
    <Stack spacing={1.5} sx={{ p: { xs: 0, md: 2 }, minWidth: { md: 260 } }}>
      <ToggleButtonGroup
        value={value.range}
        exclusive
        size="small"
        onChange={(_event, next: DateRangePreset | null) => {
          if (next) handlePreset(next);
        }}
        aria-label="Date range preset"
        sx={{
          flexWrap: 'wrap',
          gap: 0.5,
          '& .MuiToggleButton-root': { borderRadius: '8px !important', border: '1px solid' },
        }}
      >
        {PRESET_BUTTONS.map((preset) => (
          <ToggleButton key={preset} value={preset} sx={{ textTransform: 'none', px: 1.25 }}>
            {dateRangePresetLabel(preset)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {value.range === 'custom' && (
        <Stack spacing={1.25} sx={{ pt: 0.5 }}>
          <TextField
            id={fromId}
            type="date"
            label="From"
            size="small"
            value={value.customFrom ?? ''}
            onChange={(event) => onChange({ ...value, customFrom: event.target.value || null })}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { max: value.customTo ?? undefined },
            }}
            fullWidth
          />
          <TextField
            id={toId}
            type="date"
            label="To"
            size="small"
            value={value.customTo ?? ''}
            onChange={(event) => onChange({ ...value, customTo: event.target.value || null })}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: value.customFrom ?? undefined },
            }}
            fullWidth
          />
        </Stack>
      )}
    </Stack>
  );
};

/**
 * Server-side date-range filter. Desktop renders a button that opens a Popover;
 * inside the mobile filter sheet it renders inline. `FilterAltIcon` marks it as
 * a server filter (changing it re-queries the API).
 */
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  inline = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  if (inline) {
    return <DateRangeBody value={value} onChange={onChange} inline />;
  }

  const open = Boolean(anchorEl);
  const isActive = value.range !== 'all';
  const buttonLabel =
    value.range === 'all'
      ? 'Date'
      : formatDateRangeLabel(value.range, value.customFrom, value.customTo);

  return (
    <>
      <Button
        variant="outlined"
        color={isActive ? 'primary' : 'inherit'}
        size="medium"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        startIcon={<FilterAltIcon fontSize="small" />}
        endIcon={<KeyboardArrowDownIcon fontSize="small" />}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Date range filter: ${buttonLabel}`}
        sx={{
          textTransform: 'none',
          borderColor: isActive ? 'primary.main' : 'divider',
          color: isActive ? 'primary.main' : 'text.primary',
          whiteSpace: 'nowrap',
        }}
      >
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <CalendarMonthIcon fontSize="small" sx={{ opacity: 0.7 }} />
          {buttonLabel}
        </Box>
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 0.5, borderRadius: 2 } } }}
      >
        <DateRangeBody value={value} onChange={onChange} />
      </Popover>
    </>
  );
};
