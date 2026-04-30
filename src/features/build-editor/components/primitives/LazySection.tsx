/**
 * LazySection
 * Defers mounting of heavy section subtrees until they scroll within ~1 viewport
 * of being visible. Used in `BuildEditorLayout` to avoid rendering all 11 bento
 * cards on initial paint — the below-the-fold ones now render as cheap
 * placeholder boxes until the user scrolls near them.
 *
 * Design notes:
 * - Once a section has become visible, it stays mounted for the rest of the
 *   session (no remount when scrolled out of view). Section-local state (e.g.
 *   picker dialogs, collapsible sub-groups) is preserved this way.
 * - `rootMargin` is intentionally generous (~1000-1200px) so that click-to-jump
 *   from `BuildNavRail` lands on a mounted section — the IO fires well before
 *   the smooth-scroll animation arrives at the target.
 * - A `placeholderMinHeight` preserves approximate bento layout so the grid
 *   doesn't collapse before lazy sections mount. Callers tune it per section
 *   (tall ones like Equipment/Champion/Stats get larger placeholders).
 * - `eager` short-circuits the IO path; used for above-the-fold sections and
 *   for the mobile breakpoint (where `SectionCard` already unmounts collapsed
 *   content via `<Collapse unmountOnExit>`, making lazy mounting redundant).
 */

import { Box } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';

interface LazySectionProps {
  children: React.ReactNode;
  /** Approximate content height — reserves grid space so layout doesn't jump on mount. */
  placeholderMinHeight?: number;
  /** IntersectionObserver rootMargin. Default: ~1 viewport of buffer. */
  rootMargin?: string;
  /** Skip lazy mount and render children immediately. */
  eager?: boolean;
  /**
   * Grid placement for the placeholder. Must match whatever grid span the wrapped
   * SectionCard applies to itself (e.g. `gridColumn="span 2"` for full-width rows,
   * `gridRow="span 2"` for Equipment's two-row card). This keeps the grid layout
   * stable across the placeholder → real-content swap.
   */
  gridColumn?: string;
  gridRow?: string;
}

export const LazySection: React.FC<LazySectionProps> = ({
  children,
  placeholderMinHeight = 280,
  rootMargin = '1200px 0px',
  eager = false,
  gridColumn,
  gridRow,
}) => {
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const el = placeholderRef.current;
    if (!el) return;

    // Fallback for environments without IntersectionObserver (JSDOM, old browsers).
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  if (visible) return <>{children}</>;

  return (
    <Box
      ref={placeholderRef}
      aria-hidden="true"
      sx={{
        minHeight: placeholderMinHeight,
        borderRadius: 3,
        gridColumn,
        gridRow,
      }}
    />
  );
};
