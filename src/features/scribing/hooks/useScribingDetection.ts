/**
 * React hook for scribing detection
 * Uses the authoritative scribing database for comprehensive ability ID lookup
 * and integrates with existing detection algorithms for signature and affix scripts
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { Logger, LogLevel } from '@/contexts/LoggerContext';
import { selectActivePlayersById } from '@/store/player_data/playerDataSelectors';
import { useAppDispatch } from '@/store/useAppDispatch';
import {
  executeScribingDetectionsTask,
  selectScribingDetectionsResult,
  selectScribingDetectionsTask,
} from '@/store/worker_results';

// Import event hooks instead of selectors to ensure data is fetched
import { useCastEvents } from '../../../hooks/events/useCastEvents';
import { useDamageEvents } from '../../../hooks/events/useDamageEvents';
import { useDebuffEvents } from '../../../hooks/events/useDebuffEvents';
import { useFriendlyBuffEvents } from '../../../hooks/events/useFriendlyBuffEvents';
import { useHealingEvents } from '../../../hooks/events/useHealingEvents';
import { useHostileBuffEvents } from '../../../hooks/events/useHostileBuffEvents';
import { useResourceEvents } from '../../../hooks/events/useResourceEvents';
import type {
  BuffEvent,
  DebuffEvent,
  DamageEvent,
  UnifiedCastEvent,
  HealEvent,
  ResourceChangeEvent,
} from '../../../types/combatlogEvents';
import {
  computeScribingDetection,
  SCRIBING_DETECTION_SCHEMA_VERSION,
  type PlayerAbilityList,
} from '../analysis/scribingDetectionAnalysis';
import type { ScribedSkillData, ResolvedScribingDetection } from '../types';
import { isScribingAbility } from '../utils/Scribing';

const moduleLogger = new Logger({ level: LogLevel.INFO, contextPrefix: 'ScribingDetection' });

export interface CombatEventData {
  buffs: BuffEvent[];
  debuffs: DebuffEvent[];
  damage: DamageEvent[];
  casts: UnifiedCastEvent[];
  heals: HealEvent[];
  resources: ResourceChangeEvent[];
}

export interface UseScribingDetectionOptions {
  fightId?: string | null;
  playerId?: number;
  abilityId?: number;
  enabled?: boolean;
}

export interface UseScribingDetectionResult {
  data: ResolvedScribingDetection | null;
  scribedSkillData: ScribedSkillData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for scribing detection using the complete scribing database
 * and integrated detection algorithms.
 * Fetches combat events from Redux state automatically.
 */
