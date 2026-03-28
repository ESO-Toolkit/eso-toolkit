export interface Env {
  DB: D1Database;
  AI: Ai;
  ALLOWED_ORIGINS: string;
  IMGBB_API_KEY: string;
  /** ESO Logs OAuth client ID — set via `wrangler secret put ESOLOGS_CLIENT_ID` */
  ESOLOGS_CLIENT_ID: string;
  /** ESO Logs OAuth client secret — set via `wrangler secret put ESOLOGS_CLIENT_SECRET` */
  ESOLOGS_CLIENT_SECRET: string;
  /** Discord bot token — used to post rosters and check guild membership */
  DISCORD_BOT_TOKEN?: string;
  /** Discord OAuth2 client ID — for user "Link Discord" flow */
  DISCORD_CLIENT_ID?: string;
  /** Discord OAuth2 client secret — for user "Link Discord" flow */
  DISCORD_CLIENT_SECRET?: string;
  /** Shared secret for bot → API internal calls */
  INTERNAL_API_KEY?: string;
}

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

export interface RosterWithMeta extends Omit<RosterRow, 'is_anonymous'> {
  is_anonymous: boolean;
  tags: string[];
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
  discord_id: string | null;
  discord_username: string | null;
  discord_avatar: string | null;
  discord_linked_at: string | null;
  updated_at: string;
}

// ─── Discord integration types ──────────────────────────────────────────────

export interface GuildConfigRow {
  guild_id: string;
  guild_name: string;
  guild_icon: string | null;
  roster_channel_id: string;
  allowed_role_ids: string; // JSON array
  configured_by: string;
  created_at: string;
  updated_at: string;
}

export interface GuildConfigPublic {
  guild_id: string;
  guild_name: string;
  guild_icon: string | null;
  roster_channel_id: string;
  allowed_role_ids: string[];
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

export interface UserProfileResponse {
  username: string;
  bio: string;
  build_count: number;
  roster_count: number;
  builds: BuildSummary[];
  rosters: RosterSummary[];
}

// ─── Pack Hub types ───────────────────────────────────────────────────────────

export interface PackRow {
  id: string;
  author_id: string;
  author_name: string;
  is_anonymous: number; // SQLite boolean: 0 = false, 1 = true
  title: string;
  description: string;
  pack_type: string;
  addons: string; // JSON array of addon entries
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
