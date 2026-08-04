/**
 * Runs clustering over the loaded parses and hydrates display labels.
 *
 * Label resolution happens HERE, on the main thread, not in the worker: the worker
 * emits trait ids only, and set/ability names come from registries that must not
 * be pulled into a worker bundle.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { buildCanonicalMaps, setDisplayName } from '../clustering/canonicalization';
import { MIN_PARSES_TO_CLUSTER } from '../clustering/clusterBuilds';
import { extractFeatureVectors } from '../clustering/featureExtraction';
import { runBuildClustering } from '../clustering/runBuildClustering';
import type { BuildCluster, ClusterBuildsResult } from '../types/clustering.types';
import type { DpsParse } from '../types/dpsParses.types';

export interface UseBuildClustersResult {
  result: ClusterBuildsResult | null;
  loading: boolean;
  progress: number;
  error: string | null;
  /** True when there is too little data for clustering to mean anything. */
  tooFewParses: boolean;
}

/** Ability and set names pulled from the parses themselves, for trait labels. */
function buildLabelLookup(parses: readonly DpsParse[]): Map<string, string> {
  const labels = new Map<string, string>();

  for (const parse of parses) {
    const build = parse.build;
    if (!build) continue;

    // Ability names come from the signature; without them the skill-bar chips
    // render raw numeric ids, which tells a player nothing.
    for (const [abilityId, name] of Object.entries(build.abilityNames ?? {})) {
      labels.set(`frontBar|${abilityId}`, name);
      labels.set(`backBar|${abilityId}`, name);
    }

    for (const [setId] of build.setCounts) {
      // Our own table wins when it knows the set; the API's name is the fallback
      // for anything newer than our data, which top-parse gear routinely is.
      const name = setDisplayName(setId, build.setNames?.[setId]);
      labels.set(`fivePieceSets|${setId}`, name);
      labels.set(`monsterSet|${setId}`, name);
      labels.set(`mythic|${setId}`, name);
      labels.set(`arena|${setId}`, name);
    }
  }

  return labels;
}

/** Fill in the human-readable labels the worker left blank. */
function hydrateLabels(cluster: BuildCluster, labels: Map<string, string>): BuildCluster {
  const hydrate = (traits: BuildCluster['core']): BuildCluster['core'] =>
    traits.map((trait) => ({
      ...trait,
      // Fall back to a labelled id rather than a bare number, so an unknown
      // ability reads as missing data instead of looking like a UI bug.
      label:
        labels.get(`${trait.group}|${trait.id}`) ??
        (typeof trait.id === 'number' ? `Ability ${trait.id}` : String(trait.id)),
    }));

  const core = hydrate(cluster.core);
  const flex = hydrate(cluster.flex);
  const variations = hydrate(cluster.variations);

  // The label was generated before names were known; rebuild it from the
  // now-resolved five-piece sets.
  const setNames = [...core, ...flex]
    .filter((trait) => trait.group === 'fivePieceSets')
    .slice(0, 2)
    .map((trait) => trait.label);

  return {
    ...cluster,
    core,
    flex,
    variations,
    label: setNames.length > 0 ? setNames.join(' + ') : cluster.label,
  };
}

export function useBuildClusters(
  parses: readonly DpsParse[],
  resolveBaseAbilityId?: (abilityId: number) => number | undefined,
): UseBuildClustersResult {
  const [result, setResult] = useState<ClusterBuildsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const tooFewParses = parses.length > 0 && parses.length < MIN_PARSES_TO_CLUSTER;

  // Cache by the exact set of parses, so switching tabs back and forth does not
  // recompute. Parse ids are stable server-side, so this key is meaningful.
  const cacheKey = useMemo(() => parses.map((parse) => parse.parse_id).join('|'), [parses]);
  const cache = useRef(new Map<string, ClusterBuildsResult>());

  useEffect(() => {
    if (parses.length === 0 || tooFewParses) {
      setResult(null);
      setError(null);
      setProgress(0);
      return undefined;
    }

    const cached = cache.current.get(cacheKey);
    if (cached) {
      setResult(cached);
      setError(null);
      setProgress(100);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setProgress(0);
    setError(null);

    const maps = buildCanonicalMaps(parses, resolveBaseAbilityId);
    const vectors = extractFeatureVectors(parses, maps);
    const labels = buildLabelLookup(parses);

    runBuildClustering({ vectors }, (pct) => {
      if (!cancelled) setProgress(pct);
    })
      .then((clustered) => {
        if (cancelled) return;
        const hydrated: ClusterBuildsResult = {
          ...clustered,
          clusters: clustered.clusters.map((cluster) => hydrateLabels(cluster, labels)),
        };
        cache.current.set(cacheKey, hydrated);
        setResult(hydrated);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to group builds');
        setResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `parses` is covered by cacheKey; depending on the array itself would rerun
    // on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, tooFewParses, resolveBaseAbilityId]);

  return { result, loading, progress, error, tooFewParses };
}
