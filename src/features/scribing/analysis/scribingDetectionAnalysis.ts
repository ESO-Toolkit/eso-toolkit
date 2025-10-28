import scribingData from '../../../../data/scribing-complete.json';
import type {
  BuffEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
  UnifiedCastEvent,
} from '../../../types/combatlogEvents';
import type {
  ResolvedScribingDetection,
  ScribedSkillAffixInfo,
  ScribedSkillData,
  ScribedSkillSignatureInfo,
} from '../types';
import { getScribingSkillByAbilityId, type ScribingSkillInfo } from '../utils/Scribing';

export const SCRIBING_DETECTION_SCHEMA_VERSION = 2;

export interface CombatEventData {
  buffs: BuffEvent[];
  debuffs: DebuffEvent[];
  damage: DamageEvent[];
  casts: UnifiedCastEvent[];
  heals: HealEvent[];
  resources: ResourceChangeEvent[];
}

export interface DetectionLogger {
  debug?: (message: string, data?: unknown) => void;
  info?: (message: string, data?: unknown) => void;
  warn?: (message: string, data?: unknown) => void;
  error?: (message: string, data?: unknown) => void;
}

/**
 * Helper function to log debug information with fallback to console.log for workers
 */
function logDebug(logger: DetectionLogger | undefined, message: string, data?: unknown): void {
  if (logger?.debug) {
    logger.debug(message, data);
  } else {
    // Fallback to console.log for debugging in workers
    // eslint-disable-next-line no-console
    console.log(message, data);
  }
}

interface ScribingDataStructure {
  grimoires?: Record<string, { id?: number; nameTransformations?: Record<string, unknown> }>;
  signatureScripts?: Record<
    string,
    { name?: string; abilityIds?: number[]; compatibleGrimoires?: string[] }
  >;
  affixScripts?: Record<
    string,
    { name: string; abilityIds?: number[]; compatibleGrimoires?: string[] }
  >;
}

const VALID_SIGNATURE_SCRIPT_IDS = new Set<number>();
const SIGNATURE_SCRIPT_ID_TO_NAME = new Map<number, string>();
const VALID_AFFIX_SCRIPT_IDS = new Set<number>();
const AFFIX_SCRIPT_ID_TO_NAME = new Map<number, string>();
const DEFERRED_AFFIX_TRIGGER_ABILITIES = new Set<number>([240150]);

const BANNER_GRIMOIRE_KEY = 'banner-bearer';
const BANNER_PSEUDO_CAST_WINDOW_MS = 1000;
let BANNER_BASE_ABILITY_ID: number | null = null;
const BANNER_PRIMARY_ABILITY_IDS = new Set<number>();
const BANNER_ABILITY_TO_TRANSFORMATION = new Map<
  number,
  { transformation: string; primaryAbilityId: number }
>();

let isScribingDatasetInitialized = false;

type SignatureScriptEntry = {
  name: string;
  abilityIds?: number[];
  grimoireSpecificEffects?: Record<string, { mainAbilityId?: number; statusEffects?: number[] }>;
};

type AffixScriptEntry = {
  name: string;
  abilityIds?: number[];
  compatibleGrimoires?: string[];
};

const CLASS_MASTERY_EXTRA_EFFECT_IDS = [252143];

function initializeScribingDataset(): void {
  if (isScribingDatasetInitialized) {
    return;
  }

  VALID_SIGNATURE_SCRIPT_IDS.clear();
  SIGNATURE_SCRIPT_ID_TO_NAME.clear();
  VALID_AFFIX_SCRIPT_IDS.clear();
  AFFIX_SCRIPT_ID_TO_NAME.clear();
  BANNER_PRIMARY_ABILITY_IDS.clear();
  BANNER_ABILITY_TO_TRANSFORMATION.clear();
  BANNER_BASE_ABILITY_ID = null;

  const data = scribingData as ScribingDataStructure;

  const bannerGrimoire = data.grimoires?.[BANNER_GRIMOIRE_KEY];
  if (bannerGrimoire && typeof bannerGrimoire.id === 'number') {
    BANNER_BASE_ABILITY_ID = bannerGrimoire.id;
  }

  if (bannerGrimoire?.nameTransformations) {
    Object.values(
      bannerGrimoire.nameTransformations as Record<string, { name: string; abilityIds?: number[] }>,
    ).forEach((config) => {
      if (!config?.name) {
        return;
      }

      const abilityIds = Array.isArray(config.abilityIds) ? config.abilityIds : [];
      const primaryAbilityId = abilityIds[0];

      if (typeof primaryAbilityId === 'number') {
        BANNER_PRIMARY_ABILITY_IDS.add(primaryAbilityId);
      }

      abilityIds.forEach((id) => {
        if (typeof id !== 'number') {
          return;
        }

        if (BANNER_BASE_ABILITY_ID !== null && id === BANNER_BASE_ABILITY_ID) {
          return;
        }

        const resolvedPrimaryAbilityId =
          typeof primaryAbilityId === 'number' && primaryAbilityId !== BANNER_BASE_ABILITY_ID
            ? primaryAbilityId
            : id;

        BANNER_ABILITY_TO_TRANSFORMATION.set(id, {
          transformation: config.name,
          primaryAbilityId: resolvedPrimaryAbilityId,
        });
      });
    });
  }

  if (data.signatureScripts) {
    Object.values(data.signatureScripts as Record<string, SignatureScriptEntry>).forEach((script) => {
      script.abilityIds?.forEach((id) => {
        VALID_SIGNATURE_SCRIPT_IDS.add(id);
        SIGNATURE_SCRIPT_ID_TO_NAME.set(id, script.name);
      });

      if (script.grimoireSpecificEffects) {
        Object.values(script.grimoireSpecificEffects).forEach((config) => {
          if (config.mainAbilityId) {
            VALID_SIGNATURE_SCRIPT_IDS.add(config.mainAbilityId);
            SIGNATURE_SCRIPT_ID_TO_NAME.set(config.mainAbilityId, script.name);
          }
          config.statusEffects?.forEach((id) => {
            VALID_SIGNATURE_SCRIPT_IDS.add(id);
            SIGNATURE_SCRIPT_ID_TO_NAME.set(id, script.name);
          });
        });
      }
    });
  }

  const classMasteryScript = data.signatureScripts?.['class-mastery'];
  if (classMasteryScript) {
    CLASS_MASTERY_EXTRA_EFFECT_IDS.forEach((id) => {
      VALID_SIGNATURE_SCRIPT_IDS.add(id);
      SIGNATURE_SCRIPT_ID_TO_NAME.set(id, classMasteryScript.name ?? 'Class Mastery');
    });
  }

  if (data.affixScripts) {
    Object.values(data.affixScripts as Record<string, AffixScriptEntry>).forEach((script) => {
      script.abilityIds?.forEach((id) => {
        VALID_AFFIX_SCRIPT_IDS.add(id);
        AFFIX_SCRIPT_ID_TO_NAME.set(id, script.name);
      });
    });
  }

  isScribingDatasetInitialized = true;
}

