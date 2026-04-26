import React from 'react';

import type { GrimoireData } from '../components/ScribingSkillsDisplay';
import {
  analyzeBarSwaps,
  type BarSwapAnalysisResult,
} from '../features/parse_analysis/utils/parseAnalysisUtils';
import {
  useReportMasterData,
  usePlayerData,
  useFightForContext,
  useResolvedReportFightContext,
  useCastEvents,
  useDamageEvents,
  useDeathEvents,
  useFriendlyBuffEvents,
  useHostileBuffEvents,
  useHealingEvents,
  useResourceEvents,
  useCombatantInfoEvents,
  useCriticalDamageTask,
} from '../hooks';
import { useDebuffEvents } from '../hooks/events/useDebuffEvents';
import { useBuffLookupTask } from '../hooks/workerTasks/useBuffLookupTask';
import { usePlayerTravelDistanceTask } from '../hooks/workerTasks/usePlayerTravelDistanceTask';
import type { ReportFightContextInput } from '../store/contextTypes';
import type { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import {
  KnownAbilities,
  MundusStones,
  RED_CHAMPION_POINTS,
  BLUE_CHAMPION_POINTS,
  GREEN_CHAMPION_POINTS,
} from '../types/abilities';
import type { CombatantAura, CombatantInfoEvent } from '../types/combatlogEvents';
import type { PlayerGear, PlayerTalent } from '../types/playerDetails';
import {
  createSkillLineAbilityMapping,
  analyzePlayerClassFromEvents,
  type ClassAnalysisResult,
} from '../utils/classDetectionUtils';
import { detectBuildIssues, type BuildIssue } from '../utils/detectBuildIssues';
import {
  isDoubleSetCount,
  isPerfectedGear,
  normalizeGearName,
  MONSTER_ONE_PIECE_HINTS,
  MYTHIC_SET_NAMES,
  ARENA_SET_NAMES,
  type PlayerGearSetRecord,
  type PlayerGearItemData,
} from '../utils/gearUtilities';
import {
  classifyPotionEventsFromBuffStream,
  type PotionStreamResult,
} from '../utils/potionDetectionUtils';

export interface PlayerCardDataResult {
  player: PlayerDetailsWithRole | null;
  mundusBuffs: Array<{ name: string; id: number }>;
  championPoints: Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }>;
  auras: Array<{ name: string; id: number; stacks?: number }>;
  scribingSkills: GrimoireData[];
  buildIssues: BuildIssue[];
  classAnalysis?: ClassAnalysisResult;
  deaths: number;
  resurrects: number;
  cpm: number;
  maxHealth: number;
  maxStamina: number;
  maxMagicka: number;
  distanceTraveled: number | null;
  reportId?: string | null;
  fightId?: string | null;
  playerGear: PlayerGearSetRecord[];
  dpsValue?: number;
  hpsValue?: number;
  totalDamage?: number;
  totalCritDamage?: number;
  critDps?: number;
  critChance?: number;
  critDamageSummary?: { avg: number; max: number };
  barSwapResult?: BarSwapAnalysisResult;
  potionStreamResult?: PotionStreamResult;
  isLoading: boolean;
  /** Which data layers are still loading */
  loadingStages: {
    core: boolean;
    events: boolean;
    workers: boolean;
  };
}

interface UsePlayerCardDataOptions {
  playerId: string | number;
  context?: ReportFightContextInput;
}

