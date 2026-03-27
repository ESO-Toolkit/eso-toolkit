/**
 * Types for the Roster Hub marketplace feature.
 * Mirrors the D1 data model from roster-hub-api.
 */

export interface HubRoster {
  id: string;
  author_id: string;
  author_name: string;
  is_anonymous: boolean;
  title: string;
  description: string;
  trial_id: string;
  roster_data: string; // compact encoded roster (same as ?r= URL param)
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

export const PRESET_TAGS = ['beginner', 'score-push', 'fun', '#1'] as const;

export type PresetTag = (typeof PRESET_TAGS)[number];

// Accent colors for preset tag chips — consistent across filter bar, cards, and publish dialog
export const TAG_COLORS: Record<string, string> = {
  beginner: '#22c55e', // green
  'score-push': '#ef4444', // red
  '#1': '#eab308', // gold
  fun: '#a855f7', // purple
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
  build_count: number;
  roster_count: number;
  builds: ProfileBuildSummary[];
  rosters: ProfileRosterSummary[];
}

export interface UserProfileResponse {
  profile: UserProfile;
}
