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
import type { BuildCluster, ClusterBuildsResult, ClusterTrait } from '../types/clustering.types';
import type { DpsParse } from '../types/dpsParses.types';

/**
 * Cached clustering results kept in memory. Comfortably covers toggling between
 * a few encounters and classes; beyond that the least-recently-used is evicted.
 */
const MAX_CACHED_RESULTS = 12;

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

/**
 * Fallback label for a trait whose name we could not resolve.
 *
 * Group-aware on purpose: a blanket "Ability <id>" would mislabel gear sets,
 * mundus and food as abilities, which is worse than a bare number — it states
 * something false rather than merely being unhelpful.
 */
function fallbackLabel(group: ClusterTrait['group'], id: number | string): string {
  if (typeof id !== 'number') return String(id);

  switch (group) {
    case 'frontBar':
    case 'backBar':
      return `Ability ${id}`;
    case 'fivePieceSets':
    case 'monsterSet':
    case 'mythic':
    case 'arena':
      return `Set ${id}`;
    case 'mundus':
      return `Mundus ${id}`;
    case 'food':
      return `Food ${id}`;
    default:
      return String(id);
  }
}

/** Fill in the human-readable labels the worker left blank. */
function hydrateLabels(cluster: BuildCluster, labels: Map<string, string>): BuildCluster {
  const hydrate = (traits: BuildCluster['core']): BuildCluster['core'] =>
    traits.map((trait) => ({
      ...trait,
      label: labels.get(`${trait.group}|${trait.id}`) ?? fallbackLabel(trait.group, trait.id),
    }));

  const core = hydrate(cluster.core);
  const flex = hydrate(cluster.flex);
  const variations = hydrate(cluster.variations);

  // The label was generated before names were known; rebuild it from the
  // now-resolved five-piece sets — keeping the class suffix, without which two
  // sibling cards sharing gear are indistinguishable (nothing else on the
  // encounter tab renders the class).
  const setNames = [...core, ...flex]
    .filter((trait) => trait.group === 'fivePieceSets')
    .slice(0, 2)
    .map((trait) => trait.label);

  const rebuilt =
    setNames.length > 0
      ? [setNames.join(' + '), cluster.esoClass].filter(Boolean).join(' ')
      : cluster.label;

  return {
    ...cluster,
    core,
    flex,
    variations,
    label: rebuilt,
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
  //
  // Bounded: each entry holds every cluster's member id list, and a session that
  // browses many encounters and classes would otherwise retain all of them for
  // the lifetime of the page. The cap is well above the handful of views anyone
  // toggles between, so it costs no practical hit rate.
  // Keyed on CONTENT, not just identity. `parse_id` is deliberately stable across
  // re-ingests (so deep links survive), which means the same id can carry a
  // different build after the cron updates a character's best parse — an
  // id-only key would then serve clusters computed from data that no longer
  // exists. signature_hash covers build changes, amount covers a re-parse.
  const cacheKey = useMemo(
    () =>
      parses.map((parse) => `${parse.parse_id}:${parse.signature_hash}:${parse.amount}`).join('|'),
    [parses],
  );
  const cache = useRef(new Map<string, ClusterBuildsResult>());

  /** Read through, refreshing recency so the cap evicts the least-recently used. */
  const readCache = (key: string): ClusterBuildsResult | undefined => {
    const hit = cache.current.get(key);
    if (!hit) return undefined;
    cache.current.delete(key);
    cache.current.set(key, hit);
    return hit;
  };

  const writeCache = (key: string, value: ClusterBuildsResult): void => {
    cache.current.delete(key);
    cache.current.set(key, value);
    // Map iterates in insertion order, so the first key is the oldest.
    while (cache.current.size > MAX_CACHED_RESULTS) {
      const oldest = cache.current.keys().next().value;
      if (oldest === undefined) break;
      cache.current.delete(oldest);
    }
  };

  useEffect(() => {
    // Every path that returns without starting a run MUST clear `loading`.
    //
    // A previous run's cleanup sets its `cancelled` flag, so that run's
    // `.finally()` deliberately skips `setLoading(false)` to avoid writing state
    // for work nobody is waiting on. Nothing else clears the flag — so an early
    // return that forgets leaves the UI stuck on "Grouping N parses…" forever.
    // Routing both early returns through this helper makes that hard to miss.
    const settleWithoutRunning = (next: ClusterBuildsResult | null, pct: number): void => {
      setResult(next);
      setError(null);
      setProgress(pct);
      setLoading(false);
    };

    if (parses.length === 0 || tooFewParses) {
      settleWithoutRunning(null, 0);
      return undefined;
    }

    const cached = readCache(cacheKey);
    if (cached) {
      settleWithoutRunning(cached, 100);
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
        writeCache(cacheKey, hydrated);
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
