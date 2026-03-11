export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  ESOLOGS_JWKS_URL: string;
}

export interface RosterRow {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  description: string;
  trial_id: string;
  roster_data: string;
  vote_count: number;
  created_at: string;
  updated_at: string;
}

export interface RosterTagRow {
  roster_id: string;
  tag: string;
}

export interface RosterWithMeta extends RosterRow {
  tags: string[];
  user_voted?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
}
