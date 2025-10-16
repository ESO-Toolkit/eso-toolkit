/**
 * JSON-based implementation of Scribing data repository
 * Loads data from static JSON files
 */

import { Logger, LogLevel } from '@/utils/logger';

import { IScribingDataRepository } from '../../core/repositories/IScribingDataRepository';
import { DATA_FILE_PATHS, ERROR_MESSAGES } from '../../shared/constants';
import { validateScribingData } from '../../shared/schemas';
import {
  ScribingData,
  Grimoire,
  FocusScript,
  SignatureScript,
  AffixScript,
} from '../../shared/types';

export class JsonScribingDataRepository implements IScribingDataRepository {
  private cachedData: ScribingData | null = null;
  private loadingPromise: Promise<ScribingData> | null = null;
  private logger = new Logger({
    level: LogLevel.WARN,
    contextPrefix: 'JsonScribingDataRepository',
  });

  async loadScribingData(): Promise<ScribingData> {
    if (this.cachedData) {
      return this.cachedData;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.fetchAndValidateData();

    try {
      this.cachedData = await this.loadingPromise;
      return this.cachedData;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async fetchAndValidateData(): Promise<ScribingData> {
    try {
      // Try to load the complete scribing data first
      const response = await fetch(DATA_FILE_PATHS.SCRIBING_COMPLETE);
      if (!response.ok) {
        throw new Error(`Failed to fetch scribing data: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();

      // Validate the data structure
      const validatedData = validateScribingData(rawData);

      return validatedData;
    } catch (error) {
      this.logger.error('Failed to load scribing data', error instanceof Error ? error : undefined);
      throw new Error(
        `${ERROR_MESSAGES.DATA_LOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getGrimoire(id: string): Promise<Grimoire | null> {
    const data = await this.loadScribingData();
    return data.grimoires[id] || null;
  }

  async getAllGrimoires(): Promise<Grimoire[]> {
    const data = await this.loadScribingData();
    return Object.values(data.grimoires);
  }

  async getFocusScript(id: string): Promise<FocusScript | null> {
    const data = await this.loadScribingData();
    return data.focusScripts[id] || null;
  }

  async getAllFocusScripts(): Promise<FocusScript[]> {
    const data = await this.loadScribingData();
    return Object.values(data.focusScripts);
  }

  async getSignatureScript(id: string): Promise<SignatureScript | null> {
    const data = await this.loadScribingData();
    return data.signatureScripts[id] || null;
  }

  async getAllSignatureScripts(): Promise<SignatureScript[]> {
    const data = await this.loadScribingData();
    return Object.values(data.signatureScripts);
  }

  async getAffixScript(id: string): Promise<AffixScript | null> {
    const data = await this.loadScribingData();
    return data.affixScripts[id] || null;
  }

  async getAllAffixScripts(): Promise<AffixScript[]> {
    const data = await this.loadScribingData();
    return Object.values(data.affixScripts);
  }

  async getCompatibleScripts(grimoireId: string): Promise<{
    focusScripts: FocusScript[];
    signatureScripts: SignatureScript[];
    affixScripts: AffixScript[];
  }> {
    const [allFocusScripts, allSignatureScripts, allAffixScripts] = await Promise.all([
      this.getAllFocusScripts(),
      this.getAllSignatureScripts(),
      this.getAllAffixScripts(),
    ]);

    return {
      focusScripts: allFocusScripts.filter((script) =>
        script.compatibleGrimoires.includes(grimoireId),
      ),
      signatureScripts: allSignatureScripts.filter((script) =>
        script.compatibleGrimoires.includes(grimoireId),
      ),
      affixScripts: allAffixScripts.filter((script) =>
        script.compatibleGrimoires.includes(grimoireId),
      ),
    };
  }

  async validateCombination(
    grimoireId: string,
    focusScriptId: string,
    signatureScriptId: string,
    affixScriptId: string,
  ): Promise<boolean> {
    try {
      const [grimoire, focusScript, signatureScript, affixScript] = await Promise.all([
        this.getGrimoire(grimoireId),
        this.getFocusScript(focusScriptId),
        this.getSignatureScript(signatureScriptId),
        this.getAffixScript(affixScriptId),
      ]);

      // Check if all components exist
      if (!grimoire || !focusScript || !signatureScript || !affixScript) {
        return false;
      }

      // Check compatibility
      const isCompatible =
        focusScript.compatibleGrimoires.includes(grimoireId) &&
        signatureScript.compatibleGrimoires.includes(grimoireId) &&
        affixScript.compatibleGrimoires.includes(grimoireId);

      return isCompatible;
    } catch (error) {
      this.logger.error(
        'Error validating combination',
        error instanceof Error ? error : undefined,
        { grimoireId, focusScriptId, signatureScriptId, affixScriptId },
      );
      return false;
    }
  }

  clearCache(): void {
    this.cachedData = null;
    this.loadingPromise = null;
  }

  isDataCached(): boolean {
    return this.cachedData !== null;
  }
}
