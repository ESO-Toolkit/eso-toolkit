/**
 * ESO Scribing system definitions and utilities
 *
 * This file contains enums and types for the Elder Scrolls Online scribing system,
 * including all grimoires, focus scripts, and signature scripts.
 */

import { ReportAbility } from '@/graphql/generated';
import {
  BuffEvent,
  CastEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
} from '@/types/combatlogEvents';
import { PlayerTalent } from '@/types/playerDetails';

import scribingDatabase from '../../../../data/scribing-complete.json';
import { abilityIdMapper } from '../../../utils/abilityIdMapper';

// Type definitions for scribing database
interface ScribingTransformation {
  name?: string;
  abilityIds?: number[];
  [key: string]: unknown;
}

interface ScribingGrimoire {
  name?: string;
  id?: number;
  abilityIds?: number[];
  nameTransformations?: Record<string, ScribingTransformation>;
  [key: string]: unknown;
}

interface ScribingScript {
  name?: string;
  abilityIds?: number[];
  [key: string]: unknown;
}

interface ScribingDatabase {
  grimoires?: Record<string, ScribingGrimoire>;
  signatureScripts?: Record<string, ScribingScript>;
  affixScripts?: Record<string, ScribingScript>;
  [key: string]: unknown;
}

/**
 * Type definitions for function parameters
 */
interface PlayerDetails {
  data: {
    playerDetails: {
      tanks: Array<{
        id: number;
        name: string;
        combatantInfo: { talents: PlayerTalent[] };
      }>;
      dps: Array<{
        id: number;
        name: string;
        combatantInfo: { talents: PlayerTalent[] };
      }>;
      healers: Array<{
        id: number;
        name: string;
        combatantInfo: { talents: PlayerTalent[] };
      }>;
    };
  };
}

interface MasterData {
  reportData: {
    report: {
      masterData: {
        abilities: ReportAbility[];
      };
    };
  };
}

/**
 * Extended event interfaces with additional properties used in the analyzer
 */
interface ExtendedEventProperties {
  castTrackID?: string | number;
  damageTypeFlags?: number;
  extraAbilityGameID?: number;
}

/**
 * Enum representing specific damage types in ESO
 */
export enum DamageType {
  PHYSICAL = 'physical',
  MAGIC = 'magic',
  FIRE = 'fire',
  FROST = 'frost',
  SHOCK = 'shock',
  POISON = 'poison',
  DISEASE = 'disease',
  BLEED = 'bleed',
  GENERIC = 'generic',
}

/**
 * Set of ability names that should be excluded from scribing analysis
 * These are known non-scribing abilities that might match grimoire patterns
 */
export const SCRIBING_BLACKLIST = new Set<string>([
  // Banner Bearer false positives
  'Swallow Soul', // This is a class ability, not a scribing skill

  // Add other known non-scribing abilities here
  // Examples might include:
  // 'Some Other Banner',
  // 'Regular Shield',
  // etc.
]);

/**
 * Gets the formatted display name for an ability, conditionally using damage type name for high ID abilities
 * @param ability The ability information from the report
 * @param eventType The type of event (damage, buff, debuff, resource)
 * @param hitType Optional hit type for display
 * @returns A formatted display name for the ability
 */
export function getAbilityDisplayName(
  ability: { name?: string; gameID?: number; type?: number | string },
  eventType: 'damage' | 'debuff' | 'buff' | 'resource',
  hitType?: number | string,
): string {
  let displayName = ability?.name || 'Unknown Ability';

  // For damage events, potentially replace ability name with damage type
  if (eventType === 'damage') {
    // Only use damage type name for abilities with ID > 200000
    if (ability?.gameID && parseInt(String(ability.gameID)) > 200000) {
      // Get damage type from ability info
      if (ability?.type) {
        const damageType = getDamageTypeForEvent(Number(ability.type));
        if (damageType) {
          // Format the damage type name for display - capitalize first letter and add "Damage"
          displayName = damageType.charAt(0).toUpperCase() + damageType.slice(1) + ' Damage';
        }
      }
    }
  }

  // Add hit type information if provided
  if (hitType) {
    displayName += ` [${hitType}]`;
  }

  return displayName;
}

