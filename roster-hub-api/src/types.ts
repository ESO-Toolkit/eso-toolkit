export interface Env {
  DB: D1Database;
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
