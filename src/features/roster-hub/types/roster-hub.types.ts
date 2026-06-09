/**
 * Types for the Roster Hub marketplace feature.
 * Mirrors the D1 data model from roster-hub-api.
 */

// NOTE: Mirrored in roster-hub-api/src/types.ts (API worker).
// Keep both definitions in sync until a shared types package is introduced.

/** A single addon recommendation entry. */
export interface RecommendedAddonEntry {
  esouiId: number;
  name: string;
  required?: boolean;
  note?: string;
}

/** Addon recommendations attached to a published roster. */
export interface RecommendedAddons {
  packId?: string;
  packTitle?: string;
  addons: RecommendedAddonEntry[];
}

export interface HubRoster {
  id: string;
  author_id: string;
  author_name: string;
  is_anonymous: boolean;
  title: string;
  description: string;
  trial_id: string;
  /** All trials this roster is tagged with (primary trial_id is trial_ids[0]). */
  trial_ids?: string[];
  roster_data: string; // compact encoded roster (same as ?r= URL param)
  recommended_addons: RecommendedAddons | null;
  vote_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  user_voted?: boolean; // only present when authenticated
}

export interface ListRostersResponse {
  rosters: HubRoster[];
  page: number;
  sort: 'votes' | 'recent';
}

export interface SingleRosterResponse {
  roster: HubRoster;
}

export interface VoteResponse {
  voted: boolean;
  voteCount: number;
}

export type SortOrder = 'votes' | 'recent';

export interface RosterHubFilters {
  trial: string; // '' = all trials
  tag: string; // '' = any tag
  sort: SortOrder;
  page: number;
  search: string; // '' = no text filter (client-side)
}

export const PRESET_TAGS = ['beginner', 'score-push', 'farm', '#1'] as const;

export type PresetTag = (typeof PRESET_TAGS)[number];

// Accent colors for preset tag chips — consistent across filter bar, cards, and publish dialog
export const TAG_COLORS: Record<string, string> = {
  beginner: '#22c55e', // green
  'score-push': '#ef4444', // red
  farm: '#14b8a6', // teal
  '#1': '#eab308', // gold
  // Legacy colors for existing data
  normal: '#22c55e',
  vet: '#f97316',
  hm: '#ef4444',
  trainer: '#60a5fa',
};

// ─── Comments ──────────────────────────────────────────────────────────────

export interface HubComment {
  id: string;
  roster_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  replies: HubComment[];
}

export interface ListCommentsResponse {
  comments: HubComment[];
}

export interface SingleCommentResponse {
  comment: HubComment;
}

// ─── Public profiles ──────────────────────────────────────────────────────────

export interface ProfileBuildSummary {
  id: string;
  title: string;
  description: string;
  eso_class: string;
  role: string;
  game_mode: string;
  vote_count: number;
  tags: string[];
  created_at: string;
  updated_at?: string;
}

export interface ProfileRosterSummary {
  id: string;
  title: string;
  description: string;
  trial_id: string;
  vote_count: number;
  tags: string[];
  created_at: string;
}

export interface UserProfile {
  username: string;
  bio: string;
  avatar_url: string | null;
  avatar_thumb_url: string | null;
  build_count: number;
  roster_count: number;
  builds: ProfileBuildSummary[];
  rosters: ProfileRosterSummary[];
  /**
   * The user's ESO Logs numeric user ID (as a string, == author_id), used to
   * fetch the public reports they have uploaded. Null when it cannot be
   * resolved. Optional so older API responses (pre-feature) still type-check.
   */
  eso_logs_user_id?: string | null;
  /** ESO Logs NA-server account display name, if linked. */
  na_display_name?: string | null;
  /** ESO Logs EU-server account display name, if linked. */
  eu_display_name?: string | null;
}

export interface UserProfileResponse {
  profile: UserProfile;
}
