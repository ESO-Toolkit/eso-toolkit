import type { TooltipProps } from '@mui/material';

/**
 * Shared slotProps for MUI Tooltip when the title is a rich React node
 * (e.g. GearSetTooltip, SkillTooltipCard) rather than plain text.
 *
 * Modern viewport-fit strategy:
 *  - Transparent wrapper so only the inner card is visible.
 *  - maxHeight uses `dvh` so it tracks the dynamic viewport (mobile URL bar).
 *  - overflow: hidden — most tooltips are well under the cap, and letting
 *    the browser render any scrollbar on the popper caused a flash when
 *    hovering between tooltips quickly. Overflow on a rare oversized card
 *    clips the bottom.
 *  - popperOptions.strategy = 'fixed' positions the popper via
 *    `position: fixed` instead of `absolute` so it never contributes to
 *    document scroll height.
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
      overflow: 'hidden',
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
