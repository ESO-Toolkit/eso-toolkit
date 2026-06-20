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
import type { SxProps, Theme } from '@mui/material/styles';

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

/**
 * Premium "cyan-glass" Select-menu paper styling — the shared visual treatment
 * for every dropdown, promoted from the Ultimate Calculator's feature theme so
 * the whole app's dropdowns look consistent: a lighter, solid slate surface, a
 * glowing cyan edge, a thin cyan sheen across the top, and menu items that light
 * up with a cyan fill + a left accent rail on hover/selection.
 *
 * Scoped to Select menu paper (applied via the Select's `MenuProps.slotProps.paper`
 * + {@link useDropdownMenuProps}) so raw kebab/nav `<Menu>`s keep their plain look.
 * Wins over the global `.MuiMenu-paper { background … !important }` rule with `&&`
 * + `!important`; the menu-item backgrounds likewise carry `!important` to beat the
 * global `.MuiMenuItem-root` hover/selected rules. Does NOT set `position` (MUI's
 * PopoverPaper is already `absolute`, so the `&::before` sheen anchors correctly —
 * a `position` override would stretch the paper viewport-wide).
 */
export const dropdownMenuPaperSx = (dark: boolean): SxProps<Theme> => {
  const cyan = dark ? 'rgb(56,189,248)' : 'rgb(40,145,200)';
  return {
    borderRadius: '14px',
    overflowX: 'hidden',
    overflowY: 'auto',
    backdropFilter: 'blur(20px) saturate(1.5)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
    boxShadow: dark
      ? '0 24px 60px rgba(0,0,0,0.65), 0 0 36px rgba(56,189,248,0.3), inset 0 1px 0 rgba(255,255,255,0.12)'
      : '0 20px 48px rgba(15,23,42,0.22), 0 0 24px rgba(40,145,200,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
    // Beat the global `.MuiMenu-paper { background … !important }` rule: a
    // distinctly lighter, solid slate surface with a cyan edge.
    '&&': {
      backgroundColor: `${dark ? 'rgb(45,64,99)' : 'rgb(250,253,255)'} !important`,
      backgroundImage: 'none !important',
      border: `1px solid ${dark ? 'rgba(56,189,248,0.6)' : 'rgba(40,145,200,0.4)'} !important`,
    },
    // Thin cyan sheen across the very top edge.
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 2,
      background: dark
        ? 'linear-gradient(90deg, transparent, rgba(0,225,255,0.7), transparent)'
        : 'linear-gradient(90deg, transparent, rgba(40,145,200,0.6), transparent)',
      pointerEvents: 'none',
      zIndex: 1,
    },
    '& .MuiList-root': { paddingTop: '7px', paddingBottom: '7px' },
    '& .MuiMenuItem-root': {
      borderRadius: '10px',
      marginLeft: '7px',
      marginRight: '7px',
      paddingTop: '9px',
      paddingBottom: '9px',
      transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
      // `!important` on the gradients beats the global `.MuiMenuItem-root` hover/
      // selected `background-color … !important` rules so the cyan fill shows.
      '&:hover': {
        background: `${
          dark
            ? 'linear-gradient(90deg, rgba(56,189,248,0.20), rgba(56,189,248,0.06))'
            : 'linear-gradient(90deg, rgba(40,145,200,0.16), rgba(40,145,200,0.04))'
        } !important`,
        boxShadow: `inset 3px 0 0 ${cyan}`,
      },
      '&.Mui-focusVisible': {
        background: `${
          dark
            ? 'linear-gradient(90deg, rgba(56,189,248,0.24), rgba(56,189,248,0.08))'
            : 'linear-gradient(90deg, rgba(40,145,200,0.18), rgba(40,145,200,0.05))'
        } !important`,
        boxShadow: `inset 3px 0 0 ${cyan}`,
      },
      '&.Mui-selected': {
        color: `${dark ? 'rgb(186,236,255)' : 'rgb(20,110,160)'} !important`,
        fontWeight: 600,
        background: `${
          dark
            ? 'linear-gradient(90deg, rgba(56,189,248,0.32), rgba(0,225,255,0.10))'
            : 'linear-gradient(90deg, rgba(40,145,200,0.22), rgba(40,145,200,0.06))'
        } !important`,
        boxShadow: `inset 3px 0 0 ${cyan}${dark ? ', 0 0 16px rgba(56,189,248,0.18)' : ''}`,
        '&:hover': {
          background: `${
            dark
              ? 'linear-gradient(90deg, rgba(56,189,248,0.4), rgba(0,225,255,0.14))'
              : 'linear-gradient(90deg, rgba(40,145,200,0.28), rgba(40,145,200,0.1))'
          } !important`,
        },
        '&.Mui-focusVisible': {
          background: `${
            dark
              ? 'linear-gradient(90deg, rgba(56,189,248,0.36), rgba(0,225,255,0.12))'
              : 'linear-gradient(90deg, rgba(40,145,200,0.26), rgba(40,145,200,0.08))'
          } !important`,
        },
      },
    },
  };
};
