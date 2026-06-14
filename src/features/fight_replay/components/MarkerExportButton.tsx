/**
 * MarkerExportButton
 *
 * A single, seamless "copy markers" control for the fight-replay marker deck. Replaces the two
 * sibling Copy Elms / Copy M0R buttons with one split button: the main action copies in the
 * currently-selected addon format, and the attached caret opens a small chooser to switch format
 * (each option labelled with its addon). The last format chosen sticks as the new default, so the
 * common case is a single click while both targets stay one tap away.
 *
 * Self-contained (owns its menu open + selected-format state); the host only supplies the
 * format-aware export callback. Kept out of the per-frame playback path — it lives in the page
 * shell above the arena.
 *
 * @module features/fight_replay/components/MarkerExportButton
 */

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Box,
  Button,
  ButtonGroup,
  ClickAwayListener,
  Grow,
  ListItemIcon,
  ListItemText,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Typography,
} from '@mui/material';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { MarkerFormat } from '../types/mapMarkers';

interface FormatMeta {
  format: MarkerFormat;
  /** Short label shown on the main button and as the menu item primary. */
  label: string;
  /** The addon the string is formatted for — the menu item's supporting line. */
  addon: string;
}

/** Display order = chooser order. Elms is the default (first). */
const FORMATS: readonly FormatMeta[] = [
  { format: 'elms', label: 'Elms', addon: 'EnchantedMapsLite addon' },
  { format: 'mor', label: 'M0R', addon: 'M0RMarkers addon' },
] as const;

interface MarkerExportButtonProps {
  /** Copy the loaded markers in the chosen addon format. */
  onExport: (format: MarkerFormat) => void;
  /** Lets the host stretch the control to fill its row (mobile). */
  sx?: React.ComponentProps<typeof ButtonGroup>['sx'];
}

export const MarkerExportButton: React.FC<MarkerExportButtonProps> = ({ onExport, sx }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MarkerFormat>('elms');
  const anchorRef = useRef<HTMLDivElement>(null);

  const selectedMeta = useMemo(
    () => FORMATS.find((f) => f.format === selected) ?? FORMATS[0],
    [selected],
  );

  const handleCopy = useCallback(() => onExport(selected), [onExport, selected]);

  const handleToggleMenu = useCallback(() => setOpen((prev) => !prev), []);

  const handleClose = useCallback((event: Event) => {
    // Keep the menu open when the click is on the caret toggle itself.
    if (anchorRef.current?.contains(event.target as HTMLElement)) {
      return;
    }
    setOpen(false);
  }, []);

  const handlePick = useCallback(
    (format: MarkerFormat) => {
      setSelected(format);
      setOpen(false);
      // Picking a format both switches the default and performs the copy — the chooser is also
      // the action, so a deliberate format choice never costs an extra click.
      onExport(format);
    },
    [onExport],
  );

  return (
    <>
      <ButtonGroup variant="outlined" color="secondary" ref={anchorRef} sx={sx}>
        <Button startIcon={<ContentCopyIcon />} onClick={handleCopy} type="button" sx={{ flex: 1 }}>
          Copy {selectedMeta.label}
        </Button>
        <Button
          size="small"
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : undefined}
          aria-label="Choose marker export format"
          onClick={handleToggleMenu}
          type="button"
          sx={{ px: 0.5, minWidth: '36px !important' }}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-end"
        transition
        // Portalled (NOT disablePortal): the marker deck clips to `overflow: hidden` to keep its
        // gradient inside the rounded corners, which would otherwise crop this menu. Rendering in
        // a portal lets the chooser float free of that surface.
        modifiers={[{ name: 'offset', options: { offset: [0, 6] } }]}
        sx={{ zIndex: (theme) => theme.zIndex.modal }}
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps} style={{ transformOrigin: 'right top' }}>
            <Paper elevation={8} sx={{ minWidth: 248, overflow: 'hidden', borderRadius: 2 }}>
              <ClickAwayListener onClickAway={handleClose}>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      display: 'block',
                      px: 1.75,
                      pt: 1.25,
                      pb: 0.5,
                      color: 'text.secondary',
                      letterSpacing: 0.8,
                      lineHeight: 1.4,
                    }}
                  >
                    Copy markers as
                  </Typography>
                  <MenuList autoFocusItem={open} disablePadding sx={{ pb: 0.5 }}>
                    {FORMATS.map((meta) => {
                      const isSelected = meta.format === selected;
                      return (
                        <MenuItem
                          key={meta.format}
                          selected={isSelected}
                          onClick={() => handlePick(meta.format)}
                          sx={{ py: 1, px: 1.75, gap: 0.5 }}
                        >
                          <ListItemText
                            primary={meta.label}
                            secondary={meta.addon}
                            slotProps={{
                              primary: { sx: { fontWeight: 600 } },
                              secondary: { variant: 'caption' },
                            }}
                          />
                          <ListItemIcon sx={{ minWidth: 'auto', ml: 1.5 }}>
                            {isSelected ? (
                              <CheckRoundedIcon fontSize="small" color="secondary" />
                            ) : null}
                          </ListItemIcon>
                        </MenuItem>
                      );
                    })}
                  </MenuList>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
};