const SCRIBING_INFO_CACHE = new Map<number, ScribingSkillInfo | null>();

function lookupScribingSkill(abilityId: number): ScribingSkillInfo | null {
  initializeScribingDataset();

  if (!SCRIBING_INFO_CACHE.has(abilityId)) {
    SCRIBING_INFO_CACHE.set(abilityId, getScribingSkillByAbilityId(abilityId));
  }
  return SCRIBING_INFO_CACHE.get(abilityId) ?? null;
}

function synthesizeBannerCasts(
  casts: UnifiedCastEvent[],
  buffs: BuffEvent[],
  abilityId: number,
  playerId: number,
): UnifiedCastEvent[] {
  const syntheticCasts: UnifiedCastEvent[] = [];
  const lastSyntheticTimestampByPlayer = new Map<number, number>();

  for (const buff of buffs) {
    if (buff.sourceID !== playerId) {
      continue;
    }
    if (buff.type !== 'applybuff' && buff.type !== 'applybuffstack') {
      continue;
    }

    const buffInfo = lookupScribingSkill(buff.abilityGameID);
    if (!buffInfo || buffInfo.grimoireKey !== BANNER_GRIMOIRE_KEY) {
      continue;
    }

    const lastTimestamp = lastSyntheticTimestampByPlayer.get(playerId);
    if (
      lastTimestamp !== undefined &&
      buff.timestamp - lastTimestamp < BANNER_PSEUDO_CAST_WINDOW_MS
    ) {
      continue;
    }

    lastSyntheticTimestampByPlayer.set(playerId, buff.timestamp);

    syntheticCasts.push({
      timestamp: buff.timestamp,
      type: 'cast',
      sourceID: buff.sourceID,
      sourceIsFriendly: buff.sourceIsFriendly,
      targetID: buff.targetID,
      targetIsFriendly: buff.targetIsFriendly,
      abilityGameID: abilityId,
      fight: buff.fight,
      fake: true,
    });
  }

  if (syntheticCasts.length === 0) {
    return casts;
  }

  return [...casts, ...syntheticCasts].sort((a, b) => a.timestamp - b.timestamp);
}

function resolveBannerPrimaryAbilityId(
  abilityId: number,
  playerId: number,
  buffs: BuffEvent[],
): ScribingSkillInfo | null {
  if (!playerId) {
    return null;
  }

  const baseInfo = lookupScribingSkill(abilityId);
  if (!baseInfo || baseInfo.grimoireKey !== BANNER_GRIMOIRE_KEY) {
    return null;
  }

  const transformationCounts = new Map<string, { count: number; primaryAbilityId: number }>();

  buffs.forEach((buff) => {
    if (buff.sourceID !== playerId) {
      return;
    }
    if (buff.type !== 'applybuff' && buff.type !== 'applybuffstack') {
      return;
    }

    const mapping = BANNER_ABILITY_TO_TRANSFORMATION.get(buff.abilityGameID);
    if (!mapping) {
      return;
    }

    const existing = transformationCounts.get(mapping.transformation) ?? {
      count: 0,
      primaryAbilityId: mapping.primaryAbilityId,
    };

    existing.count += 1;
    transformationCounts.set(mapping.transformation, existing);
  });

  if (transformationCounts.size === 0) {
    return null;
  }

  const baseCount = transformationCounts.get(baseInfo.transformation)?.count ?? 0;

  let topTransformation = baseInfo.transformation;
  let topPrimaryAbilityId = abilityId;
  let topCount = baseCount;

  transformationCounts.forEach((data, transformation) => {
    if (data.count > topCount) {
      topTransformation = transformation;
      topPrimaryAbilityId = data.primaryAbilityId;
      topCount = data.count;
    }
  });

  if (topTransformation === baseInfo.transformation) {
    return null;
  }

  if (topCount <= baseCount) {
    return null;
  }

  const info = lookupScribingSkill(topPrimaryAbilityId);
  if (!info || info.grimoireKey !== BANNER_GRIMOIRE_KEY) {
    return null;
  }

  return info;
}

