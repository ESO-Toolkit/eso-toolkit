import React, { useState } from 'react';

export interface ResilientImgProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /**
   * Ordered list of equivalent image URLs, most-reliable first. The component
   * renders the first one and advances to the next whenever a source fails to
   * load — so a blocked/flaky CDN falls through to the next instead of leaving
   * a broken or invisible image.
   */
  sources: string[];
  /**
   * Rendered when EVERY source fails (or `sources` is empty). Use a themed slot
   * glyph / placeholder rather than letting the icon vanish. Defaults to null.
   */
  fallback?: React.ReactNode;
}

/**
 * An `<img>` that tries multiple sources before giving up, then shows a
 * placeholder instead of disappearing.
 *
 * The historical pattern across the app — `onError={e => e.target.style.display
 * = 'none'}` — silently hides an icon the moment a single CDN request fails,
 * which is exactly what users behind ad/privacy blockers or flaky networks hit.
 * Prefer this component for any remote game icon (gear, abilities, food) so one
 * unreachable host degrades gracefully.
 */
export const ResilientImg: React.FC<ResilientImgProps> = ({
  sources,
  fallback = null,
  alt = '',
  onError,
  ...imgProps
}) => {
  const primary = sources[0] ?? '';
  // Derive the active index from state keyed on the primary source: switching
  // to a different icon (new primary) resets the cursor to 0 in the SAME render
  // — no stale "exhausted" flash, and no effect/race needed.
  const [state, setState] = useState<{ key: string; idx: number }>({ key: primary, idx: 0 });
  const idx = state.key === primary ? state.idx : 0;

  if (sources.length === 0 || idx >= sources.length) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={sources[idx]}
      alt={alt}
      onError={(e) => {
        setState({ key: primary, idx: idx + 1 });
        onError?.(e);
      }}
      {...imgProps}
    />
  );
};
