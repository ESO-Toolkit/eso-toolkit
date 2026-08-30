/** Stable separation between consecutive app accordions. */
export const ACCORDION_GAP_PX = 8;

/** Prevent MUI from changing accordion margins when expansion state changes. */
export const accordionDefaultProps = {
  disableGutters: true,
} as const;

/**
 * Keep accordion spacing independent of MUI's expanded-state margins.
 *
 * The expanded-sibling selector makes the gap resilient to local state styles
 * that reset margins when an accordion opens.
 */
export const accordionSpacingStyleOverrides = {
  '& + &': {
    marginTop: ACCORDION_GAP_PX,
  },
  '& + &.Mui-expanded': {
    marginTop: ACCORDION_GAP_PX,
  },
} as const;