function detectSignatureScript(
  abilityId: number,
  playerId: number,
  combatEvents: CombatEventData,
): ScribedSkillSignatureInfo | null {
  initializeScribingDataset();

  const abilityCasts = combatEvents.casts.filter(
    (event) =>
      event.type === 'cast' && event.sourceID === playerId && event.abilityGameID === abilityId,
  );

  if (abilityCasts.length === 0) {
    return null;
  }

  const SIGNATURE_WINDOW_MS = 1500;
  const signatureEffects = new Map<number, { name: string; count: number; type: string }>();

  const checkAndCountSignature = (
    event: { abilityGameID: number; extraAbilityGameID?: number | null },
    eventType: string,
  ): void => {
    if (event.abilityGameID !== abilityId && VALID_SIGNATURE_SCRIPT_IDS.has(event.abilityGameID)) {
      const existing =
        signatureEffects.get(event.abilityGameID) ||
        ({ name: `${eventType} ${event.abilityGameID}`, count: 0, type: eventType } as const);
      signatureEffects.set(event.abilityGameID, {
        ...existing,
        count: existing.count + 1,
      });
    }

    if (
      event.extraAbilityGameID &&
      event.extraAbilityGameID !== abilityId &&
      VALID_SIGNATURE_SCRIPT_IDS.has(event.extraAbilityGameID)
    ) {
      const existing =
        signatureEffects.get(event.extraAbilityGameID) ||
        ({
          name: `${eventType} ${event.extraAbilityGameID}`,
          count: 0,
          type: eventType,
        } as const);
      signatureEffects.set(event.extraAbilityGameID, {
        ...existing,
        count: existing.count + 1,
      });
    }
  };

  for (const cast of abilityCasts) {
    const windowEnd = cast.timestamp + SIGNATURE_WINDOW_MS;

    combatEvents.buffs
      .filter(
        (buff) =>
          buff.sourceID === playerId &&
          buff.timestamp > cast.timestamp &&
          buff.timestamp <= windowEnd,
      )
      .forEach((buff) => checkAndCountSignature(buff, 'buff'));

    combatEvents.debuffs
      .filter(
        (debuff) =>
          debuff.sourceID === playerId &&
          debuff.timestamp > cast.timestamp &&
          debuff.timestamp <= windowEnd,
      )
      .forEach((debuff) => checkAndCountSignature(debuff, 'debuff'));

    combatEvents.damage
      .filter(
        (damage) =>
          damage.sourceID === playerId &&
          damage.timestamp > cast.timestamp &&
          damage.timestamp <= windowEnd,
      )
      .forEach((damage) => checkAndCountSignature(damage, 'damage'));

    combatEvents.heals
      .filter(
        (heal) =>
          heal.sourceID === playerId &&
          heal.timestamp > cast.timestamp &&
          heal.timestamp <= windowEnd,
      )
      .forEach((heal) => checkAndCountSignature(heal, 'healing'));

    combatEvents.resources
      .filter(
        (resource) =>
          resource.sourceID === playerId &&
          resource.timestamp > cast.timestamp &&
          resource.timestamp <= windowEnd,
      )
      .forEach((resource) => checkAndCountSignature(resource, 'resource'));

    combatEvents.casts
      .filter(
        (castEvent) =>
          castEvent.sourceID === playerId &&
          castEvent.abilityGameID !== abilityId &&
          castEvent.timestamp > cast.timestamp &&
          castEvent.timestamp <= windowEnd,
      )
      .forEach((castEvent) => checkAndCountSignature(castEvent, 'cast'));
  }

  const MIN_CONSISTENCY = 0.5;
  const consistentEffects = Array.from(signatureEffects.entries())
    .filter(([, effect]) => effect.count >= abilityCasts.length * MIN_CONSISTENCY)
    .sort((a, b) => b[1].count - a[1].count);

  if (consistentEffects.length === 0) {
    return null;
  }

  const [topEffectId, topEffect] = consistentEffects[0];
  const confidence = Math.min(0.95, topEffect.count / abilityCasts.length);
  const scriptName = SIGNATURE_SCRIPT_ID_TO_NAME.get(topEffectId);

  return {
    name: scriptName || `Signature Script (Effect ID: ${topEffectId})`,
    confidence,
    detectionMethod: 'Post-Cast Pattern Analysis',
    evidence: [
      `Analyzed ${abilityCasts.length} casts`,
      `Found ${consistentEffects.length} consistent effects`,
      `Top effect: ${topEffect.type} ID ${topEffectId} (${topEffect.count}/${abilityCasts.length} casts)`,
      ...consistentEffects
        .slice(0, 3)
        .map(([id, eff]) => `${eff.type} ${id}: ${eff.count} occurrences`),
    ],
  };
}

