/**
 * Types for the DPS-builds leaderboard API.
 *
 * Mirrors `DpsParsePublic` / `DpsEncounterSummary` in roster-hub-api/src/types.ts —
 * keep both in sync. Field names stay snake_case as the API serves them, matching
 * how the roster and build hub clients treat their rows.
 */

/** Build signature as extracted by the ingest. Mirrors BuildSignatureV1. */
export interface BuildSignature {
  v: number;
  sets: {
    /** Five-piece set IDs, ascending. */
    fivePiece: number[];
    monster?: number;
    mythic?: number;
    arena?: number;
    /** Sets that fit no named slot. */
    extra: number[];
  };
  /** Raw setID → piece count. The escape hatch when slotting is wrong. */
  setCounts: Array<[number, number]>;
  bars: {
    /** Ability IDs in slot order; the last entry of each bar is the ultimate. */
    front: number[];
    back: number[];
    frontUltimate?: number;
    backUltimate?: number;
    /** False when the 12-talent invariant didn't hold and the split is a guess. */
    barOrderKnown: boolean;
  };
  /** Indices into CLASS_SKILL_LINES. */
  skillLines?: { l1?: number; l2?: number; l3?: number };
  ultimate?: string;
  esoClass?: string;
  spec?: string;
  /**
   * Dimensions the source data does not carry. Always includes race, cp, mundus
   * and food today — `characterRankings` returns none of them. The UI must grey
   * these out rather than implying we know, and the distance function must skip
   * them rather than scoring "both absent" as a match.
   */
  missing: string[];
}

export interface DpsParse {
  /**
   * Addressable id for the detail route. Stable across re-ingests, so deep links
   * and the medoid → Build Editor handoff keep working.
   */
  parse_id: string;
  encounter_id: number;
  difficulty: number;
  zone_id: number;
  trial_id: string;
  encounter_name: string;
  hard_mode_level: number | null;
  partition: number;

  /** Character name, or 'Anonymous' when name storage is disabled server-side. */
  character_label: string;
  eso_class: string;
  spec_name: string;
  race: string | null;
  server_region: string | null;
  server_name: string | null;
  guild_name: string | null;

  report_code: string;
  fight_id: number;
  rank: number | null;
  amount: number;
  duration_ms: number | null;
  log_start_ms: number | null;
  log_date: string | null;
  bracket_data: number | null;

  set1_id: number | null;
  set2_id: number | null;
  monster_id: number | null;
  mythic_id: number | null;
  arena_set_id: number | null;
  mundus_id: number | null;
  food_ability_id: number | null;
  signature_hash: string;

  build: BuildSignature | null;
  /** Deep link back to the source log on esologs.com. */
  source_url: string;
}

export interface ListDpsParsesResponse {
  parses: DpsParse[];
  total: number;
  limit: number;
  offset: number;
}

export interface DpsEncounterSummary {
  encounter_id: number;
  difficulty: number;
  encounter_name: string;
  zone_id: number;
  trial_id: string;
  parse_count: number;
  top_amount: number;
  class_count: number;
  updated_at: string | null;
}

export interface ListDpsEncountersResponse {
  encounters: DpsEncounterSummary[];
}

/** Raw gear/talents for one parse — shaped for playerToBuild(). */
export interface DpsParseGearPiece {
  slot: number;
  itemId: number;
  setId: number;
  name?: string;
  icon?: string;
  trait?: number;
  cp?: number;
  enchantType?: number;
  enchantQuality?: number;
  quality?: string;
}

export interface DpsParseTalent {
  slot: number;
  abilityId: number;
  name?: string;
  icon?: string;
}

export interface DpsParseSetRef {
  setId: number;
  name?: string;
}

export interface DpsParseBuildResponse {
  parseId: string;
  playerName: string;
  combatant: {
    gear: DpsParseGearPiece[];
    talents: DpsParseTalent[];
    sets: DpsParseSetRef[];
  };
}
