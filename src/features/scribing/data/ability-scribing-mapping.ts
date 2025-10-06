/**
 * Comprehensive Ability ID to Scribing Component Mapping
 * 
 * This module provides reverse lookup mappings for ESO scribing components
 * based on ability IDs found in combat logs.
 */

export interface AbilityScribingMapping {
  abilityId: number;
  type: 'grimoire' | 'transformation' | 'signature' | 'affix';
  grimoireKey: string;
  componentKey: string;
  name: string;
  category?: string;
  description?: string;
}

export interface ScribingComponentLookup {
  grimoires: Map<number, AbilityScribingMapping>;
  transformations: Map<number, AbilityScribingMapping>;
  signatures: Map<number, AbilityScribingMapping>;
  affixes: Map<number, AbilityScribingMapping>;
  all: Map<number, AbilityScribingMapping[]>;
}

/**
 * Class to build and maintain comprehensive scribing component mappings
 */
export class AbilityScribingMapper {
  private scribingData: any = null;
  private lookup: ScribingComponentLookup = {
    grimoires: new Map(),
    transformations: new Map(),
    signatures: new Map(),
    affixes: new Map(),
    all: new Map(),
  };

  constructor() {
    // Constructor now does minimal setup
    // Actual initialization happens via static factory method
  }

  /**
   * Create and initialize an AbilityScribingMapper instance
   */
  static async create(): Promise<AbilityScribingMapper> {
    const mapper = new AbilityScribingMapper();
    await mapper.initializeMapper();
    return mapper;
  }

  /**
   * Initialize the mapper with scribing database
   */
  private async initializeMapper(): Promise<void> {
    try {
      // Check if running in Node.js environment
      if (typeof window === 'undefined') {
        // Node.js environment - use fs to read file
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'data', 'scribing-complete.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        this.scribingData = JSON.parse(fileContent);
      } else {
        // Browser environment - use fetch
        const response = await fetch('/data/scribing-complete.json');
        this.scribingData = await response.json();
      }
      this.buildMappings();
    } catch (error) {
      console.error('Failed to initialize ability scribing mapper:', error);
      throw new Error('Ability scribing mapper initialization failed');
    }
  }

  /**
   * Build all ability ID mappings from scribing data
   */
  private buildMappings(): void {
    if (!this.scribingData) return;

    this.buildGrimoireMappings();
    this.buildTransformationMappings();
    this.buildSignatureMappings();
    this.buildAffixMappings();
    this.buildCombinedMappings();
  }

  /**
   * Build mappings for base grimoire ability IDs
   */
  private buildGrimoireMappings(): void {
    if (!this.scribingData.grimoires) return;

    Object.entries(this.scribingData.grimoires).forEach(([grimoireKey, grimoire]: [string, any]) => {
      const mapping: AbilityScribingMapping = {
        abilityId: grimoire.id,
        type: 'grimoire',
        grimoireKey,
        componentKey: grimoireKey,
        name: grimoire.name,
        category: 'grimoire',
        description: `Base ability for ${grimoire.name} grimoire`,
      };

      this.lookup.grimoires.set(grimoire.id, mapping);
    });
  }

  /**
   * Build mappings for name transformation ability IDs (focus scripts)
   */
  private buildTransformationMappings(): void {
    if (!this.scribingData.grimoires) return;

    Object.entries(this.scribingData.grimoires).forEach(([grimoireKey, grimoire]: [string, any]) => {
      if (grimoire.nameTransformations) {
        Object.entries(grimoire.nameTransformations).forEach(([transformKey, transformation]: [string, any]) => {
          if (transformation.abilityIds && Array.isArray(transformation.abilityIds)) {
            transformation.abilityIds.forEach((abilityId: number) => {
              const mapping: AbilityScribingMapping = {
                abilityId,
                type: 'transformation',
                grimoireKey,
                componentKey: transformKey,
                name: transformation.name,
                category: 'focus-script',
                description: `${transformation.name} (${grimoireKey} with ${transformKey} focus)`,
              };

              this.lookup.transformations.set(abilityId, mapping);
            });
          }
        });
      }
    });
  }

