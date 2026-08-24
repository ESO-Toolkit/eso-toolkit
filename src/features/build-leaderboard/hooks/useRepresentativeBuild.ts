import { useEffect, useState } from 'react';

import { dpsParsesApi } from '../api/dpsParsesApi';
import type { DpsParseBuildResponse } from '../types/dpsParses.types';

const buildCache = new Map<string, DpsParseBuildResponse>();
const pendingBuilds = new Map<string, Promise<DpsParseBuildResponse>>();

function loadBuild(parseId: string): Promise<DpsParseBuildResponse> {
  const cached = buildCache.get(parseId);
  if (cached) return Promise.resolve(cached);

  const pending = pendingBuilds.get(parseId);
  if (pending) return pending;

  const request = dpsParsesApi
    .getBuild(parseId)
    .then((build) => {
      buildCache.set(parseId, build);
      return build;
    })
    .finally(() => pendingBuilds.delete(parseId));
  pendingBuilds.set(parseId, request);
  return request;
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
    build: buildCache.get(parseId) ?? null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return undefined;

    const cached = buildCache.get(parseId);
    if (cached) {
      setState({ parseId, build: cached, loading: false, error: null });
      return undefined;
    }

    let active = true;
    setState({ parseId, build: null, loading: true, error: null });
    void loadBuild(parseId)
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
    };
  }, [enabled, parseId]);

  if (state.parseId !== parseId) {
    return { build: buildCache.get(parseId) ?? null, loading: false, error: null };
  }

  return state;
}

export function clearRepresentativeBuildCache(): void {
  buildCache.clear();
  pendingBuilds.clear();
}
