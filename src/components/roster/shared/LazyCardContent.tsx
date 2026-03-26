/**
 * LazyCardContent — defers mounting of heavy card content (Autocompletes, etc.)
 * until the component has been in the DOM for one animation frame.
 *
 * On initial mount, renders nothing. After the first rAF, renders children.
 * This breaks the synchronous forced-reflow chain that MUI Autocomplete
 * causes when many instances mount simultaneously.
 *
 * When `eager` is true, renders children immediately (for cards that are
 * already visible and should not flash).
 */

import React, { useState, useEffect } from 'react';

interface LazyCardContentProps {
  /** When true, skip the deferred mount and render immediately */
  eager?: boolean;
  children: React.ReactNode;
}

export const LazyCardContent: React.FC<LazyCardContentProps> = React.memo(function LazyCardContent({
  eager = false,
  children,
}) {
  const [ready, setReady] = useState(eager);

  useEffect(() => {
    if (!ready) {
      const raf = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [ready]);

  if (!ready) return null;
  return <>{children}</>;
});
