/**
 * Shared Select/menu open-direction + height logic — the single source of truth
 * for the "open below the field, flip up near the viewport bottom, never cover
 * the field" behavior.
 *
 * Three MUI defaults make Select menus appear over/covering the field:
 *  1. MUI's default `selectedMenu` positioning aligns the *selected* option over
 *     the anchor, so a Select whose value is near the END of a long option list
 *     opens centred on the field. Anchoring `bottom → top` opens it downward.
 *  2. Near the viewport bottom there isn't room below the field. MUI's Popover
 *     only *shifts* a downward menu up to keep it on screen — it never flips — so
 *     the menu slides up and covers the field. We detect that case and flip the
 *     origins to open *upward* (`top → bottom`).
 *  3. A menu TALLER than the room below the field is likewise shifted up over the
 *     field (even mid-page). Capping the menu's `maxHeight` to the available room
 *     on its open side makes a tall menu open below and *scroll* instead of
 *     covering the field.
 *
 * Proven first in the Ultimate Calculator's feature theme (whose tall picker hard-
 * capped `maxHeight: 420`); generalized here so the whole app shares one
 * implementation, with the cap measured per-open instead of hand-tuned per menu.
 */

import type { PopoverOrigin } from '@mui/material/Popover';

export interface DropdownMenuOrigins {
  anchorOrigin: PopoverOrigin;
  transformOrigin: PopoverOrigin;
}

/** Origins that open the menu downward from the field (the normal case). */
export const DROPDOWN_MENU_ORIGINS_DOWN: DropdownMenuOrigins = {
  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
  transformOrigin: { vertical: 'top', horizontal: 'left' },
};

/** Origins that open the menu upward from the field (near the viewport bottom). */
export const DROPDOWN_MENU_ORIGINS_UP: DropdownMenuOrigins = {
  anchorOrigin: { vertical: 'top', horizontal: 'left' },
  transformOrigin: { vertical: 'bottom', horizontal: 'left' },
};

/**
 * Pick the open-direction origins. Pass `true` to open upward (the field is too
 * close to the viewport bottom to fit the menu below it).
 */
export const dropdownMenuOrigins = (up: boolean): DropdownMenuOrigins =>
  up ? DROPDOWN_MENU_ORIGINS_UP : DROPDOWN_MENU_ORIGINS_DOWN;

/** Gap between the field and the menu, in MUI spacing units (0.5 * 8px = 4px). */
export const DROPDOWN_MENU_GAP = 0.5;
/** Same gap in px — used when measuring available room. */
const FIELD_MENU_GAP_PX = DROPDOWN_MENU_GAP * 8;
/** Keep the menu this far from the viewport edge (matches MUI Popover's default
 * `marginThreshold`, so MUI never needs to shift the menu after we size it). */
const VIEWPORT_EDGE_GAP_PX = 16;
/** Never cap a menu shorter than this — a sliver of menu is worse than a small overflow. */
const MIN_MENU_HEIGHT_PX = 120;
/** Below this much room beneath the field, prefer flipping up (if above is roomier). */
const MIN_USABLE_BELOW_PX = 220;

/**
 * CSS custom property holding the per-open menu max-height (px). The open handler
 * sets it imperatively so updating the cap costs no React re-render; the menu
 * paper reads it via {@link DROPDOWN_MENU_MAX_HEIGHT_SX} and the browser re-reads
 * it at paint. Only one Select menu is open at a time, so one global var is safe.
 */
export const DROPDOWN_MENU_MAX_HEIGHT_VAR = '--esotk-dropdown-menu-max-height';

/** `maxHeight` sx value for a Select menu paper (falls back to 60vh if unset). */
export const DROPDOWN_MENU_MAX_HEIGHT_SX = `var(${DROPDOWN_MENU_MAX_HEIGHT_VAR}, 60vh)`;

export interface MenuPlacement {
  /** Open the menu upward (field too close to the viewport bottom). */
  menuUp: boolean;
  /** Max menu height (px) so it fits on its open side without MUI shifting it. */
  maxHeight: number;
}

/**
 * Measure an anchor and decide how its menu should open: the direction (down by
 * default, up only when the room below is cramped and there's more room above),
 * and a max-height that fits the chosen side so a tall menu scrolls instead of
 * being shifted up over the field.
 */
export const computeMenuPlacement = (anchor: HTMLElement): MenuPlacement => {
  const rect = anchor.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - FIELD_MENU_GAP_PX - VIEWPORT_EDGE_GAP_PX;
  const spaceAbove = rect.top - FIELD_MENU_GAP_PX - VIEWPORT_EDGE_GAP_PX;
  const menuUp = spaceBelow < MIN_USABLE_BELOW_PX && spaceAbove > spaceBelow;
  const room = menuUp ? spaceAbove : spaceBelow;
  return { menuUp, maxHeight: Math.max(MIN_MENU_HEIGHT_PX, Math.floor(room)) };
};

/**
 * Whether a menu should open upward given its anchor — for raw `<Popover>`
 * value-pickers that manage their own height. Selects use {@link computeMenuPlacement}.
 */
export const shouldFlipMenuUp = (anchor: HTMLElement): boolean =>
  computeMenuPlacement(anchor).menuUp;

/**
 * Imperatively publish the per-open max-height so the menu paper's
 * `var(${DROPDOWN_MENU_MAX_HEIGHT_VAR})` picks it up without a React re-render.
 */
export const setDropdownMenuMaxHeight = (maxHeight: number): void => {
  document.documentElement.style.setProperty(DROPDOWN_MENU_MAX_HEIGHT_VAR, `${maxHeight}px`);
};
