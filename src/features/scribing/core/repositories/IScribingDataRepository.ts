/**
 * Repository interface for Scribing data access
 * Defines the contract for data persistence and retrieval
 */

import {
  ScribingData,
  Grimoire,
  FocusScript,
  SignatureScript,
  AffixScript,
} from '../../shared/types';

export interface IScribingDataRepository {
  /**
   * Load complete scribing data
   */
  loadScribingData(): Promise<ScribingData>;

  /**
   * Get a specific grimoire by ID
   */
  getGrimoire(id: string): Promise<Grimoire | null>;

  /**
   * Get all grimoires
   */
  getAllGrimoires(): Promise<Grimoire[]>;

  /**
   * Get a specific focus script by ID
   */
  getFocusScript(id: string): Promise<FocusScript | null>;

  /**
   * Get all focus scripts
   */
  getAllFocusScripts(): Promise<FocusScript[]>;

  /**
   * Get a specific signature script by ID
   */
  getSignatureScript(id: string): Promise<SignatureScript | null>;

  /**
   * Get all signature scripts
   */
  getAllSignatureScripts(): Promise<SignatureScript[]>;

  /**
   * Get a specific affix script by ID
   */
  getAffixScript(id: string): Promise<AffixScript | null>;

  /**
   * Get all affix scripts
   */
  getAllAffixScripts(): Promise<AffixScript[]>;

  /**
   * Get scripts compatible with a specific grimoire
   */
  getCompatibleScripts(grimoireId: string): Promise<{
    focusScripts: FocusScript[];
    signatureScripts: SignatureScript[];
    affixScripts: AffixScript[];
  }>;

  /**
   * Validate if a combination is valid
   */
  validateCombination(
    grimoireId: string,
    focusScriptId: string,
    signatureScriptId: string,
    affixScriptId: string,
  ): Promise<boolean>;

  /**
   * Cache management
   */
  clearCache(): void;
  isDataCached(): boolean;
}
