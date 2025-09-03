import abilitiesData from '../../data/abilities.json';

// Type for ability data from abilities.json
export interface AbilityData {
  id: number;
  name: string | null;
  icon: string;
  __typename?: string;
}

// Create a mapping of ability names to IDs and icons
class AbilityIdMapper {
  private nameToIdMap: Map<string, AbilityData>;
  private idToDataMap: Map<number, AbilityData>;

  constructor() {
    this.nameToIdMap = new Map();
    this.idToDataMap = new Map();
    this.buildMappings();
  }

  private buildMappings(): void {
    // Convert the abilities.json data into maps for quick lookups
    Object.values(abilitiesData as unknown as Record<string, AbilityData>).forEach((ability) => {
      if (ability.name && ability.id) {
        // Use lowercase for consistent lookups
        const normalizedName = this.normalizeAbilityName(ability.name);
        this.nameToIdMap.set(normalizedName, ability);
        this.idToDataMap.set(ability.id, ability);
      }
    });
  }

  private normalizeAbilityName(name: string): string {
    return name.toLowerCase().trim();
  }

  /**
   * Get ability data by name
   */
  getAbilityByName(name: string): AbilityData | null {
    const normalized = this.normalizeAbilityName(name);
    return this.nameToIdMap.get(normalized) || null;
  }

  /**
   * Get ability data by ID
   */
  getAbilityById(id: number): AbilityData | null {
    return this.idToDataMap.get(id) || null;
  }

  /**
   * Get ability ID by name
   */
  getAbilityId(name: string): number | null {
    const ability = this.getAbilityByName(name);
    return ability ? ability.id : null;
  }

  /**
   * Get ability icon URL by ID
   */
  getIconUrl(id: number): string | null {
    const ability = this.getAbilityById(id);
    if (ability?.icon && ability.icon !== 'icon_missing') {
      return `https://assets.rpglogs.com/img/eso/abilities/${ability.icon}.png`;
    }
    return null;
  }

  /**
   * Get ability icon URL by name
   */
  getIconUrlByName(name: string): string | null {
    const ability = this.getAbilityByName(name);
    if (ability?.icon && ability.icon !== 'icon_missing') {
      return `https://assets.rpglogs.com/img/eso/abilities/${ability.icon}.png`;
    }
    return null;
  }

  /**
   * Search for abilities by partial name match
   */
  searchAbilities(partialName: string, limit = 10): AbilityData[] {
    const searchTerm = this.normalizeAbilityName(partialName);
    const results: AbilityData[] = [];

    for (const [name, ability] of this.nameToIdMap.entries()) {
      if (name.includes(searchTerm) && results.length < limit) {
        results.push(ability);
      }
    }

    return results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
}

// Export singleton instance
export const abilityIdMapper = new AbilityIdMapper();
