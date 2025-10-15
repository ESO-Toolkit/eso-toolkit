/**
 * Core service for mapping ability IDs to scribing components
 * Migrated and improved from the original AbilityScribingMapper
 */

import { ScribingData, AbilityScribingMapping, ScribingComponentLookup } from '../../shared/types';
import { IScribingDataRepository } from '../repositories/IScribingDataRepository';

export interface IAbilityMappingService {
  /**
   * Initialize the service with data
   */
  initialize(): Promise<void>;

  /**
   * Check if the service is ready for use
   */
  isReady(): boolean;

  /**
   * Get scribing component(s) by ability ID
   */
  getScribingComponent(abilityId: number): AbilityScribingMapping[];

  /**
   * Get grimoire by ability ID
   */
  getGrimoireByAbilityId(abilityId: number): AbilityScribingMapping | null;

  /**
   * Get transformation (focus script result) by ability ID
   */
  getTransformationByAbilityId(abilityId: number): AbilityScribingMapping | null;

  /**
   * Get signature script by ability ID
   */
  getSignatureByAbilityId(abilityId: number): AbilityScribingMapping | null;

  /**
   * Get affix script by ability ID
   */
  getAffixByAbilityId(abilityId: number): AbilityScribingMapping | null;

  /**
   * Check if ability ID is related to scribing
   */
  isScribingAbility(abilityId: number): boolean;

  /**
   * Get all ability IDs for a specific grimoire
   */
  getAbilityIdsForGrimoire(grimoireKey: string): number[];

  /**
   * Get mapping statistics
   */
  getStats(): {
    totalGrimoires: number;
    totalTransformations: number;
    totalSignatures: number;
    totalAffixes: number;
    totalMappings: number;
  };
}

export class AbilityMappingService implements IAbilityMappingService {
  private scribingData: ScribingData | null = null;
  private lookup: ScribingComponentLookup = {
    grimoires: new Map(),
    transformations: new Map(),
    signatures: new Map(),
    affixes: new Map(),
    all: new Map(),
  };

  constructor(private repository: IScribingDataRepository) {}

  async initialize(): Promise<void> {
    this.scribingData = await this.repository.loadScribingData();
    this.buildMappings();
  }

  isReady(): boolean {
    return this.scribingData !== null && this.lookup.all.size > 0;
  }

  private buildMappings(): void {
    if (!this.scribingData) {
      throw new Error('Scribing data not loaded');
    }

    // Clear existing mappings
    this.lookup.grimoires.clear();
    this.lookup.transformations.clear();
    this.lookup.signatures.clear();
    this.lookup.affixes.clear();
    this.lookup.all.clear();

    // Build grimoire mappings
    this.buildGrimoireMappings();

    // Build transformation mappings (from grimoire nameTransformations)
    this.buildTransformationMappings();

    // Build signature script mappings
    this.buildSignatureScriptMappings();

    // Build affix script mappings
    this.buildAffixScriptMappings();

    // Build consolidated lookup
    this.buildConsolidatedLookup();
  }

  private buildGrimoireMappings(): void {
    if (!this.scribingData?.grimoires) return;

    for (const [grimoireKey, grimoire] of Object.entries(this.scribingData.grimoires)) {
      // Map grimoire base ability ID
      const id = (grimoire as unknown as { id?: number }).id;
      const name = grimoire.name;

      if (typeof id === 'number' && typeof name === 'string') {
        const mapping: AbilityScribingMapping = {
          abilityId: id,
          type: 'grimoire',
          grimoireKey,
          componentKey: grimoireKey,
          name: name,
          category: 'grimoire',
          description: grimoire.description,
        };

        this.lookup.grimoires.set(id, mapping);
      }

      // Map grimoire ability IDs array if present
      const abilityIds = grimoire.abilityIds;
      if (Array.isArray(abilityIds)) {
        for (const abilityId of abilityIds) {
          if (typeof abilityId === 'number') {
            const mapping: AbilityScribingMapping = {
              abilityId,
              type: 'grimoire',
              grimoireKey,
              componentKey: grimoireKey,
              name: name,
              category: 'grimoire',
              description: grimoire.description,
            };

            this.lookup.grimoires.set(abilityId, mapping);
          }
        }
      }
    }
  }

  private buildTransformationMappings(): void {
    if (!this.scribingData?.grimoires) return;

    for (const [grimoireKey, grimoire] of Object.entries(this.scribingData.grimoires)) {
      const nameTransformations = (
        grimoire as unknown as { nameTransformations?: Record<string, unknown> }
      ).nameTransformations;

      if (nameTransformations && typeof nameTransformations === 'object') {
        for (const [transformationKey, transformation] of Object.entries(nameTransformations)) {
          const transformationData = transformation as { name?: string; abilityIds?: number[] };

          if (transformationData?.abilityIds && Array.isArray(transformationData.abilityIds)) {
            for (const abilityId of transformationData.abilityIds) {
              if (typeof abilityId === 'number') {
                const mapping: AbilityScribingMapping = {
                  abilityId,
                  type: 'transformation',
                  grimoireKey,
                  componentKey: transformationKey,
                  name: transformationData.name || transformationKey,
                  category: 'focus_transformation',
                  description: `${grimoire.name} - ${transformationData.name || transformationKey}`,
                };

                this.lookup.transformations.set(abilityId, mapping);
              }
            }
          }
        }
      }
    }
  }

