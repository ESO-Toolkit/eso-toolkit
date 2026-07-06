/**
 * Champion-point view-model — turns a captured CP snapshot into card-ready data.
 *
 * The companion captures the full per-star allocation (the gap ESO Logs can't see);
 * this groups it by tree, names each star via the existing champion-point map, and
 * surfaces the slotted stars and totals so a player-card panel can render it directly.
 */

import {
  CHAMPION_POINT_ABILITIES,
  ChampionPointTree,
  getChampionPointAbilityName,
  isChampionPointVerified,
} from '@/types/champion-points';

import type { CompanionChampionPoints } from './esotkCompanionParser';

/** Bucket for stars whose id isn't in the known map yet (new/unmapped). */
export const UNKNOWN_TREE = 'Unknown' as const;
export type ChampionTreeKey = ChampionPointTree | typeof UNKNOWN_TREE;

export interface AllocatedStar {
  id: number;
  name: string;
  points: number;
  tree: ChampionTreeKey;
  /** Whether the id→name mapping is verified (vs a best-effort/unknown label). */
  verified: boolean;
}

export interface SlottedStar {
  slot: number;
  id: number;
  name: string;
}

export interface ChampionPointsViewModel {
  /** Total earned champion points (CP rank), if captured. */
  total?: number;
  /** Sum of points actually spent across all stars. */
  totalAllocated: number;
  /** All stars with points > 0, sorted by points descending. */
  allocated: AllocatedStar[];
  /** Allocated stars grouped by tree. */
  byTree: Record<ChampionTreeKey, AllocatedStar[]>;
  /** The 12 slotted stars in slot order. */
  slotted: SlottedStar[];
}

function treeForStar(id: number): ChampionTreeKey {
  return (
    CHAMPION_POINT_ABILITIES[id as keyof typeof CHAMPION_POINT_ABILITIES]?.tree ?? UNKNOWN_TREE
  );
}

function emptyByTree(): Record<ChampionTreeKey, AllocatedStar[]> {
  return {
    [ChampionPointTree.Craft]: [],
    [ChampionPointTree.Warfare]: [],
    [ChampionPointTree.Fitness]: [],
    [UNKNOWN_TREE]: [],
  };
}

/**
 * Build a card-ready champion-point view-model from a captured CP snapshot.
 * Returns `null` when there's nothing to show.
 */
export function buildChampionPointsViewModel(
  cp: CompanionChampionPoints | undefined,
): ChampionPointsViewModel | null {
  if (!cp) return null;

  // Prefer ESOTK's canonical (English) name for known ids; otherwise fall back to the
  // name the addon captured from the client, so even ids the map doesn't know read
  // cleanly instead of as "Unknown". Only canonical-map hits count as verified.
  const resolveName = (id: number): { name: string; verified: boolean } => {
    if (isChampionPointVerified(id)) {
      return { name: getChampionPointAbilityName(id), verified: true };
    }
    const captured = cp.names?.[id];
    if (captured) return { name: captured, verified: false };
    return { name: getChampionPointAbilityName(id), verified: false };
  };

  const allocated: AllocatedStar[] = [];
  for (const discipline of Object.values(cp.disciplines)) {
    for (const [skillIdStr, points] of Object.entries(discipline.skills)) {
      const id = Number(skillIdStr);
      if (!Number.isFinite(id) || points <= 0) continue;
      const { name, verified } = resolveName(id);
      allocated.push({ id, name, points, tree: treeForStar(id), verified });
    }
  }
  allocated.sort((a, b) => b.points - a.points || a.id - b.id);

  const byTree = emptyByTree();
  for (const star of allocated) {
    byTree[star.tree].push(star);
  }

  const slotted: SlottedStar[] = Object.entries(cp.slotted)
    .map(([slotStr, id]) => ({ slot: Number(slotStr), id, name: resolveName(id).name }))
    .filter((s) => Number.isFinite(s.slot) && Number.isFinite(s.id) && s.id > 0)
    .sort((a, b) => a.slot - b.slot);

  const totalAllocated = allocated.reduce((sum, s) => sum + s.points, 0);

  if (allocated.length === 0 && slotted.length === 0 && cp.total === undefined) {
    return null;
  }

  return { total: cp.total, totalAllocated, allocated, byTree, slotted };
}
