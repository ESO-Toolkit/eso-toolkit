/**
 * ESO Scribing Data Utilities
 *
 * Helper functions and utilities for working with ESO Scribing data
 * in the ESO Log Aggregator application.
 */

import type {
  ScribingData,
  Grimoire,
  Script,
  ScribedSkillCombination,
  ScriptType,
  SkillLine,
} from '../types/scribing';

// Import the scribing data
// Note: In a real application, this would be loaded dynamically
let scribingData: ScribingData | null = null;

/**
 * Load scribing data from the JSON file
 */
export async function loadScribingData(): Promise<ScribingData> {
  if (scribingData) {
    return scribingData;
  }

  try {
    // In a real implementation, you would fetch this from your data source
    const response = await fetch('/data/scribing.json');
    scribingData = await response.json();
    return scribingData as ScribingData;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load scribing data:', error);
    throw error;
  }
}

/**
 * Get all grimoires
 */
export function getAllGrimoires(data: ScribingData): Grimoire[] {
  return Object.values(data.grimoires);
}

/**
 * Get grimoires by skill line
 */
export function getGrimoiresBySkillLine(data: ScribingData, skillLine: SkillLine): Grimoire[] {
  return getAllGrimoires(data).filter((grimoire) => grimoire.skillLine === skillLine);
}

/**
 * Get all scripts of a specific type
 */
export function getScriptsByType<T extends Script>(data: ScribingData, type: ScriptType): T[] {
  switch (type) {
    case 'Focus':
      return Object.values(data.focusScripts) as T[];
    case 'Signature':
      return Object.values(data.signatureScripts) as T[];
    case 'Affix':
      return Object.values(data.affixScripts) as T[];
    default:
      return [];
  }
}

/**
 * Get compatible scripts for a grimoire
 */
export function getCompatibleScripts(
  data: ScribingData,
  grimoireId: string,
  scriptType: ScriptType,
): Script[] {
  const scripts = getScriptsByType(data, scriptType);
  return scripts.filter((script) => script.compatibleGrimoires.includes(grimoireId));
}

/**
 * Validate a scribed skill combination
 */
export function isValidCombination(
  data: ScribingData,
  combination: ScribedSkillCombination,
): boolean {
  const { grimoire, focusScript, signatureScript, affixScript } = combination;

  // Check if grimoire exists
  if (!data.grimoires[grimoire]) {
    return false;
  }

  // Check if all scripts exist and are compatible with the grimoire
  const focus = data.focusScripts[focusScript];
  const signature = data.signatureScripts[signatureScript];
  const affix = data.affixScripts[affixScript];

  if (!focus || !signature || !affix) {
    return false;
  }

  return (
    focus.compatibleGrimoires.includes(grimoire) &&
    signature.compatibleGrimoires.includes(grimoire) &&
    affix.compatibleGrimoires.includes(grimoire)
  );
}

/**
 * Get all valid combinations for a grimoire
 */
export function getValidCombinations(
  data: ScribingData,
  grimoireId: string,
): ScribedSkillCombination[] {
  const combinations: ScribedSkillCombination[] = [];

  const compatibleFocus = getCompatibleScripts(data, grimoireId, 'Focus');
  const compatibleSignature = getCompatibleScripts(data, grimoireId, 'Signature');
  const compatibleAffix = getCompatibleScripts(data, grimoireId, 'Affix');

  for (const focus of compatibleFocus) {
    for (const signature of compatibleSignature) {
      for (const affix of compatibleAffix) {
        combinations.push({
          grimoire: grimoireId,
          focusScript: focus.id,
          signatureScript: signature.id,
          affixScript: affix.id,
        });
      }
    }
  }

  return combinations;
}

/**
 * Calculate total combinations for a grimoire
 */
export function calculateCombinationCount(data: ScribingData, grimoireId: string): number {
  const compatibleFocus = getCompatibleScripts(data, grimoireId, 'Focus');
  const compatibleSignature = getCompatibleScripts(data, grimoireId, 'Signature');
  const compatibleAffix = getCompatibleScripts(data, grimoireId, 'Affix');

  return compatibleFocus.length * compatibleSignature.length * compatibleAffix.length;
}

/**
 * Get scripts obtainable from quests
 */
export function getQuestScripts(data: ScribingData): Script[] {
  // Check all script types for quest rewards
  const allScripts = [
    ...Object.values(data.focusScripts),
    ...Object.values(data.signatureScripts),
    ...Object.values(data.affixScripts),
  ];

  return allScripts.filter((script) => script.questReward);
}

/**
 * Get scripts available for free from Mages Guild locations
 */
export function getFreeScripts(data: ScribingData): Script[] {
  const freeScripts: Script[] = [];

  for (const location of Object.values(data.freeScriptLocations)) {
    const scriptMap =
      location.scriptType === 'Focus'
        ? data.focusScripts
        : location.scriptType === 'Signature'
          ? data.signatureScripts
          : data.affixScripts;

    const script = scriptMap[location.scriptId];
    if (script) {
      freeScripts.push(script);
    }
  }

  return freeScripts;
}

/**
 * Calculate luminous ink cost for a combination
 */
export function calculateInkCost(
  data: ScribingData,
  isNewSkill: boolean = true,
  changedScripts: number = 3,
): number {
  if (isNewSkill) {
    return data.luminousInk.costs.newSkill;
  }

  return data.luminousInk.costs.modifySkill * changedScripts;
}

/**
 * Search scripts by name or description
 */
export function searchScripts(
  data: ScribingData,
  query: string,
  scriptType?: ScriptType,
): Script[] {
  const searchTerm = query.toLowerCase();
  let scriptsToSearch: Script[] = [];

  if (scriptType) {
    scriptsToSearch = getScriptsByType(data, scriptType);
  } else {
    scriptsToSearch = [
      ...Object.values(data.focusScripts),
      ...Object.values(data.signatureScripts),
      ...Object.values(data.affixScripts),
    ];
  }

  return scriptsToSearch.filter(
    (script) =>
      script.name.toLowerCase().includes(searchTerm) ||
      script.description.toLowerCase().includes(searchTerm),
  );
}

/**
 * Get grimoire by ID
 */
export function getGrimoire(data: ScribingData, id: string): Grimoire | null {
  return data.grimoires[id] || null;
}

/**
 * Get script by ID and type
 */
export function getScript(data: ScribingData, id: string, type: ScriptType): Script | null {
  switch (type) {
    case 'Focus':
      return data.focusScripts[id] || null;
    case 'Signature':
      return data.signatureScripts[id] || null;
    case 'Affix':
      return data.affixScripts[id] || null;
    default:
      return null;
  }
}

/**
 * Get vendor costs for a script type
 */
export function getVendorCosts(
  data: ScribingData,
  vendorId: string,
  scriptType: ScriptType,
  isFirstPurchase: boolean = true,
): number | null {
  const vendor = data.scriptVendors[vendorId];
  if (!vendor) return null;

  const scriptKey = `${scriptType.toLowerCase()}-script` as keyof typeof vendor.costs;
  const costs = vendor.costs[scriptKey];

  return isFirstPurchase ? costs.first : costs.additional;
}

// Export utility functions
export const ScribingUtils = {
  loadScribingData,
  getAllGrimoires,
  getGrimoiresBySkillLine,
  getScriptsByType,
  getCompatibleScripts,
  isValidCombination,
  getValidCombinations,
  calculateCombinationCount,
  getQuestScripts,
  getFreeScripts,
  calculateInkCost,
  searchScripts,
  getGrimoire,
  getScript,
  getVendorCosts,
};