export function useScribingDetection(
  options: UseScribingDetectionOptions,
): UseScribingDetectionResult {
  const { fightId, playerId, abilityId, enabled = true } = options;
  const dispatch = useAppDispatch();

  const playersById = useSelector(selectActivePlayersById);
  const workerTaskState = useSelector(selectScribingDetectionsTask);
  const workerResult = useSelector(selectScribingDetectionsResult);

  const { damageEvents: damage } = useDamageEvents();
  const { healingEvents: heals } = useHealingEvents();
  const { friendlyBuffEvents } = useFriendlyBuffEvents();
  const { hostileBuffEvents } = useHostileBuffEvents();
  const { debuffEvents: debuffs } = useDebuffEvents();
  const { castEvents: casts } = useCastEvents();
  const { resourceEvents: resources } = useResourceEvents();

  const allBuffs = useMemo(
    () => [...friendlyBuffEvents, ...hostileBuffEvents],
    [friendlyBuffEvents, hostileBuffEvents],
  );

  const combatEvents = useMemo<CombatEventData>(
    () => ({
      buffs: allBuffs,
      debuffs,
      damage,
      casts,
      heals,
      resources,
    }),
    [allBuffs, debuffs, damage, casts, heals, resources],
  );

  const fightIdNumber = useMemo(() => {
    if (!fightId) {
      return null;
    }
    const parsed = Number(fightId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [fightId]);

  const isTestMode =
    typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    process.env.NODE_ENV === 'test';

  const shouldAttemptDetection =
    enabled &&
    fightIdNumber !== null &&
    typeof playerId === 'number' &&
    typeof abilityId === 'number' &&
    abilityId > 0 &&
    isScribingAbility(abilityId);

  const basePlayerAbilities = useMemo<PlayerAbilityList[]>(() => {
    const players = Object.values(playersById);

    return players
      .map((player) => {
        const talents = player.combatantInfo?.talents ?? [];
        const abilityIds = Array.from(
          new Set(
            talents
              .map((talent) => talent?.guid)
              .filter(
                (guid): guid is number => typeof guid === 'number' && isScribingAbility(guid),
              ),
          ),
        );

        return {
          playerId: player.id,
          abilityIds,
        };
      })
      .filter((entry) => entry.abilityIds.length > 0);
  }, [playersById]);

  const requestedPlayerAbilities = useMemo<PlayerAbilityList[]>(() => {
    if (!shouldAttemptDetection || typeof playerId !== 'number' || typeof abilityId !== 'number') {
      return basePlayerAbilities;
    }

    const merged = new Map<number, Set<number>>();
    basePlayerAbilities.forEach((entry) => {
      merged.set(entry.playerId, new Set(entry.abilityIds));
    });

    if (!merged.has(playerId)) {
      merged.set(playerId, new Set());
    }
    merged.get(playerId)!.add(abilityId);

    return Array.from(merged.entries()).map(([id, set]) => ({
      playerId: id,
      abilityIds: Array.from(set),
    }));
  }, [basePlayerAbilities, shouldAttemptDetection, playerId, abilityId]);

  const existingAbilitySets = useMemo(() => {
    if (!workerResult || fightIdNumber === null || workerResult.fightId !== fightIdNumber) {
      return new Map<number, Set<number>>();
    }

    const map = new Map<number, Set<number>>();
    Object.entries(workerResult.players).forEach(([playerKey, abilityMap]) => {
      const validAbilities = new Set<number>();
      const staleAbilities: number[] = [];
      Object.entries(abilityMap).forEach(([abilityKey, detection]) => {
        if (detection?.schemaVersion === SCRIBING_DETECTION_SCHEMA_VERSION) {
          validAbilities.add(Number(abilityKey));
        } else {
          staleAbilities.push(Number(abilityKey));
        }
      });

      if (staleAbilities.length > 0) {
        moduleLogger.info('Ignoring stale scribing detection results', {
          fightId: fightIdNumber,
          playerId: Number(playerKey),
          staleAbilities,
          expectedSchemaVersion: SCRIBING_DETECTION_SCHEMA_VERSION,
        });
      }

      if (validAbilities.size > 0) {
        map.set(Number(playerKey), validAbilities);
      }
    });
    return map;
  }, [workerResult, fightIdNumber]);

  const combinedPlayerAbilities = useMemo<PlayerAbilityList[]>(() => {
    if (!shouldAttemptDetection) {
      return [];
    }

    const merged = new Map<number, Set<number>>();

    existingAbilitySets.forEach((set, id) => {
      merged.set(id, new Set(set));
    });

    requestedPlayerAbilities.forEach((entry) => {
      if (!merged.has(entry.playerId)) {
        merged.set(entry.playerId, new Set());
      }
      const set = merged.get(entry.playerId)!;
      entry.abilityIds.forEach((value) => set.add(value));
    });

    return Array.from(merged.entries())
      .map(([id, set]) => ({ playerId: id, abilityIds: Array.from(set) }))
      .filter((entry) => entry.abilityIds.length > 0);
  }, [existingAbilitySets, requestedPlayerAbilities, shouldAttemptDetection]);

  const currentDetection: ResolvedScribingDetection | null = useMemo(() => {
    if (
      !shouldAttemptDetection ||
      !workerResult ||
      fightIdNumber === null ||
      workerResult.fightId !== fightIdNumber ||
      typeof playerId !== 'number' ||
      typeof abilityId !== 'number'
    ) {
      return null;
    }

    const detection = workerResult.players[playerId]?.[abilityId] ?? null;

    return detection;
  }, [shouldAttemptDetection, workerResult, fightIdNumber, playerId, abilityId]);

  const usableWorkerDetection = useMemo(() => {
    if (!currentDetection) {
      return null;
    }

    if (currentDetection.schemaVersion !== SCRIBING_DETECTION_SCHEMA_VERSION) {
      moduleLogger.info('Discarding worker detection with outdated schema', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
        schemaVersion: currentDetection.schemaVersion,
        expectedSchemaVersion: SCRIBING_DETECTION_SCHEMA_VERSION,
      });
      return null;
    }

    return currentDetection;
  }, [currentDetection, fightIdNumber, playerId, abilityId]);

  const shouldUseWorker =
    shouldAttemptDetection &&
    typeof window !== 'undefined' &&
    !isTestMode &&
    combinedPlayerAbilities.length > 0;

  useEffect(() => {
    if (!shouldUseWorker) {
      return;
    }
    if (!fightIdNumber || typeof playerId !== 'number' || typeof abilityId !== 'number') {
      return;
    }
    if (combinedPlayerAbilities.length === 0) {
      return;
    }
    if (usableWorkerDetection) {
      return;
    }
    if (workerTaskState.isLoading) {
      return;
    }

    moduleLogger.info('Requesting scribing detection via worker', {
      fightId: fightIdNumber,
      playerId,
      abilityId,
      abilityCount: combinedPlayerAbilities.reduce(
        (sum, entry) => sum + entry.abilityIds.length,
        0,
      ),
    });

    dispatch(
      executeScribingDetectionsTask({
        fightId: fightIdNumber,
        combatEvents,
        playerAbilities: combinedPlayerAbilities,
      }),
    );
  }, [
    shouldUseWorker,
    fightIdNumber,
    playerId,
    abilityId,
    usableWorkerDetection,
    combinedPlayerAbilities,
    combatEvents,
    dispatch,
    workerTaskState.isLoading,
  ]);

  const fallbackDetection = useMemo(() => {
    if (!shouldAttemptDetection || shouldUseWorker) {
      return null;
    }
    if (typeof playerId !== 'number' || typeof abilityId !== 'number') {
      return null;
    }

    const detection = computeScribingDetection({
      abilityId,
      playerId,
      combatEvents,
    });
    if (detection) {
      moduleLogger.debug('Computed fallback scribing detection', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
        schemaVersion: detection.schemaVersion,
      });
    }
    return detection;
  }, [shouldAttemptDetection, shouldUseWorker, playerId, abilityId, combatEvents, fightIdNumber]);
  const resolvedDetection = usableWorkerDetection ?? fallbackDetection ?? null;
  const loading = shouldUseWorker ? !usableWorkerDetection && workerTaskState.isLoading : false;
  const error = shouldUseWorker ? workerTaskState.error : null;
  const scribedSkillData = resolvedDetection?.scribedSkillData ?? null;

  useEffect(() => {
    if (usableWorkerDetection) {
      moduleLogger.info('Using worker-provided scribing detection result', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
        schemaVersion: usableWorkerDetection.schemaVersion,
      });
      return;
    }

    if (fallbackDetection) {
      moduleLogger.info('Using fallback scribing detection result', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
        schemaVersion: fallbackDetection.schemaVersion,
      });
      return;
    }

    if (!loading && shouldAttemptDetection) {
      moduleLogger.debug('Scribing detection not yet available', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
        shouldUseWorker,
      });
    }
  }, [
    usableWorkerDetection,
    fallbackDetection,
    fightIdNumber,
    playerId,
    abilityId,
    loading,
    shouldAttemptDetection,
    shouldUseWorker,
  ]);

  const refetch = useCallback(async () => {
    if (!shouldAttemptDetection) {
      return;
    }

    if (shouldUseWorker) {
      if (!fightIdNumber) {
        return;
      }
      moduleLogger.info('Manually refetching scribing detection via worker', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
      });
      await dispatch(
        executeScribingDetectionsTask({
          fightId: fightIdNumber,
          combatEvents,
          playerAbilities: combinedPlayerAbilities,
        }),
      );
      return;
    }

    if (typeof playerId !== 'number' || typeof abilityId !== 'number') {
      return;
    }
  }, [
    shouldAttemptDetection,
    shouldUseWorker,
    fightIdNumber,
    playerId,
    abilityId,
    combatEvents,
    combinedPlayerAbilities,
    dispatch,
  ]);

  return {
    data: resolvedDetection,
    scribedSkillData,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for getting scribing data for a specific skill.
 * Simplified wrapper that fetches combat events from Redux automatically.
 *
 * @param fightId - Fight identifier
 * @param playerId - Player identifier
 * @param abilityId - Ability identifier to detect scribing for
 */
export function useSkillScribingData(
  fightId: string | undefined,
  playerId: number | undefined,
  abilityId: number | undefined,
): {
  scribedSkillData: ScribedSkillData | null;
  loading: boolean;
  error: string | null;
} {
  const { scribedSkillData, loading, error } = useScribingDetection({
    fightId: fightId ?? null,
    playerId,
    abilityId,
    enabled: Boolean(fightId && playerId && abilityId),
  });

  return { scribedSkillData, loading, error };
}
