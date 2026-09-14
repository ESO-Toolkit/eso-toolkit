import React, { ReactNode, Suspense, useCallback, useState } from 'react';

import { ErrorBoundary, isChunkLoadError } from './ErrorBoundary';

export type LazyRouteLoader = () => Promise<{ default: React.ComponentType }>;

interface RetryableLazyRouteProps {
  fallback: ReactNode;
  load: LazyRouteLoader;
  reloadPage?: () => void;
}

const reloadPage = (): void => {
  window.location.reload();
};

/**
 * Renders a lazy route whose failed import can be retried from ErrorBoundary.
 *
 * A browser may cache a rejected dynamic import in its module map. Chunk-load
 * failures therefore reload the document; other errors receive a fresh lazy
 * instance and remain recoverable in place.
 */
export const RetryableLazyRoute = ({
  fallback,
  load,
  reloadPage: performReload = reloadPage,
}: RetryableLazyRouteProps): ReactNode => {
  const [LazyRoute, setLazyRoute] = useState(() => React.lazy(load));
  const retryLoad = useCallback(
    (error: Error | null) => {
      if (isChunkLoadError(error)) {
        performReload();
        return;
      }

      setLazyRoute(() => React.lazy(load));
    },
    [load, performReload],
  );

  return (
    <ErrorBoundary onRetry={retryLoad}>
      <Suspense fallback={fallback}>
        <LazyRoute />
      </Suspense>
    </ErrorBoundary>
  );
};
