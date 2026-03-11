/**
 * Types for the Roster Hub marketplace feature.
 * Mirrors the D1 data model from roster-hub-api.
 */

export interface HubRoster {
  id: string;
  author_id: string;
  author_name: string;
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
  tag: string;   // '' = any tag
  sort: SortOrder;
  page: number;
}

export const PRESET_TAGS = [
  'beginner',
  'optimized',
  'score-push',
  'godslayer',
  'no-cp',
  'group-finder',
  'speed-run',
  'prog',
] as const;

export type PresetTag = (typeof PRESET_TAGS)[number];

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