  private buildSignatureScriptMappings(): void {
    if (!this.scribingData?.signatureScripts) return;

    for (const [scriptKey, script] of Object.entries(this.scribingData.signatureScripts)) {
      const abilityIds = script.abilityIds;

      if (Array.isArray(abilityIds)) {
        for (const abilityId of abilityIds) {
          if (typeof abilityId === 'number') {
            const mapping: AbilityScribingMapping = {
              abilityId,
              type: 'signature',
              grimoireKey: '', // Signature scripts can work with multiple grimoires
              componentKey: scriptKey,
              name: script.name,
              category: 'signature_script',
              description: script.description,
            };

            this.lookup.signatures.set(abilityId, mapping);
          }
        }
      }
    }
  }

  private buildAffixScriptMappings(): void {
    if (!this.scribingData?.affixScripts) return;

    for (const [scriptKey, script] of Object.entries(this.scribingData.affixScripts)) {
      const abilityIds = script.abilityIds;

      if (Array.isArray(abilityIds)) {
        for (const abilityId of abilityIds) {
          if (typeof abilityId === 'number') {
            const mapping: AbilityScribingMapping = {
              abilityId,
              type: 'affix',
              grimoireKey: '', // Affix scripts can work with multiple grimoires
              componentKey: scriptKey,
              name: script.name,
              category: 'affix_script',
              description: script.description,
            };

            this.lookup.affixes.set(abilityId, mapping);
          }
        }
      }
    }
  }

  private buildConsolidatedLookup(): void {
    const allMappings = new Map<number, AbilityScribingMapping[]>();

    // Collect all mappings by ability ID
    for (const [abilityId, mapping] of this.lookup.grimoires) {
      if (!allMappings.has(abilityId)) {
        allMappings.set(abilityId, []);
      }
      allMappings.get(abilityId)!.push(mapping);
    }

    for (const [abilityId, mapping] of this.lookup.transformations) {
      if (!allMappings.has(abilityId)) {
        allMappings.set(abilityId, []);
      }
      allMappings.get(abilityId)!.push(mapping);
    }

    for (const [abilityId, mapping] of this.lookup.signatures) {
      if (!allMappings.has(abilityId)) {
        allMappings.set(abilityId, []);
      }
      allMappings.get(abilityId)!.push(mapping);
    }

    for (const [abilityId, mapping] of this.lookup.affixes) {
      if (!allMappings.has(abilityId)) {
        allMappings.set(abilityId, []);
      }
      allMappings.get(abilityId)!.push(mapping);
    }

    this.lookup.all = allMappings;
  }

  getScribingComponent(abilityId: number): AbilityScribingMapping[] {
    return this.lookup.all.get(abilityId) || [];
  }

  getGrimoireByAbilityId(abilityId: number): AbilityScribingMapping | null {
    return this.lookup.grimoires.get(abilityId) || null;
  }

  getTransformationByAbilityId(abilityId: number): AbilityScribingMapping | null {
    return this.lookup.transformations.get(abilityId) || null;
  }

  getSignatureByAbilityId(abilityId: number): AbilityScribingMapping | null {
    return this.lookup.signatures.get(abilityId) || null;
  }

  getAffixByAbilityId(abilityId: number): AbilityScribingMapping | null {
    return this.lookup.affixes.get(abilityId) || null;
  }

  isScribingAbility(abilityId: number): boolean {
    return this.lookup.all.has(abilityId);
  }

  getAbilityIdsForGrimoire(grimoireKey: string): number[] {
    const abilityIds: number[] = [];

    // Get grimoire base ability IDs
    for (const [abilityId, mapping] of this.lookup.grimoires) {
      if (mapping.grimoireKey === grimoireKey) {
        abilityIds.push(abilityId);
      }
    }

    // Get transformation ability IDs
    for (const [abilityId, mapping] of this.lookup.transformations) {
      if (mapping.grimoireKey === grimoireKey) {
        abilityIds.push(abilityId);
      }
    }

    return [...new Set(abilityIds)]; // Remove duplicates
  }

  getStats(): {
    totalGrimoires: number;
    totalTransformations: number;
    totalSignatures: number;
    totalAffixes: number;
    totalMappings: number;
  } {
    return {
      totalGrimoires: this.lookup.grimoires.size,
      totalTransformations: this.lookup.transformations.size,
      totalSignatures: this.lookup.signatures.size,
      totalAffixes: this.lookup.affixes.size,
      totalMappings: this.lookup.all.size,
    };
  }
}
