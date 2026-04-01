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
