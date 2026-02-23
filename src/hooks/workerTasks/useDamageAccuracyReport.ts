import React from 'react';

import type { CombatantInfoEvent, DamageEvent } from '../../types/combatlogEvents';
import type { BuffLookupData } from '../../utils/BuffLookupUtils';
import {
  type FightAccuracyReport,
  type GenerateFightAccuracyReportInput,
  generateFightAccuracyReport,
} from '../../utils/damageAccuracyEngine';
import { useCombatantInfoRecord } from '../events/useCombatantInfoRecord';
import { useDamageEvents } from '../events/useDamageEvents';
import { useCurrentFight } from '../useCurrentFight';
import { usePlayerData } from '../usePlayerData';
import { useBuffLookupTask } from '../workerTasks/useBuffLookupTask';
import { useDebuffLookupTask } from '../workerTasks/useDebuffLookupTask';

interface UseDamageAccuracyReportOptions {
  /** Default target resistance to assume (18200 for trial bosses) */
  defaultTargetResistance?: number;
}

export function useDamageAccuracyReport(options?: UseDamageAccuracyReportOptions): {
  accuracyReport: FightAccuracyReport | null;
  isLoading: boolean;
  error: string | null;
} {
  const { fight: selectedFight } = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord();
  const { buffLookupData, isBuffLookupLoading, buffLookupError } = useBuffLookupTask();
  const { debuffLookupData, isDebuffLookupLoading, debuffLookupError } = useDebuffLookupTask();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();

  const defaultTargetResistance = options?.defaultTargetResistance ?? 18200;

  const [accuracyReport, setAccuracyReport] = React.useState<FightAccuracyReport | null>(null);
  const [isComputing, setIsComputing] = React.useState(false);
  const [computeError, setComputeError] = React.useState<string | null>(null);

  // Track the computation to avoid re-running on every render
  const lastComputeKeyRef = React.useRef<string>('');

  React.useEffect(() => {
    // Check all dependencies are ready
    const allReady =
      selectedFight &&
      !isPlayerDataLoading &&
      playerData?.playersById &&
      !isCombatantInfoEventsLoading &&
      combatantInfoRecord !== null &&
      !isBuffLookupLoading &&
      buffLookupData !== null &&
      !isDebuffLookupLoading &&
      debuffLookupData !== null &&
      !isDamageEventsLoading &&
      damageEvents.length > 0;

    if (!allReady) {
      return;
    }

    // Build a key to avoid re-computation if nothing changed
    const computeKey = `${selectedFight.id}-${damageEvents.length}-${defaultTargetResistance}`;
    if (computeKey === lastComputeKeyRef.current) {
      return;
    }

    lastComputeKeyRef.current = computeKey;
    setIsComputing(true);
    setComputeError(null);

    // Run computation async to avoid blocking the UI
    const timeoutId = setTimeout(() => {
      try {
        const input: GenerateFightAccuracyReportInput = {
          damageEvents: damageEvents as DamageEvent[],
          playersById: playerData!.playersById,
          combatantInfoRecord: combatantInfoRecord as Record<number, CombatantInfoEvent>,
          buffLookup: buffLookupData as BuffLookupData,
          debuffLookup: debuffLookupData as BuffLookupData,
          fightStartTime: selectedFight.startTime,
          fightEndTime: selectedFight.endTime,
          defaultTargetResistance,
        };

        const report = generateFightAccuracyReport(input);
        setAccuracyReport(report);
      } catch (err) {
        setComputeError(err instanceof Error ? err.message : 'Unknown error during computation');
      } finally {
        setIsComputing(false);
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    selectedFight,
    playerData,
    isPlayerDataLoading,
    combatantInfoRecord,
    isCombatantInfoEventsLoading,
    buffLookupData,
    isBuffLookupLoading,
    debuffLookupData,
    isDebuffLookupLoading,
    damageEvents,
    isDamageEventsLoading,
    defaultTargetResistance,
  ]);

  const isLoading =
    isPlayerDataLoading ||
    isCombatantInfoEventsLoading ||
    isBuffLookupLoading ||
    isDebuffLookupLoading ||
    isDamageEventsLoading ||
    isComputing;

  const error = buffLookupError || debuffLookupError || computeError;

  return React.useMemo(
    () => ({ accuracyReport, isLoading, error }),
    [accuracyReport, isLoading, error],
  );
}
