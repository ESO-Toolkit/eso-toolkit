import { useEffect, useState } from 'react';

import { dpsParsesApi } from '../api/dpsParsesApi';
import type { DpsParseBuildResponse } from '../types/dpsParses.types';

const buildCache = new Map<string, DpsParseBuildResponse>();
const pendingBuilds = new Map<string, PendingBuild>();

/**
 * The inspector can visit many representative parses in one session. Keep
 * this cache deliberately small and evict the least-recently-used entry so a
 * long browsing session cannot retain every build payload indefinitely.
 */
export const REPRESENTATIVE_BUILD_CACHE_LIMIT = 50;

interface PendingBuild {
  controller: AbortController;
  promise: Promise<DpsParseBuildResponse>;
  consumers: number;
  settled: boolean;
  cancelled: boolean;
}

interface AcquiredBuild {
  promise: Promise<DpsParseBuildResponse>;
  release: () => void;
}

function readCachedBuild(parseId: string): DpsParseBuildResponse | undefined {
  return buildCache.get(parseId);
}

function touchCachedBuild(parseId: string): DpsParseBuildResponse | undefined {
  const cached = readCachedBuild(parseId);
  if (cached) {
    // Map insertion order gives us a deterministic LRU eviction policy.
    buildCache.delete(parseId);
    buildCache.set(parseId, cached);
  }
  return cached;
}

function cacheBuild(parseId: string, build: DpsParseBuildResponse): void {
  buildCache.delete(parseId);
  buildCache.set(parseId, build);
  while (buildCache.size > REPRESENTATIVE_BUILD_CACHE_LIMIT) {
    const oldestParseId = buildCache.keys().next().value as string | undefined;
    if (oldestParseId === undefined) break;
    buildCache.delete(oldestParseId);
  }
}

function loadBuild(parseId: string): AcquiredBuild {
  const cached = touchCachedBuild(parseId);
  if (cached) return { promise: Promise.resolve(cached), release: () => undefined };

  let pending = pendingBuilds.get(parseId);
  if (!pending) {
    const controller = new AbortController();
    let entry: PendingBuild;
    const promise = dpsParsesApi
      .getBuild(parseId, controller.signal)
      .then((build) => {
        if (!entry.cancelled) cacheBuild(parseId, build);
        return build;
      })
      .finally(() => {
        entry.settled = true;
        if (pendingBuilds.get(parseId) === entry) pendingBuilds.delete(parseId);
      });
    entry = {
      controller,
      promise,
      consumers: 0,
      settled: false,
      cancelled: false,
    };
    pending = entry;
    pendingBuilds.set(parseId, entry);
  }

  pending.consumers += 1;
  let released = false;
  return {
    promise: pending.promise,
    release: () => {
      if (released) return;
      released = true;
      pending!.consumers -= 1;
      if (pending!.consumers === 0 && !pending!.settled && pendingBuilds.get(parseId) === pending) {
        pending!.cancelled = true;
        if (pendingBuilds.get(parseId) === pending) pendingBuilds.delete(parseId);
        pending!.controller.abort();
      }
    },
  };
}

export interface RepresentativeBuildState {
  build: DpsParseBuildResponse | null;
  loading: boolean;
  error: string | null;
}

interface KeyedRepresentativeBuildState extends RepresentativeBuildState {
  parseId: string;
}

export function useRepresentativeBuild(
  parseId: string,
  enabled: boolean,
): RepresentativeBuildState {
  const [state, setState] = useState<KeyedRepresentativeBuildState>({
    parseId,
    build: readCachedBuild(parseId) ?? null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return undefined;

    const cached = touchCachedBuild(parseId);
    if (cached) {
      setState({ parseId, build: cached, loading: false, error: null });
      return undefined;
    }

    let active = true;
    setState({ parseId, build: null, loading: true, error: null });
    const acquired = loadBuild(parseId);
    void acquired.promise
      .then((build) => {
        if (active) setState({ parseId, build, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          parseId,
          build: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Representative build unavailable',
        });
      });

    return () => {
      active = false;
      acquired.release();
    };
  }, [enabled, parseId]);

  if (state.parseId !== parseId) {
    return { build: readCachedBuild(parseId) ?? null, loading: false, error: null };
  }

  return state;
}

export function clearRepresentativeBuildCache(): void {
  buildCache.clear();
  pendingBuilds.forEach((pending) => {
    pending.cancelled = true;
    pending.controller.abort();
  });
  pendingBuilds.clear();
}
