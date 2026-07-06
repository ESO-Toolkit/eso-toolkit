import React from 'react';
import { useSelector } from 'react-redux';

import { useLogger } from '@/contexts/LoggerContext';
import { buildMatchableReport } from '@/features/loadout-manager/utils/buildMatchableReport';
import {
  normalizeCompanionSnapshots,
  parseESOTKCompanionSavedVariables,
} from '@/features/loadout-manager/utils/esotkCompanionParser';
import {
  buildCompanionBuildsForReport,
  type CompanionBuildForPlayer,
} from '@/features/loadout-manager/utils/esotkCompanionReportAdapter';
import {
  SCRIBING_DETECTION_SCHEMA_VERSION,
  type CombatEventData,
  type PlayerAbilityList,
} from '@/features/scribing/analysis/scribingDetectionAnalysis';
import { isScribingAbility } from '@/features/scribing/utils/Scribing';
import {
  companionSnapshotsUploaded,
  selectCompanionSnapshots,
  selectCompanionUpload,
} from '@/store/companion';
import { useAppDispatch } from '@/store/useAppDispatch';
import {
  executeScribingDetectionsTask,
  selectScribingDetectionsResult,
  selectScribingDetectionsTask,
} from '@/store/worker_results';

import type { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { PlayerAvatarsProvider } from '../../../contexts/PlayerAvatarsContext';
import { CLASS_MASTERY_LINE_NAME } from '../../../data/skill-lines/class/classMastery';
import {
  CLASS_SKILL_LINES,
  getDefaultLinesForClass,
} from '../../../features/build-editor/data/esoStaticData';
import type { ESOClass } from '../../../features/build-editor/types/build.types';
import { sanitizeClassMasteryPicks } from '../../../features/build-editor/utils/classMasteryTransfer';
import type { ReportAbilityFragment } from '../../../graphql/gql/graphql';
import {
  useCastEvents,
  useCombatantInfoEvents,
  useCriticalDamageTask,
  useDamageEvents,
  useDeathEvents,
  useFightForContext,
  useFriendlyBuffEvents,
  useHostileBuffEvents,
  useHealingEvents,
  usePlayerData,
  useReportMasterData,
  useResolvedReportFightContext,
  useResourceEvents,
  useRoleDetection,
} from '../../../hooks';
import { useDebuffEvents } from '../../../hooks/events/useDebuffEvents';
import { useBuffLookupTask } from '../../../hooks/workerTasks/useBuffLookupTask';
import { usePlayerTravelDistanceTask } from '../../../hooks/workerTasks/usePlayerTravelDistanceTask';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import {
  buildFallbackPlayersFromMasterData,
  hasPlayerEntries,
} from '../../../store/player_data/playerDataFallback';
import type { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { selectReportRegistryEntryForContext } from '../../../store/report/reportSelectors';
import type { RootState } from '../../../store/storeWithHistory';
import {
  KnownAbilities,
  MundusStones,
  RED_CHAMPION_POINTS,
  BLUE_CHAMPION_POINTS,
  GREEN_CHAMPION_POINTS,
} from '../../../types/abilities';
import { CombatantAura, CombatantInfoEvent } from '../../../types/combatlogEvents';
import { PlayerGear } from '../../../types/playerDetails';
import { BuffLookupData } from '../../../utils/BuffLookupUtils';
import {
  createSkillLineAbilityMapping,
  analyzePlayerClassFromEvents,
  type ClassAnalysisResult,
} from '../../../utils/classDetectionUtils';
import { detectBuildIssues, BuildIssue } from '../../../utils/detectBuildIssues';
import {
  ARENA_SET_NAMES,
  isDoubleSetCount,
  isPerfectedGear,
  MONSTER_ONE_PIECE_HINTS,
  MYTHIC_SET_NAMES,
  normalizeGearName,
  PlayerGearItemData,
  PlayerGearSetRecord,
} from '../../../utils/gearUtilities';
import {
  classNameToEsoClass,
  fetchKalpaBuildEvidenceForReport,
  findAnonymousKalpaBuildEvidenceForPlayer,
  findKalpaBuildEvidenceForPlayer,
  loadKalpaBuildEvidenceForReport,
  redactKalpaPlayerIdentity,
  type KalpaBuildEvidence,
  type KalpaPlayerBuildEvidence,
} from '../../../utils/kalpaBuildEvidence';
import {
  classifyPotionEventsFromBuffStream,
  type PotionStreamResult,
} from '../../../utils/potionDetectionUtils';
import {
  analyzeBarSwaps,
  type BarSwapAnalysisResult,
} from '../../parse_analysis/utils/parseAnalysisUtils';

import { PlayersPanelView } from './PlayersPanelView';

// Recipe lookup stubs — full recipe resolution pending unified detection service
const findScribingRecipe = async (_skillId: unknown, _skillName?: string): Promise<null> => null;
const formatScribingRecipeForDisplay = (
  _recipe: unknown,
): {
  grimoire: string;
  transformation: string;
  transformationType: string;
  confidence: number;
  matchMethod: string;
  recipeSummary: string;
  tooltipInfo: string;
} => ({
  grimoire: '',
  transformation: '',
  transformationType: '',
  confidence: 0,
  matchMethod: 'stub',
  recipeSummary: '',
  tooltipInfo: '',
});

const ESO_CLASS_LABEL: Record<Exclude<ESOClass, 'any-class'>, string> = {
  dragonknight: 'Dragonknight',
  sorcerer: 'Sorcerer',
  nightblade: 'Nightblade',
  templar: 'Templar',
  warden: 'Warden',
  necromancer: 'Necromancer',
  arcanist: 'Arcanist',
};

type ChampionPointColor = 'red' | 'blue' | 'green';
type ChampionPointEntry = { name: string; id: number; color: ChampionPointColor };

const CHAMPION_POINT_NAME_BY_ID: Record<number, string> = {
  [KnownAbilities.BITING_AURA]: 'Biting Aura',
  [KnownAbilities.BLOODY_RENEWAL]: 'Bloody Renewal',
  [KnownAbilities.BOUNDLESS_VITALITY]: 'Boundless Vitality',
  [KnownAbilities.BULWARK]: 'Bulwark',
  [KnownAbilities.DEADLY_AIM]: 'Deadly Aim',
  [KnownAbilities.DUELISTS_REBUFF]: "Duelist's Rebuff",
  [KnownAbilities.ELUSIVE_MIST]: 'Elusive Mist',
  [KnownAbilities.ENLIVENING_OVERFLOW]: 'Enlivening Overflow',
  [KnownAbilities.EXPERT_EVASION]: 'Expert Evasion',
  [KnownAbilities.EXPLOITER]: 'Exploiter',
  [KnownAbilities.FIGHTING_FINESSE]: 'Fighting Finesse',
  [KnownAbilities.FORTUNES_FAVOR]: "Fortune's Favor",
  [KnownAbilities.FROM_THE_BRINK]: 'From the Brink',
  [KnownAbilities.GILDED_FINGERS]: 'Gilded Fingers',
  [KnownAbilities.HASTY_RETREAT]: 'Hasty Retreat',
  [KnownAbilities.HEROS_VIGOR]: "Hero's Vigor",
  [KnownAbilities.IRONCLAD]: 'Ironclad',
  [KnownAbilities.JUGGERNAUT]: 'Juggernaut',
  [KnownAbilities.LIQUID_EFFICIENCY]: 'Liquid Efficiency',
  [KnownAbilities.MASTER_AT_ARMS]: 'Master-at-Arms',
  [KnownAbilities.METICULOUS_DISASSEMBLY]: 'Meticulous Disassembly',
  [KnownAbilities.PLENTIFUL_HARVEST]: 'Plentiful Harvest',
  [KnownAbilities.PROFESSIONAL_UPKEEP]: 'Professional Upkeep',
  [KnownAbilities.RATIONER]: 'Rationer',
  [KnownAbilities.REAVING_BLOWS]: 'Reaving Blows',
  [KnownAbilities.REJUVENATOR]: 'Rejuvenator',
  [KnownAbilities.SIPHONING_SPELLS]: 'Siphoning Spells',
  [KnownAbilities.SLIPPERY]: 'Slippery',
  [KnownAbilities.SPRINTER]: 'Sprinter',
  [KnownAbilities.SUSTAINED_BY_SUFFERING]: 'Sustained by Suffering',
  [KnownAbilities.UNASSAILABLE]: 'Unassailable',
};

function championPointColorForId(abilityId: number): ChampionPointColor | undefined {
  if (RED_CHAMPION_POINTS.has(abilityId as KnownAbilities)) return 'red';
  if (BLUE_CHAMPION_POINTS.has(abilityId as KnownAbilities)) return 'blue';
  if (GREEN_CHAMPION_POINTS.has(abilityId as KnownAbilities)) return 'green';
  return undefined;
}

export function buildChampionPointEntry(
  abilityId: number,
  abilitiesById: Record<string | number, ReportAbilityFragment>,
): ChampionPointEntry | undefined {
  const color = championPointColorForId(abilityId);
  if (!color) return undefined;
  return {
    name:
      abilitiesById[abilityId]?.name ||
      CHAMPION_POINT_NAME_BY_ID[abilityId] ||
      `Unknown CP (${abilityId})`,
    id: abilityId,
    color,
  };
}

function sortChampionPointEntries(entries: ChampionPointEntry[]): ChampionPointEntry[] {
  const colorOrder: Record<ChampionPointColor, number> = { red: 0, blue: 1, green: 2 };
  return entries.sort((a, b) => {
    if (colorOrder[a.color] !== colorOrder[b.color]) {
      return colorOrder[a.color] - colorOrder[b.color];
    }
    return a.name.localeCompare(b.name);
  });
}

export function classAnalysisFromKalpaEvidence(
  evidence?: KalpaPlayerBuildEvidence,
): ClassAnalysisResult | undefined {
  const esoClass = classNameToEsoClass(evidence?.className);
  if (!esoClass || esoClass === 'any-class') {
    return undefined;
  }

  const className = ESO_CLASS_LABEL[esoClass];
  const classMasteryPassives = sanitizeClassMasteryPicks(evidence?.classMasteryPassives, esoClass);
  const skillLines: ClassAnalysisResult['skillLines'] = getDefaultLinesForClass(esoClass)
    .map((lineId) => CLASS_SKILL_LINES.find((line) => line.id === lineId))
    .filter((line): line is (typeof CLASS_SKILL_LINES)[number] => line != null)
    .map((line) => ({
      skillLine: line.label,
      className,
      count: 0,
      skillIds: new Set<number>(),
    }));

  if (classMasteryPassives.length > 0) {
    skillLines.push({
      skillLine: CLASS_MASTERY_LINE_NAME,
      className,
      count: classMasteryPassives.length,
      skillIds: new Set(classMasteryPassives),
    });
  }

  return skillLines.length > 0
    ? {
        primary: skillLines[0].skillLine,
        skillLines,
      }
    : undefined;
}

// This panel now uses report actors from masterData

type CompanionBuildRenderProps = Pick<
  CompanionBuildForPlayer,
  'championPoints' | 'coaching' | 'stats' | 'effects' | 'scribing' | 'classMastery' | 'distanceMs'
>;

interface PlayersPanelProps {
  context?: ReportFightContextInput;
}

export const PlayersPanel: React.FC<PlayersPanelProps> = ({ context: contextOverride }) => {
  const logger = useLogger('PlayersPanel');
  const dispatch = useAppDispatch();
  const scribingTaskState = useSelector(selectScribingDetectionsTask);
  const scribingResult = useSelector(selectScribingDetectionsResult);
  const resolvedContext = useResolvedReportFightContext(contextOverride);
  const fight = useFightForContext(resolvedContext);
  const reportId = resolvedContext.reportCode;
  const fightId = resolvedContext.fightId !== null ? String(resolvedContext.fightId) : null;
  const reportEntry = useSelector((state: RootState) =>
    selectReportRegistryEntryForContext(state, resolvedContext),
  );

  // State for storing scribing recipe information
  const [scribingRecipes, setScribingRecipes] = React.useState<
    Record<
      string,
      Record<
        string,
        {
          grimoire: string;
          transformation: string;
          transformationType: string;
          confidence: number;
          matchMethod: string;
          recipeSummary: string;
          tooltipInfo: string;
        }
      >
    >
  >({});
  const companionSnapshots = useSelector(selectCompanionSnapshots);
  const companionUpload = useSelector(selectCompanionUpload);

  // Use hooks to get data
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData({
    context: resolvedContext,
    includeFallback: false,
  });
  const [kalpaBuildEvidence, setKalpaBuildEvidence] = React.useState<
    KalpaBuildEvidence | undefined
  >(() => loadKalpaBuildEvidenceForReport(reportId));
  React.useEffect(() => {
    let cancelled = false;
    const localEvidence = loadKalpaBuildEvidenceForReport(reportId);
    setKalpaBuildEvidence(localEvidence);

    if (!reportId || localEvidence) {
      return () => {
        cancelled = true;
      };
    }

    void fetchKalpaBuildEvidenceForReport(reportId).then((evidence) => {
      if (!cancelled && evidence) {
        setKalpaBuildEvidence(evidence);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [reportId]);

  // Kalpa forwards the logger's ESOTK Companion snapshots inside the build-evidence sidecar.
  // When they arrive, feed them into the shared companion store so the companion panel and the
  // crit-damage graph pick them up automatically — exactly like a manual file upload. Skip when
  // snapshots are already loaded (e.g. a manual upload) so we never clobber an explicit choice.
  React.useEffect(() => {
    const raw = kalpaBuildEvidence?.companion?.snapshots;
    if (!raw?.length || companionSnapshots.length > 0) return;
    const snapshots = normalizeCompanionSnapshots(raw);
    if (snapshots.length > 0) {
      dispatch(companionSnapshotsUploaded({ snapshots, snapshotCount: snapshots.length }));
    }
  }, [kalpaBuildEvidence, companionSnapshots.length, dispatch]);

  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents({
    context: resolvedContext,
  });
  const { castEvents, isCastEventsLoading } = useCastEvents({ context: resolvedContext });
  const { deathEvents, isDeathEventsLoading } = useDeathEvents({ context: resolvedContext });
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents({
    context: resolvedContext,
  });
  const { hostileBuffEvents, isHostileBuffEventsLoading } = useHostileBuffEvents({
    context: resolvedContext,
  });
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents({ context: resolvedContext });
  const { damageEvents, isDamageEventsLoading } = useDamageEvents({ context: resolvedContext });
  const { healingEvents, isHealingEventsLoading } = useHealingEvents({ context: resolvedContext });
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents({
    context: resolvedContext,
  });
  const isFightLoading = resolvedContext.fightId !== null && !fight;

  // --- Role detection ---
  const { rolesByPlayerId } = useRoleDetection({
    fight,
    actorsById: reportMasterData.actorsById,
    damageEvents,
    healingEvents,
    castEvents,
    debuffEvents,
    friendlyBuffEvents,
    hostileBuffEvents,
    combatantInfoEvents,
  });

  const playersById = React.useMemo<Record<string | number, PlayerDetailsWithRole>>(() => {
    if (hasPlayerEntries(playerData?.playersById)) {
      return playerData.playersById;
    }

    return buildFallbackPlayersFromMasterData({
      friendlyPlayerIds: fight?.friendlyPlayers ?? undefined,
      actorsById: reportMasterData.actorsById,
      combatantInfoEvents,
      rolesByPlayerId,
    });
  }, [
    playerData?.playersById,
    fight?.friendlyPlayers,
    reportMasterData.actorsById,
    combatantInfoEvents,
    rolesByPlayerId,
  ]);

  const companionReport = React.useMemo(
    () => buildMatchableReport(playersById, reportEntry),
    [playersById, reportEntry],
  );

  const companionBuildsByPlayer = React.useMemo<Record<string, CompanionBuildRenderProps>>(() => {
    if (!companionReport || companionSnapshots.length === 0) return {};

    const builds = buildCompanionBuildsForReport(companionSnapshots, companionReport, {
      targetFightId: resolvedContext.fightId ?? undefined,
    });

    const byPlayer: Record<string, CompanionBuildRenderProps> = {};
    builds.forEach((build, actorId) => {
      byPlayer[String(actorId)] = {
        championPoints: build.championPoints,
        coaching: build.coaching,
        stats: build.stats,
        effects: build.effects,
        scribing: build.scribing,
        classMastery: build.classMastery,
        distanceMs: build.distanceMs,
      };
    });
    return byPlayer;
  }, [companionReport, companionSnapshots, resolvedContext.fightId]);

  // Stable reference so PlayersPanelView's React.memo isn't defeated every render
  // (an inline literal here re-renders the view even on the no-Companion default path).
  const companionUploadState = React.useMemo(
    () => ({ ...companionUpload, matchedCount: Object.keys(companionBuildsByPlayer).length }),
    [companionUpload, companionBuildsByPlayer],
  );

  const handleCompanionFileSelected = React.useCallback(
    async (file: File): Promise<void> => {
      try {
        const text = await file.text();
        const parsed = parseESOTKCompanionSavedVariables(text);
        if (!parsed || parsed.all.length === 0) {
          dispatch(
            companionSnapshotsUploaded({
              snapshots: [],
              fileName: file.name,
              snapshotCount: 0,
              error: 'No ESOTK Companion snapshots found',
            }),
          );
          return;
        }

        dispatch(
          companionSnapshotsUploaded({
            snapshots: parsed.all,
            fileName: file.name,
            snapshotCount: parsed.all.length,
          }),
        );
        logger.info('Loaded ESOTK Companion snapshots', {
          fileName: file.name,
          snapshotCount: parsed.all.length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to read companion file';
        dispatch(
          companionSnapshotsUploaded({
            snapshots: [],
            fileName: file.name,
            snapshotCount: 0,
            error: message,
          }),
        );
        logger.error(
          'Failed to load ESOTK Companion snapshots',
          error instanceof Error ? error : undefined,
          {
            fileName: file.name,
            error: message,
          },
        );
      }
    },
    [logger, dispatch],
  );

  const identityKalpaBuildEvidenceByPlayer = React.useMemo(() => {
    const result: Record<string, KalpaPlayerBuildEvidence> = {};
    if (!hasPlayerEntries(playersById)) {
      return result;
    }

    Object.values(playersById).forEach((player) => {
      const evidence = findKalpaBuildEvidenceForPlayer(kalpaBuildEvidence, player);
      if (evidence) {
        result[String(player.id)] = evidence;
      }
    });

    return result;
  }, [kalpaBuildEvidence, playersById]);

  const fightIdNumber = resolvedContext.fightId;

  const allBuffEvents = React.useMemo(
    () => [...friendlyBuffEvents, ...hostileBuffEvents],
    [friendlyBuffEvents, hostileBuffEvents],
  );

  const combatEvents: CombatEventData = React.useMemo(
    () => ({
      buffs: allBuffEvents,
      debuffs: debuffEvents,
      damage: damageEvents,
      casts: castEvents,
      heals: healingEvents,
      resources: resourceEvents,
    }),
    [allBuffEvents, debuffEvents, damageEvents, castEvents, healingEvents, resourceEvents],
  );

  const scribingPlayerAbilities = React.useMemo<PlayerAbilityList[]>(() => {
    if (!hasPlayerEntries(playersById)) {
      return [];
    }

    const playerIds = new Set(Object.values(playersById).map((p) => p.id));

    const abilitiesByPlayer = new Map<number, Set<number>>();

    // Scan talent GUIDs (works when ESO Logs provides the transformed ID)
    Object.values(playersById).forEach((player) => {
      const talents = player.combatantInfo?.talents ?? [];
      talents.forEach((talent) => {
        if (typeof talent.guid === 'number' && isScribingAbility(talent.guid)) {
          if (!abilitiesByPlayer.has(player.id)) {
            abilitiesByPlayer.set(player.id, new Set());
          }
          abilitiesByPlayer.get(player.id)!.add(talent.guid);
        }
      });
    });

    // Scan cast events for scribing ability IDs (handles when talent.guid is the base game ID)
    castEvents.forEach((event) => {
      if (
        event.type === 'cast' &&
        playerIds.has(event.sourceID) &&
        isScribingAbility(event.abilityGameID)
      ) {
        if (!abilitiesByPlayer.has(event.sourceID)) {
          abilitiesByPlayer.set(event.sourceID, new Set());
        }
        abilitiesByPlayer.get(event.sourceID)!.add(event.abilityGameID);
      }
    });

    return Array.from(abilitiesByPlayer.entries())
      .map(([playerId, abilityIds]) => ({
        playerId,
        abilityIds: Array.from(abilityIds),
      }))
      .filter((entry) => entry.abilityIds.length > 0);
  }, [playersById, castEvents]);

  const existingScribingAbilities = React.useMemo(() => {
    if (!scribingResult || fightIdNumber === null || scribingResult.fightId !== fightIdNumber) {
      return new Map<number, Set<number>>();
    }

    const map = new Map<number, Set<number>>();
    Object.entries(scribingResult.players).forEach(([playerKey, abilityMap]) => {
      const validAbilities = new Set<number>();
      Object.entries(abilityMap).forEach(([abilityKey, detection]) => {
        if (detection?.schemaVersion === SCRIBING_DETECTION_SCHEMA_VERSION) {
          validAbilities.add(Number(abilityKey));
        }
      });

      if (validAbilities.size > 0) {
        map.set(Number(playerKey), validAbilities);
      }
    });
    return map;
  }, [scribingResult, fightIdNumber]);

  const pendingScribingAbilities = React.useMemo<PlayerAbilityList[]>(() => {
    if (scribingPlayerAbilities.length === 0) {
      return [];
    }

    const pending: PlayerAbilityList[] = [];

    scribingPlayerAbilities.forEach(({ playerId, abilityIds }) => {
      const existing = existingScribingAbilities.get(playerId);
      const missing = abilityIds.filter((id) => !existing?.has(id));

      if (missing.length > 0) {
        pending.push({ playerId, abilityIds: missing });
      }
    });

    return pending;
  }, [scribingPlayerAbilities, existingScribingAbilities]);

  const publicScribedSkillIdsByPlayer = React.useMemo(() => {
    const result: Record<string, number[]> = {};

    scribingPlayerAbilities.forEach(({ playerId, abilityIds }) => {
      result[String(playerId)] = abilityIds;
    });

    return result;
  }, [scribingPlayerAbilities]);

  // Get friendly buff lookup data for build issues detection
  const { buffLookupData: friendlyBuffLookup, isBuffLookupLoading } = useBuffLookupTask({
    context: resolvedContext,
  });
  const { playerTravelDistances, isPlayerTravelDistancesLoading } = usePlayerTravelDistanceTask({
    context: resolvedContext,
  });
  const distanceByPlayer = React.useMemo(() => {
    if (!playerTravelDistances?.distancesByPlayerId) {
      return {} as Record<string, number>;
    }

    const byPlayer: Record<string, number> = {};
    Object.entries(playerTravelDistances.distancesByPlayerId).forEach(([playerId, summary]) => {
      byPlayer[String(playerId)] = summary?.totalDistance ?? 0;
    });

    return byPlayer;
  }, [playerTravelDistances]);

  // Compute DPS per player (total outgoing damage to enemies / fight duration in seconds)
  // Also computes totalDamage, totalCritDamage, critDps, and critChance per player
  const damageStatsByPlayer = React.useMemo(() => {
    if (!fight || !damageEvents || damageEvents.length === 0)
      return {
        dpsValueByPlayer: {} as Record<string, number>,
        totalDamageByPlayer: {} as Record<string, number>,
        totalCritDamageByPlayer: {} as Record<string, number>,
        critDpsByPlayer: {} as Record<string, number>,
        critChanceByPlayer: {} as Record<string, number>,
      };
    const durationSecs = (fight.endTime - fight.startTime) / 1000;
    if (durationSecs <= 0)
      return {
        dpsValueByPlayer: {} as Record<string, number>,
        totalDamageByPlayer: {} as Record<string, number>,
        totalCritDamageByPlayer: {} as Record<string, number>,
        critDpsByPlayer: {} as Record<string, number>,
        critChanceByPlayer: {} as Record<string, number>,
      };

    const damageByPlayer: Record<string, number> = {};
    const critDamageByPlayer: Record<string, number> = {};
    const hitCountByPlayer: Record<string, number> = {};
    const critHitCountByPlayer: Record<string, number> = {};
    for (const event of damageEvents) {
      if (event.sourceIsFriendly && !event.targetIsFriendly) {
        const id = String(event.sourceID);
        const amount = event.amount ?? 0;
        damageByPlayer[id] = (damageByPlayer[id] ?? 0) + amount;
        hitCountByPlayer[id] = (hitCountByPlayer[id] ?? 0) + 1;
        if (event.hitType === 2) {
          critDamageByPlayer[id] = (critDamageByPlayer[id] ?? 0) + amount;
          critHitCountByPlayer[id] = (critHitCountByPlayer[id] ?? 0) + 1;
        }
      }
    }

    const dpsResult: Record<string, number> = {};
    const totalDmgResult: Record<string, number> = {};
    const totalCritDmgResult: Record<string, number> = {};
    const critDpsResult: Record<string, number> = {};
    const critChanceResult: Record<string, number> = {};
    for (const [id, totalDamage] of Object.entries(damageByPlayer)) {
      dpsResult[id] = totalDamage / durationSecs;
      totalDmgResult[id] = totalDamage;
      const critDmg = critDamageByPlayer[id] ?? 0;
      totalCritDmgResult[id] = critDmg;
      critDpsResult[id] = critDmg / durationSecs;
      const hits = hitCountByPlayer[id] ?? 0;
      const critHits = critHitCountByPlayer[id] ?? 0;
      critChanceResult[id] = hits > 0 ? (critHits / hits) * 100 : 0;
    }
    return {
      dpsValueByPlayer: dpsResult,
      totalDamageByPlayer: totalDmgResult,
      totalCritDamageByPlayer: totalCritDmgResult,
      critDpsByPlayer: critDpsResult,
      critChanceByPlayer: critChanceResult,
    };
  }, [fight, damageEvents]);

  const {
    dpsValueByPlayer,
    totalDamageByPlayer,
    totalCritDamageByPlayer,
    critDpsByPlayer,
    critChanceByPlayer,
  } = damageStatsByPlayer;

  // Compute HPS per player (total outgoing healing to friendlies / fight duration in seconds)
  const hpsValueByPlayer = React.useMemo(() => {
    if (!fight || !healingEvents || healingEvents.length === 0) return {};
    const durationSecs = (fight.endTime - fight.startTime) / 1000;
    if (durationSecs <= 0) return {};

    const healingByPlayer: Record<string, number> = {};
    for (const event of healingEvents) {
      if (event.sourceIsFriendly) {
        const id = String(event.sourceID);
        healingByPlayer[id] = (healingByPlayer[id] ?? 0) + (event.amount ?? 0);
      }
    }

    const result: Record<string, number> = {};
    for (const [id, totalHealing] of Object.entries(healingByPlayer)) {
      result[id] = totalHealing / durationSecs;
    }
    return result;
  }, [fight, healingEvents]);

  // Compute bar swap analysis (including bar setup pattern) per player
  const barSwapByPlayer = React.useMemo(() => {
    const result: Record<string, BarSwapAnalysisResult> = {};
    if (!fight || !castEvents || !hasPlayerEntries(playersById)) return result;
    const { startTime, endTime } = fight;
    for (const player of Object.values(playersById)) {
      if (!player?.id) continue;
      result[String(player.id)] = analyzeBarSwaps(
        castEvents,
        Number(player.id),
        startTime,
        endTime,
      );
    }
    return result;
  }, [fight, castEvents, playersById]);

  const { abilitiesById } = reportMasterData;

  const publicClassAnalysisByPlayer = React.useMemo(() => {
    const result: Record<string, ClassAnalysisResult> = {};

    if (!abilitiesById || !hasPlayerEntries(playersById)) {
      return result;
    }

    const classMapping = createSkillLineAbilityMapping(abilitiesById);

    Object.values(playersById).forEach((player) => {
      if (!player?.id) return;

      const playerId = String(player.id);
      result[playerId] = analyzePlayerClassFromEvents(
        playerId,
        abilitiesById,
        combatantInfoEvents,
        castEvents,
        damageEvents,
        friendlyBuffEvents,
        debuffEvents,
        player.combatantInfo?.talents,
        classMapping,
      );
    });

    return result;
  }, [
    abilitiesById,
    playersById,
    combatantInfoEvents,
    castEvents,
    damageEvents,
    friendlyBuffEvents,
    debuffEvents,
  ]);

  // Fetch critical damage data for the inline crit summary on DPS player cards
  const { criticalDamageData } = useCriticalDamageTask({ context: resolvedContext });

  const criticalDamageByPlayer = React.useMemo(() => {
    if (!criticalDamageData?.playerDataMap) return undefined;
    const result: Record<string, { avg: number; max: number }> = {};
    Object.entries(criticalDamageData.playerDataMap).forEach(([playerId, data]) => {
      result[String(playerId)] = {
        avg: data.effectiveCriticalDamage,
        max: data.maximumCriticalDamage,
      };
    });
    return result;
  }, [criticalDamageData?.playerDataMap]);

  // Calculate loading state - include ALL data dependencies this panel needs
  const isLoading =
    isMasterDataLoading ||
    isPlayerDataLoading ||
    isCombatantInfoEventsLoading ||
    isCastEventsLoading ||
    isDeathEventsLoading ||
    isFriendlyBuffEventsLoading ||
    isHostileBuffEventsLoading ||
    isDebuffEventsLoading ||
    isDamageEventsLoading ||
    isHealingEventsLoading ||
    isResourceEventsLoading ||
    isBuffLookupLoading ||
    isPlayerTravelDistancesLoading ||
    isFightLoading;

  React.useEffect(() => {
    if (isLoading) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    if (fightIdNumber === null) {
      return;
    }
    if (pendingScribingAbilities.length === 0) {
      return;
    }
    if (scribingTaskState.isLoading) {
      return;
    }

    dispatch(
      executeScribingDetectionsTask({
        fightId: fightIdNumber,
        combatEvents,
        playerAbilities: pendingScribingAbilities,
      }),
    );
  }, [
    isLoading,
    fightIdNumber,
    pendingScribingAbilities,
    scribingTaskState.isLoading,
    combatEvents,
    dispatch,
  ]);
  // Calculate unique mundus buffs per player using MundusStones enum from combatantinfo auras
  const mundusBuffsByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number }>> = {};

    if (!combatantInfoEvents || !abilitiesById) return result;

    // Get numeric mundus stone ability IDs from the enum (filter out string keys)
    const mundusStoneIds = Object.values(MundusStones).filter(
      (v): v is number => typeof v === 'number',
    );
    // Secondary: detect by ability name in case logs use alternate IDs (e.g., "Bonus (2): The Atronach")
    const mundusNameRegex =
      /^(?:Boon:|Bonus\s*\(2\):)?\s*The\s+(Warrior|Mage|Serpent|Thief|Lady|Steed|Lord|Apprentice|Ritual|Lover|Atronach|Shadow|Tower)\b/i;

    // Initialize arrays for each player
    if (hasPlayerEntries(playersById)) {
      Object.values(playersById).forEach((actor) => {
        if (actor?.id) {
          const playerId = String(actor.id);
          result[playerId] = [];

          // Gather ALL combatantinfo events for this player and union mundus auras across them
          const combatantInfoEventsForPlayer = combatantInfoEvents.filter(
            (event: CombatantInfoEvent): event is CombatantInfoEvent =>
              event.type === 'combatantinfo' &&
              'sourceID' in event &&
              String(event.sourceID) === playerId,
          );

          if (combatantInfoEventsForPlayer.length > 0) {
            const seen = new Set<number>();
            for (const cie of combatantInfoEventsForPlayer) {
              const auras = cie.auras || [];
              for (const aura of auras as CombatantAura[]) {
                const ability = abilitiesById[aura.ability];
                const name = ability?.name || aura.name || '';
                const isMundusById = mundusStoneIds.includes(aura.ability);
                const isMundusByName = mundusNameRegex.test(name);
                if (!isMundusById && !isMundusByName) continue;
                if (seen.has(aura.ability)) continue;
                seen.add(aura.ability);
                const mundusName = name || `Unknown Mundus (${aura.ability})`;
                const cleaned = mundusName.replace(/^(?:Boon:|Bonus\s*\(2\):)\s*/i, '').trim();
                result[playerId].push({ name: cleaned, id: aura.ability });
              }
            }
          }

          // Fallback: If none found via combatantinfo, scan applybuff events for mundus on this player
          if (result[playerId].length === 0) {
            for (const ev of friendlyBuffEvents) {
              if (ev.type === 'applybuff') {
                const abilityId = ev.abilityGameID;
                // mundus applies to self; match either source or target to this player
                const appliesToPlayer =
                  (ev.targetID != null && String(ev.targetID) === playerId) ||
                  (ev.sourceID != null && String(ev.sourceID) === playerId);
                if (typeof abilityId === 'number' && appliesToPlayer) {
                  const ability = abilitiesById[abilityId];
                  const name = ability?.name || '';
                  const isMundus = mundusStoneIds.includes(abilityId) || mundusNameRegex.test(name);
                  if (isMundus) {
                    const mundusName = name || `Mundus (${abilityId})`;
                    const cleaned = mundusName.replace(/^(?:Boon:|Bonus\s*\(2\):)\s*/i, '').trim();
                    result[playerId].push({ name: cleaned, id: abilityId });
                    break; // one mundus is sufficient
                  }
                }
              }
            }
          }
        }
      });
    }

    return result;
  }, [combatantInfoEvents, abilitiesById, playersById, friendlyBuffEvents]);

  // Classify each player's potion usage from the live fight event stream (Path B detection).
  const potionResultsByPlayer = React.useMemo((): Record<string, PotionStreamResult> => {
    if (!friendlyBuffEvents || !abilitiesById) return {};
    return classifyPotionEventsFromBuffStream(
      friendlyBuffEvents,
      resourceEvents ?? [],
      abilitiesById,
    );
  }, [friendlyBuffEvents, resourceEvents, abilitiesById]);

  // Public ESO Logs CP auras, kept separate so anonymous sidecar matching can
  // use them as a fingerprint before native-only CP passives are merged in.
  const publicChampionPointsByPlayer = React.useMemo(() => {
    const result: Record<string, ChampionPointEntry[]> = {};

    if (!abilitiesById) return result;

    // Initialize arrays for each player
    if (hasPlayerEntries(playersById)) {
      Object.values(playersById).forEach((actor) => {
        if (actor?.id) {
          const playerId = String(actor.id);
          result[playerId] = [];
          const seen = new Set<number>();
          const addChampionPoint = (abilityId: number): void => {
            if (seen.has(abilityId)) return;
            const entry = buildChampionPointEntry(abilityId, abilitiesById);
            if (!entry) return;
            seen.add(abilityId);
            result[playerId].push(entry);
          };

          // Gather ALL combatantinfo events for this player and union champion points across them
          const combatantInfoEventsForPlayer =
            combatantInfoEvents?.filter(
              (event: CombatantInfoEvent): event is CombatantInfoEvent =>
                event.type === 'combatantinfo' &&
                'sourceID' in event &&
                String(event.sourceID) === playerId,
            ) ?? [];

          if (combatantInfoEventsForPlayer.length > 0) {
            for (const cie of combatantInfoEventsForPlayer) {
              const auras = cie.auras || [];
              for (const aura of auras as CombatantAura[]) {
                addChampionPoint(aura.ability);
              }
            }
          }

          sortChampionPointEntries(result[playerId]);
        }
      });
    }

    return result;
  }, [combatantInfoEvents, abilitiesById, playersById]);

  const kalpaBuildEvidenceByPlayer = React.useMemo(() => {
    const result: Record<string, KalpaPlayerBuildEvidence> = {
      ...identityKalpaBuildEvidenceByPlayer,
    };

    if (!kalpaBuildEvidence?.players?.length || !hasPlayerEntries(playersById)) {
      return result;
    }

    const assignedAnonymousEvidence = new Set<KalpaPlayerBuildEvidence>();

    Object.values(playersById).forEach((player) => {
      if (!player?.id || result[String(player.id)]) return;

      const playerId = String(player.id);
      const match = findAnonymousKalpaBuildEvidenceForPlayer(kalpaBuildEvidence, {
        classNames: publicClassAnalysisByPlayer[playerId]?.skillLines.map(
          (skillLine) => skillLine.className,
        ),
        championPointPassiveIds: publicChampionPointsByPlayer[playerId]?.map((entry) => entry.id),
        scribedSkillIds: publicScribedSkillIdsByPlayer[playerId],
        excludedPlayers: assignedAnonymousEvidence,
      });

      if (!match) return;
      result[playerId] = redactKalpaPlayerIdentity(match);
      assignedAnonymousEvidence.add(match);
    });

    return result;
  }, [
    identityKalpaBuildEvidenceByPlayer,
    kalpaBuildEvidence,
    playersById,
    publicClassAnalysisByPlayer,
    publicChampionPointsByPlayer,
    publicScribedSkillIdsByPlayer,
  ]);

  const championPointsByPlayer = React.useMemo(() => {
    const result: Record<string, ChampionPointEntry[]> = {};
    if (!abilitiesById || !hasPlayerEntries(playersById)) return result;

    Object.values(playersById).forEach((actor) => {
      if (!actor?.id) return;
      const playerId = String(actor.id);
      const seen = new Set<number>();
      result[playerId] = [];

      const addChampionPoint = (abilityId: number): void => {
        if (seen.has(abilityId)) return;
        const entry = buildChampionPointEntry(abilityId, abilitiesById);
        if (!entry) return;
        seen.add(abilityId);
        result[playerId].push(entry);
      };

      for (const entry of publicChampionPointsByPlayer[playerId] ?? []) {
        addChampionPoint(entry.id);
      }
      for (const abilityId of kalpaBuildEvidenceByPlayer[playerId]?.championPointPassives ?? []) {
        addChampionPoint(abilityId);
      }
      // Kalpa's full passives list carries every slotted long-term effect. addChampionPoint
      // filters each id through the authoritative CP classifier (championPointColorForId),
      // so this picks up CP stars beyond the legacy championPointPassives subset while
      // silently skipping non-CP passives — no false positives.
      for (const abilityId of kalpaBuildEvidenceByPlayer[playerId]?.passives ?? []) {
        addChampionPoint(abilityId);
      }

      sortChampionPointEntries(result[playerId]);
    });

    return result;
  }, [abilitiesById, playersById, publicChampionPointsByPlayer, kalpaBuildEvidenceByPlayer]);

  // Compute CPM (casts per minute) per player for the current fight, including all casts
  const cpmByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    if (!fight) return result;

    for (const ev of castEvents) {
      if (ev.type === 'cast' && !ev.fake) {
        const src = ev.sourceID;
        result[src] = (result[src] || 0) + 1;
      }
    }

    const durationMs = fight?.endTime - fight?.startTime;
    const minutes = durationMs > 0 ? durationMs / 60000 : 0;
    if (minutes > 0) {
      for (const k of Object.keys(result)) {
        result[k] = Number((result[k] / minutes).toFixed(1));
      }
    } else {
      // No duration; set CPM to 0
      for (const k of Object.keys(result)) {
        result[k] = 0;
      }
    }

    return result;
  }, [castEvents, fight]);

  // Compute death counts per player for the current fight
  const deathsByPlayer = React.useMemo(() => {
    const counts: Record<string, number> = {};

    const fightNum = fightId ? Number(fightId) : undefined;

    for (const ev of deathEvents) {
      if (
        ev.type === 'death' &&
        (fightNum == null || (typeof ev.fight === 'number' && ev.fight === fightNum))
      ) {
        const target = ev.targetID;
        if (target != null) {
          const key = String(target);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }

    return counts;
  }, [deathEvents, fightId]);

  // Compute total successful resurrects per player using the "Recently Revived" buff applications.
  // This focuses on successful revives and avoids double-counting cast attempts.
  const resurrectsByPlayer = React.useMemo(() => {
    const counts: Record<string, number> = {};

    for (const ev of castEvents) {
      // Buff applications carry sourceID (the resurrector) when available
      if (ev.type === 'cast' && ev.abilityGameID === KnownAbilities.RESURRECT) {
        counts[ev.sourceID] = (counts[ev.sourceID] || 0) + 1;
      }
    }

    return counts;
  }, [castEvents]);

  // Calculate the latest aura snapshot per player from combatantinfo events
  const aurasByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number; stacks?: number }>> = {};

    if (!hasPlayerEntries(playersById) || !combatantInfoEvents || !abilitiesById) {
      return result;
    }

    Object.values(playersById).forEach((actor) => {
      if (!actor?.id) {
        return;
      }

      const playerId = String(actor.id);
      result[playerId] = [];

      const latestCombatantInfo = combatantInfoEvents
        .filter((event): event is CombatantInfoEvent => {
          return (
            event.type === 'combatantinfo' &&
            'sourceID' in event &&
            String(event.sourceID) === playerId
          );
        })
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

      if (!latestCombatantInfo?.auras) {
        return;
      }

      latestCombatantInfo.auras.forEach((aura) => {
        const ability = abilitiesById[aura.ability];
        const auraName = ability?.name || aura.name || `Unknown Aura (${aura.ability})`;

        result[playerId].push({
          name: auraName,
          id: aura.ability,
          stacks: aura.stacks,
        });
      });

      result[playerId].sort((a, b) => a.name.localeCompare(b.name));
    });

    return result;
  }, [abilitiesById, combatantInfoEvents, playersById]);

  const playerGear = React.useMemo(() => {
    const result: Record<number, PlayerGearSetRecord[]> = {};

    if (!hasPlayerEntries(playersById)) {
      return result;
    }

    for (const player of Object.values(playersById)) {
      const gear = player?.combatantInfo?.gear ?? [];

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

      // Build sortable records from aggregated set data
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
        // Determine desired order category
        let category = 99;
        if (isMonster)
          category = 0; // monster (1p or 2p) first
        else if (isFivePiece)
          category = 1; // 5-piece bonuses
        else if (isHighland4)
          category = 2; // 4-piece Highland Sentinel
        else if (isThreePiece)
          category = 3; // 3-piece (e.g., Potentates)
        else if (isMythic)
          category = 4; // mythic
        else if (isArena)
          category = 5; // arena weapons
        else category = 6; // everything else last

        // Secondary ordering within monsters: 2p before 1p
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
        // Prefer higher piece counts within same category (except monsters handled above)
        if (a.count !== b.count) return b.count - a.count;
        return a.sortName.localeCompare(b.sortName);
      });

      result[player.id] = records;
    }

    return result;
  }, [playersById]);

  // Calculate max resources (health, stamina, magicka) per player using all resource events throughout the fight
  const maxResourcesByPlayer = React.useMemo(() => {
    const result: Record<string, { health: number; stamina: number; magicka: number }> = {};

    if (!hasPlayerEntries(playersById) || !fight) return result;

    // Initialize with 0 for each player
    Object.values(playersById).forEach((player) => {
      if (player?.id) {
        result[String(player.id)] = { health: 0, stamina: 0, magicka: 0 };
      }
    });

    const updatePlayerResources = (
      playerId: string,
      resources: { maxHitPoints?: number; maxStamina?: number; maxMagicka?: number },
    ): void => {
      if (result[playerId] !== undefined && resources) {
        if (resources.maxHitPoints) {
          result[playerId].health = Math.max(result[playerId].health, resources.maxHitPoints);
        }
        if (resources.maxStamina) {
          result[playerId].stamina = Math.max(result[playerId].stamina, resources.maxStamina);
        }
        if (resources.maxMagicka) {
          result[playerId].magicka = Math.max(result[playerId].magicka, resources.maxMagicka);
        }
      }
    };

    // Look for max resources across all resource events within the fight timeframe
    if (resourceEvents) {
      resourceEvents.forEach((event) => {
        if (event.type === 'resourcechange') {
          // Only consider events within the current fight timeframe
          const isInFightTimeframe =
            event.timestamp >= fight.startTime && event.timestamp <= fight.endTime;

          if (isInFightTimeframe) {
            // Check source resources
            if (event.sourceID && event.sourceResources) {
              const playerId = String(event.sourceID);
              updatePlayerResources(playerId, event.sourceResources);
            }

            // Check target resources
            if (event.targetID && event.targetResources) {
              const playerId = String(event.targetID);
              updatePlayerResources(playerId, event.targetResources);
            }
          }
        }
      });
    }

    // Also check damage and healing events for additional resource data
    if (damageEvents) {
      damageEvents.forEach((event) => {
        if (event.type === 'damage') {
          const isInFightTimeframe =
            event.timestamp >= fight.startTime && event.timestamp <= fight.endTime;

          if (isInFightTimeframe) {
            // Check source resources in damage events
            if (event.sourceID && event.sourceResources) {
              const playerId = String(event.sourceID);
              updatePlayerResources(playerId, event.sourceResources);
            }

            // Check target resources in damage events
            if (event.targetID && event.targetResources) {
              const playerId = String(event.targetID);
              updatePlayerResources(playerId, event.targetResources);
            }
          }
        }
      });
    }

    // Also check healing events for additional resource data
    if (healingEvents) {
      healingEvents.forEach((event) => {
        if (event.type === 'heal') {
          const isInFightTimeframe =
            event.timestamp >= fight.startTime && event.timestamp <= fight.endTime;

          if (isInFightTimeframe) {
            // Check source resources in healing events
            if (event.sourceID && event.sourceResources) {
              const playerId = String(event.sourceID);
              updatePlayerResources(playerId, event.sourceResources);
            }

            // Check target resources in healing events
            if (event.targetID && event.targetResources) {
              const playerId = String(event.targetID);
              updatePlayerResources(playerId, event.targetResources);
            }
          }
        }
      });
    }

    return result;
  }, [playersById, resourceEvents, damageEvents, healingEvents, fight]);

  // Extract individual max resources for backward compatibility
  const maxHealthByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(maxResourcesByPlayer).forEach(([playerId, resources]) => {
      result[playerId] = resources.health;
    });
    return result;
  }, [maxResourcesByPlayer]);

  const maxStaminaByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(maxResourcesByPlayer).forEach(([playerId, resources]) => {
      result[playerId] = resources.stamina;
    });
    return result;
  }, [maxResourcesByPlayer]);

  const maxMagickaByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(maxResourcesByPlayer).forEach(([playerId, resources]) => {
      result[playerId] = resources.magicka;
    });
    return result;
  }, [maxResourcesByPlayer]);

  // Calculate build issues per player
  const buildIssuesByPlayer = React.useMemo(() => {
    const result: Record<string, BuildIssue[]> = {};

    if (
      !hasPlayerEntries(playersById) ||
      !friendlyBuffLookup ||
      !fight?.startTime ||
      !fight?.endTime
    ) {
      return result;
    }

    Object.values(playersById).forEach((player) => {
      if (!player?.id) return;

      const playerId = String(player.id);
      const gear = (player?.combatantInfo?.gear ?? []).filter((g) => g.id !== 0);
      const resourceSnapshot = maxResourcesByPlayer[playerId];
      const playerResourceProfile = resourceSnapshot
        ? { stamina: resourceSnapshot.stamina, magicka: resourceSnapshot.magicka }
        : undefined;

      // Extract auras for this player from combatant info events
      const playerAuras: CombatantAura[] = [];
      if (combatantInfoEvents) {
        const playerCombatantInfo = combatantInfoEvents.find(
          (event) => event.sourceID === player.id,
        );
        if (playerCombatantInfo?.auras) {
          playerAuras.push(...playerCombatantInfo.auras);
        }
      }

      const emptyBuffLookup: BuffLookupData = { buffIntervals: {} };

      const buildIssues = detectBuildIssues(
        gear,
        friendlyBuffLookup || emptyBuffLookup,
        fight.startTime,
        fight.endTime,
        playerAuras,
        player.role,
        damageEvents,
        player.id,
        playerResourceProfile,
      );

      result[playerId] = buildIssues;
    });

    return result;
  }, [
    playersById,
    friendlyBuffLookup,
    fight?.startTime,
    fight?.endTime,
    damageEvents,
    combatantInfoEvents,
    maxResourcesByPlayer,
  ]);

  // Build scribing skills per player from the worker detection results
  const scribingSkillsByPlayer = React.useMemo(() => {
    if (!scribingResult || fightIdNumber === null || scribingResult.fightId !== fightIdNumber) {
      return {};
    }

    const result: Record<string, GrimoireData[]> = {};

    Object.entries(scribingResult.players).forEach(([playerIdStr, abilityMap]) => {
      const grimoireDataList: GrimoireData[] = [];

      Object.values(abilityMap).forEach((detection) => {
        if (
          !detection?.scribedSkillData ||
          detection.schemaVersion !== SCRIBING_DETECTION_SCHEMA_VERSION
        ) {
          return;
        }

        const { scribedSkillData, scribingInfo } = detection;

        let grimoireData = grimoireDataList.find(
          (g) => g.grimoireName === scribedSkillData.grimoireName,
        );
        if (!grimoireData) {
          grimoireData = {
            grimoireName: scribedSkillData.grimoireName,
            skills: [],
          };
          grimoireDataList.push(grimoireData);
        }

        grimoireData.skills.push({
          skillId: detection.effectiveAbilityId,
          skillName: scribingInfo.transformation,
          effects: scribedSkillData.effects,
          recipe: scribedSkillData.recipe,
        });
      });

      if (grimoireDataList.length > 0) {
        result[playerIdStr] = grimoireDataList;
      }
    });

    return result;
  }, [scribingResult, fightIdNumber]);

  // Calculate class analysis for each player
  const classAnalysisByPlayer = React.useMemo(() => {
    const result: Record<string, ClassAnalysisResult> = {};

    if (!hasPlayerEntries(playersById)) {
      return result;
    }

    Object.values(playersById).forEach((player) => {
      if (!player?.id) return;

      const playerId = String(player.id);
      const publicAnalysis = publicClassAnalysisByPlayer[playerId] ?? {
        primary: null,
        skillLines: [],
      };
      const evidence = kalpaBuildEvidenceByPlayer[playerId];
      const kalpaAnalysis = classAnalysisFromKalpaEvidence(evidence);
      const shouldUseKalpaAnalysis =
        Boolean(kalpaAnalysis) &&
        ((evidence?.classMasteryPassives?.length ?? 0) > 0 ||
          publicAnalysis.skillLines.length === 0);

      result[playerId] = shouldUseKalpaAnalysis && kalpaAnalysis ? kalpaAnalysis : publicAnalysis;
    });

    return result;
  }, [playersById, publicClassAnalysisByPlayer, kalpaBuildEvidenceByPlayer]);

  // Effect to lookup scribing recipes for detected skills
  React.useEffect(() => {
    const lookupRecipes = async (): Promise<void> => {
      const newRecipes: Record<
        string,
        Record<
          string,
          {
            grimoire: string;
            transformation: string;
            transformationType: string;
            confidence: number;
            matchMethod: string;
            recipeSummary: string;
            tooltipInfo: string;
          }
        >
      > = {};

      for (const [playerId, grimoires] of Object.entries(scribingSkillsByPlayer)) {
        newRecipes[playerId] = {};

        for (const grimoire of grimoires) {
          for (const skill of grimoire.skills) {
            // Find the first effect with a valid ability ID for recipe lookup
            const effectWithId = skill.effects.find(
              (effect: { abilityId?: number; abilityName?: string }) =>
                effect.abilityId && effect.abilityId > 0,
            );

            // Try recipe lookup with the skill's main ID first
            try {
              logger.info('Looking up scribing recipe for skill', {
                skillName: skill.skillName,
                skillId: skill.skillId,
              });

              let recipeMatch = (await findScribingRecipe(
                skill.skillId,
                skill.skillName,
              )) as null | { grimoire: { name: string }; transformation?: { name: string } };

              // If that doesn't work, try with the first effect's ability ID
              if (!recipeMatch && effectWithId) {
                logger.info('Trying recipe lookup with effect ID', {
                  effectId: effectWithId.abilityId,
                  effectName: effectWithId.abilityName,
                });
                recipeMatch = (await findScribingRecipe(
                  effectWithId.abilityId,
                  effectWithId.abilityName,
                )) as null | { grimoire: { name: string }; transformation?: { name: string } };
              }

              if (recipeMatch) {
                logger.info('Found scribing recipe', {
                  grimoire: recipeMatch.grimoire.name,
                  transformation: recipeMatch.transformation?.name,
                });
                const recipeDisplay = formatScribingRecipeForDisplay(recipeMatch);
                newRecipes[playerId][skill.skillId] = recipeDisplay;
              } else {
                logger.info('No recipe found for skill', { skillName: skill.skillName });
              }
            } catch (error) {
              logger.warn('Failed to lookup scribing recipe', {
                skillName: skill.skillName,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
      }

      setScribingRecipes(newRecipes);
    };

    if (Object.keys(scribingSkillsByPlayer).length > 0) {
      lookupRecipes();
    }
  }, [scribingSkillsByPlayer, logger]);

  // Merge scribing skills with their recipe information
  const enhancedScribingSkillsByPlayer = React.useMemo(() => {
    const result: Record<string, GrimoireData[]> = {};

    Object.entries(scribingSkillsByPlayer).forEach(([playerId, grimoires]) => {
      result[playerId] = grimoires.map((grimoire) => ({
        ...grimoire,
        skills: grimoire.skills.map(
          (skill: {
            skillId: number;
            skillName: string;
            effects: Array<{
              abilityId: number;
              abilityName: string;
              type: 'damage' | 'heal' | 'resource' | 'buff' | 'debuff' | 'aura';
              count: number;
            }>;
          }) => ({
            ...skill,
            recipe: scribingRecipes[playerId]?.[skill.skillId],
          }),
        ),
      }));
    });

    return result;
  }, [scribingSkillsByPlayer, scribingRecipes]);

  return (
    <PlayerAvatarsProvider players={playersById}>
      <div data-testid="players-panel-loaded">
        <PlayersPanelView
          playerActors={playersById}
          mundusBuffsByPlayer={mundusBuffsByPlayer}
          championPointsByPlayer={championPointsByPlayer}
          scribingSkillsByPlayer={enhancedScribingSkillsByPlayer}
          buildIssuesByPlayer={buildIssuesByPlayer}
          classAnalysisByPlayer={classAnalysisByPlayer}
          kalpaBuildEvidenceByPlayer={kalpaBuildEvidenceByPlayer}
          deathsByPlayer={deathsByPlayer}
          resurrectsByPlayer={resurrectsByPlayer}
          cpmByPlayer={cpmByPlayer}
          aurasByPlayer={aurasByPlayer}
          maxHealthByPlayer={maxHealthByPlayer}
          maxStaminaByPlayer={maxStaminaByPlayer}
          maxMagickaByPlayer={maxMagickaByPlayer}
          distanceByPlayer={distanceByPlayer}
          reportId={reportId}
          fightId={fightId}
          isLoading={isLoading}
          playerGear={playerGear}
          fightStartTime={fight?.startTime}
          fightEndTime={fight?.endTime}
          dpsValueByPlayer={dpsValueByPlayer}
          hpsValueByPlayer={hpsValueByPlayer}
          totalDamageByPlayer={totalDamageByPlayer}
          totalCritDamageByPlayer={totalCritDamageByPlayer}
          critDpsByPlayer={critDpsByPlayer}
          critChanceByPlayer={critChanceByPlayer}
          criticalDamageByPlayer={criticalDamageByPlayer}
          barSwapByPlayer={barSwapByPlayer}
          potionResultsByPlayer={potionResultsByPlayer}
          rolesByPlayerId={rolesByPlayerId}
          companionBuildsByPlayer={companionBuildsByPlayer}
          companionUpload={companionUploadState}
          onCompanionFileSelected={handleCompanionFileSelected}
        />
      </div>
    </PlayerAvatarsProvider>
  );
};
