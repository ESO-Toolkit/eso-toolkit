/**
 * Types for the Pack Hub marketplace feature.
 * Mirrors the D1 data model from roster-hub-api.
 */

export interface PackAddonEntry {
  esouiId: number;
  name: string;
  required?: boolean;
  note?: string;
}

export interface HubPack {
  id: string;
  author_id: string;
  author_name: string;
  is_anonymous: boolean;
  title: string;
  description: string;
  pack_type: string; // 'addon-pack' | 'build-pack' | 'roster-pack'
  addons: PackAddonEntry[]; // parsed from JSON
  vote_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  user_voted?: boolean; // only present when authenticated
}

export interface ListPacksResponse {
  packs: HubPack[];
  page: number;
  sort: 'votes' | 'recent';
}

export interface SinglePackResponse {
  pack: HubPack;
}

export interface VoteResponse {
  voted: boolean;
  voteCount: number;
}

export type SortOrder = 'votes' | 'recent';

export interface PackHubFilters {
  packType: string; // '' = all types
  tag: string; // '' = any tag
  sort: SortOrder;
  page: number;
  search: string; // client-side text filter
}

export interface PublishPackPayload {
  title: string;
  description?: string;
  pack_type?: string;
  addons: PackAddonEntry[];
  tags?: string[];
  is_anonymous?: boolean;
}

export const PACK_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'addon-pack', label: 'Addon Pack' },
  { value: 'build-pack', label: 'Build Pack' },
  { value: 'roster-pack', label: 'Roster Pack' },
] as const;

export const PACK_TYPE_LABELS: Record<string, string> = {
  'addon-pack': 'Addon Pack',
  'build-pack': 'Build Pack',
  'roster-pack': 'Roster Pack',
};

export const PACK_TYPE_ACCENT: Record<string, string> = {
  'addon-pack': '#c4a44a', // gold
  'build-pack': '#3b82f6', // blue
  'roster-pack': '#22c55e', // green
};

export const PRESET_PACK_TAGS = [
  'trial',
  'pvp',
  'beginner',
  'healer',
  'tank',
  'dps',
  'utility',
] as const;

export type PresetPackTag = (typeof PRESET_PACK_TAGS)[number];

export const PACK_TAG_COLORS: Record<string, string> = {
  trial: '#ef4444', // red
  pvp: '#f97316', // orange
  beginner: '#22c55e', // green
  healer: '#06b6d4', // cyan
  tank: '#8b5cf6', // violet
  dps: '#eab308', // yellow
  utility: '#94a3b8', // slate
};
