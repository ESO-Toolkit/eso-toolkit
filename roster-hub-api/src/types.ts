export interface Env {
  DB: D1Database;
  /** Gzipped report build-evidence sidecars, keyed by ESO Logs report code. */
  REPORT_BUILD_EVIDENCE?: R2Bucket;
  AI: Ai;
  ALLOWED_ORIGINS: string;
  IMGBB_API_KEY: string;
  /** ESO Logs OAuth client ID — set via `wrangler secret put ESOLOGS_CLIENT_ID` */
  ESOLOGS_CLIENT_ID: string;
  /** ESO Logs OAuth client secret — set via `wrangler secret put ESOLOGS_CLIENT_SECRET` */
  ESOLOGS_CLIENT_SECRET: string;
  /** Discord bot Worker URL for roster sync webhooks (optional) */
  DISCORD_BOT_URL?: string;
  /** Shared secret for authenticating webhook calls to the discord bot */
  DISCORD_WEBHOOK_SECRET?: string;
  /** Internal API key for admin endpoints — set via `wrangler secret put INTERNAL_API_KEY` */
  INTERNAL_API_KEY?: string;
}

// ─── Addon recommendation types (shared between rosters & packs) ─────────────
// NOTE: Mirrored in src/features/roster-hub/types/roster-hub.types.ts (frontend).
// Keep both definitions in sync until a shared types package is introduced.

export interface RecommendedAddonEntry {
  esouiId: number;
  name: string;
  required?: boolean;
  note?: string;
}

export interface RecommendedAddons {
  packId?: string;
  packTitle?: string;
  addons: RecommendedAddonEntry[];
}

// ─── ROSTERS ─────────────────────────────────────────────────────────

export interface RosterRow {
  id: string;
  author_id: string;
  author_name: string;
  is_anonymous: number; // SQLite boolean: 0 = false, 1 = true
  title: string;
  description: string;
  trial_id: string;
  roster_data: string;
  recommended_addons: string | null; // JSON: { packId?, addons[] }
  vote_count: number;
  created_at: string;
  updated_at: string;
}

export interface RosterTagRow {
  roster_id: string;
  tag: string;
}

export interface RosterTrialRow {
  roster_id: string;
  trial_id: string;
}

export interface RosterWithMeta extends Omit<RosterRow, 'is_anonymous'> {
  is_anonymous: boolean;
  tags: string[];
  /** All trials this roster is tagged with (primary trial_id is trial_ids[0]). */
  trial_ids: string[];
  user_voted?: boolean;
  recommended_addons: string | null;
}