  /**
   * Build mappings for signature script ability IDs
   */
  private buildSignatureMappings(): void {
    if (!this.scribingData.signatureScripts) return;

    Object.entries(this.scribingData.signatureScripts).forEach(([signatureKey, signature]: [string, any]) => {
      if (signature.abilityIds && Array.isArray(signature.abilityIds)) {
        signature.abilityIds.forEach((abilityId: number) => {
          // Find compatible grimoires for this signature
          const compatibleGrimoires = signature.compatibleGrimoires || [];
          
          compatibleGrimoires.forEach((grimoireKey: string) => {
            const mapping: AbilityScribingMapping = {
              abilityId,
              type: 'signature',
              grimoireKey,
              componentKey: signatureKey,
              name: signature.name,
              category: 'signature-script',
              description: signature.description || `${signature.name} signature script effect`,
            };

            this.lookup.signatures.set(abilityId, mapping);
          });
        });
      }
    });
  }

  /**
   * Build mappings for affix script ability IDs
   * Note: Affix scripts typically don't have direct ability IDs in logs,
   * but may have associated buff/debuff IDs
   */
  private buildAffixMappings(): void {
    if (!this.scribingData.affixScripts) return;

    Object.entries(this.scribingData.affixScripts).forEach(([affixKey, affix]: [string, any]) => {
      // Affix scripts typically manifest as buffs/debuffs rather than direct ability casts
      // We'll map known affix-related ability IDs if they exist
      if (affix.abilityIds && Array.isArray(affix.abilityIds)) {
        affix.abilityIds.forEach((abilityId: number) => {
          const compatibleGrimoires = affix.compatibleGrimoires || [];
          
          compatibleGrimoires.forEach((grimoireKey: string) => {
            const mapping: AbilityScribingMapping = {
              abilityId,
              type: 'affix',
              grimoireKey,
              componentKey: affixKey,
              name: affix.name,
              category: 'affix-script',
              description: affix.description || `${affix.name} affix script effect`,
            };

            this.lookup.affixes.set(abilityId, mapping);
          });
        });
      }
    });
  }

  /**
   * Build combined mapping for quick lookup
   */
  private buildCombinedMappings(): void {
    // Combine all mappings into a single lookup table
    [...this.lookup.grimoires.entries(),
     ...this.lookup.transformations.entries(),
     ...this.lookup.signatures.entries(),
     ...this.lookup.affixes.entries(),
    ].forEach(([abilityId, mapping]) => {
      if (!this.lookup.all.has(abilityId)) {
        this.lookup.all.set(abilityId, []);
      }
      this.lookup.all.get(abilityId)?.push(mapping);
    });
  }

  /**
   * Get scribing component by ability ID
   */
  public getScribingComponent(abilityId: number): AbilityScribingMapping[] {
    return this.lookup.all.get(abilityId) || [];
  }

  /**
   * Get grimoire by ability ID
   */
  public getGrimoireByAbilityId(abilityId: number): AbilityScribingMapping | null {
    return this.lookup.grimoires.get(abilityId) || null;
  }

  /**
   * Get transformation (focus script result) by ability ID
   */
  public getTransformationByAbilityId(abilityId: number): AbilityScribingMapping | null {
    return this.lookup.transformations.get(abilityId) || null;
  }

  /**
   * Get signature script by ability ID
   */
  public getSignatureByAbilityId(abilityId: number): AbilityScribingMapping | null {
    return this.lookup.signatures.get(abilityId) || null;
  }

  /**
   * Get affix script by ability ID
   */
  public getAffixByAbilityId(abilityId: number): AbilityScribingMapping | null {
    return this.lookup.affixes.get(abilityId) || null;
  }

  /**
   * Check if ability ID is related to scribing
   */
  public isScribingAbility(abilityId: number): boolean {
    return this.lookup.all.has(abilityId);
  }

  /**
   * Get all ability IDs for a specific grimoire
   */
  public getAbilityIdsForGrimoire(grimoireKey: string): number[] {
    const abilityIds: number[] = [];
    
    // Add base grimoire ID
    for (const [abilityId, mapping] of this.lookup.grimoires.entries()) {
      if (mapping.grimoireKey === grimoireKey) {
        abilityIds.push(abilityId);
      }
    }
    
    // Add transformation IDs
    for (const [abilityId, mapping] of this.lookup.transformations.entries()) {
      if (mapping.grimoireKey === grimoireKey) {
        abilityIds.push(abilityId);
      }
    }
    
    // Add signature IDs
    for (const [abilityId, mapping] of this.lookup.signatures.entries()) {
      if (mapping.grimoireKey === grimoireKey) {
        abilityIds.push(abilityId);
      }
    }
    
    // Add affix IDs
    for (const [abilityId, mapping] of this.lookup.affixes.entries()) {
      if (mapping.grimoireKey === grimoireKey) {
        abilityIds.push(abilityId);
      }
    }
    
    return [...new Set(abilityIds)]; // Remove duplicates
  }

