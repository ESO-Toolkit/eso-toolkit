/**
 * Assignable-set catalog for the Roster Builder "All Sets" browser.
 *
 * The roster stores gear as numeric `KnownSetIDs` (ESO Logs gameData ids) and
 * resolves a chosen set name → id via `findSetIdByName`. A set therefore can
 * only be assigned if it lives in `SET_DISPLAY_NAMES`. This module enumerates
 * that genuinely-assignable universe (~230 sets) and enriches each entry with:
 *   - `setType`/`bonuses` from the build-editor gear catalog (`gearSetRegistry`)
 *     when the name resolves there, so the browser can show content-type tabs
 *     and set-bonus previews exactly like the build editor's gear picker.
 *   - `slotKind` ('fivePiece' | 'monster') — which roster slot the set can go in.
 *     This is derived from the curated roster lists FIRST (always correct, even
 *     when the catalog has no match), so the assign popover never shows a set
 *     with zero assignable slots.
 *   - `role` ('tank' | 'healer' | 'both') for the role filter.
 *
 * Everything is precomputed once at module load — rows never call
 * `findSetIdByName`/`getSetRole`/`lookupGearSet` during render.
 */

import {
  getSetType,
  lookupGearSet,
  type GearSetType,
} from '../../features/build-editor/data/gearSetRegistry';
import { KnownSetIDs } from '../../types/abilities';
import {
  ALL_5PIECE_SETS,
  MONSTER_SETS,
  QUICK_TANK_5PIECE_SETS,
  QUICK_TANK_MONSTER_SETS,
  QUICK_FLEXIBLE_5PIECE_SETS,
  QUICK_FLEXIBLE_MONSTER_SETS,
  QUICK_FLEXIBLE_MYTHICS,
  QUICK_HEALER_5PIECE_SETS,
  QUICK_HEALER_MONSTER_SETS,
  QUICK_HEALER_MYTHICS,
  TANK_SETS,
  HEALER_SETS,
  FLEXIBLE_SETS,
} from '../../types/roster';
import { getGearSetTooltipPropsByName } from '../../utils/gearSetTooltipMapper';
import { getAllSetIds, getSetDisplayName } from '../../utils/setNameUtils';
import type { GearSetTooltipProps } from '../GearSetTooltip';

export type SetSlotKind = 'fivePiece' | 'monster';
export type SetRole = 'tank' | 'healer' | 'both';

export interface AssignableSet {
  id: KnownSetIDs;
  name: string;
  /**
   * The catalog's canonical name for this set (after alias resolution). Equals
   * `name` unless the roster display name is abbreviated. Used to look up the
   * rich gear-set tooltip, which keys by the catalog name.
   */
  catalogName: string;
  /** Content-type label for grouping/tabs (catalog-derived, or 'Other'). */
  setType: GearSetType;
  /** Set-bonus lines from the catalog; empty when the catalog has no match. */
  bonuses: string[];
  /** Which roster slot this set can be assigned to. Always resolvable. */
  slotKind: SetSlotKind;
  /** Primary role(s) for the role filter. */
  role: SetRole;
}

// ─── Membership sets (built once) ────────────────────────────────────────────

const MONSTER_ID_SET = new Set<KnownSetIDs>(MONSTER_SETS as readonly KnownSetIDs[]);
const FIVE_PIECE_ID_SET = new Set<KnownSetIDs>(ALL_5PIECE_SETS as readonly KnownSetIDs[]);

const TANK_ID_SET = new Set<KnownSetIDs>([
  ...QUICK_TANK_5PIECE_SETS,
  ...QUICK_TANK_MONSTER_SETS,
  ...(TANK_SETS as readonly KnownSetIDs[]),
]);
const HEALER_ID_SET = new Set<KnownSetIDs>([
  ...QUICK_HEALER_5PIECE_SETS,
  ...QUICK_HEALER_MONSTER_SETS,
  ...QUICK_HEALER_MYTHICS,
  ...(HEALER_SETS as readonly KnownSetIDs[]),
]);
const FLEX_ID_SET = new Set<KnownSetIDs>([
  ...QUICK_FLEXIBLE_5PIECE_SETS,
  ...QUICK_FLEXIBLE_MONSTER_SETS,
  ...QUICK_FLEXIBLE_MYTHICS,
  ...(FLEXIBLE_SETS as readonly KnownSetIDs[]),
]);

/**
 * Catalog setTypes that occupy the Monster/Mythic (2-piece / 1-piece) slot.
 * Used as the secondary slot-kind signal when a set isn't in the curated lists.
 */
const MONSTER_SLOT_TYPES = new Set<GearSetType>(['Monster Set', 'Mythic']);

/**
 * Catalog canonical names for sets whose roster display name is abbreviated
 * (so `lookupGearSet` misses them). Resolves the set's content type + bonus
 * preview. Each entry was verified as the unique catalog set whose name contains
 * the roster name — not guessed. Not required for correctness (slot kind is
 * resolved independently); purely a content-type / bonus enrichment.
 */
