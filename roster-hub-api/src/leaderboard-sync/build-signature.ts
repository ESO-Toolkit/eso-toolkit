/**
 * Turns a parsed `characterRankings` entry into the canonical build signature
 * stored on `dps_parses` and clustered by the frontend.
 *
 * Reuses `categorizeGear` and `detectTalentInfo` rather than reimplementing them —
 * both work on this data once it is adapted (see the two adapters below) — then
 * corrects two known warts in `categorizeGear`'s output:
 *
 *  1. It folds DPS mythics INTO `monsterSet`. For clustering those are separate
 *     axes: an Oakensoul build is not a Zaan build. Split back out here.
 *  2. It returns `arenaWeapon` as a display NAME. Names are not stable enough to
 *     hash on, so the set ID is recovered from the piece counts.
 *
 * `setCounts` is always stored raw. It is the escape hatch: if the hardcoded set-ID
 * tables in gear-categorizer.ts go stale after a patch (they will), a mis-slotted
 * set becomes a frontend-only fix instead of a full re-ingest.
 */

import {
  ARENA_WEAPON_SET_IDS,
  DPS_MYTHIC_SET_IDS,
  MONSTER_SET_IDS,
  categorizeGear,
} from './gear-categorizer';
import {
  EXPECTED_TALENT_COUNT,
  TALENTS_PER_BAR,
  ULTIMATE_BAR_INDEX,
  type ParsedCharacterRanking,
} from './character-rankings-parser';
import { detectTalentInfo } from './talent-mapper';
import type { GearItem, TalentItem } from './esologs-client';

/**
 * Bumped when the extraction logic changes shape; stored per row.
 *
 * v2 added `setNames` and `abilityNames`. Bumping matters: the upsert only
 * rewrites a row when the parse improved, so without a version change an
 * existing row keeps its old signature forever and the new fields never appear.
 */
export const SIGNATURE_VERSION = 2;

export interface BuildSignatureV1 {
  v: typeof SIGNATURE_VERSION;
  sets: {
    /** Five-piece sets. Stored ascending so set1/set2 order never affects the hash. */
    fivePiece: number[];
    monster?: number;
    mythic?: number;
    arena?: number;
    /** Anything that didn't fit a named slot, ascending. */
    extra: number[];
  };
  /** Raw setID → piece count, ascending by setID. The escape hatch. */
  setCounts: Array<[number, number]>;
  /**
   * setID → display name, as ESO Logs reports it.
   *
   * Carried through so the UI can label sets our own SET_DISPLAY_NAMES table does
   * not know yet — which is routine, since top parses use sets newer than our
   * data. Without this the page renders "Set 775" at users.
   */
  setNames: Record<number, string>;
  /**
   * abilityId → display name, as ESO Logs reports it.
   *
   * Without this the skill-bar chips render raw numeric ids ("123704"), which is
   * useless to a player — and the bars are half the point of the feature. The
   * names only otherwise exist on the detail route, which the list view never
   * calls.
   */
  abilityNames: Record<number, string>;
  bars: {
    /** Ability IDs in slot order, ultimate last. */
    front: number[];
    back: number[];
    frontUltimate?: number;
    backUltimate?: number;
    /** True when the 12-talent invariant held and the split is trustworthy. */
    barOrderKnown: boolean;
  };
  /** Indices into CLASS_SKILL_LINES, from detectTalentInfo's top-3 heuristic. */
  skillLines?: { l1?: number; l2?: number; l3?: number };
  /** Support ultimate display name, when one was slotted. */
  ultimate?: string;
  /**
   * Werewolf builds produce no skillLines signal (the world skill line has no
   * CLASS_SKILL_LINES index), so the flag rides alongside it. Omitted entirely
   * for non-werewolf builds so existing signature hashes are unchanged.
   */
  werewolf?: boolean;
  esoClass?: string;
  spec?: string;
  /**
   * Build dimensions the source data does not carry. characterRankings returns no
   * race, champion points, mundus or food, so these are always present in v1 — the
   * UI greys them out rather than implying we know. Populated later by the R2
   * build-evidence enrichment pass.
   */
  missing: string[];
}

/** Dimensions characterRankings never returns. Confirmed by the probe. */
const ALWAYS_MISSING = ['race', 'cp', 'mundus', 'food'] as const;

// ─── Adapters ────────────────────────────────────────────────────────────────

/**
 * `categorizeGear` wants `GearItem` (numeric setID, optional setName). The parser
 * already coerced setID; the friendly set name comes from the entry's `sets` list,
 * which is the only place ESO Logs reports it.
 */