export interface CommentRow {
  id: string;
  roster_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface CommentWithReplies extends CommentRow {
  replies: CommentRow[];
}

export interface AuthUser {
  id: string;
  name: string;
}

// ─── Build Hub types ──────────────────────────────────────────────────────────

export interface BuildRow {
  id: string;
  author_id: string;
  author_name: string;
  is_anonymous: number; // SQLite boolean: 0 = false, 1 = true
  title: string;
  description: string;
  eso_class: string;
  role: string;
  game_mode: string;
  build_data: string;
  visibility: string;
  vote_count: number;
  created_at: string;
  updated_at: string;
}

export interface BuildTagRow {
  build_id: string;
  tag: string;
}

export interface BuildWithMeta extends Omit<BuildRow, 'is_anonymous'> {
  is_anonymous: boolean;
  tags: string[];
  user_voted?: boolean;
}

export interface BuildCommentRow {
  id: string;
  build_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface BuildCommentWithReplies extends BuildCommentRow {
  replies: BuildCommentRow[];
}

// ─── Temp builds (guest, expiring) ───────────────────────────────────────────

export interface TempBuildRow {
  id: string;
  build_data: string;
  created_at: string;
  expires_at: string;
}

// ─── Image upload types ───────────────────────────────────────────────────────

export interface ImageUploadRow {
  id: string;
  uploader_id: string;
  uploader_name: string;
  url: string;
  thumb_url: string;
  delete_url: string;
  created_at: string;
}

export interface ImageReportRow {
  id: string;
  image_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
}

// ─── User profiles ─────────────────────────────────────────────────────────

export interface UserProfileRow {
  author_id: string;
  author_name: string;
  bio: string;
  avatar_url: string | null;
  avatar_thumb_url: string | null;
  avatar_delete_url: string | null;
  avatar_uploaded_at: string | null;
  na_display_name: string | null;
  eu_display_name: string | null;
  updated_at: string;
}

/** Lightweight build summary — no build_data blob returned in profile responses */
export interface BuildSummary {
  id: string;
  title: string;
  description: string;
  eso_class: string;
  role: string;
  game_mode: string;
  vote_count: number;
  tags: string[];
  created_at: string;
}

/** Lightweight roster summary — no roster_data blob returned in profile responses */
export interface RosterSummary {
  id: string;
  title: string;
  description: string;
  trial_id: string;
  vote_count: number;
  tags: string[];
  created_at: string;
}

// ─── Pack Hub types ──────────────────────────────────────────────────────────

export interface PackRow {
  id: string;
  author_id: string;
  author_name: string;
  is_anonymous: number; // SQLite boolean: 0 = false, 1 = true
  title: string;
  description: string;
  pack_type: string;
  addons: string; // JSON array
  vote_count: number;
  created_at: string;
  updated_at: string;
}

export interface PackTagRow {
  pack_id: string;
  tag: string;
}

export interface PackWithMeta extends Omit<PackRow, 'is_anonymous'> {
  is_anonymous: boolean;
  tags: string[];
  user_voted?: boolean;
}

export interface UserProfileResponse {
  username: string;
  bio: string;
  avatar_url: string | null;
  avatar_thumb_url: string | null;
  build_count: number;
  roster_count: number;
  builds: BuildSummary[];
  rosters: RosterSummary[];
  /**
   * The user's ESO Logs numeric user ID (as a string), used to fetch the
   * reports they have uploaded. Equal to `author_id`, which the auth layer
   * derives from the ESO Logs `currentUser.id`. Null if it cannot be
   * resolved (e.g. a profile with no content and no profile row).
   */
  eso_logs_user_id: string | null;
  /** ESO Logs NA-server account display name, if the user linked one. */
  na_display_name: string | null;
  /** ESO Logs EU-server account display name, if the user linked one. */
  eu_display_name: string | null;
}

// ─── DPS parses (top individual parses ingested from ESO Logs) ───────────────

/** Row shape of the `dps_parses` table. Mirrors migration-dps-parses.sql. */
export interface DpsParseRow {
  encounter_id: number;
  difficulty: number;
  zone_id: number;
  trial_id: string;
  encounter_name: string;
  hard_mode_level: number | null;
  partition: number;

  character_key: string;
  character_name: string | null;
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

  build_json: string;
  combatant_json: string | null;

  signature_version: number;
  evidence_enriched: number;
  ingested_at: string;
  updated_at: string;
}

/**
 * A parse as served by the read API.
 *
 * `build_json` is parsed server-side (unlike rosters/builds, which hand the client
 * a raw string): there is exactly one consumer, the response is edge-cached, and
 * doing 200 client-side JSON.parse calls on the render path of a page that then
 * runs clustering is the wrong trade. `combatant_json` is deliberately absent —
 * it is large and only the detail route serves it.
 */
export interface DpsParsePublic extends Omit<
  DpsParseRow,
  | 'build_json'
  | 'combatant_json'
  | 'character_key'
  | 'character_name'
  | 'signature_version'
  | 'evidence_enriched'
> {
  build: unknown;
  /**
   * Addressable id for the detail route: `encounterId-difficulty-characterKey`.
   * Stable across re-ingests, so client deep links do not rot nightly.
   */
  parse_id: string;
  /** Character name, or 'Anonymous' when name storage is disabled. */
  character_label: string;
  /** Attribution back to the source log. Required, not optional. */
  source_url: string;
}

/** Picker feed for the encounter selector. */
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

/** Row shape of the `dps_parse_sync_state` cron cursor. */
export interface DpsParseSyncStateRow {
  encounter_id: number;
  difficulty: number;
  encounter_name: string;
  zone_id: number;
  last_page: number;
  last_partition: number | null;
  last_synced_at: string | null;
  last_status: string;
  last_error: string;
  rows_ingested: number;
  empty_streak: number;
}