/**
 * Gets the dominant damage type for an ability based on its type flags
 * @param typeFlags The numeric damage type flags
 * @returns The dominant damage type or null if not determined
 */
export function getDamageTypeForEvent(typeFlags: number): DamageType | null {
  // Check in priority order (most important damage types first)
  switch (typeFlags) {
    case 4:
      return DamageType.FIRE;
    case 16:
      return DamageType.FROST;
    case 512:
      return DamageType.SHOCK;
    case 8:
      return DamageType.POISON;
    case 256:
      return DamageType.DISEASE;
    case 2:
      return DamageType.BLEED;
    case 1:
      return DamageType.PHYSICAL;
    case 64:
      return DamageType.MAGIC;
    case 128:
      return DamageType.GENERIC;
    default:
      return null; // Unknown damage type
  }
}

/**
 * Enum for all ESO scribing grimoires.
 * These are the 12 base grimoires that scribing skills are built from.
 */
export enum Grimoire {
  BANNER_BEARER = 'Banner Bearer',
  ELEMENTAL_EXPLOSION = 'Elemental Explosion',
  MENDERS_BOND = "Mender's Bond",
  SHIELD_THROW = 'Shield Throw',
  SMASH = 'Smash',
  SOUL_BURST = 'Soul Burst',
  TORCHBEARER = 'Torchbearer',
  TRAMPLE = 'Trample',
  TRAVELING_KNIFE = 'Traveling Knife',
  ULFSILD_CONTINGENCY = "Ulfsild's Contingency",
  VAULT = 'Vault',
  WIELD_SOUL = 'Wield Soul',
}

/**
 * Interface for scribing skill configuration
 */
export interface ScribingSkill {
  grimoire: Grimoire;
  abilityId: number;
  name: string;
}

/**
 * Interface for scribing skill information from ability ID lookup
 */
export interface ScribingSkillInfo {
  grimoire: string;
  transformation: string;
  transformationType: string;
  transformedName: string;
  grimoireId: number;
}

/**
 * Regular expression patterns for matching grimoire abilities by name.
 * These patterns help identify which grimoire a scribing ability belongs to.
 */
export const GRIMOIRE_NAME_PATTERNS: Record<Grimoire, RegExp> = {
  [Grimoire.BANNER_BEARER]: /\w+ Banner$/,
  [Grimoire.ELEMENTAL_EXPLOSION]: /\w+ Explosion$/,
  [Grimoire.MENDERS_BOND]: /\w+ Bond$/,
  [Grimoire.SHIELD_THROW]: /\w+ Throw$/,
  [Grimoire.SMASH]: /\w+ Smash$/,
  [Grimoire.SOUL_BURST]: /\w+ Burst$/,
  [Grimoire.TORCHBEARER]: /\w+ Torchbearer/,
  [Grimoire.TRAMPLE]: /\w+ Trample$/,
  [Grimoire.TRAVELING_KNIFE]: /\w+ Knife$/,
  [Grimoire.ULFSILD_CONTINGENCY]: /\w+ Contingency$/,
  [Grimoire.VAULT]: /\w+ Vault$/,
  [Grimoire.WIELD_SOUL]: /\w+ Soul$/,
};

/**
 * Get all grimoire values as an array
 */
export function getAllGrimoires(): Grimoire[] {
  return Object.values(Grimoire);
}

/**
 * Map an ability ID to scribing skill information using the scribing database
 * This replaces the heuristic-based grimoire detection with accurate ability ID lookup
 */
