import fs from 'node:fs';
import path from 'node:path';

import scribingDatabase from '../data/scribing-complete.json';
import { getGrimoireAbilityIds, getScribingSkillByAbilityId } from '../src/features/scribing/utils/Scribing';

interface RawEventsFile {
  reportData?: {
    report?: {
      events?: {
        data?: any[];
      };
    };
  };
}

interface RawMasterData {
  reportData?: {
    report?: {
      masterData?: {
        actors?: Array<{
          id?: number;
          name?: string;
          type?: string;
        }>;
        abilities?: Array<{
          id?: number;
          name?: string;
          icon?: string;
          abilityIcon?: string;
        }>;
      };
    };
  };
}

interface CastEvent {
  timestamp: number;
  type: 'cast' | 'begincast';
  sourceID: number;
  abilityGameID: number;
}

interface CombatEventBase {
  timestamp: number;
  sourceID: number;
  abilityGameID: number;
  extraAbilityGameID?: number | null;
}

interface DamageEvent extends CombatEventBase {}
interface HealEvent extends CombatEventBase {}
interface BuffEvent extends CombatEventBase {}
interface DebuffEvent extends CombatEventBase {}
interface ResourceEvent extends CombatEventBase {
  resourceChange?: number;
}

interface CombatEventData {
  buffs: BuffEvent[];
  debuffs: DebuffEvent[];
  damage: DamageEvent[];
  casts: CastEvent[];
  heals: HealEvent[];
  resources: ResourceEvent[];
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function loadAbilityNameLookup(): Map<number, string> {
  const abilityFile = path.resolve(__dirname, '../data/abilities.json');
  const lookup = new Map<number, string>();

  if (!fs.existsSync(abilityFile)) {
    return lookup;
  }

  try {
    const raw = readJson<Record<string, { name?: string }>>(abilityFile) ?? {};
    for (const [idString, ability] of Object.entries(raw)) {
      const id = Number(idString);
      if (!Number.isNaN(id) && ability?.name) {
        lookup.set(id, ability.name);
      }
    }
  } catch (error) {
    console.warn('Failed to load abilities.json lookup:', error instanceof Error ? error.message : error);
  }

  return lookup;
}

function loadEvents(filePath: string): any[] {
  const raw = readJson<RawEventsFile>(filePath);
  return raw.reportData?.report?.events?.data ?? [];
}

function buildAbilityNameMap(masterDataPath: string): Map<number, string> {
  const masterData = readJson<RawMasterData>(masterDataPath);
  const abilityMap = new Map<number, string>();
  const abilities = masterData.reportData?.report?.masterData?.abilities ?? [];
  for (const ability of abilities) {
    if (typeof ability?.id === 'number' && ability.name) {
      abilityMap.set(ability.id, ability.name);
    }
  }
  return abilityMap;
}

function buildActorNameMap(masterDataPath: string): Map<number, string> {
  const masterData = readJson<RawMasterData>(masterDataPath);
  const actorMap = new Map<number, string>();
  const actors = masterData.reportData?.report?.masterData?.actors ?? [];
  for (const actor of actors) {
    if (typeof actor?.id === 'number' && actor.name) {
      actorMap.set(actor.id, actor.name);
    }
  }
  return actorMap;
}

const VALID_SIGNATURE_SCRIPT_IDS = new Set<number>();
const SIGNATURE_SCRIPT_ID_TO_NAME = new Map<number, string>();
const VALID_AFFIX_SCRIPT_IDS = new Set<number>();
const AFFIX_SCRIPT_ID_TO_NAME = new Map<number, string>();
const DEFERRED_AFFIX_TRIGGER_ABILITIES = new Set<number>([240150]);

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

Object.values((scribingDatabase as any).signatureScripts as Record<string, SignatureScriptEntry>).forEach((script) => {
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

// ESO Logs currently reports the Arcanist Class Mastery signature via resource ticks that use
// ability ID 252143 rather than the class-specific banner ability IDs present in the scribing
// database. Manually register this effect so both offline analysis and the UI hook recognize it.
const CLASS_MASTERY_EXTRA_EFFECT_IDS = [252143];
const classMasteryScript = (scribingDatabase as any).signatureScripts?.['class-mastery'];
if (classMasteryScript) {
  CLASS_MASTERY_EXTRA_EFFECT_IDS.forEach((id) => {
    VALID_SIGNATURE_SCRIPT_IDS.add(id);
    SIGNATURE_SCRIPT_ID_TO_NAME.set(id, classMasteryScript.name ?? 'Class Mastery');
  });
}

Object.values((scribingDatabase as any).affixScripts as Record<string, AffixScriptEntry>).forEach((script) => {
  script.abilityIds?.forEach((id) => {
    VALID_AFFIX_SCRIPT_IDS.add(id);
    AFFIX_SCRIPT_ID_TO_NAME.set(id, script.name);
  });
});

interface SignatureAnalysisResult {
  castsAnalyzed: number;
  detectedScriptName?: string;
  detectedConfidence?: number;
  topEffects: Array<{ id: number; type: string; count: number; scriptName?: string }>;
  highlyCorrelated: Array<{ id: number; type: string; count: number; scriptName?: string }>;
}

function analyzeSignatureScript(
  abilityId: number,
  playerId: number,
  events: CombatEventData,
): SignatureAnalysisResult {
  const abilityCasts = events.casts.filter((event) => event.sourceID === playerId && event.abilityGameID === abilityId);
  const signatureEffects = new Map<number, { name: string; count: number; type: string }>();

  const SIGNATURE_WINDOW_MS = 1500;

  const checkEvent = (event: CombatEventBase, eventType: string) => {
    if (!event) return;
    const ability = event.abilityGameID;
    if (ability !== abilityId && VALID_SIGNATURE_SCRIPT_IDS.has(ability)) {
      const existing = signatureEffects.get(ability) ?? { name: `${eventType} ${ability}`, count: 0, type: eventType };
      signatureEffects.set(ability, { ...existing, count: existing.count + 1 });
    }
    const extra = event.extraAbilityGameID;
    if (extra && extra !== abilityId && VALID_SIGNATURE_SCRIPT_IDS.has(extra)) {
      const existing = signatureEffects.get(extra) ?? { name: `${eventType} ${extra}`, count: 0, type: eventType };
      signatureEffects.set(extra, { ...existing, count: existing.count + 1 });
    }
  };

  for (const cast of abilityCasts) {
    const windowEnd = cast.timestamp + SIGNATURE_WINDOW_MS;

    events.buffs
      .filter((b) => b.sourceID === playerId && b.timestamp > cast.timestamp && b.timestamp <= windowEnd)
      .forEach((b) => checkEvent(b, 'buff'));

    events.debuffs
      .filter((d) => d.sourceID === playerId && d.timestamp > cast.timestamp && d.timestamp <= windowEnd)
      .forEach((d) => checkEvent(d, 'debuff'));

    events.damage
      .filter((dmg) => dmg.sourceID === playerId && dmg.timestamp > cast.timestamp && dmg.timestamp <= windowEnd)
      .forEach((dmg) => checkEvent(dmg, 'damage'));

    events.heals
      .filter((heal) => heal.sourceID === playerId && heal.timestamp > cast.timestamp && heal.timestamp <= windowEnd)
      .forEach((heal) => checkEvent(heal, 'heal'));

    events.resources
      .filter((res) => res.sourceID === playerId && res.timestamp > cast.timestamp && res.timestamp <= windowEnd)
      .forEach((res) => checkEvent(res, 'resource'));

    events.casts
      .filter(
        (evt) =>
          evt.sourceID === playerId &&
          evt.abilityGameID !== abilityId &&
          evt.timestamp > cast.timestamp &&
          evt.timestamp <= windowEnd,
      )
      .forEach((evt) => checkEvent(evt as unknown as CombatEventBase, 'cast'));
  }

  const result: SignatureAnalysisResult = {
    castsAnalyzed: abilityCasts.length,
    topEffects: [],
    highlyCorrelated: [],
  };

  if (abilityCasts.length === 0) {
    return result;
  }

  const MIN_CONSISTENCY = 0.5;
  const consistent = Array.from(signatureEffects.entries())
    .filter(([_, effect]) => effect.count >= abilityCasts.length * MIN_CONSISTENCY)
    .sort((a, b) => b[1].count - a[1].count);

  result.topEffects = consistent.map(([id, effect]) => ({
    id,
    type: effect.type,
    count: effect.count,
    scriptName: SIGNATURE_SCRIPT_ID_TO_NAME.get(id),
  }));

  if (consistent.length > 0) {
    const [topId, topEffect] = consistent[0];
    result.detectedScriptName = SIGNATURE_SCRIPT_ID_TO_NAME.get(topId);
    result.detectedConfidence = Math.min(0.95, topEffect.count / abilityCasts.length);
  }

  const minCorrelation = abilityCasts.length >= 4 ? abilityCasts.length - 2 : Math.ceil(abilityCasts.length * 0.5);
  const correlated = Array.from(signatureEffects.entries())
    .filter(([_, effect]) => effect.count >= minCorrelation)
    .sort((a, b) => b[1].count - a[1].count);

  result.highlyCorrelated = correlated.map(([id, effect]) => ({
    id,
    type: effect.type,
    count: effect.count,
    scriptName: SIGNATURE_SCRIPT_ID_TO_NAME.get(id),
  }));

  return result;
}

interface AffixCandidateInfo {
  id: number;
  type: 'buff' | 'debuff' | 'damage' | 'heal';
  count: number;
  consistency: number;
  scriptName?: string;
}

interface AffixAnalysisResult {
  castsAnalyzed: number;
  detections: AffixCandidateInfo[];
  candidates: AffixCandidateInfo[];
}

function analyzeAffixScripts(
  abilityId: number,
  playerId: number,
  events: CombatEventData,
  grimoireKey?: string,
): AffixAnalysisResult {
  const casts = events.casts.filter((evt) => evt.sourceID === playerId && evt.abilityGameID === abilityId);
  const result: AffixAnalysisResult = {
    castsAnalyzed: casts.length,
    detections: [],
    candidates: [],
  };

  if (casts.length === 0) {
    return result;
  }

  const grimoireCompatibleAffixIds = new Set<number>();
  const affixScripts = (scribingDatabase as any).affixScripts as Record<string, AffixScriptEntry>;

  if (grimoireKey) {
    Object.values(affixScripts).forEach((script) => {
      if (script.compatibleGrimoires?.includes(grimoireKey)) {
        script.abilityIds?.forEach((id) => grimoireCompatibleAffixIds.add(id));
      }
    });
  } else {
    VALID_AFFIX_SCRIPT_IDS.forEach((id) => grimoireCompatibleAffixIds.add(id));
  }

  const AFFIX_WINDOW_MS = 1000;
  const BUFF_WINDOW_MS = 1200;

  const collect = (map: Map<number, Set<number>>, id: number, index: number) => {
    if (!map.has(id)) {
      map.set(id, new Set());
    }
    map.get(id)!.add(index);
  };

  const buffCandidates = new Map<number, Set<number>>();
  const debuffCandidates = new Map<number, Set<number>>();
  const damageCandidates = new Map<number, Set<number>>();
  const healCandidates = new Map<number, Set<number>>();

  const getTriggerStart = (cast: CastEvent): number => {
    if (!DEFERRED_AFFIX_TRIGGER_ABILITIES.has(abilityId)) {
      return cast.timestamp;
    }

    const candidates: number[] = [];

    const recordNext = (list: CastEvent[] | DamageEvent[] | HealEvent[], predicate?: (event: any) => boolean) => {
      const found = (list as any[]).find(
        (event) =>
          event.sourceID === playerId &&
          event.timestamp > cast.timestamp &&
          (predicate ? predicate(event) : true),
      );
      if (found) {
        candidates.push(found.timestamp);
      }
    };

    recordNext(events.casts as CastEvent[], (event) => event.abilityGameID !== abilityId);
    recordNext(events.damage as DamageEvent[]);
    recordNext(events.heals as HealEvent[]);

    const resourceCost = events.resources.find(
      (event) => event.sourceID === playerId && event.timestamp > cast.timestamp && (event.resourceChange ?? 0) < 0,
    );
    if (resourceCost) {
      candidates.push(resourceCost.timestamp);
    }

    if (candidates.length === 0) {
      const nextCast = events.casts.find((event) => event.sourceID === playerId && event.timestamp > cast.timestamp);
      if (nextCast) {
        candidates.push(nextCast.timestamp);
      }
    }

    return candidates.length > 0 ? Math.min(...candidates) : cast.timestamp;
  };

  casts.forEach((cast, index) => {
    const triggerStart = getTriggerStart(cast);
    const windowEnd = triggerStart + AFFIX_WINDOW_MS;
    const buffWindowEnd = triggerStart + BUFF_WINDOW_MS;

    const windowBuffs = events.buffs.filter(
      (buff) =>
        buff.sourceID === playerId &&
        buff.timestamp >= triggerStart &&
        buff.timestamp <= buffWindowEnd &&
        !(buff as any).extraAbilityGameID,
    );

    windowBuffs.forEach((buff) => {
      if (buff.abilityGameID !== abilityId && grimoireCompatibleAffixIds.has(buff.abilityGameID)) {
        collect(buffCandidates, buff.abilityGameID, index);
      }
    });

    const windowDebuffs = events.debuffs.filter(
      (debuff) =>
        debuff.sourceID === playerId &&
        debuff.timestamp >= triggerStart &&
        debuff.timestamp <= buffWindowEnd &&
        !(debuff as any).extraAbilityGameID,
    );

    windowDebuffs.forEach((debuff) => {
      if (debuff.abilityGameID !== abilityId && grimoireCompatibleAffixIds.has(debuff.abilityGameID)) {
        collect(debuffCandidates, debuff.abilityGameID, index);
      }
    });

    const windowDamage = events.damage.filter(
      (dmg) =>
        dmg.sourceID === playerId &&
        dmg.timestamp > triggerStart &&
        dmg.timestamp <= windowEnd &&
        dmg.abilityGameID !== abilityId,
    );

    windowDamage.forEach((dmg) => {
      if (grimoireCompatibleAffixIds.has(dmg.abilityGameID)) {
        collect(damageCandidates, dmg.abilityGameID, index);
      }
    });

    const windowHeals = events.heals.filter(
      (heal) =>
        heal.sourceID === playerId &&
        heal.timestamp > triggerStart &&
        heal.timestamp <= windowEnd &&
        heal.abilityGameID !== abilityId,
    );

    windowHeals.forEach((heal) => {
      if (grimoireCompatibleAffixIds.has(heal.abilityGameID)) {
        collect(healCandidates, heal.abilityGameID, index);
      }
    });
  });

  const candidates: AffixCandidateInfo[] = [];

  const pushCandidates = (entries: Map<number, Set<number>>, type: AffixCandidateInfo['type']) => {
    entries.forEach((castSet, id) => {
      const consistency = castSet.size / casts.length;
      candidates.push({
        id,
        type,
        count: castSet.size,
        consistency,
        scriptName: AFFIX_SCRIPT_ID_TO_NAME.get(id),
      });
    });
  };

  pushCandidates(buffCandidates, 'buff');
  pushCandidates(debuffCandidates, 'debuff');
  pushCandidates(damageCandidates, 'damage');
  pushCandidates(healCandidates, 'heal');

  candidates.sort((a, b) => b.consistency - a.consistency);

  result.candidates = candidates;
  if (candidates.length > 0) {
    const top = candidates[0];
    result.detections.push(top);
  }

  return result;
}

function formatPercent(value: number | undefined): string {
  if (value === undefined) return 'n/a';
  return `${(value * 100).toFixed(1)}%`;
}

function main() {
  const [reportCode, fightIdArg] = process.argv.slice(2);
  if (!reportCode || !fightIdArg) {
    console.error('Usage: npm run script -- scripts/analyze-scribing-detection.ts <report> <fightId>');
    process.exit(1);
  }

  const fightId = Number.parseInt(fightIdArg, 10);
  if (Number.isNaN(fightId)) {
    console.error('Fight ID must be a number');
    process.exit(1);
  }

  const baseDir = path.resolve(__dirname, '../data-downloads', reportCode);
  const fightDir = path.join(baseDir, `fight-${fightId}`);
  const eventsDir = path.join(fightDir, 'events');

  if (!fs.existsSync(eventsDir)) {
    console.error(`Events directory not found: ${eventsDir}`);
    process.exit(1);
  }

  const masterDataPath = path.join(baseDir, 'master-data.json');
  const abilityNames = buildAbilityNameMap(masterDataPath);
  const actorNames = buildActorNameMap(masterDataPath);
  const fallbackAbilityNames = loadAbilityNameLookup();

  const bannerPrimaryAbilityIds = new Set<number>(
    getGrimoireAbilityIds('Banner Bearer').filter((id) => {
      const abilityName = abilityNames.get(id) ?? fallbackAbilityNames.get(id);
      if (!abilityName) {
        return false;
      }

      const lowerName = abilityName.toLowerCase();
      if (!lowerName.includes('banner')) {
        return false;
      }
      if (lowerName.includes('banner bearer')) {
        return false;
      }
      if (lowerName.includes('bannerman')) {
        return false;
      }

      return true;
    }),
  );

  const events: CombatEventData = {
    buffs: loadEvents(path.join(eventsDir, 'buff-events.json')) as BuffEvent[],
    debuffs: loadEvents(path.join(eventsDir, 'debuff-events.json')) as DebuffEvent[],
    damage: loadEvents(path.join(eventsDir, 'damage-events.json')) as DamageEvent[],
    casts: (loadEvents(path.join(eventsDir, 'cast-events.json')) as CastEvent[]).filter(
      (event) => event.type === 'cast',
    ),
    heals: loadEvents(path.join(eventsDir, 'healing-events.json')) as HealEvent[],
    resources: loadEvents(path.join(eventsDir, 'resource-events.json')) as ResourceEvent[],
  };

  if (bannerPrimaryAbilityIds.size > 0) {
    const existingCastKeys = new Set<string>();
    events.casts.forEach((cast) => {
      const key = `${cast.sourceID}-${cast.abilityGameID}-${cast.timestamp}`;
      existingCastKeys.add(key);
    });

    const bannerCasts: CastEvent[] = [];

    for (const buff of events.buffs) {
      const abilityId = buff.abilityGameID;
      if (!abilityId || !bannerPrimaryAbilityIds.has(abilityId)) {
        continue;
      }
      if (typeof buff.sourceID !== 'number') {
        continue;
      }
      const key = `${buff.sourceID}-${abilityId}-${buff.timestamp}`;
      if (existingCastKeys.has(key)) {
        continue;
      }
      existingCastKeys.add(key);
      bannerCasts.push({
        timestamp: buff.timestamp,
        type: 'cast',
        sourceID: buff.sourceID,
        abilityGameID: abilityId,
      });
    }

    if (bannerCasts.length > 0) {
      events.casts.push(...bannerCasts);
      events.casts.sort((a, b) => a.timestamp - b.timestamp);
    }
  }

  const scribingGroups = new Map<string, { abilityId: number; playerId: number; casts: CastEvent[] }>();

  for (const castEvent of events.casts) {
    if (castEvent.type !== 'cast') {
      continue;
    }
    const scribingInfo = getScribingSkillByAbilityId(castEvent.abilityGameID);
    if (!scribingInfo) {
      continue;
    }
    const key = `${castEvent.sourceID}-${castEvent.abilityGameID}`;
    if (!scribingGroups.has(key)) {
      scribingGroups.set(key, {
        abilityId: castEvent.abilityGameID,
        playerId: castEvent.sourceID,
        casts: [],
      });
    }
    scribingGroups.get(key)!.casts.push(castEvent);
  }

  if (scribingGroups.size === 0) {
    console.log('No scribing casts found in this fight.');
    return;
  }

  const findings: any[] = [];

  for (const group of scribingGroups.values()) {
    const { abilityId, playerId, casts: abilityCasts } = group;
    const scribingInfo = getScribingSkillByAbilityId(abilityId)!;

    const signatureResult = analyzeSignatureScript(abilityId, playerId, events);
    const affixResult = analyzeAffixScripts(abilityId, playerId, events, scribingInfo.grimoireKey);

    findings.push({
      abilityId,
      abilityName: abilityNames.get(abilityId) ?? fallbackAbilityNames.get(abilityId) ?? 'Unknown Ability',
      playerId,
      playerName: actorNames.get(playerId) ?? `Actor ${playerId}`,
      casts: abilityCasts.length,
      scribingInfo,
      signatureResult,
      affixResult,
    });
  }

  findings.sort((a, b) => a.playerName.localeCompare(b.playerName));

  for (const finding of findings) {
    const {
      abilityId,
      abilityName,
      playerName,
      playerId,
      casts,
      scribingInfo,
      signatureResult,
      affixResult,
    } = finding;

    console.log('──────────────────────────────────────────────');
    console.log(`${playerName} (ID ${playerId})`);
    console.log(`  Ability: ${abilityName} (${abilityId})`);
    console.log(
      `  Recipe: ${scribingInfo.grimoire} → ${scribingInfo.transformation} (${scribingInfo.transformationType})`,
    );
    console.log(`  Casts analyzed: ${casts}`);

    if (signatureResult.castsAnalyzed === 0) {
      console.log('  Signature: No casts detected');
    } else if (signatureResult.detectedScriptName) {
      console.log(
        `  Signature: ${signatureResult.detectedScriptName} (${formatPercent(signatureResult.detectedConfidence)})`,
      );
    } else {
      console.log('  Signature: ❌ Not detected');
    }

    if (signatureResult.topEffects.length > 0) {
      console.log('    Consistent effects:');
      signatureResult.topEffects.forEach((effect: SignatureAnalysisResult['topEffects'][number]) => {
        const name = effect.scriptName ?? 'Unknown Signature';
        console.log(
          `      - ${name} [${effect.type}] id:${effect.id} (${effect.count}/${signatureResult.castsAnalyzed})`,
        );
      });
    }

    if (signatureResult.highlyCorrelated.length > 0) {
      console.log('    Highly correlated (below threshold):');
      signatureResult.highlyCorrelated.forEach((effect: SignatureAnalysisResult['highlyCorrelated'][number]) => {
        const name = effect.scriptName ?? 'Unknown Signature';
        console.log(
          `      - ${name} [${effect.type}] id:${effect.id} (${effect.count}/${signatureResult.castsAnalyzed})`,
        );
      });
    }

    if (affixResult.castsAnalyzed === 0) {
      console.log('  Affix: No casts detected');
    } else if (affixResult.detections.length > 0) {
      const top = affixResult.detections[0];
      console.log(
        `  Affix: ${top.scriptName ?? 'Unknown Affix'} [${top.type}] (${top.count}/${affixResult.castsAnalyzed}, ${formatPercent(top.consistency)})`,
      );
    } else {
      console.log('  Affix: ❌ Not detected');
    }

    if (affixResult.candidates.length > 0) {
      console.log('    Affix candidates:');
      affixResult.candidates
        .slice(0, 5)
        .forEach((candidate: AffixAnalysisResult['candidates'][number]) => {
        const name = candidate.scriptName ?? 'Unknown Affix';
        console.log(
          `      - ${name} [${candidate.type}] id:${candidate.id} (${candidate.count}/${affixResult.castsAnalyzed}, ${formatPercent(candidate.consistency)})`,
        );
      });
    }
  }

  console.log('──────────────────────────────────────────────');
}

main();