function toGearItems(entry: ParsedCharacterRanking, aliases: Map<number, number>): GearItem[] {
  const setNames = new Map<number, string>();
  entry.sets.forEach((set) => {
    if (set.name) setNames.set(set.setId, set.name);
  });

  return entry.gear.map((piece) => ({
    setID: aliases.get(piece.setId) ?? piece.setId,
    setName: setNames.get(piece.setId),
    slot: piece.slot,
    quality: piece.enchantQuality ?? 0,
    name: piece.name,
    icon: piece.icon,
    // No `type` is returned; categorizeGear does not read it, so 0 is safe.
    type: 0,
  }));
}

/**
 * Maps perfected set IDs onto their non-perfected base ID.
 *
 * ESO gives perfected and non-perfected versions of a trial set different IDs, and
 * players routinely mix them. Observed live: a build wearing 3x "Perfected Slivers
 * of the Null Arca" (772) plus 2x "Slivers of the Null Arca" (767) counted as
 * NEITHER a five-piece, because each ID was only seen 3 and 2 times. That silently
 * corrupts set1/set2 — the most heavily weighted clustering axis.
 *
 * Derived from the `sets` names in the payload rather than a hardcoded table, so
 * it keeps working for sets shipped after this code was written. Canonical ID is
 * the lowest in the group, which is the non-perfected original.
 */
function buildPerfectedAliasMap(entry: ParsedCharacterRanking): Map<number, number> {
  const groups = new Map<string, number[]>();

  for (const set of entry.sets) {
    if (!set.name) continue;
    const base = set.name
      .replace(/^perfected\s+/i, '')
      .trim()
      .toLowerCase();
    const ids = groups.get(base);
    if (ids) ids.push(set.setId);
    else groups.set(base, [set.setId]);
  }

  const aliases = new Map<number, number>();
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    const canonical = Math.min(...ids);
    for (const id of ids) {
      if (id !== canonical) aliases.set(id, canonical);
    }
  }
  return aliases;
}

/** `detectTalentInfo` keys on `guid`; characterRankings calls the same field `id`. */
function toTalentItems(entry: ParsedCharacterRanking): TalentItem[] {
  return entry.talents.map((talent) => ({
    guid: talent.abilityId,
    name: talent.name,
    type: 0,
    abilityIcon: talent.icon,
  }));
}

// ─── Extraction ──────────────────────────────────────────────────────────────

function countPieces(
  entry: ParsedCharacterRanking,
  aliases: Map<number, number>,
): Map<number, number> {
  const counts = new Map<number, number>();
  entry.gear.forEach((piece) => {
    if (!piece.setId) return;
    const setId = aliases.get(piece.setId) ?? piece.setId;
    counts.set(setId, (counts.get(setId) ?? 0) + 1);
  });
  return counts;
}

/**
 * Splits the 12 talents into two bars.
 *
 * The probe confirmed the array is always exactly 12 with no ordering field:
 * [0..5] front bar, [6..11] back bar, index 5 and 11 being the ultimates. When
 * that invariant does not hold we still return the abilities, but flag
 * `barOrderKnown: false` so the clustering can fall back to a bar-agnostic
 * comparison instead of inventing a split.
 */
function splitBars(entry: ParsedCharacterRanking): BuildSignatureV1['bars'] {
  const ids = entry.talents.map((t) => t.abilityId);
  const barOrderKnown = entry.talents.length === EXPECTED_TALENT_COUNT;

  if (!barOrderKnown) {
    return { front: ids, back: [], barOrderKnown: false };
  }

  const front = ids.slice(0, TALENTS_PER_BAR);
  const back = ids.slice(TALENTS_PER_BAR);

  return {
    front,
    back,
    frontUltimate: front[ULTIMATE_BAR_INDEX],
    backUltimate: back[ULTIMATE_BAR_INDEX],
    barOrderKnown: true,
  };
}

/**
 * Build the signature for one ranking entry.
 *
 * Returns null only when there is nothing to describe — callers should already
 * have filtered with `hasRealCombatantInfo`.
 */