export function getScribingSkillByAbilityId(abilityId: number): ScribingSkillInfo | null {
  try {
    const database = scribingDatabase as ScribingDatabase;
    const grimoires = database.grimoires || {};
    const signatureScripts = database.signatureScripts || {};
    const affixScripts = database.affixScripts || {};

    // First check focus scripts (grimoire name transformations)
    for (const [_grimoireKey, grimoireData] of Object.entries(grimoires)) {
      const grimoire = grimoireData as ScribingGrimoire;

      // Check if this is the base grimoire ID
      if (grimoire.id === abilityId && grimoire.name && grimoire.id !== undefined) {
        return {
          grimoire: grimoire.name,
          transformation: 'Base Ability',
          transformationType: 'Base Grimoire',
          transformedName: grimoire.name,
          grimoireId: grimoire.id,
        };
      }

      // Check all name transformations (focus scripts)
      if (grimoire.nameTransformations) {
        for (const [transformationKey, transformationData] of Object.entries(
          grimoire.nameTransformations,
        )) {
          const transformation = transformationData as ScribingTransformation;

          if (transformation.abilityIds && Array.isArray(transformation.abilityIds)) {
            if (
              transformation.abilityIds.includes(abilityId) &&
              grimoire.name &&
              grimoire.id !== undefined &&
              transformation.name
            ) {
              const transformationType = getTransformationType(transformationKey);

              return {
                grimoire: grimoire.name,
                transformation: transformation.name,
                transformationType,
                transformedName: transformation.name,
                grimoireId: grimoire.id,
              };
            }
          }
        }
      }
    }

    // Check signature scripts
    if (signatureScripts) {
      for (const [_scriptKey, scriptData] of Object.entries(signatureScripts)) {
        const script = scriptData as ScribingScript;

        if (script.abilityIds && Array.isArray(script.abilityIds) && script.name) {
          if (script.abilityIds.includes(abilityId)) {
            return {
              grimoire: 'Unknown Grimoire', // We don't know which grimoire this belongs to from signature script alone
              transformation: script.name,
              transformationType: 'Signature Script',
              transformedName: script.name,
              grimoireId: 0, // Unknown
            };
          }
        }
      }
    }

    // Check affix scripts
    if (affixScripts) {
      for (const [_scriptKey, scriptData] of Object.entries(affixScripts)) {
        const script = scriptData as ScribingScript;

        if (script.abilityIds && Array.isArray(script.abilityIds) && script.name) {
          if (script.abilityIds.includes(abilityId)) {
            return {
              grimoire: 'Unknown Grimoire', // We don't know which grimoire this belongs to from affix script alone
              transformation: script.name,
              transformationType: 'Affix Script',
              transformedName: script.name,
              grimoireId: 0, // Unknown
            };
          }
        }
      }
    }

    return null;
  } catch {
    // console.error('Error looking up scribing skill by ability ID:', error);
    return null;
  }
}

/**
 * Determine the transformation type from the transformation key
 * All nameTransformations in our database represent Focus Scripts (the middle slot)
 */
function getTransformationType(transformationKey: string): string {
  // All transformation keys in our database represent Focus Scripts
  // These are the middle slot in ESO's scribing system that determine the primary effect
  const knownFocusScripts = new Set([
    // Damage types
    'physical-damage',
    'magic-damage',
    'shock-damage',
    'flame-damage',
    'frost-damage',
    'poison-damage',
    'disease-damage',
    'bleed-damage',
    // Utility effects
    'healing',
    'multi-target',
    'immobilize',
    'restore-resources',
    'mitigation',
    'knockback',
    'stun',
    'dispel',
    'damage-shield',
    'taunt',
    'generate-ultimate',
    'pull',
    'trauma',
  ]);

  if (knownFocusScripts.has(transformationKey)) {
    return 'Focus Script';
  } else {
    // Log unknown transformation types for debugging
    // console.warn(`Unknown scribing transformation type: ${transformationKey}`);
    return 'Focus Script'; // Default to Focus Script since that's what our database contains
  }
}

/**
 * Check if a string is a valid grimoire name
 */
export function isValidGrimoire(grimoire: string): grimoire is Grimoire {
  return Object.values(Grimoire).includes(grimoire as Grimoire);
}

/**
 * Interface for individual effect analysis
 */
export interface Effect {
  abilityId: number;
  abilityName: string;
  damageType?: DamageType;
  events: Array<
    CastEvent | DamageEvent | HealEvent | DebuffEvent | BuffEvent | ResourceChangeEvent
  >;
}

/**
 * Interface for scribing skill analysis result
 */
export interface ScribingSkillAnalysis {
  grimoire: Grimoire;
  effects: Effect[];
  talentName: string;
  talentGuid: number;
}

/**
 * Analyze scribing skill effects from ESO log data
 * Returns comprehensive analysis including damage breakdowns and effect grouping
 */
