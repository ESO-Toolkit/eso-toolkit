import type { TooltipProps } from '@mui/material';

/**
 * Shared slotProps for MUI Tooltip when the title is a rich React node
 * (e.g. GearSetTooltip, SkillTooltipCard) rather than plain text.
 *
 * Modern viewport-fit strategy:
 *  - Transparent wrapper so only the inner card is visible.
 *  - maxHeight uses `dvh` so it tracks the dynamic viewport (mobile URL bar).
 *  - Content stays scrollable via wheel/touch, but the native scrollbar is
 *    hidden (scrollbar-width: none + ::-webkit-scrollbar) so the tooltip
 *    card never shows a scroll gutter.
 *  - popperOptions.strategy = 'fixed' positions the popper via
 *    `position: fixed` instead of `absolute`. With absolute positioning the
 *    portal-rendered tooltip briefly extended the document during its
 *    first measure pass, causing the page scrollbar to flash when hovering
 *    between tooltips quickly; fixed strategy positions relative to the
 *    viewport and never contributes to page scroll height.
 *  - preventOverflow { altAxis: true } lets Popper slide the tooltip along
 *    the cross axis when flipping alone can't fit it.
 *  - flip fallbackPlacements cover all four sides so the tooltip will land
 *    on whichever side has the most room.
 */
export const RICH_TOOLTIP_SLOT_PROPS: NonNullable<TooltipProps['slotProps']> = {
  tooltip: {
    sx: {
      maxWidth: 320,
      p: 0,
      backgroundColor: 'transparent !important',
      border: 'none !important',
      boxShadow: 'none !important',
      maxHeight: 'min(520px, calc(100dvh - 24px))',
      overflowY: 'auto',
      overflowX: 'hidden',
      overscrollBehavior: 'contain',
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': { display: 'none' },
    },
  },
  arrow: { sx: { display: 'none' } },
  popper: {
    popperOptions: {
      strategy: 'fixed',
      modifiers: [
        { name: 'preventOverflow', options: { altAxis: true, padding: 12 } },
        {
          name: 'flip',
          options: {
            fallbackPlacements: ['top', 'bottom', 'right', 'left'],
            padding: 12,
          },
        },
      ],
    },
  },
};
