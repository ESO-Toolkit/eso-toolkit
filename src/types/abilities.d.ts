export interface Ability {
  id: number;
  name?: string;
  icon?: string;
  // Add other fields as needed from the API
}

export type AbilitiesLookup = Record<string, Ability>;

