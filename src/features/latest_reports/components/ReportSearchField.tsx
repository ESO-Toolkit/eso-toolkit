import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import React from 'react';

const HELPER_TEXT = 'Searches title, owner, and zone on this page';

interface ReportSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Render the helper text under the field (desktop). Mobile relies on the tooltip. */
  showHelperText?: boolean;
  fullWidth?: boolean;
  /** Forwarded to the input for focus management from the parent. */
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * Free-text search box for the loaded page of reports. The placeholder and
 * helper text make the "loaded page only" scope explicit — the ESO Logs API has
 * no server-side title/owner search, so this only refines what is already on
 * screen.
 */
export const ReportSearchField: React.FC<ReportSearchFieldProps> = ({
  value,
  onChange,
  showHelperText = false,
  fullWidth = false,
  inputRef,
}) => {
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
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={HELPER_TEXT} arrow>
                <IconButton
                  size="small"
                  edge="end"
                  tabIndex={-1}
                  aria-label="What does this search cover?"
                  sx={{ cursor: 'help' }}
                >
                  <InfoOutlinedIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
      sx={{ minWidth: { sm: 240 }, flex: { sm: '1 1 280px' }, maxWidth: { sm: 360 } }}
    />
  );
};