function detectAffixScripts(
  abilityId: number,
  playerId: number,
  combatEvents: CombatEventData,
  grimoireKey?: string,
  logger?: DetectionLogger,
): ScribedSkillAffixInfo[] {
  initializeScribingDataset();

  const castEvents = combatEvents.casts.filter((event) => event.type === 'cast');
  const casts = castEvents.filter(
    (event) => event.sourceID === playerId && event.abilityGameID === abilityId,
  );

  if (casts.length === 0) {
    logger?.debug?.('Affix detection skipped: no casts for ability', {
      abilityId,
      playerId,
      grimoireKey,
    });
    return [];
  }

  const GRIMOIRE_COMPATIBLE_AFFIX_IDS = new Set<number>();

  if (grimoireKey) {
    Object.values(
      (scribingData as ScribingDataStructure).affixScripts as Record<string, AffixScriptEntry>,
    ).forEach((script) => {
      if (script.compatibleGrimoires?.includes(grimoireKey)) {
        script.abilityIds?.forEach((id) => GRIMOIRE_COMPATIBLE_AFFIX_IDS.add(id));
      }
    });
  } else {
    VALID_AFFIX_SCRIPT_IDS.forEach((id) => GRIMOIRE_COMPATIBLE_AFFIX_IDS.add(id));
  }

  logger?.debug?.('Affix detection window initialization', {
    abilityId,
    playerId,
    grimoireKey,
    castsAnalyzed: casts.length,
    compatibleAffixIds: Array.from(GRIMOIRE_COMPATIBLE_AFFIX_IDS).sort(),
  });

  const AFFIX_WINDOW_MS = 1000;
  const BUFF_WINDOW_MS = 1200;
  const IMMEDIATE_TRIGGER_THRESHOLD_MS = 10; // Buffs applied within 10ms are likely scribing affixes

  const buffCandidates = new Map<number, Set<number>>();
  const debuffCandidates = new Map<number, Set<number>>();
  const damageCandidates = new Map<number, Set<number>>();
  const healCandidates = new Map<number, Set<number>>();
  const resourceCandidates = new Map<number, Set<number>>();

  // Track timing information for buff candidates to identify immediate triggers
  const buffTimings = new Map<number, { immediateCasts: Set<number>; totalCasts: Set<number> }>();

  const getAffixTriggerStartTime = (
    cast: UnifiedCastEvent,
    ability: number,
    player: number,
  ): number => {
    if (!DEFERRED_AFFIX_TRIGGER_ABILITIES.has(ability)) {
      return cast.timestamp;
    }

    const candidates: number[] = [];

    const recordNext = <T extends { sourceID: number; timestamp: number }>(
      items: T[],
      predicate: (item: T) => boolean = () => true,
    ): void => {
      const next = items.find(
        (item) => item.sourceID === player && item.timestamp > cast.timestamp && predicate(item),
      );
      if (next) {
        candidates.push(next.timestamp);
      }
    };

    recordNext(castEvents, (event) => event.abilityGameID !== ability);
    recordNext(combatEvents.damage);
    recordNext(combatEvents.heals);

    const resourceCost = combatEvents.resources.find(
      (event) =>
        event.sourceID === player &&
        event.timestamp > cast.timestamp &&
        (event.resourceChange ?? 0) < 0,
    );
    if (resourceCost) {
      candidates.push(resourceCost.timestamp);
    }

    if (candidates.length === 0) {
      const nextCast = castEvents.find(
        (event) => event.sourceID === player && event.timestamp > cast.timestamp,
      );
      if (nextCast) {
        candidates.push(nextCast.timestamp);
      }
    }

    if (candidates.length === 0) {
      return cast.timestamp;
    }

    return Math.min(...candidates);
  };

  casts.forEach((cast, castIndex) => {
    const triggerStart = getAffixTriggerStartTime(cast, abilityId, playerId);
    const windowStart = triggerStart;
    const windowEnd = triggerStart + AFFIX_WINDOW_MS;
    const buffWindowEnd = triggerStart + BUFF_WINDOW_MS;

    const windowBuffs = combatEvents.buffs.filter(
      (buff) =>
        buff.sourceID === playerId &&
        buff.targetID === playerId &&
        buff.timestamp >= windowStart &&
        buff.timestamp <= buffWindowEnd &&
        !('extraAbilityGameID' in buff && buff.extraAbilityGameID),
    );

    const windowDebuffs = combatEvents.debuffs.filter(
      (debuff) =>
        debuff.sourceID === playerId &&
        debuff.timestamp >= windowStart &&
        debuff.timestamp <= buffWindowEnd &&
        !('extraAbilityGameID' in debuff && debuff.extraAbilityGameID),
    );

    const windowDamage = combatEvents.damage.filter(
      (damage) =>
        damage.sourceID === playerId &&
        damage.timestamp > windowStart &&
        damage.timestamp <= windowEnd &&
        damage.abilityGameID !== abilityId,
    );

    const windowHeals = combatEvents.heals.filter(
      (heal) =>
        heal.sourceID === playerId &&
        heal.timestamp > windowStart &&
        heal.timestamp <= windowEnd &&
        heal.abilityGameID !== abilityId,
    );

    const windowResources = combatEvents.resources.filter(
      (resource) =>
        resource.sourceID === playerId &&
        resource.timestamp > windowStart &&
        resource.timestamp <= windowEnd &&
        resource.abilityGameID !== abilityId,
    );

    windowBuffs.forEach((buff) => {
      if (
        buff.abilityGameID !== abilityId &&
        GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(buff.abilityGameID)
      ) {
        if (!buffCandidates.has(buff.abilityGameID)) {
          buffCandidates.set(buff.abilityGameID, new Set());
        }
        buffCandidates.get(buff.abilityGameID)!.add(castIndex);

        // Track timing information for immediate trigger detection
        const offsetFromCast = buff.timestamp - cast.timestamp;
        if (!buffTimings.has(buff.abilityGameID)) {
          buffTimings.set(buff.abilityGameID, { immediateCasts: new Set(), totalCasts: new Set() });
        }
        const timing = buffTimings.get(buff.abilityGameID)!;
        timing.totalCasts.add(castIndex);
        if (offsetFromCast <= IMMEDIATE_TRIGGER_THRESHOLD_MS) {
          timing.immediateCasts.add(castIndex);
        }
      }
    });

    windowDebuffs.forEach((debuff) => {
      if (
        debuff.abilityGameID !== abilityId &&
        GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(debuff.abilityGameID)
      ) {
        if (!debuffCandidates.has(debuff.abilityGameID)) {
          debuffCandidates.set(debuff.abilityGameID, new Set());
        }
        debuffCandidates.get(debuff.abilityGameID)!.add(castIndex);
      }
    });

    windowDamage.forEach((damage) => {
      if (GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(damage.abilityGameID)) {
        if (!damageCandidates.has(damage.abilityGameID)) {
          damageCandidates.set(damage.abilityGameID, new Set());
        }
        damageCandidates.get(damage.abilityGameID)!.add(castIndex);
      }
    });

    windowHeals.forEach((heal) => {
      if (GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(heal.abilityGameID)) {
        if (!healCandidates.has(heal.abilityGameID)) {
          healCandidates.set(heal.abilityGameID, new Set());
        }
        healCandidates.get(heal.abilityGameID)!.add(castIndex);
      }
    });

    windowResources.forEach((resource) => {
      if (GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(resource.abilityGameID)) {
        if (!resourceCandidates.has(resource.abilityGameID)) {
          resourceCandidates.set(resource.abilityGameID, new Set());
        }
        resourceCandidates.get(resource.abilityGameID)!.add(castIndex);
      }
    });

    if (logger?.debug) {
      logger.debug('Affix detection cast window results', {
        abilityId,
        playerId,
        castIndex,
        triggerStart,
        buffs: windowBuffs.map((buff) => buff.abilityGameID),
        debuffs: windowDebuffs.map((debuff) => debuff.abilityGameID),
        damage: windowDamage.map((damage) => damage.abilityGameID),
        heals: windowHeals.map((heal) => heal.abilityGameID),
        resources: windowResources.map((resource) => resource.abilityGameID),
      });
    } else {
      logDebug(logger, '[ScribingDetection] Affix detection cast window results', {
        abilityId,
        playerId,
        castIndex,
        triggerStart,
        buffs: windowBuffs.map((buff) => buff.abilityGameID),
        debuffs: windowDebuffs.map((debuff) => debuff.abilityGameID),
        damage: windowDamage.map((damage) => damage.abilityGameID),
        heals: windowHeals.map((heal) => heal.abilityGameID),
        resources: windowResources.map((resource) => resource.abilityGameID),
      });
    }
  });

  const serializeCandidateMap = (
    map: Map<number, Set<number>>,
  ): Array<{ abilityId: number; casts: number[] }> =>
    Array.from(map.entries()).map(([candidateId, castSet]) => ({
      abilityId: candidateId,
      casts: Array.from(castSet).sort((a, b) => a - b),
    }));

  logger?.debug?.('Affix detection candidate summary', {
    abilityId,
    playerId,
    buffCandidates: serializeCandidateMap(buffCandidates),
    debuffCandidates: serializeCandidateMap(debuffCandidates),
    damageCandidates: serializeCandidateMap(damageCandidates),
    healCandidates: serializeCandidateMap(healCandidates),
    resourceCandidates: serializeCandidateMap(resourceCandidates),
  });

  logDebug(logger, '[ScribingDetection] Affix detection candidate summary', {
    abilityId,
    playerId,
    buffCandidates: serializeCandidateMap(buffCandidates),
    debuffCandidates: serializeCandidateMap(debuffCandidates),
    damageCandidates: serializeCandidateMap(damageCandidates),
    healCandidates: serializeCandidateMap(healCandidates),
    resourceCandidates: serializeCandidateMap(resourceCandidates),
  });

  const allCandidates: Array<{
    id: number;
    castSet: Set<number>;
    consistency: number;
    type: 'buff' | 'debuff' | 'damage' | 'heal' | 'resource';
  }> = [];

  buffCandidates.forEach((castSet, id) => {
    allCandidates.push({
      id,
      castSet,
      consistency: castSet.size / casts.length,
      type: 'buff',
    });
  });

  debuffCandidates.forEach((castSet, id) => {
    allCandidates.push({
      id,
      castSet,
      consistency: castSet.size / casts.length,
      type: 'debuff',
    });
  });

  damageCandidates.forEach((castSet, id) => {
    allCandidates.push({
      id,
      castSet,
      consistency: castSet.size / casts.length,
      type: 'damage',
    });
  });

  healCandidates.forEach((castSet, id) => {
    allCandidates.push({
      id,
      castSet,
      consistency: castSet.size / casts.length,
      type: 'heal',
    });
  });

  resourceCandidates.forEach((castSet, id) => {
    allCandidates.push({
      id,
      castSet,
      consistency: castSet.size / casts.length,
      type: 'resource',
    });
  });

  if (allCandidates.length === 0) {
    logger?.debug?.('Affix detection found no viable candidates', {
      abilityId,
      playerId,
    });
    return [];
  }

  const preferTypeOrder: Array<'buff' | 'debuff' | 'damage' | 'heal'> = [
    'buff',
    'debuff',
    'damage',
    'heal',
  ];

  type AggregatedCandidate = {
    key: string;
    scriptName?: string;
    abilityIds: Set<number>;
    castSet: Set<number>;
    typeCounts: Record<'buff' | 'debuff' | 'damage' | 'heal' | 'resource', number>;
  };

  const aggregated = new Map<string, AggregatedCandidate>();

  allCandidates.forEach((candidate) => {
    const scriptName = AFFIX_SCRIPT_ID_TO_NAME.get(candidate.id);
    const key = scriptName ?? `ability-${candidate.id}`;

    if (!aggregated.has(key)) {
      aggregated.set(key, {
        key,
        scriptName,
        abilityIds: new Set<number>(),
        castSet: new Set<number>(),
        typeCounts: {
          buff: 0,
          debuff: 0,
          damage: 0,
          heal: 0,
          resource: 0,
        },
      });
    }

    const entry = aggregated.get(key)!;
    entry.abilityIds.add(candidate.id);
    candidate.castSet.forEach((index) => entry.castSet.add(index));
    entry.typeCounts[candidate.type] += 1;
  });

  const aggregatedCandidates = Array.from(aggregated.values()).map((entry) => {
    const dominantType = preferTypeOrder.reduce<'buff' | 'debuff' | 'damage' | 'heal'>(
      (acc, type) => {
        if (entry.typeCounts[type] > entry.typeCounts[acc]) {
          return type;
        }
        return acc;
      },
      'buff',
    );

    const totalCasts = casts.length;
    const consistency = totalCasts > 0 ? entry.castSet.size / totalCasts : 0;

    // Calculate immediate trigger ratio for buff-type candidates
    let immediateTriggerRatio = 0;
    if (dominantType === 'buff') {
      // Check if any of the ability IDs have timing information
      for (const abilityId of entry.abilityIds) {
        const timing = buffTimings.get(abilityId);
        if (timing && timing.totalCasts.size > 0) {
          const ratio = timing.immediateCasts.size / timing.totalCasts.size;
          immediateTriggerRatio = Math.max(immediateTriggerRatio, ratio);
        }
      }
    }

    return {
      key: entry.key,
      scriptName: entry.scriptName,
      abilityIds: entry.abilityIds,
      castSet: entry.castSet,
      dominantType,
      consistency,
      immediateTriggerRatio,
    };
  });

  logger?.debug?.('Affix detection aggregated candidates', {
    abilityId,
    playerId,
    aggregatedCandidates: aggregatedCandidates.map((candidate) => ({
      key: candidate.key,
      scriptName: candidate.scriptName,
      dominantType: candidate.dominantType,
      consistency: candidate.consistency,
      immediateTriggerRatio: candidate.immediateTriggerRatio,
      abilityIds: Array.from(candidate.abilityIds).sort((a, b) => a - b),
      castIndexes: Array.from(candidate.castSet).sort((a, b) => a - b),
    })),
  });

  logDebug(logger, '[ScribingDetection] Affix detection aggregated candidates', {
    abilityId,
    playerId,
    aggregatedCandidates: aggregatedCandidates.map((candidate) => ({
      key: candidate.key,
      scriptName: candidate.scriptName,
      dominantType: candidate.dominantType,
      consistency: candidate.consistency,
      immediateTriggerRatio: candidate.immediateTriggerRatio,
      abilityIds: Array.from(candidate.abilityIds).sort((a, b) => a - b),
      castIndexes: Array.from(candidate.castSet).sort((a, b) => a - b),
    })),
  });

  aggregatedCandidates.sort((a, b) => {
    // Prioritize candidates with high immediate trigger ratios (>= 0.5 means at least 50% immediate)
    const aHasImmediateTrigger = a.immediateTriggerRatio >= 0.5;
    const bHasImmediateTrigger = b.immediateTriggerRatio >= 0.5;

    if (aHasImmediateTrigger !== bHasImmediateTrigger) {
      return bHasImmediateTrigger ? 1 : -1; // Prefer immediate triggers
    }

    // If both have or both don't have immediate triggers, sort by consistency
    if (b.consistency !== a.consistency) {
      return b.consistency - a.consistency;
    }
    if (b.castSet.size !== a.castSet.size) {
      return b.castSet.size - a.castSet.size;
    }
    if (a.scriptName && b.scriptName) {
      return a.scriptName.localeCompare(b.scriptName);
    }
    if (a.scriptName) {
      return -1;
    }
    if (b.scriptName) {
      return 1;
    }
    const aMin = Math.min(...a.abilityIds);
    const bMin = Math.min(...b.abilityIds);
    return aMin - bMin;
  });

  const topAggregate = aggregatedCandidates[0];
  if (!topAggregate) {
    return [];
  }

  logger?.info?.('Affix detection selected top candidate', {
    abilityId,
    playerId,
    grimoireKey,
    scriptName: topAggregate.scriptName,
    dominantType: topAggregate.dominantType,
    consistency: topAggregate.consistency,
    abilityIds: Array.from(topAggregate.abilityIds).sort((a, b) => a - b),
    castIndexes: Array.from(topAggregate.castSet).sort((a, b) => a - b),
  });

  logDebug(logger, '[ScribingDetection] ✅ SELECTED TOP CANDIDATE (FINAL RESULT)', {
    abilityId,
    playerId,
    grimoireKey,
    scriptName: topAggregate.scriptName,
    dominantType: topAggregate.dominantType,
    consistency: topAggregate.consistency,
    abilityIds: Array.from(topAggregate.abilityIds).sort((a, b) => a - b),
    castIndexes: Array.from(topAggregate.castSet).sort((a, b) => a - b),
  });

  const confidence = topAggregate.consistency;
  const scriptName = topAggregate.scriptName;
  const primaryAbilityId = Math.min(...topAggregate.abilityIds);

  let detectionMethod = '';
  let description = '';

  switch (topAggregate.dominantType) {
    case 'buff':
      detectionMethod = 'Buff Pattern Analysis (No extraAbilityGameID)';
      description = `Applies buff effects in ${Math.round(confidence * 100)}% of casts`;
      break;
    case 'debuff':
      detectionMethod = 'Debuff Pattern Analysis (No extraAbilityGameID)';
      description = `Applies debuff effects in ${Math.round(confidence * 100)}% of casts`;
      break;
    case 'damage':
      detectionMethod = 'Damage Pattern Analysis';
      description = `Adds additional damage effects in ${Math.round(confidence * 100)}% of casts`;
      break;
    case 'heal':
      detectionMethod = 'Healing Pattern Analysis';
      description = `Adds additional healing effects in ${Math.round(confidence * 100)}% of casts`;
      break;
  }

  const buffIds: number[] = [];
  const debuffIds: number[] = [];
  const abilityNames: string[] = [];

  topAggregate.abilityIds.forEach((id) => {
    if (topAggregate.dominantType === 'buff') {
      buffIds.push(id);
    } else if (topAggregate.dominantType === 'debuff') {
      debuffIds.push(id);
    } else if (topAggregate.dominantType === 'damage' || topAggregate.dominantType === 'heal') {
      abilityNames.push(
        `${topAggregate.dominantType.charAt(0).toUpperCase() + topAggregate.dominantType.slice(1)} Ability ${id}`,
      );
    }
  });

  return [
    {
      id: `affix-${scriptName ?? primaryAbilityId}`,
      name:
        scriptName ??
        `${topAggregate.dominantType.charAt(0).toUpperCase() + topAggregate.dominantType.slice(1)} Affix Script`,
      description,
      confidence,
      detectionMethod,
      evidence: {
        buffIds,
        debuffIds,
        abilityNames,
        occurrenceCount: topAggregate.castSet.size,
      },
    },
  ];
}