const CATALOG_NAME_ALIASES: Record<string, string> = {
  Alkosh: 'Roar of Alkosh',
  Azureblight: 'Azureblight Reaper',
  'Crimson Oath': "Crimson Oath's Rive",
  Encratis: "Encratis's Behemoth",
  Gourmand: 'Back-Alley Gourmand',
  Jerensi: "Jerensi's Bladestorm",
  "Kazpian's": "Kazpian's Cruel Signet",
  "Perfected Kazpian's": "Kazpian's Cruel Signet",
  'Martial Knowledge': 'Way of Martial Knowledge',
  'Mora Scribe': "Mora Scribe's Thesis",
  'Perfected Mora Scribe': "Mora Scribe's Thesis",
  Olorime: 'Vestment of Olorime',
  'Perfected Olorime': 'Vestment of Olorime',
  Overwhelming: 'Overwhelming Surge',
  Ozezan: 'Ozezan the Inferno',
  'Pale Order': 'Ring of the Pale Order',
  "Perfected False God's": "False God's Devotion",
  Relequen: 'Arms of Relequen',
  "Relequen's Perfected": 'Arms of Relequen',
  'Storm-Cursed': "Storm-Cursed's Revenge",
  Stormweaver: "Stormweaver's Cavort",
  'The Pariah': 'Mark of the Pariah',
  'The Weald': 'Symmetry of the Weald',
  'Three Queens': 'Three Queens Wellspring',
  Vandorallen: "Vandorallen's Resonance",
  'Wild Hunt': 'Ring of the Wild Hunt',
  Yolnahkriin: 'Claw of Yolnahkriin',
};

// ─── Role / slot classifiers ─────────────────────────────────────────────────

function deriveRole(id: KnownSetIDs): SetRole {
  if (FLEX_ID_SET.has(id)) return 'both';
  const isTank = TANK_ID_SET.has(id);
  const isHealer = HEALER_ID_SET.has(id);
  if (isTank && !isHealer) return 'tank';
  if (isHealer && !isTank) return 'healer';
  return 'both';
}

function deriveSlotKind(id: KnownSetIDs, setType: GearSetType): SetSlotKind {
  // Curated lists are authoritative when present.
  if (MONSTER_ID_SET.has(id)) return 'monster';
  if (FIVE_PIECE_ID_SET.has(id)) return 'fivePiece';
  // Otherwise fall back to the catalog content type.
  return MONSTER_SLOT_TYPES.has(setType) ? 'monster' : 'fivePiece';
}

// ─── Catalog (built once) ────────────────────────────────────────────────────

function buildAssignableSets(): AssignableSet[] {
  const sets: AssignableSet[] = [];
  for (const id of getAllSetIds()) {
    const name = getSetDisplayName(id);
    // Skip the placeholder "Unknown" entries that exist only to map stray ids.
    if (!name || name === 'Unknown' || name.startsWith('Unknown Set')) continue;

    const catalogName = CATALOG_NAME_ALIASES[name] ?? name;
    const gearData = lookupGearSet(catalogName);
    const setType = getSetType(catalogName);
    const bonuses = gearData?.bonuses ?? [];

    sets.push({
      id,
      name,
      catalogName,
      setType,
      bonuses,
      slotKind: deriveSlotKind(id, setType),
      role: deriveRole(id),
    });
  }
  // Stable alphabetical order; tab grouping re-buckets by type.
  sets.sort((a, b) => a.name.localeCompare(b.name));
  return sets;
}

let _cache: AssignableSet[] | null = null;
let _byName: Map<string, AssignableSet> | null = null;

/** All assignable sets, enriched and sorted by name. Computed once. */
export function getAssignableSets(): AssignableSet[] {
  if (!_cache) _cache = buildAssignableSets();
  return _cache;
}

function nameIndex(): Map<string, AssignableSet> {
  if (!_byName) {
    _byName = new Map(getAssignableSets().map((s) => [s.name.toLowerCase(), s]));
  }
  return _byName;
}

/**
 * Slot kind for an arbitrary set name (case-insensitive). Used by the assign
 * popover so it can offer the correct slot(s) for any assignable set, not just
 * the ~35 curated support sets. Returns null for names not in the catalog.
 */
export function getSlotKindForSetName(setName: string | undefined | null): SetSlotKind | null {
  if (!setName) return null;
  return nameIndex().get(setName.toLowerCase())?.slotKind ?? null;
}

const _tooltipCache = new Map<KnownSetIDs, GearSetTooltipProps>();

/**
 * Rich tooltip props for a set row's hover card (the shared `GearSetTooltip`).
 * Resolves the catalog entry by the aliased `catalogName` so abbreviated roster
 * names (Olorime, Alkosh, …) still get bonuses. Falls back to a minimal card
 * built from the set's own data so EVERY row has a useful tooltip — including
 * the sets the catalog can't name-match (shown with the roster name + type, and
 * any bonuses we did capture). Memoized per set id.
 */
export function getSetTooltipProps(set: AssignableSet): GearSetTooltipProps {
  const cached = _tooltipCache.get(set.id);
  if (cached) return cached;

  const mapped = getGearSetTooltipPropsByName(set.catalogName, 0);
  const props: GearSetTooltipProps = mapped ?? {
    headerBadge: set.setType === 'Other' ? undefined : set.setType,
    setName: set.name,
    setBonuses: set.bonuses.map((bonus) => {
      const m = bonus.match(/\((\d+)\s*items?\)/i);
      return {
        pieces: m ? m[0] : '',
        effect: bonus.replace(/\(\d+\s*items?\)\s*/i, '').trim(),
      };
    }),
  };
  // Always show the roster's own name, even when the catalog canonical differs.
  props.setName = set.name;
  _tooltipCache.set(set.id, props);
  return props;
}