export function analyzeScribingSkillEffects(
  talent: PlayerTalent,
  allReportAbilities: ReportAbility[],
  allDebuffEvents: DebuffEvent[],
  allBuffEvents: BuffEvent[],
  allResourceEvents: ResourceChangeEvent[],
  allDamageEvents: DamageEvent[],
  allCastEvents: CastEvent[],
  allHealingEvents: HealEvent[],
  playerId = 1,
): ScribingSkillAnalysis | null {
  // Check if this ability is a scribing skill
  for (const grimoireType of getAllGrimoires()) {
    const pattern = GRIMOIRE_NAME_PATTERNS[grimoireType];
    if (pattern.test(talent.name) && !SCRIBING_BLACKLIST.has(talent.name)) {
      // Find all abilities in the report that match this grimoire pattern (excluding blacklisted ones)
      const relatedAbilities = allReportAbilities
        .filter(
          (ability) =>
            ability.name && pattern.test(ability.name) && !SCRIBING_BLACKLIST.has(ability.name),
        )
        .map((ability) => ({
          name: ability.name || `Unknown Ability ${ability.gameID}`,
          id: ability.gameID || 0,
        }));

      // Collapse related abilities by name to remove duplicates
      const uniqueAbilitiesByName = new Map<string, { name: string; id: number }>();
      relatedAbilities.forEach((ability) => {
        if (!uniqueAbilitiesByName.has(ability.name)) {
          uniqueAbilitiesByName.set(ability.name, ability);
        }
      });

      // Find all cast events for this scribing skill to get their castTrackIDs
      const scribingCastEvents = allCastEvents.filter(
        (cast) => cast.sourceID === playerId && cast.abilityGameID === talent.guid,
      );

      // Create a set of cast track IDs
      const scribingCastTrackIDs = new Set<number | string>();
      scribingCastEvents.forEach((cast) => {
        const castTrackID = (cast as CastEvent & ExtendedEventProperties).castTrackID;
        if (castTrackID) {
          scribingCastTrackIDs.add(castTrackID);
        }
      });

      // Find ALL damage events that have a castTrackID matching any of our scribing skill casts
      const allCastLinkedDamage = allDamageEvents
        .filter((event) => {
          const castTrackID = (event as DamageEvent & ExtendedEventProperties).castTrackID;
          return (
            event.sourceID === playerId && castTrackID && scribingCastTrackIDs.has(castTrackID)
          );
        })
        .map((event) => {
          // Find the cast event to include its information
          const castEvent = scribingCastEvents.find(
            (cast) =>
              (cast as CastEvent & ExtendedEventProperties).castTrackID ===
              (event as DamageEvent & ExtendedEventProperties).castTrackID,
          );

          const isDirectMatch = event.abilityGameID === talent.guid;

          // Create a new object with additional properties
          const enhancedEvent = {
            ...event,
            sourceFile: 'damage-events',
            matchType: isDirectMatch ? 'direct' : 'cast-linked',
            linkedCastEvent: castEvent,
            linkedCast: castEvent ? castEvent.abilityGameID : null,
          };

          return enhancedEvent;
        });

      // Find all debuff events where sourceID matches playerId and extraAbilityGameID matches this talent's guid
      const relatedDebuffs = allDebuffEvents
        .filter(
          (event) =>
            event.sourceID === playerId &&
            (event as DebuffEvent & ExtendedEventProperties).extraAbilityGameID === talent.guid &&
            event.type === 'applydebuff',
        )
        .map((event) => ({
          ...event,
          sourceFile: 'debuff-events',
        }));

      // Find all buff events where sourceID matches playerId and extraAbilityGameID matches this talent's guid
      const relatedBuffs = allBuffEvents
        .filter(
          (event) =>
            event.sourceID === playerId &&
            (event as BuffEvent & ExtendedEventProperties).extraAbilityGameID === talent.guid &&
            event.type === 'applybuff',
        )
        .map((event) => ({
          ...event,
          sourceFile: 'buff-events',
        }));

      // Find all resource events where sourceID matches playerId and extraAbilityGameID matches this talent's guid
      const relatedResources = allResourceEvents
        .filter(
          (event) =>
            event.sourceID === playerId &&
            (event as ResourceChangeEvent & ExtendedEventProperties).extraAbilityGameID ===
              talent.guid,
        )
        .map((event) => ({
          ...event,
          sourceFile: 'resource-events',
        }));

      // Find all healing events that have a castTrackID matching any of our scribing skill casts
      const allCastLinkedHealing = allHealingEvents
        .filter((event) => {
          const castTrackID = (event as HealEvent & ExtendedEventProperties).castTrackID;
          return (
            event.sourceID === playerId && castTrackID && scribingCastTrackIDs.has(castTrackID)
          );
        })
        .map((event) => {
          // Find the cast event to include its information
          const castEvent = scribingCastEvents.find(
            (cast) =>
              (cast as CastEvent & ExtendedEventProperties).castTrackID ===
              (event as HealEvent & ExtendedEventProperties).castTrackID,
          );

          const isDirectMatch = event.abilityGameID === talent.guid;

          // Create a new object with additional properties
          const enhancedEvent = {
            ...event,
            sourceFile: 'healing-events',
            matchType: isDirectMatch ? 'direct' : 'cast-linked',
            linkedCastEvent: castEvent,
            linkedCast: castEvent ? castEvent.abilityGameID : null,
          };

          return enhancedEvent;
        });

      // Group all events by ability (using string keys to accommodate both ability IDs and damage-specific IDs)
      const effectsByAbility = new Map<string, Effect>();

      // Helper function to get or create effect
      const getOrCreateEffect = (abilityId: number): Effect => {
        const key = abilityId.toString();
        if (!effectsByAbility.has(key)) {
          // First, try to find the ability in report abilities
          const ability = allReportAbilities.find((a) => a.gameID === abilityId);
          let abilityName = ability && ability.name ? ability.name : null;

          // If not found in report abilities, try the master abilities data
          if (!abilityName) {
            const masterAbility = abilityIdMapper.getAbilityById(abilityId);
            abilityName = masterAbility?.name || null;
          }

          // Final fallback to showing the ID if no name is available
          const finalAbilityName = abilityName || `Ability ${abilityId}`;

          effectsByAbility.set(key, {
            abilityId,
            abilityName: finalAbilityName,
            events: [],
          });
        }
        return effectsByAbility.get(key) as Effect;
      };

      // Process damage events
      allCastLinkedDamage.forEach((event) => {
        const abilityId = event.abilityGameID;

        // Get the damage type flag for this event
        const flags = (event as DamageEvent & ExtendedEventProperties).damageTypeFlags || 0;

        if (event.amount && event.amount > 0) {
          // Determine the single damage type for this event
          const damageType = getDamageTypeForEvent(flags);

          if (damageType) {
            // Use our utility function to get the display name
            const damageTypeName =
              damageType.charAt(0).toUpperCase() + damageType.slice(1) + ' Damage';

            // Create a unique key for this ability + damage type combination
            const damageSpecificId = `${abilityId}_${damageType}`;

            // Get or create an effect for this specific damage type
            if (!effectsByAbility.has(damageSpecificId)) {
              // Create a new effect object specifically for this damage type
              effectsByAbility.set(damageSpecificId, {
                abilityId,
                abilityName: damageTypeName, // Use just the damage type name
                damageType, // Add the damage type to the effect
                events: [],
              });
            }

            // Get the damage-specific effect
            const damageEffect = effectsByAbility.get(damageSpecificId) as Effect;

            // Add this event to the damage-specific effect
            damageEffect.events.push(event);
          } else {
            // If no damage type was determined, add it to a generic effect
            const key = abilityId.toString();
            if (!effectsByAbility.has(key)) {
              getOrCreateEffect(abilityId); // This creates the effect if it doesn't exist
            }
            const effect = effectsByAbility.get(key) as Effect;
            effect.events.push(event);
          }
        } else {
          // For events with no damage (like misses), add to the generic effect
          const key = abilityId.toString();
          if (!effectsByAbility.has(key)) {
            getOrCreateEffect(abilityId); // This creates the effect if it doesn't exist
          }
          const effect = effectsByAbility.get(key) as Effect;
          effect.events.push(event);
        }
      });

      // Process debuff events
      relatedDebuffs.forEach((event) => {
        // Use abilityGameID directly (like the test script does)
        const abilityId = event.abilityGameID;
        const effect = getOrCreateEffect(abilityId);
        effect.events.push(event);
      });

      // Process buff events
      relatedBuffs.forEach((event) => {
        // Use abilityGameID directly (like the test script does)
        const abilityId = event.abilityGameID;
        const effect = getOrCreateEffect(abilityId);
        effect.events.push(event);
      });

      // Process resource events
      relatedResources.forEach((event) => {
        // Use abilityGameID directly (like the test script does)
        const abilityId = event.abilityGameID;
        const effect = getOrCreateEffect(abilityId);
        effect.events.push(event);
      });

      // Process healing events
      allCastLinkedHealing.forEach((event) => {
        const abilityId = event.abilityGameID;

        if (event.amount && event.amount > 0) {
          // For healing events, we just treat them as general healing
          // Create a unique key for this ability + healing combination
          const healingSpecificId = `${abilityId}_healing`;

          // Get or create an effect for this healing type
          if (!effectsByAbility.has(healingSpecificId)) {
            // Create a new effect object specifically for healing
            effectsByAbility.set(healingSpecificId, {
              abilityId,
              abilityName: 'Healing', // Use just "Healing" as the name
              events: [],
            });
          }

          // Get the healing-specific effect
          const healingEffect = effectsByAbility.get(healingSpecificId) as Effect;

          // Add this event to the healing-specific effect
          healingEffect.events.push(event);
        } else {
          // For events with no healing amount (like misses), add to the generic effect
          const key = abilityId.toString();
          if (!effectsByAbility.has(key)) {
            getOrCreateEffect(abilityId); // This creates the effect if it doesn't exist
          }
          const effect = effectsByAbility.get(key) as Effect;
          effect.events.push(event);
        }
      });

      return {
        grimoire: grimoireType,
        effects: Array.from(effectsByAbility.values()),
        talentName: talent.name,
        talentGuid: talent.guid,
      };
    }
  }

  return null;
}

