/**
 * Scribing Simulation Engine
 * Calculates dynamic skill properties based on script combinations
 */

import { IScribingDataRepository } from '../../core/repositories/IScribingDataRepository';
import { ERROR_MESSAGES, DEFAULT_SIMULATION_CONFIG } from '../../shared/constants';
import { validateSimulationRequest, validateSimulationResponse } from '../../shared/schemas';
import {
  ScribingSimulationRequest,
  ScribingSimulationResponse,
  Grimoire,
  FocusScript,
  SignatureScript,
  AffixScript,
  ResourceType,
  DamageType,
} from '../../shared/types';

export interface IScribingSimulatorService {
  /**
   * Simulate a scribing combination
   */
  simulate(request: ScribingSimulationRequest): Promise<ScribingSimulationResponse>;

  /**
   * Validate if a combination is possible
   */
  validateCombination(
    grimoireId: string,
    focusScriptId?: string,
    signatureScriptId?: string,
    affixScriptId?: string,
  ): Promise<boolean>;

  /**
   * Get available combinations for a grimoire
   */
  getAvailableCombinations(grimoireId: string): Promise<{
    focusScripts: FocusScript[];
    signatureScripts: SignatureScript[];
    affixScripts: AffixScript[];
  }>;
}

export class ScribingSimulatorService implements IScribingSimulatorService {
  constructor(private repository: IScribingDataRepository) {}

