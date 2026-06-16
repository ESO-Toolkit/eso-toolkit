/**
 * SetGearAutocomplete — the shared freeSolo set picker used by every roster slot
 * card (Tank/Healer/DPS) and the Per-Fight Builds editor.
 *
 * Why this exists: each gear field used to inline a freeSolo MUI Autocomplete
 * whose onChange did `setX: value ? findSetIdByName(value) : undefined`. When a
 * user typed a name that didn't resolve, `findSetIdByName` returned `undefined`
 * and the field silently WIPED the previously-stored set (issue #1254 item 1).
 *
 * Behavior here:
 *   • Clearing the field (empty input / the ✕ clear button) clears the set — an
 *     explicit, intentional removal, reported as `onResolve(undefined)`.
 *   • Typing a name that resolves stores that set's ID.
 *   • Typing a name that does NOT resolve KEEPS the prior set and surfaces an
 *     amber "Unknown set … — keeping previous" helperText, then reverts the
 *     input text back to the stored set on commit so the field never lies about
 *     what is actually stored.
 *
 * The component fully controls both `value` (the resolved selection) and
 * `inputValue` (the visible text). Controlling `inputValue` lets us revert the
 * box to the stored set after an unrecognized entry, and an effect keyed on the
 * `value` prop clears any stale warning when the bound set changes externally
 * (e.g. via Quick Assignment, a log re-import, switching encounters, or undo).
 */

import { Autocomplete, TextField } from '@mui/material';
import React, { useState, useCallback, useEffect } from 'react';

import { KnownSetIDs } from '../../../types/abilities';
import { findSetIdByName } from '../../../utils/setNameUtils';

export interface SetGearAutocompleteProps {
  /** Display name of the currently-stored set, or '' when empty. */
  value: string;
  /** Option strings to offer in the dropdown. */
  options: readonly string[];
  /** Field label, e.g. "Primary Set (Body)". */
  label: string;
  /** Placeholder text shown when empty. */
  placeholder?: string;
  /** Stable sx for the inner TextField (glass styling). */
  sx?: Record<string, unknown>;
  /** Optional grouping callback for the dropdown. */
  groupBy?: (option: string) => string;
  /**
   * Called with the resolved set ID, or `undefined` when the field is
   * intentionally cleared. NOT called when the input is unrecognized — in that
   * case the prior value is kept and a warning is shown instead.
   */
  onResolve: (setId: KnownSetIDs | undefined) => void;
}

export const SetGearAutocomplete: React.FC<SetGearAutocompleteProps> = ({
  value,
  options,
  label,
  placeholder,
  sx,
  groupBy,
  onResolve,
}) => {
  // The visible text in the box (controlled). Mirrors `value` except while the
  // user is mid-edit.
  const [inputValue, setInputValue] = useState(value);
  // The unrecognized string the user last committed (drives the warning).
  // Null whenever the field holds a recognized value or is empty.
  const [unknownInput, setUnknownInput] = useState<string | null>(null);

  // When the bound set changes externally (parent re-render with a new value),
  // re-sync the visible text and drop any stale "unknown set" warning — the
  // warning belonged to the previous value and no longer applies.
  useEffect(() => {
    setInputValue(value);
    setUnknownInput(null);
  }, [value]);

  const handleChange = useCallback(
    (_event: React.SyntheticEvent, newValue: string | null) => {
      // Empty / cleared → intentional removal.
      if (!newValue || !newValue.trim()) {
        setUnknownInput(null);
        setInputValue('');
        onResolve(undefined);
        return;
      }
      const setId = findSetIdByName(newValue);
      if (setId !== undefined) {
        setUnknownInput(null);
        onResolve(setId);
        return;
      }
      // Unrecognized input — keep the prior set, warn rather than wipe, and
      // revert the visible text to the stored set so the box doesn't lie.
      setUnknownInput(newValue.trim());
      setInputValue(value);
    },
    [onResolve, value],
  );

  return (
    <Autocomplete
      freeSolo
      size="small"
      options={options}
      value={value}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
      onChange={handleChange}
      groupBy={groupBy}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={label}
          placeholder={placeholder}
          error={unknownInput !== null}
          helperText={
            unknownInput !== null ? `Unknown set "${unknownInput}" — keeping previous` : undefined
          }
          sx={sx}
        />
      )}
      renderOption={(props, option) => <li {...props}>{option}</li>}
    />
  );
};

SetGearAutocomplete.displayName = 'SetGearAutocomplete';
