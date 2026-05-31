import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';

// Styled scroll container with a thin scrollbar (visible on pointer devices).
const MetricsScrollContainer = styled(Box)(({ theme }) => ({
  overflowX: 'auto',
  overflowY: 'hidden',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'thin',
  '&::-webkit-scrollbar': {
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.grey[200],
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.grey[500],
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: theme.palette.grey[700],
  },
}));

/** Width of the soft fade applied at a scrollable edge. */
const FADE_PX = 24;

/**
 * Build a horizontal mask gradient that fades the content at whichever edge can
 * still be scrolled. Returns `undefined` when neither edge is scrollable so no
 * mask is applied (and the row renders fully opaque).
 */
const buildEdgeMask = (canScrollLeft: boolean, canScrollRight: boolean): string | undefined => {
  if (!canScrollLeft && !canScrollRight) return undefined;
  const start = canScrollLeft ? `transparent 0, #000 ${FADE_PX}px` : '#000 0';
  const end = canScrollRight ? `#000 calc(100% - ${FADE_PX}px), transparent 100%` : '#000 100%';
  return `linear-gradient(to right, ${start}, ${end})`;
};

interface MetricsScrollRowProps {
  /**
   * Whether the row can scroll horizontally. When `false` (wrap layout) the
   * content wraps instead of scrolling, so no overflow affordance is shown.
   */
  scrollable: boolean;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * Horizontal metric row that signals when its content overflows. A soft fade
 * appears at whichever edge can still be scrolled: the right fade reads as
 * "more this way →", and the left fade appears once the user has scrolled away
 * from the start. The fade disappears entirely when the row fits, so it never
 * reads as a permanent artefact. The cue is built with a CSS mask so it blends
 * with the card's translucent background in any theme — important on mobile,
 * where the scrollbar is hidden and there is otherwise no hint to scroll.
 */
export const MetricsScrollRow: React.FC<MetricsScrollRowProps> = ({ scrollable, children, sx }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });

  const updateEdges = React.useCallback(() => {
    const el = ref.current;
    if (!el || !scrollable) {
      setEdges({ left: false, right: false });
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    // 1px tolerance avoids a flickering fade from sub-pixel rounding.
    setEdges({
      left: el.scrollLeft > 1,
      right: el.scrollLeft < maxScroll - 1,
    });
  }, [scrollable]);

  React.useEffect(() => {
    updateEdges();
    const el = ref.current;
    if (!el) return;
    // Recompute when the row itself resizes (viewport changes, font load, etc.).
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
    // `children` is included so the edges recompute when the metric set changes.
  }, [updateEdges, children]);

  const mask = buildEdgeMask(edges.left, edges.right);

  return (
    <MetricsScrollContainer
      ref={ref}
      onScroll={updateEdges}
      data-testid="metrics-scroll-row"
      data-can-scroll-left={edges.left}
      data-can-scroll-right={edges.right}
      sx={[
        ...(Array.isArray(sx) ? sx : [sx]),
        mask
          ? { maskImage: mask, WebkitMaskImage: mask }
          : { maskImage: 'none', WebkitMaskImage: 'none' },
      ]}
    >
      {children}
    </MetricsScrollContainer>
  );
};
