import ClearIcon from '@mui/icons-material/Clear';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { IconButton, InputAdornment, TextField, Tooltip, useTheme } from '@mui/material';
import React from 'react';

import { glassOutlinedFieldSx } from '../latestReportsStyles';

const HELPER_TEXT = 'Searches title, owner, and zone on this page';

interface ReportSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Render the helper text under the field (desktop). Mobile relies on the tooltip. */
  showHelperText?: boolean;
  fullWidth?: boolean;
  /** Let the field flex-grow to fill its row (drops the desktop max-width cap). */
  grow?: boolean;
  /** Forwarded to the input for focus management from the parent. */
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * Free-text search box for the loaded page of reports. Glassmorphic styling +
 * focus glow to match the Roster Hub filter bar. The placeholder and tooltip
 * make the "loaded page only" scope explicit — the ESO Logs API has no
 * server-side title/owner search, so this only refines what is already loaded.
 */
export const ReportSearchField: React.FC<ReportSearchFieldProps> = ({
  value,
  onChange,
  showHelperText = false,
  fullWidth = false,
  grow = false,
  inputRef,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <TextField
      value={value}
      onChange={(event) => onChange(event.target.value)}
      size="small"
      fullWidth={fullWidth}
      placeholder="Search loaded reports…"
      helperText={showHelperText ? HELPER_TEXT : undefined}
      inputRef={inputRef}
      slotProps={{
        // aria-label must land on the <input> itself (there is no visible
        // label), so it goes through htmlInput, not the TextField root.
        htmlInput: { 'aria-label': 'Search loaded reports by title, owner, or zone' },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} aria-hidden />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {value ? (
                <IconButton
                  size="small"
                  edge="end"
                  onClick={() => onChange('')}
                  aria-label="Clear search"
                  sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
                >
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              ) : (
                <Tooltip title={HELPER_TEXT} arrow>
                  <IconButton
                    size="small"
                    edge="end"
                    tabIndex={-1}
                    aria-label="What does this search cover?"
                    sx={{ cursor: 'help', color: 'text.disabled' }}
                  >
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </InputAdornment>
          ),
        },
      }}
      sx={{
        minWidth: { sm: 240 },
        flex: grow ? '1 1 auto' : { sm: '1 1 280px' },
        maxWidth: grow ? 'none' : { sm: 380 },
        ...glassOutlinedFieldSx(isDark),
      }}
    />
  );
};