  /**
   * Get focus script type from grimoire and ability ID
   */
  public getFocusScriptType(grimoireKey: string, abilityId: number): string | null {
    const transformation = this.lookup.transformations.get(abilityId);
    if (transformation && transformation.grimoireKey === grimoireKey) {
      return transformation.componentKey;
    }
    return null;
  }

  /**
   * Export mapping data as JSON for external use
   */
  public exportMappings(): any {
    return {
      stats: {
        totalGrimoires: this.lookup.grimoires.size,
        totalTransformations: this.lookup.transformations.size,
        totalSignatures: this.lookup.signatures.size,
        totalAffixes: this.lookup.affixes.size,
        totalMappings: this.lookup.all.size,
      },
      grimoires: Object.fromEntries(this.lookup.grimoires.entries()),
      transformations: Object.fromEntries(this.lookup.transformations.entries()),
      signatures: Object.fromEntries(this.lookup.signatures.entries()),
      affixes: Object.fromEntries(this.lookup.affixes.entries()),
    };
  }

  /**
   * Get mapping statistics
   */
  public getStats() {
    return {
      totalGrimoires: this.lookup.grimoires.size,
      totalTransformations: this.lookup.transformations.size,
      totalSignatures: this.lookup.signatures.size,
      totalAffixes: this.lookup.affixes.size,
      totalMappings: this.lookup.all.size,
      databaseVersion: this.scribingData?.version || 'unknown',
      lastUpdated: this.scribingData?.lastUpdated || 'unknown',
    };
  }

  /**
   * Check if mapper is ready for use
   */
  public isReady(): boolean {
    return this.scribingData !== null && this.lookup.all.size > 0;
  }
}

/**
 * Singleton instance for global access
 * Note: For Node.js usage, prefer AbilityScribingMapper.create() to ensure proper initialization
 */
let _mapperInstance: AbilityScribingMapper | null = null;
let _initializationPromise: Promise<AbilityScribingMapper> | null = null;

export async function getAbilityScribingMapper(): Promise<AbilityScribingMapper> {
  if (!_mapperInstance) {
    if (!_initializationPromise) {
      _initializationPromise = AbilityScribingMapper.create();
    }
    _mapperInstance = await _initializationPromise;
  }
  return _mapperInstance;
}

/**
 * Lazy-initialized singleton for backward compatibility
 * This ensures the mapper is properly initialized before use
 */
class LazyAbilityScribingMapper {
  private _mapper: AbilityScribingMapper | null = null;
  private _initPromise: Promise<AbilityScribingMapper> | null = null;

  private async ensureInitialized(): Promise<AbilityScribingMapper> {
    if (!this._mapper) {
      if (!this._initPromise) {
        this._initPromise = getAbilityScribingMapper();
      }
      this._mapper = await this._initPromise;
    }
    return this._mapper;
  }

  async getScribingComponent(abilityId: number) {
    const mapper = await this.ensureInitialized();
    return mapper.getScribingComponent(abilityId);
  }

  async getGrimoireByAbilityId(abilityId: number) {
    const mapper = await this.ensureInitialized();
    return mapper.getGrimoireByAbilityId(abilityId);
  }

  async getTransformationByAbilityId(abilityId: number) {
    const mapper = await this.ensureInitialized();
    return mapper.getTransformationByAbilityId(abilityId);
  }

  async getSignatureByAbilityId(abilityId: number) {
    const mapper = await this.ensureInitialized();
    return mapper.getSignatureByAbilityId(abilityId);
  }

  async getAffixByAbilityId(abilityId: number) {
    const mapper = await this.ensureInitialized();
    return mapper.getAffixByAbilityId(abilityId);
  }

  async isReady(): Promise<boolean> {
    const mapper = await this.ensureInitialized();
    return mapper.isReady();
  }

  async getStats() {
    const mapper = await this.ensureInitialized();
    return mapper.getStats();
  }

  async getAbilityIdsForGrimoire(grimoireKey: string): Promise<number[]> {
    const mapper = await this.ensureInitialized();
    return mapper.getAbilityIdsForGrimoire(grimoireKey);
  }

  async getFocusScriptType(grimoireKey: string, abilityId: number): Promise<string | null> {
    const mapper = await this.ensureInitialized();
    return mapper.getFocusScriptType(grimoireKey, abilityId);
  }
}

// Keep backward compatibility for browser usage with lazy initialization
export const abilityScribingMapper = new LazyAbilityScribingMapper();

export default AbilityScribingMapper;