function buildRecipeInfo(scribingInfo: ScribingSkillInfo): ScribedSkillData['recipe'] {
  return {
    grimoire: scribingInfo.grimoire,
    transformation: scribingInfo.transformation,
    transformationType: scribingInfo.transformationType,
    confidence: 1.0,
    matchMethod: 'Database Lookup',
    recipeSummary: `📖 ${scribingInfo.grimoire} + 🔄 ${scribingInfo.transformation}`,
    tooltipInfo: `Detected from scribing database with 100% confidence`,
  };
}

export interface ComputeScribingDetectionOptions {
  abilityId: number;
  playerId: number;
  combatEvents: CombatEventData;
  logger?: DetectionLogger;
}

export function computeScribingDetection(
  options: ComputeScribingDetectionOptions,
): ResolvedScribingDetection | null {
  initializeScribingDataset();

  const { abilityId, playerId, combatEvents, logger } = options;

  let effectiveAbilityId = abilityId;
  let scribingInfo = lookupScribingSkill(effectiveAbilityId);

  if (!scribingInfo) {
    return null;
  }

  const baseLooksLikeBanner =
    scribingInfo.grimoireKey === BANNER_GRIMOIRE_KEY ||
    BANNER_PRIMARY_ABILITY_IDS.has(effectiveAbilityId);

  if (baseLooksLikeBanner) {
    const resolved = resolveBannerPrimaryAbilityId(
      effectiveAbilityId,
      playerId,
      combatEvents.buffs,
    );
    if (resolved && resolved.abilityId !== effectiveAbilityId) {
      logger?.info?.('Resolved banner focus from combat data', {
        originalAbilityId: effectiveAbilityId,
        resolvedAbilityId: resolved.abilityId,
        playerId,
        transformation: resolved.transformation,
      });
      effectiveAbilityId = resolved.abilityId;
      scribingInfo = resolved;
    }
  }

  let normalizedCasts = combatEvents.casts;
  const loggedCastCount = combatEvents.casts.filter(
    (event) =>
      event.type === 'cast' &&
      event.sourceID === playerId &&
      event.abilityGameID === effectiveAbilityId,
  ).length;

  if (scribingInfo.grimoireKey === BANNER_GRIMOIRE_KEY && loggedCastCount === 0) {
    const extended = synthesizeBannerCasts(
      combatEvents.casts,
      combatEvents.buffs,
      effectiveAbilityId,
      playerId,
    );
    if (extended !== combatEvents.casts) {
      logger?.debug?.('Synthesized banner casts from buff events', {
        abilityId: effectiveAbilityId,
        playerId,
        additionalCasts: extended.length - combatEvents.casts.length,
      });
    }
    normalizedCasts = extended;
  }

  const normalizedEvents: CombatEventData = {
    buffs: combatEvents.buffs,
    debuffs: combatEvents.debuffs,
    damage: combatEvents.damage,
    casts: normalizedCasts,
    heals: combatEvents.heals,
    resources: combatEvents.resources,
  };

  const abilityCastCount = normalizedCasts.filter(
    (event) =>
      event.type === 'cast' &&
      event.sourceID === playerId &&
      event.abilityGameID === effectiveAbilityId,
  ).length;
  const wasCastInFight = abilityCastCount > 0;

  const detectedSignature = wasCastInFight
    ? detectSignatureScript(effectiveAbilityId, playerId, normalizedEvents)
    : null;

  const detectedAffixes = wasCastInFight
    ? detectAffixScripts(
        effectiveAbilityId,
        playerId,
        normalizedEvents,
        scribingInfo.grimoireKey,
        logger,
      )
    : [];

  const signatureScript: ScribedSkillSignatureInfo = detectedSignature
    ? detectedSignature
    : wasCastInFight
      ? {
          name: 'Unknown Signature',
          confidence: 0.5,
          detectionMethod: 'Insufficient combat evidence',
          evidence: ['Unable to reach consistency threshold during detection'],
        }
      : {
          name: 'Signature undetermined',
          confidence: 0,
          detectionMethod: 'No casts in fight',
          evidence: ['Skill was never cast in this fight, so there is no combat data.'],
        };

  const affixScripts: ScribedSkillAffixInfo[] = wasCastInFight
    ? detectedAffixes.length > 0
      ? detectedAffixes
      : [
          {
            id: 'affix-unknown',
            name: 'Unknown Affix',
            description: 'Scribing affix script',
            confidence: 0.3,
            detectionMethod: 'Insufficient combat evidence',
            evidence: {
              buffIds: [],
              debuffIds: [],
              abilityNames: [],
              occurrenceCount: 0,
            },
          },
        ]
    : [];

  const scribedSkillData: ScribedSkillData = {
    grimoireName: scribingInfo.grimoire,
    effects: [],
    wasCastInFight,
    recipe: buildRecipeInfo(scribingInfo),
    signatureScript,
    affixScripts: affixScripts.length > 0 ? affixScripts : undefined,
  };

  return {
    schemaVersion: SCRIBING_DETECTION_SCHEMA_VERSION,
    abilityId,
    effectiveAbilityId,
    scribingInfo,
    wasCastInFight,
    signatureResult: detectedSignature,
    affixResults: detectedAffixes,
    scribedSkillData,
  };
}