export function extractBuildSignature(
  entry: ParsedCharacterRanking,
  onWarn?: (message: string) => void,
): BuildSignatureV1 | null {
  if (entry.gear.length === 0 && entry.talents.length === 0) return null;

  const aliases = buildPerfectedAliasMap(entry);
  const counts = countPieces(entry, aliases);
  const categorized = categorizeGear(toGearItems(entry, aliases), true);

  // Wart 1: mythics arrive folded into monsterSet, and categorizeGear stops after
  // assigning one — so a build wearing both a mythic and a monster set leaves the
  // monster set stranded in additionalSets. Split the mythic out, then recover the
  // real monster set. Without the second step the monster slot is empty for the
  // ~70% of top DPS parses that run a mythic.
  let monster = categorized.monsterSet;
  let mythic: number | undefined;
  const extra = [...categorized.additionalSets];

  if (monster !== undefined && DPS_MYTHIC_SET_IDS.has(monster)) {
    mythic = monster;
    monster = undefined;

    const recovered = extra.findIndex((setId) => MONSTER_SET_IDS.has(setId));
    if (recovered !== -1) {
      monster = extra[recovered];
      extra.splice(recovered, 1);
    }
  }

  // Wart 2: arenaWeapon is a display name. Recover the ID from the piece counts.
  let arena: number | undefined;
  if (categorized.arenaWeapon) {
    for (const setId of counts.keys()) {
      if (ARENA_WEAPON_SET_IDS.has(setId)) {
        arena = setId;
        break;
      }
    }
  }

  const fivePiece = [categorized.set1, categorized.set2]
    .filter((id): id is number => typeof id === 'number')
    .sort((a, b) => a - b);

  const slotted = new Set<number>([...fivePiece]);
  if (monster !== undefined) slotted.add(monster);
  if (mythic !== undefined) slotted.add(mythic);
  if (arena !== undefined) slotted.add(arena);

  // A 2+-piece set that landed in no known slot means the hardcoded ID tables in
  // gear-categorizer.ts have gone stale — surface it in the Worker logs so the
  // drift is visible after each patch instead of silently corrupting clusters.
  for (const [setId, count] of counts) {
    if (count >= 2 && !slotted.has(setId)) {
      onWarn?.(
        `Unclassified set ${setId} worn as ${count} pieces — gear-categorizer tables may be stale`,
      );
    }
  }

  const talentInfo = detectTalentInfo(toTalentItems(entry));

  return {
    v: SIGNATURE_VERSION,
    sets: {
      fivePiece,
      monster,
      mythic,
      arena,
      extra: extra.sort((a, b) => a - b),
    },
    setCounts: [...counts.entries()].sort((a, b) => a[0] - b[0]),
    setNames: Object.fromEntries(
      entry.sets
        .filter((set): set is { setId: number; name: string } => Boolean(set.name))
        // Map perfected variants onto the canonical id the signature actually uses.
        .map((set) => [aliases.get(set.setId) ?? set.setId, set.name]),
    ),
    abilityNames: Object.fromEntries(
      entry.talents
        .filter((talent): talent is typeof talent & { name: string } => Boolean(talent.name))
        .map((talent) => [talent.abilityId, talent.name]),
    ),
    bars: splitBars(entry),
    skillLines: talentInfo.sl
      ? {
          l1: typeof talentInfo.sl.l1 === 'number' ? talentInfo.sl.l1 : undefined,
          l2: typeof talentInfo.sl.l2 === 'number' ? talentInfo.sl.l2 : undefined,
          l3: typeof talentInfo.sl.l3 === 'number' ? talentInfo.sl.l3 : undefined,
        }
      : undefined,
    ultimate: talentInfo.ul,
    // JSON.stringify drops undefined keys, so non-werewolf signatures keep their
    // exact previous bytes — and their hashes.
    werewolf: talentInfo.werewolf === true ? true : undefined,
    esoClass: entry.esoClass,
    spec: entry.spec,
    missing: [...ALWAYS_MISSING],
  };
}

// ─── Canonical hash ──────────────────────────────────────────────────────────

const ascending = (values: number[] = []): number[] => [...values].sort((a, b) => a - b);

/**
 * Stable identity for a build, used to collapse duplicate meta setups before
 * clustering.
 *
 * Canonicalization rules, chosen deliberately:
 *  - The two 5-piece sets are sorted, so "Deadly + Ansuul" and "Ansuul + Deadly"
 *    collide. `categorizeGear` orders them by piece count, which is unstable when
 *    both are 5 pieces.
 *  - Abilities are sorted WITHIN a bar (slot order is cosmetic) but the bars are
 *    kept SEPARATE, because moving a skill front-to-back is a real build change.
 *  - When the bar split is untrusted, hash the flat ability set instead, so an
 *    unknown layout cannot masquerade as a specific one.
 */
export async function computeSignatureHash(signature: BuildSignatureV1): Promise<string> {
  const canonical = JSON.stringify([
    signature.v,
    signature.esoClass ?? '',
    signature.spec ?? '',
    ascending(signature.sets.fivePiece),
    signature.sets.monster ?? 0,
    signature.sets.mythic ?? 0,
    signature.sets.arena ?? 0,
    ascending(signature.sets.extra),
    signature.bars.barOrderKnown
      ? [ascending(signature.bars.front), ascending(signature.bars.back)]
      : ascending([...signature.bars.front, ...signature.bars.back]),
    signature.bars.barOrderKnown ? 1 : 0,
  ]);

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}