  async simulate(request: ScribingSimulationRequest): Promise<ScribingSimulationResponse> {
    // Validate request
    try {
      validateSimulationRequest(request);
    } catch (error) {
      return {
        combination: {
          grimoire: request.grimoireId,
        },
        calculatedSkill: {
          name: 'Invalid Request',
          description: 'Simulation request validation failed',
          resourceType: 'magicka',
          cost: 0,
          castTime: 0,
          range: 0,
          effects: [],
        },
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }

    try {
      // Get components
      const [grimoire, focusScript, signatureScript, affixScript] = await Promise.all([
        this.repository.getGrimoire(request.grimoireId),
        request.focusScriptId ? this.repository.getFocusScript(request.focusScriptId) : null,
        request.signatureScriptId
          ? this.repository.getSignatureScript(request.signatureScriptId)
          : null,
        request.affixScriptId ? this.repository.getAffixScript(request.affixScriptId) : null,
      ]);

      if (!grimoire) {
        return this.createErrorResponse(request, [ERROR_MESSAGES.MISSING_GRIMOIRE]);
      }

      // Validate compatibility
      const validationErrors: string[] = [];

      if (focusScript && !focusScript.compatibleGrimoires.includes(request.grimoireId)) {
        validationErrors.push(
          `Focus script ${focusScript.name} is not compatible with ${grimoire.name}`,
        );
      }

      if (signatureScript && !signatureScript.compatibleGrimoires.includes(request.grimoireId)) {
        validationErrors.push(
          `Signature script ${signatureScript.name} is not compatible with ${grimoire.name}`,
        );
      }

      if (affixScript && !affixScript.compatibleGrimoires.includes(request.grimoireId)) {
        validationErrors.push(
          `Affix script ${affixScript.name} is not compatible with ${grimoire.name}`,
        );
      }

      if (validationErrors.length > 0) {
        return this.createErrorResponse(request, validationErrors);
      }

      // Calculate skill properties
      const calculatedSkill = this.calculateSkillProperties(
        grimoire,
        focusScript,
        signatureScript,
        affixScript,
        request,
      );

      const response: ScribingSimulationResponse = {
        combination: {
          grimoire: grimoire.name,
          focusScript: focusScript?.name,
          signatureScript: signatureScript?.name,
          affixScript: affixScript?.name,
        },
        calculatedSkill,
        isValid: true,
      };

      // Validate response structure
      try {
        validateSimulationResponse(response);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Response validation failed:', error);
      }

      return response;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Simulation failed:', error);
      return this.createErrorResponse(request, [
        `Simulation failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private calculateSkillProperties(
    grimoire: Grimoire,
    focusScript: FocusScript | null,
    signatureScript: SignatureScript | null,
    affixScript: AffixScript | null,
    request: ScribingSimulationRequest,
  ) {
    // Base properties from grimoire
    let resourceType: ResourceType = 'magicka'; // Default
    let baseCost = grimoire.cost.first;
    let castTime = DEFAULT_SIMULATION_CONFIG.BASE_CAST_TIME;
    let range = 28; // Default range in meters
    let damage: { type: DamageType; amount: number } | undefined;

    // Determine resource type from grimoire skill line
    if (grimoire.skillLine === 'Support' || grimoire.skillLine === 'Restoration Staff') {
      resourceType = 'magicka';
    } else if (grimoire.skillLine === 'Assault') {
      resourceType = 'stamina';
    }

    // Apply focus script modifications
    if (focusScript) {
      if (focusScript.damageType) {
        damage = {
          type: focusScript.damageType,
          amount: this.calculateDamageAmount(baseCost, request.characterLevel),
        };
      }

      // Focus scripts can modify resource type
      if (focusScript.effectType?.includes('stamina')) {
        resourceType = 'stamina';
      } else if (focusScript.effectType?.includes('magicka')) {
        resourceType = 'magicka';
      }
    }

    // Apply signature script modifications
    const effects: string[] = [grimoire.description];
    if (signatureScript) {
      if (signatureScript.additionalEffects) {
        effects.push(...signatureScript.additionalEffects);
      }
      effects.push(signatureScript.description);
    }

    // Apply affix script modifications
    if (affixScript) {
      effects.push(affixScript.description);

      // Affix scripts might modify cost
      if (affixScript.bonusType === 'cost_reduction' && affixScript.bonusValue) {
        baseCost = Math.max(1, baseCost - affixScript.bonusValue);
      }
    }

    // Generate skill name
    const name = this.generateSkillName(grimoire, focusScript, signatureScript, affixScript);

    // Generate description
    const description = this.generateSkillDescription(
      grimoire,
      focusScript,
      signatureScript,
      affixScript,
    );

    return {
      name,
      description,
      resourceType,
      cost: baseCost,
      castTime,
      range,
      damage,
      effects: effects.filter(Boolean),
    };
  }

  private calculateDamageAmount(baseCost: number, characterLevel?: number): number {
    // Simple damage calculation based on cost and level
    const level = characterLevel || DEFAULT_SIMULATION_CONFIG.CHARACTER_LEVEL;
    const levelMultiplier = Math.max(1, level / 160);
    return Math.floor(baseCost * 10 * levelMultiplier);
  }

  private generateSkillName(
    grimoire: Grimoire,
    focusScript: FocusScript | null,
    signatureScript: SignatureScript | null,
    _affixScript: AffixScript | null,
  ): string {
    let name = grimoire.name;

    if (focusScript && focusScript.effectType) {
      // Modify name based on focus script
      name = `${focusScript.effectType} ${name}`;
    }

    if (signatureScript) {
      // Some signature scripts add suffixes
      name = `${name} (Enhanced)`;
    }

    return name;
  }

  private generateSkillDescription(
    grimoire: Grimoire,
    focusScript: FocusScript | null,
    signatureScript: SignatureScript | null,
    affixScript: AffixScript | null,
  ): string {
    let description = grimoire.description;

    if (focusScript) {
      description += ` Modified by ${focusScript.name}: ${focusScript.description}`;
    }

    if (signatureScript) {
      description += ` Enhanced by ${signatureScript.name}: ${signatureScript.description}`;
    }

    if (affixScript) {
      description += ` Augmented by ${affixScript.name}: ${affixScript.description}`;
    }

    return description;
  }

  private createErrorResponse(
    request: ScribingSimulationRequest,
    errors: string[],
  ): ScribingSimulationResponse {
    return {
      combination: {
        grimoire: request.grimoireId,
        focusScript: request.focusScriptId,
        signatureScript: request.signatureScriptId,
        affixScript: request.affixScriptId,
      },
      calculatedSkill: {
        name: 'Invalid Combination',
        description: 'This combination is not valid',
        resourceType: 'magicka',
        cost: 0,
        castTime: 0,
        range: 0,
        effects: [],
      },
      isValid: false,
      errors,
    };
  }

  async validateCombination(
    grimoireId: string,
    focusScriptId?: string,
    signatureScriptId?: string,
    affixScriptId?: string,
  ): Promise<boolean> {
    return this.repository.validateCombination(
      grimoireId,
      focusScriptId || '',
      signatureScriptId || '',
      affixScriptId || '',
    );
  }

  async getAvailableCombinations(grimoireId: string): Promise<{
    focusScripts: FocusScript[];
    signatureScripts: SignatureScript[];
    affixScripts: AffixScript[];
  }> {
    return this.repository.getCompatibleScripts(grimoireId);
  }
}
