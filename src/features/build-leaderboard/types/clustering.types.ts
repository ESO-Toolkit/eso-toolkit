/**
 * Types for build clustering.
 *
 * Kept free of React and of any heavy data imports: everything here crosses into
 * a web worker via structured clone, so it must be plain serializable data.
 */

/** Feature groups the distance function compares, in weight order. */
export type FeatureGroupKey =
  | 'esoClass'
  | 'skillLines'
  | 'fivePieceSets'
  | 'frontBar'
  | 'backBar'
  | 'mythic'
  | 'arena'
  | 'monsterSet'
  | 'cpSlottables'
  | 'mundus'
  | 'food'
  | 'race';

export type FeatureWeights = Record<FeatureGroupKey, number>;

/**
 * One parse reduced to the axes clustering compares.
 *
 * Set and ability IDs are already canonicalized (perfected sets and ability morphs
 * collapsed onto their base) so the distance function is pure arithmetic.
 */
export interface ParseFeatureVector {
  parseId: string;
  /** Ranking metric, carried through for cluster summaries. */
  amount: number;
  esoClass: string;
  skillLines: number[];
  fivePieceSets: number[];
  frontBar: number[];
  backBar: number[];
  /** Base (unmorphed) ability ids, for partial credit between morph siblings. */
  frontBarBase: number[];
  backBarBase: number[];
  monsterSet: number | null;
  mythic: number | null;
  arena: number | null;
  cpSlottables: number[];
  mundus: number | null;
  food: number | null;
  race: string | null;
  /**
   * Groups this parse has no data for. A group absent from BOTH vectors is skipped
   * entirely rather than scored as a match — otherwise every parse would look
   * identical on the four dimensions characterRankings never returns.
   */
  missing: FeatureGroupKey[];
}

/** Unique feature vectors plus how many raw parses each represents. */
export interface CollapsedPoints {
  points: ParseFeatureVector[];
  /** Parse count behind each point, parallel to `points`. */
  multiplicity: number[];
  /** Parse ids behind each point, parallel to `points`. */
  members: string[][];
}

export interface DendrogramMerge {
  left: number;
  right: number;
  height: number;
  size: number;
}

export interface DpsSummary {
  min: number;
  q1: number;
  median: number;
  q3: number;
  p90: number;
  max: number;
  mean: number;
  count: number;
}

/** A single build trait and how much of a cluster runs it. */
export interface ClusterTrait {
  group: FeatureGroupKey;
  id: number | string;
  /** Resolved on the main thread after the worker returns. */
  label: string;
  /** 0–1 share of the cluster's parses carrying this trait. */
  share: number;
}

export interface BuildCluster {
  id: string;
  /** Human-readable summary, e.g. "Deadly Strike + Coral Riptide Arcanist". */
  label: string;
  /**
   * Class of the medoid build.
   *
   * Carried explicitly because `traitShares` does not emit an `esoClass` trait —
   * the UI cannot dig it out of `core`, and the label needs it as a suffix to
   * keep sibling cards distinguishable on the encounter tab.
   */
  esoClass: string;
  size: number;
  /** Share of all clustered parses. */
  share: number;
  memberParseIds: string[];
  /** A real observed parse, not a synthetic centroid — displayable and openable. */
  medoidParseId: string;
  dps: DpsSummary;
  /** Traits ≥ CORE_SHARE_THRESHOLD — effectively mandatory. */
  core: ClusterTrait[];
  /** Traits between FLEX and CORE thresholds — real alternatives exist. */
  flex: ClusterTrait[];
  /**
   * Traits below the flex threshold — minority picks, hidden behind the UI's
   * "Show variations" disclosure.
   *
   * These must be returned rather than discarded: without them the disclosure
   * has nothing to reveal and can never activate.
   */
  variations: ClusterTrait[];
  /** Mean intra-cluster distance, 0–1. Lower means a tighter archetype. */
  cohesion: number;
}

export interface ClusterOptions {
  weights?: FeatureWeights;
  minK?: number;
  maxK?: number;
  /** Clusters below this share are merged into their nearest neighbour. */
  minClusterShare?: number;
  /** Cap on raw parses considered. */
  maxInputSize?: number;
  /** Cap on unique signatures fed to the O(n^3) linkage step. */
  maxUniqueSignatures?: number;
}

export interface ClusterBuildsInput {
  vectors: ParseFeatureVector[];
  options?: ClusterOptions;
}

export interface ClusterBuildsResult {
  clusters: BuildCluster[];
  k: number;
  /** Weighted mean silhouette of the chosen k. Higher is better separated. */
  silhouette: number;
  silhouetteByK: Array<{ k: number; score: number }>;
  /** The archetype a newcomer should start with. Null when data is too thin. */
  recommendedClusterId: string | null;
  totalParses: number;
  uniqueSignatures: number;
  droppedParses: number;
}