export interface PlayerAbilityList {
  playerId: number;
  abilityIds: number[];
}

export interface ComputeScribingDetectionsForFightOptions {
  fightId: number;
  combatEvents: CombatEventData;
  playerAbilities: PlayerAbilityList[];
  logger?: DetectionLogger;
  onProgress?: (progress: number) => void;
}

export interface ScribingDetectionsMap {
  fightId: number;
  players: Record<number, Record<number, ResolvedScribingDetection>>;
}

export function computeScribingDetectionsForFight(
  options: ComputeScribingDetectionsForFightOptions,
): ScribingDetectionsMap {
  const { fightId, combatEvents, playerAbilities, logger, onProgress } = options;
  const players: Record<number, Record<number, ResolvedScribingDetection>> = {};

  const totalAbilities = playerAbilities.reduce((sum, entry) => sum + entry.abilityIds.length, 0);
  let processedAbilities = 0;

  playerAbilities.forEach(({ playerId, abilityIds }) => {
    abilityIds.forEach((abilityId) => {
      const result = computeScribingDetection({
        abilityId,
        playerId,
        combatEvents,
        logger,
      });

      if (!result) {
        return;
      }

      if (!players[playerId]) {
        players[playerId] = {};
      }

      players[playerId][abilityId] = result;

      processedAbilities += 1;
      if (totalAbilities > 0) {
        onProgress?.(processedAbilities / totalAbilities);
      }
    });
  });

  if (totalAbilities === 0) {
    onProgress?.(1);
  }

  return { fightId, players };
}
