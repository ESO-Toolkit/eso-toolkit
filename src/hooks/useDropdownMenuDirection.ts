/**
 * App-wide "which way / how tall do Select menus open?" state.
 *
 * Only one Select menu is open at a time across the whole app, so a single
 * shared `menuUp` flag is sufficient. `ReduxThemeProvider` owns the state via
 * {@link useDropdownMenuController}, injects the measured `onOpen` handler +
 * direction-aware origins into the global `MuiSelect.defaultProps`, and exposes
 * the flag through {@link DropdownMenuDirectionProvider}.
 *
 * Plain Selects need nothing — they pick the behavior up from the theme default.
 * The handful of Selects that pass their OWN `MenuProps` (which would otherwise
 * *replace*, not merge with, the theme default and silently opt out of the fix)
 * build their `MenuProps` from {@link useDropdownMenuProps}, which folds the
 * shared open-direction origins, the per-open height cap, and a direction-aware
 * field/menu gap in with the caller's cosmetic paper styling.
 *
 * The open handler also publishes a per-open max-height (so a tall menu opens
 * below and scrolls instead of being shifted up over the field) via a CSS custom
 * property — that costs no React re-render; only an actual up/down *flip* does.
 *
 * See `src/theme/dropdownMenu.ts` for the origins, height cap, and flip
 * heuristic. Raw `<Popover>` value-pickers (not Selects) can use
 * `shouldFlipMenuUp` directly.
 */

import type { MenuProps } from '@mui/material/Menu';
import { useTheme } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';

import {
  DROPDOWN_MENU_GAP,
  DROPDOWN_MENU_MAX_HEIGHT_SX,
  computeMenuPlacement,
  dropdownMenuOrigins,
  dropdownMenuPaperSx,
  setDropdownMenuMaxHeight,
  type DropdownMenuOrigins,
} from '../theme/dropdownMenu';

/** MUI Select `onOpen` handler — measures the anchor to choose open direction. */
export type SelectOpenHandler = (event: React.SyntheticEvent) => void;

export interface DropdownMenuDirection {
  /** True when menus should currently open upward (field near viewport bottom). */
  menuUp: boolean;
  /** `onOpen` handler to attach to a Select; measures the anchor and sets `menuUp`. */
  onSelectOpen: SelectOpenHandler;
}

const DropdownMenuDirectionContext = React.createContext<DropdownMenuDirection>({
  menuUp: false,
  onSelectOpen: () => {},
});

/**
 * Owns the single shared open-direction flag. Returns the current flag plus the
 * `onOpen` handler that measures a Select's anchor on open: it publishes the
 * height cap (CSS var, no re-render) and flips the direction when there isn't
 * room below. `setMenuUp` with an unchanged value is a no-op (React bails out),
 * so the common mid-page case never triggers a re-render.
 */
export function useDropdownMenuController(): DropdownMenuDirection {
  const [menuUp, setMenuUp] = React.useState(false);
  const onSelectOpen = React.useCallback<SelectOpenHandler>((event) => {
    const anchor = event.currentTarget as HTMLElement | null;
    if (!anchor) return;
    const placement = computeMenuPlacement(anchor);
    setDropdownMenuMaxHeight(placement.maxHeight);
    setMenuUp(placement.menuUp);
  }, []);
  return React.useMemo(() => ({ menuUp, onSelectOpen }), [menuUp, onSelectOpen]);
}

export const DropdownMenuDirectionProvider = DropdownMenuDirectionContext.Provider;

/** Read the current shared open-direction state. */
export const useDropdownMenuDirection = (): DropdownMenuDirection =>
  React.useContext(DropdownMenuDirectionContext);

/** Origins for the current open direction (downward, or upward near the bottom). */
export const useDropdownMenuOrigins = (): DropdownMenuOrigins =>
  dropdownMenuOrigins(useDropdownMenuDirection().menuUp);

/**
 * Build the `MenuProps` for a Select that passes its OWN `MenuProps` (which would
 * otherwise replace the theme default). Folds in everything the global default
 * gives plain Selects so they stay consistent: the shared open-direction origins
 * (opens below the field, flips up near the viewport bottom), the per-open height
 * cap (tall menus scroll instead of covering the field), a DIRECTION-AWARE gap
 * (below the field when opening down, above it when flipped up — so an upward
 * menu never overlaps the field), and the shared premium cyan-glass paper look.
 * Any caller-supplied paper `sx` is layered on top.
 *
 * ```tsx
 * const menuProps = useDropdownMenuProps();
 * <Select MenuProps={menuProps}>…</Select>
 * ```
 */
export const useDropdownMenuProps = (paperSx?: SxProps<Theme>): Partial<MenuProps> => {
  const { menuUp } = useDropdownMenuDirection();
  const dark = useTheme().palette.mode === 'dark';
  const baseSx: SxProps<Theme> = {
    maxHeight: DROPDOWN_MENU_MAX_HEIGHT_SX,
    ...(menuUp ? { mt: 0, mb: DROPDOWN_MENU_GAP } : { mt: DROPDOWN_MENU_GAP, mb: 0 }),
  };
  const extra: SxProps<Theme>[] = Array.isArray(paperSx)
    ? (paperSx as SxProps<Theme>[])
    : paperSx
      ? [paperSx]
      : [];
  return {
    ...dropdownMenuOrigins(menuUp),
    slotProps: {
      paper: { sx: [dropdownMenuPaperSx(dark), baseSx, ...extra] as SxProps<Theme> },
    },
  };
};
