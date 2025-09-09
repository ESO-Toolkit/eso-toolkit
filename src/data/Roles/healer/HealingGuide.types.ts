// types/HealingGuide.types.ts

export interface GearSet {
  abbreviation?: string;
  full_name: string;
  type: 'slayer' | 'buff' | 'monster' | 'debuff' | 'other' | 'arena_weapon';
  aliases?: string[];
  description?: string;
  slot_preference?: string;
}

export interface GearCategory {
  description: string;
  sets: GearSet[];
}

export interface BuildSetup {
  setup_id: string;
  description: string;
  components: string[];
}

export interface ExampleBuild {
  build_name: string;
  gear_distribution: Record<string, string>;
}

export interface BuildStrategies {
  general_philosophies: string[];
  common_setups: BuildSetup[];
  example_builds: ExampleBuild[];
}

export interface ContentTopic {
  key: string;
  title: string;
  description: string;
}

export interface HealingGuideMetadata {
  title: string;
  author: string;
  content_type: string;
  format_version: string;
  extraction_date: string;
  source: string;
}

export interface HealingGuideData {
  metadata: HealingGuideMetadata;
  content_outline: string[];
  gear_sets: {
    categories: {
      slayer_sets: GearCategory;
      buff_sets: GearCategory;
      monster_sets: GearCategory;
      debuff_sets: GearCategory;
      other_sets: GearCategory;
    };
    activation_types: Record<string, string>;
  };
  build_strategies: BuildStrategies;
  content_topics: Record<string, string>;
  implementation_notes: Record<string, string>;
}

// Utility types for searching and filtering
export type GearSetType = 'slayer' | 'buff' | 'monster' | 'debuff' | 'other' | 'arena_weapon';
export type GearSetCategory =
  | 'slayer_sets'
  | 'buff_sets'
  | 'monster_sets'
  | 'debuff_sets'
  | 'other_sets';

export interface SearchableGearSet extends GearSet {
  category: GearSetCategory;
  searchTerms: string[];
}
