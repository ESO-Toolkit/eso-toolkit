export interface HubBuild {
  id: string;
  author_id: string;
  author_name: string;
  is_anonymous: boolean;
  title: string;
  description: string;
  eso_class: string;
  role: string;
  game_mode: string;
  /** Compact encoded build — base64url(deflate(compact JSON)) */
  build_data: string;
  vote_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  user_voted?: boolean;
}

export interface HubBuildComment {
  id: string;
  build_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  replies: HubBuildComment[];
}

export interface ListBuildsOptions {
  esoClass?: string;
  role?: string;
  mode?: string;
  tag?: string;
  sort?: 'votes' | 'recent';
  page?: number;
}

export interface PublishBuildPayload {
  title: string;
  description?: string;
  eso_class: string;
  role: string;
  game_mode?: string;
  build_data: string;
  tags?: string[];
  is_anonymous?: boolean;
}

export type SortOrder = 'votes' | 'recent';

export interface BuildHubFilters {
  esoClass: string; // '' = all classes
  role: string; // '' = all roles
  tag: string; // '' = any tag
  sort: SortOrder;
  page: number;
  search: string; // client-side text filter
}

export const PRESET_BUILD_TAGS = ['beginner', 'meta', 'solo', 'pvp', 'fun'] as const;

export type PresetBuildTag = (typeof PRESET_BUILD_TAGS)[number];

export const BUILD_TAG_COLORS: Record<string, string> = {
  beginner: '#22c55e', // green
  meta: '#ef4444', // red
  solo: '#eab308', // gold
  pvp: '#a855f7', // purple
  fun: '#06b6d4', // cyan
};

export const CLASS_OPTIONS = [
  { value: '', label: 'All Classes' },
  { value: 'dragonknight', label: 'Dragonknight' },
  { value: 'sorcerer', label: 'Sorcerer' },
  { value: 'nightblade', label: 'Nightblade' },
  { value: 'templar', label: 'Templar' },
  { value: 'warden', label: 'Warden' },
  { value: 'necromancer', label: 'Necromancer' },
  { value: 'arcanist', label: 'Arcanist' },
] as const;

export const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'tank', label: 'Tank' },
  { value: 'healer', label: 'Healer' },
  { value: 'magicka-dps', label: 'Magicka DPS' },
  { value: 'stamina-dps', label: 'Stamina DPS' },
  { value: 'hybrid-dps', label: 'Hybrid DPS' },
] as const;

export const ROLE_ACCENT: Record<string, string> = {
  tank: '#06b6d4', // cyan
  healer: '#ec4899', // pink
  'magicka-dps': '#3b82f6', // blue
  'stamina-dps': '#22c55e', // green
  'hybrid-dps': '#eab308', // gold
};