/**
 * Analyze scribing skills for all players in the report
 * @param playerDetails Player details structure from the report
 * @param masterData Master data structure containing abilities
 * @param allDebuffEvents All debuff events
 * @param allBuffEvents All buff events
 * @param allResourceEvents All resource change events
 * @param allDamageEvents All damage events
 * @param allHealingEvents All healing events
 * @param allCastEvents All cast events
 * @returns Record of player IDs to their scribing skill analyses
 */
export function analyzeAllPlayersScribingSkills(
  playerDetails: PlayerDetails,
  masterData: MasterData,
  allDebuffEvents: DebuffEvent[],
  allBuffEvents: BuffEvent[],
  allResourceEvents: ResourceChangeEvent[],
  allDamageEvents: DamageEvent[],
  allHealingEvents: HealEvent[],
  allCastEvents: CastEvent[],
): Record<number, ScribingSkillAnalysis[]> {
  const result: Record<number, ScribingSkillAnalysis[]> = {};

  // Get all players from the player details structure
  const allPlayers = [
    ...(playerDetails.data?.playerDetails?.tanks || []),
    ...(playerDetails.data?.playerDetails?.dps || []),
    ...(playerDetails.data?.playerDetails?.healers || []),
  ];

  const allReportAbilities = masterData.reportData?.report?.masterData?.abilities || [];

  // Analyze each player's scribing skills
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allPlayers.forEach((player: any) => {
    const playerId = player.id;
    const talents = player.combatantInfo?.talents || [];

    const scribingAnalyses: ScribingSkillAnalysis[] = [];

    talents.forEach((talent: PlayerTalent) => {
      const analysis = analyzeScribingSkillEffects(
        talent,
        allReportAbilities,
        allDebuffEvents,
        allBuffEvents,
        allResourceEvents,
        allDamageEvents,
        allCastEvents,
        allHealingEvents,
        playerId,
      );

      if (analysis) {
        scribingAnalyses.push(analysis);
      }
    });

    if (scribingAnalyses.length > 0) {
      result[playerId] = scribingAnalyses;
    }
  });

  return result;
}