export function usePlayerCardData({
  playerId,
  context: contextOverride,
}: UsePlayerCardDataOptions): PlayerCardDataResult {
  const resolvedContext = useResolvedReportFightContext(contextOverride);
  const fight = useFightForContext(resolvedContext);
  const reportId = resolvedContext.reportCode;
  const fightId = resolvedContext.fightId !== null ? String(resolvedContext.fightId) : null;

  // Core data — should be cached from initial page load
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: resolvedContext });

  // Event data — may or may not be cached depending on which tab the user was on
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents({
    context: resolvedContext,
  });
  const { castEvents, isCastEventsLoading } = useCastEvents({ context: resolvedContext });
  const { deathEvents, isDeathEventsLoading } = useDeathEvents({ context: resolvedContext });
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents({
    context: resolvedContext,
  });
  const { hostileBuffEvents: _hostileBuffEvents, isHostileBuffEventsLoading } =
    useHostileBuffEvents({
      context: resolvedContext,
    });
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents({ context: resolvedContext });
  const { damageEvents, isDamageEventsLoading } = useDamageEvents({ context: resolvedContext });
  const { healingEvents, isHealingEventsLoading } = useHealingEvents({ context: resolvedContext });
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents({
    context: resolvedContext,
  });

  // Worker tasks — run after event data is available
  const { buffLookupData: friendlyBuffLookup, isBuffLookupLoading } = useBuffLookupTask({
    context: resolvedContext,
  });
  const { playerTravelDistances, isPlayerTravelDistancesLoading } = usePlayerTravelDistanceTask({
    context: resolvedContext,
  });
  const { criticalDamageData } = useCriticalDamageTask({ context: resolvedContext });

  const playerIdStr = String(playerId);
  const playerIdNum = Number(playerId);

  // Resolve the player object
  const player = React.useMemo((): PlayerDetailsWithRole | null => {
    if (!playerData?.playersById) return null;
    return playerData.playersById[playerId] || playerData.playersById[playerIdNum] || null;
  }, [playerData?.playersById, playerId, playerIdNum]);

  const { abilitiesById } = reportMasterData;

  // --- Mundus buffs ---
  const mundusBuffs = React.useMemo(() => {
    if (!combatantInfoEvents || !abilitiesById || !player) return [];
    const mundusStoneIds = Object.values(MundusStones).filter(
      (v): v is number => typeof v === 'number',
    );
    const mundusNameRegex =
      /^(?:Boon:|Bonus\s*\(2\):)?\s*The\s+(Warrior|Mage|Serpent|Thief|Lady|Steed|Lord|Apprentice|Ritual|Lover|Atronach|Shadow|Tower)\b/i;

    const result: Array<{ name: string; id: number }> = [];
    const seen = new Set<number>();

    const playerEvents = combatantInfoEvents.filter(
      (event: CombatantInfoEvent): event is CombatantInfoEvent =>
        event.type === 'combatantinfo' &&
        'sourceID' in event &&
        String(event.sourceID) === playerIdStr,
    );

    for (const cie of playerEvents) {
      for (const aura of (cie.auras || []) as CombatantAura[]) {
        const ability = abilitiesById[aura.ability];
        const name = ability?.name || aura.name || '';
        if (!mundusStoneIds.includes(aura.ability) && !mundusNameRegex.test(name)) continue;
        if (seen.has(aura.ability)) continue;
        seen.add(aura.ability);
        const cleaned = (name || `Unknown Mundus (${aura.ability})`)
          .replace(/^(?:Boon:|Bonus\s*\(2\):)\s*/i, '')
          .trim();
        result.push({ name: cleaned, id: aura.ability });
      }
    }

    // Fallback: scan friendly buff events
    if (result.length === 0 && friendlyBuffEvents) {
      for (const ev of friendlyBuffEvents) {
        if (ev.type === 'applybuff') {
          const abilityId = ev.abilityGameID;
          const appliesToPlayer =
            (ev.targetID != null && String(ev.targetID) === playerIdStr) ||
            (ev.sourceID != null && String(ev.sourceID) === playerIdStr);
          if (typeof abilityId === 'number' && appliesToPlayer) {
            const ability = abilitiesById[abilityId];
            const name = ability?.name || '';
            if (mundusStoneIds.includes(abilityId) || mundusNameRegex.test(name)) {
              const cleaned = (name || `Mundus (${abilityId})`)
                .replace(/^(?:Boon:|Bonus\s*\(2\):)\s*/i, '')
                .trim();
              result.push({ name: cleaned, id: abilityId });
              break;
            }
          }
        }
      }
    }

    return result;
  }, [combatantInfoEvents, abilitiesById, player, playerIdStr, friendlyBuffEvents]);

  // --- Champion points ---
  const championPoints = React.useMemo(() => {
    if (!combatantInfoEvents || !abilitiesById || !player) return [];
    const allCPs = new Set([
      ...Array.from(RED_CHAMPION_POINTS),
      ...Array.from(BLUE_CHAMPION_POINTS),
      ...Array.from(GREEN_CHAMPION_POINTS),
    ]);

    const result: Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }> = [];
    const seen = new Set<number>();

    const playerEvents = combatantInfoEvents.filter(
      (e: CombatantInfoEvent) =>
        e.type === 'combatantinfo' && 'sourceID' in e && String(e.sourceID) === playerIdStr,
    );

    for (const cie of playerEvents) {
      for (const aura of (cie.auras || []) as CombatantAura[]) {
        if (!allCPs.has(aura.ability) || seen.has(aura.ability)) continue;
        seen.add(aura.ability);
        const ability = abilitiesById[aura.ability];
        const name = ability?.name || `Unknown CP (${aura.ability})`;
        let color: 'red' | 'blue' | 'green' = 'green';
        if (RED_CHAMPION_POINTS.has(aura.ability)) color = 'red';
        else if (BLUE_CHAMPION_POINTS.has(aura.ability)) color = 'blue';
        result.push({ name, id: aura.ability, color });
      }
    }

    result.sort((a, b) => {
      const colorOrder = { red: 0, blue: 1, green: 2 };
      if (colorOrder[a.color] !== colorOrder[b.color])
        return colorOrder[a.color] - colorOrder[b.color];
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [combatantInfoEvents, abilitiesById, player, playerIdStr]);

  // --- Auras ---
  const auras = React.useMemo(() => {
    if (!player || !combatantInfoEvents || !abilitiesById) return [];
    const latestCI = combatantInfoEvents
      .filter(
        (e): e is CombatantInfoEvent =>
          e.type === 'combatantinfo' && 'sourceID' in e && String(e.sourceID) === playerIdStr,
      )
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

    if (!latestCI?.auras) return [];
    return latestCI.auras
      .map((aura) => {
        const ability = abilitiesById[aura.ability];
        return {
          name: ability?.name || aura.name || `Unknown Aura (${aura.ability})`,
          id: aura.ability,
          stacks: aura.stacks,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [player, combatantInfoEvents, abilitiesById, playerIdStr]);

  // --- Deaths & resurrects ---
  const deaths = React.useMemo(() => {
    const fightNum = fightId ? Number(fightId) : undefined;
    let count = 0;
    for (const ev of deathEvents) {
      if (
        ev.type === 'death' &&
        ev.targetID != null &&
        String(ev.targetID) === playerIdStr &&
        (fightNum == null || (typeof ev.fight === 'number' && ev.fight === fightNum))
      ) {
        count++;
      }
    }
    return count;
  }, [deathEvents, fightId, playerIdStr]);

  const resurrects = React.useMemo(() => {
    let count = 0;
    for (const ev of castEvents) {
      if (
        ev.type === 'cast' &&
        ev.abilityGameID === KnownAbilities.RESURRECT &&
        String(ev.sourceID) === playerIdStr
      ) {
        count++;
      }
    }
    return count;
  }, [castEvents, playerIdStr]);

  // --- CPM ---
  const cpm = React.useMemo(() => {
    if (!fight) return 0;
    let castCount = 0;
    for (const ev of castEvents) {
      if (ev.type === 'cast' && !ev.fake && String(ev.sourceID) === playerIdStr) {
        castCount++;
      }
    }
    const minutes = (fight.endTime - fight.startTime) / 60000;
    return minutes > 0 ? Number((castCount / minutes).toFixed(1)) : 0;
  }, [castEvents, fight, playerIdStr]);

  // --- Max resources ---
  const maxResources = React.useMemo(() => {
    const result = { health: 0, stamina: 0, magicka: 0 };
    if (!player || !fight) return result;

    const updateFromResources = (resources?: {
      maxHitPoints?: number;
      maxStamina?: number;
      maxMagicka?: number;
    }): void => {
      if (!resources) return;
      if (resources.maxHitPoints) result.health = Math.max(result.health, resources.maxHitPoints);
      if (resources.maxStamina) result.stamina = Math.max(result.stamina, resources.maxStamina);
      if (resources.maxMagicka) result.magicka = Math.max(result.magicka, resources.maxMagicka);
    };

    const inFight = (ts: number): boolean => ts >= fight.startTime && ts <= fight.endTime;

    for (const events of [resourceEvents ?? [], damageEvents ?? [], healingEvents ?? []]) {
      for (const event of events) {
        if (!inFight(event.timestamp)) continue;
        if (
          'sourceID' in event &&
          String(event.sourceID) === playerIdStr &&
          'sourceResources' in event
        ) {
          updateFromResources(
            event.sourceResources as {
              maxHitPoints?: number;
              maxStamina?: number;
              maxMagicka?: number;
            },
          );
        }
        if (
          'targetID' in event &&
          String(event.targetID) === playerIdStr &&
          'targetResources' in event
        ) {
          updateFromResources(
            event.targetResources as {
              maxHitPoints?: number;
              maxStamina?: number;
              maxMagicka?: number;
            },
          );
        }
      }
    }
    return result;
  }, [player, fight, resourceEvents, damageEvents, healingEvents, playerIdStr]);

  // --- DPS/HPS/Crit stats ---
  const damageStats = React.useMemo(() => {
    if (!fight || !damageEvents || damageEvents.length === 0)
      return { dps: 0, total: 0, critTotal: 0, critDps: 0, critChance: 0 };
    const durationSecs = (fight.endTime - fight.startTime) / 1000;
    if (durationSecs <= 0) return { dps: 0, total: 0, critTotal: 0, critDps: 0, critChance: 0 };

    let totalDmg = 0;
    let critDmg = 0;
    let hits = 0;
    let critHits = 0;
    for (const event of damageEvents) {
      if (
        event.sourceIsFriendly &&
        !event.targetIsFriendly &&
        String(event.sourceID) === playerIdStr
      ) {
        const amount = event.amount ?? 0;
        totalDmg += amount;
        hits++;
        if (event.hitType === 2) {
          critDmg += amount;
          critHits++;
        }
      }
    }
    return {
      dps: totalDmg / durationSecs,
      total: totalDmg,
      critTotal: critDmg,
      critDps: critDmg / durationSecs,
      critChance: hits > 0 ? (critHits / hits) * 100 : 0,
    };
  }, [fight, damageEvents, playerIdStr]);

  const hpsValue = React.useMemo(() => {
    if (!fight || !healingEvents || healingEvents.length === 0) return 0;
    const durationSecs = (fight.endTime - fight.startTime) / 1000;
    if (durationSecs <= 0) return 0;
    let total = 0;
    for (const event of healingEvents) {
      if (event.sourceIsFriendly && String(event.sourceID) === playerIdStr) {
        total += event.amount ?? 0;
      }
    }
    return total / durationSecs;
  }, [fight, healingEvents, playerIdStr]);

  // --- Gear sets ---
  const playerGear = React.useMemo((): PlayerGearSetRecord[] => {
    if (!player) return [];
    const gear = player.combatantInfo?.gear ?? [];
    const setDataByBase: Record<string, PlayerGearItemData> = {};

    gear.forEach((g: PlayerGear, idx) => {
      if (!g.setName) return;
      const increment = isDoubleSetCount(g, idx, gear) ? 2 : 1;
      const isPerfected = isPerfectedGear(g);
      const baseDisplay = g.setName.replace(/^Perfected\s+/, '');
      const baseKey = normalizeGearName(baseDisplay);

      if (!setDataByBase[baseKey]) {
        setDataByBase[baseKey] = {
          total: 0,
          perfected: 0,
          setID: g.setID,
          hasPerfected: false,
          hasRegular: false,
          baseDisplay,
        };
      }
      const entry = setDataByBase[baseKey];
      entry.total += increment;
      if (isPerfected) {
        entry.perfected += increment;
        entry.hasPerfected = true;
      } else {
        entry.hasRegular = true;
      }
      if (!entry.setID && g.setID) entry.setID = g.setID;
    });

    const records = Object.entries(setDataByBase).map<PlayerGearSetRecord>(([baseKey, data]) => {
      const labelName =
        data.perfected === data.total ? `Perfected ${data.baseDisplay}` : data.baseDisplay;
      const count = data.total;
      const n = normalizeGearName(labelName);
      const isMonster = MONSTER_ONE_PIECE_HINTS.has(n);
      const isMythic = MYTHIC_SET_NAMES.has(n);
      const isArena = ARENA_SET_NAMES.has(n);
      const isHighland4 = count === 4 && n === normalizeGearName('Highland Sentinel');
      const isFivePiece = count >= 5;
      const isThreePiece = count === 3;
      let category: number;
      if (isMonster) category = 0;
      else if (isFivePiece) category = 1;
      else if (isHighland4) category = 2;
      else if (isThreePiece) category = 3;
      else if (isMythic) category = 4;
      else if (isArena) category = 5;
      else category = 6;
      const secondary = isMonster ? (count === 2 ? 0 : 1) : 0;

      return {
        key: baseKey,
        data,
        labelName,
        count,
        category,
        secondary,
        sortName: data.baseDisplay.toLowerCase(),
      };
    });

    records.sort((a, b) => {
      if (a.category !== b.category) return a.category - b.category;
      if (a.secondary !== b.secondary) return a.secondary - b.secondary;
      if (a.count !== b.count) return b.count - a.count;
      return a.sortName.localeCompare(b.sortName);
    });

    return records;
  }, [player]);

  // --- Bar swap analysis ---
  const barSwapResult = React.useMemo((): BarSwapAnalysisResult | undefined => {
    if (!fight || !castEvents || !player) return undefined;
    return analyzeBarSwaps(castEvents, playerIdNum, fight.startTime, fight.endTime);
  }, [fight, castEvents, player, playerIdNum]);

  // --- Potion classification ---
  const potionStreamResult = React.useMemo((): PotionStreamResult | undefined => {
    if (!friendlyBuffEvents || !abilitiesById) return undefined;
    const allResults = classifyPotionEventsFromBuffStream(
      friendlyBuffEvents,
      resourceEvents ?? [],
      abilitiesById,
    );
    return allResults[playerIdStr];
  }, [friendlyBuffEvents, resourceEvents, abilitiesById, playerIdStr]);

  // --- Build issues ---
  const buildIssues = React.useMemo((): BuildIssue[] => {
    if (!player || !friendlyBuffLookup || !fight?.startTime || !fight?.endTime) return [];
    const gear = player.combatantInfo?.gear ?? [];
    const resourceProfile = maxResources
      ? { stamina: maxResources.stamina, magicka: maxResources.magicka }
      : undefined;

    const playerAuras: CombatantAura[] = [];
    if (combatantInfoEvents) {
      const ci = combatantInfoEvents.find((e) => e.sourceID === playerIdNum);
      if (ci?.auras) playerAuras.push(...ci.auras);
    }

    return detectBuildIssues(
      gear,
      friendlyBuffLookup,
      fight.startTime,
      fight.endTime,
      playerAuras,
      player.role,
      damageEvents,
      playerIdNum,
      resourceProfile,
    );
  }, [
    player,
    friendlyBuffLookup,
    fight?.startTime,
    fight?.endTime,
    damageEvents,
    combatantInfoEvents,
    maxResources,
    playerIdNum,
  ]);

  // --- Class analysis ---
  const classAnalysis = React.useMemo((): ClassAnalysisResult | undefined => {
    if (!abilitiesById || !player) return undefined;
    const classMapping = createSkillLineAbilityMapping(abilitiesById);
    const playerTalents = player.combatantInfo?.talents;
    return analyzePlayerClassFromEvents(
      playerIdStr,
      abilitiesById,
      combatantInfoEvents,
      castEvents,
      damageEvents,
      friendlyBuffEvents,
      debuffEvents,
      playerTalents as PlayerTalent[] | undefined,
      classMapping,
    );
  }, [
    abilitiesById,
    player,
    playerIdStr,
    combatantInfoEvents,
    castEvents,
    damageEvents,
    friendlyBuffEvents,
    debuffEvents,
  ]);

  // --- Distance traveled ---
  const distanceTraveled = React.useMemo((): number | null => {
    if (!playerTravelDistances?.distancesByPlayerId) return null;
    const summary = playerTravelDistances.distancesByPlayerId[playerIdNum];
    return summary?.totalDistance ?? null;
  }, [playerTravelDistances, playerIdNum]);

  // --- Critical damage summary ---
  const critDamageSummary = React.useMemo((): { avg: number; max: number } | undefined => {
    if (!criticalDamageData?.playerDataMap) return undefined;
    const data = criticalDamageData.playerDataMap[playerIdNum];
    if (!data) return undefined;
    return { avg: data.effectiveCriticalDamage, max: data.maximumCriticalDamage };
  }, [criticalDamageData, playerIdNum]);

  // --- Loading stages ---
  const coreLoading = isMasterDataLoading || isPlayerDataLoading;
  const eventsLoading =
    isCombatantInfoEventsLoading ||
    isCastEventsLoading ||
    isDeathEventsLoading ||
    isFriendlyBuffEventsLoading ||
    isHostileBuffEventsLoading ||
    isDebuffEventsLoading ||
    isDamageEventsLoading ||
    isHealingEventsLoading ||
    isResourceEventsLoading;
  const workersLoading = isBuffLookupLoading || isPlayerTravelDistancesLoading;

  return React.useMemo(
    () => ({
      player,
      mundusBuffs,
      championPoints,
      auras,
      scribingSkills: [] as GrimoireData[], // Scribing detection is complex and optional
      buildIssues,
      classAnalysis,
      deaths,
      resurrects,
      cpm,
      maxHealth: maxResources.health,
      maxStamina: maxResources.stamina,
      maxMagicka: maxResources.magicka,
      distanceTraveled,
      reportId,
      fightId,
      playerGear,
      dpsValue: damageStats.dps,
      hpsValue,
      totalDamage: damageStats.total,
      totalCritDamage: damageStats.critTotal,
      critDps: damageStats.critDps,
      critChance: damageStats.critChance,
      critDamageSummary,
      barSwapResult,
      potionStreamResult,
      isLoading: coreLoading || eventsLoading,
      loadingStages: {
        core: coreLoading,
        events: eventsLoading,
        workers: workersLoading,
      },
    }),
    [
      player,
      mundusBuffs,
      championPoints,
      auras,
      buildIssues,
      classAnalysis,
      deaths,
      resurrects,
      cpm,
      maxResources,
      distanceTraveled,
      reportId,
      fightId,
      playerGear,
      damageStats,
      hpsValue,
      critDamageSummary,
      barSwapResult,
      potionStreamResult,
      coreLoading,
      eventsLoading,
      workersLoading,
    ],
  );
}
