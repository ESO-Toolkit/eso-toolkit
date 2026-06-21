/**
 * Scribing Simulation Engine (service layer)
 *
 * Thin async wrapper over the pure {@link deriveScribedSkill} engine: it loads
 * the dataset via the repository, enforces script compatibility for the public
 * API, and shapes the result into a {@link ScribingSimulationResponse}.
 */

import { Logger, LogLevel } from '@/utils/logger';

import { IScribingDataRepository } from '../../core/repositories/IScribingDataRepository';
import { ERROR_MESSAGES } from '../../shared/constants';
import { validateSimulationRequest, validateSimulationResponse } from '../../shared/schemas';
import {
  ScribingSimulationRequest,
  ScribingSimulationResponse,
  FocusScript,
  SignatureScript,
  AffixScript,
} from '../../shared/types';
import {
  deriveScribedSkill,
  getCompatibleScripts,
  type ScribedSkillResult,
} from '../scribingEngine';

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
  private logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'ScribingSimulatorService' });

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
        calculatedSkill: this.emptySkill('Invalid Request', 'Simulation request validation failed'),
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }

    try {
      const data = await this.repository.loadScribingData();
      const grimoire = data.grimoires[request.grimoireId];
      if (!grimoire) {
        return this.createErrorResponse(request, [ERROR_MESSAGES.MISSING_GRIMOIRE]);
      }

      const focusScript = request.focusScriptId
        ? data.focusScripts[request.focusScriptId]
        : undefined;
      const signatureScript = request.signatureScriptId
        ? data.signatureScripts[request.signatureScriptId]
        : undefined;
      const affixScript = request.affixScriptId
        ? data.affixScripts[request.affixScriptId]
        : undefined;

      // Strict compatibility for the public API: a provided script that the
      // grimoire does not support is an error (the live UI never offers these).
      const validationErrors: string[] = [];
      if (focusScript && !focusScript.compatibleGrimoires.includes(grimoire.id)) {
        validationErrors.push(
          `Focus script ${focusScript.name} is not compatible with ${grimoire.name}`,
        );
      }
      if (signatureScript && !signatureScript.compatibleGrimoires.includes(grimoire.id)) {
        validationErrors.push(
          `Signature script ${signatureScript.name} is not compatible with ${grimoire.name}`,
        );
      }
      if (affixScript && !affixScript.compatibleGrimoires.includes(grimoire.id)) {
        validationErrors.push(
          `Affix script ${affixScript.name} is not compatible with ${grimoire.name}`,
        );
      }
      if (validationErrors.length > 0) {
        return this.createErrorResponse(request, validationErrors);
      }

      const result = deriveScribedSkill(data, {
        grimoireId: request.grimoireId,
        focusId: request.focusScriptId,
        signatureId: request.signatureScriptId,
        affixId: request.affixScriptId,
      });

      // `deriveScribedSkill` only returns null for an unknown grimoire, already
      // handled above.
      if (!result) {
        return this.createErrorResponse(request, [ERROR_MESSAGES.MISSING_GRIMOIRE]);
      }

      const response = this.toResponse(result, focusScript, signatureScript, affixScript);

      try {
        validateSimulationResponse(response);
      } catch (error) {
        this.logger.error('Response validation failed', error instanceof Error ? error : undefined);
      }

      return response;
    } catch (error) {
      this.logger.error('Simulation failed', error instanceof Error ? error : undefined, {
        grimoireId: request.grimoireId,
      });
      return this.createErrorResponse(request, [
        `Simulation failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }
  }

  private toResponse(
    result: ScribedSkillResult,
    focusScript: FocusScript | undefined,
    signatureScript: SignatureScript | undefined,
    affixScript: AffixScript | undefined,
  ): ScribingSimulationResponse {
    const sentences = [
      result.baseEffect,
      ...result.effects.map((e) => `${e.name}: ${e.effect}`),
    ].filter((s): s is string => Boolean(s && s.length));

    return {
      combination: {
        grimoire: result.grimoireName,
        focusScript: focusScript?.name,
        signatureScript: signatureScript?.name,
        affixScript: affixScript?.name,
      },
      calculatedSkill: {
        name: result.skillName,
        description: sentences.join(' '),
        resourceType: result.resourceType,
        cost: result.cost,
        castTime: 0,
        range: 0,
        effects: result.effects.map((e) => `${e.name}: ${e.effect}`),
        abilityId: result.abilityId,
        icon: result.icon,
        skillLine: result.skillLine,
        targetType: result.targetType,
        castType: result.castType,
        scriptBreakdown: result.effects.map((e) => ({
          slot: e.slot,
          name: e.name,
          effect: e.effect,
          category: e.category,
          acquisition: e.acquisition,
        })),
      },
      isValid: true,
      warnings: result.warnings.length ? result.warnings : undefined,
    };
  }

  private emptySkill(
    name: string,
    description: string,
  ): ScribingSimulationResponse['calculatedSkill'] {
    return {
      name,
      description,
      resourceType: 'magicka',
      cost: 0,
      castTime: 0,
      range: 0,
      effects: [],
    };
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
      calculatedSkill: this.emptySkill('Invalid Combination', 'This combination is not valid'),
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
    const data = await this.repository.loadScribingData();
    return getCompatibleScripts(data, grimoireId);
  }
}
