import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { usePlayerData } from '../../../hooks';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { filterDataPointsByActiveCombat } from '../../../utils/activeCombatTimeUtils';
import {
  type CompanionCritEvidence,
  CriticalDamageSourceWithActiveState,
} from '../../../utils/CritDamageUtils';

import {
  computeCritDamageAdjustment,
  type CriticalDamageSourceInclusion,
} from './critDamageAdjustment';
import {
  PlayerCriticalDamageDetailsView,
  PlayerCriticalDamageData,
} from './PlayerCriticalDamageDetailsView';

const FIGHTING_FINESSE_SOURCE_NAME = 'Fighting Finesse';
const BACKSTABBER_SOURCE_NAME = 'Backstabber';

// Backstabber only applies while flanking (rear/side arc), which can't be detected
// from log data. Default it OFF so the displayed critical damage reflects the
// unconditional baseline; users can toggle it on if they were reliably flanking.
const BACKSTABBER_DEFAULT_ENABLED = false;

// Fighting Finesse is a slottable Champion Point that may not be slotted, and can't be
// confirmed from log data. Default it OFF so the displayed critical damage reflects the
// unconditional baseline; users can toggle it on (per-player or globally) when slotted.
const FIGHTING_FINESSE_DEFAULT_ENABLED = false;

interface PlayerCriticalDamageDataExtended extends PlayerCriticalDamageData {
  criticalDamageSources: CriticalDamageSourceWithActiveState[];
  staticCriticalDamage: number;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isCriticalDamageDataPoint = (
  point: unknown,
): point is PlayerCriticalDamageData['dataPoints'][number] => {
  if (!point || typeof point !== 'object') return false;
  const candidate = point as Record<string, unknown>;
  return (
    isFiniteNumber(candidate.timestamp) &&
    isFiniteNumber(candidate.relativeTime) &&
    isFiniteNumber(candidate.criticalDamage)
  );
};

const isCombatInterval = (interval: unknown): interval is { start: number; end: number } => {
  if (!interval || typeof interval !== 'object') return false;
  const candidate = interval as Record<string, unknown>;
  return isFiniteNumber(candidate.start) && isFiniteNumber(candidate.end);
};

export const resolveCriticalDamageSourceInclusion = (
  source: CriticalDamageSourceWithActiveState | undefined,
): CriticalDamageSourceInclusion => {
  if (!source || typeof source.wasActive !== 'boolean') return 'unknown';
  return source.wasActive ? 'included' : 'excluded';
};

export const getFightDurationMs = (fight: FightFragment | undefined): number => {
  if (!fight || !isFiniteNumber(fight.startTime) || !isFiniteNumber(fight.endTime)) return 0;
  return Math.max(0, fight.endTime - fight.startTime);
};

interface PlayerCriticalDamageDetailsProps {
  id: number;
  name: string;
  fight: FightFragment | undefined;
  expanded?: boolean;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  criticalDamageData: PlayerCriticalDamageDataExtended | null;
  isLoading: boolean;
  phaseTransitionInfo?: PhaseTransitionInfo;
  globalFightingFinesseEnabled?: boolean;
  /**
   * Per-player ESOTK Companion evidence for this player, when a snapshot matched. Drives the
   * Fighting Finesse default (slotted => on) and makes companion data authoritative over the
   * report-wide toggle. The *subtract* still keys off the worker's baked-in `wasActive`, so
   * both derive from the same evidence and never disagree.
   */
  companionCritEvidence?: CompanionCritEvidence;
}

export const PlayerCriticalDamageDetails: React.FC<PlayerCriticalDamageDetailsProps> = ({
  id,
  name,
  fight,
  expanded = false,
  onExpandChange,
  criticalDamageData,
  isLoading,
  phaseTransitionInfo,
  globalFightingFinesseEnabled: globalFightingFinesseEnabledProp,
  companionCritEvidence,
}) => {
  const { playerData } = usePlayerData();
  const { reportId, fightId } = useSelectedReportAndFight();

  // Get player data
  const player = React.useMemo(() => {
    if (!playerData?.playersById) return null;
    return playerData.playersById[id] || null;
  }, [playerData, id]);

  const fightDurationMs = getFightDurationMs(fight);

  const criticalDamageSources = React.useMemo(
    () =>
      Array.isArray(criticalDamageData?.criticalDamageSources)
        ? criticalDamageData.criticalDamageSources
        : [],
    [criticalDamageData?.criticalDamageSources],
  );

  const fightingFinesseSource = React.useMemo(() => {
    return criticalDamageSources.find(
      (source) => source.source === 'always_on' && source.name === FIGHTING_FINESSE_SOURCE_NAME,
    );
  }, [criticalDamageSources]);

  const backstabberSource = React.useMemo(() => {
    return criticalDamageSources.find(
      (source) => source.source === 'always_on' && source.name === BACKSTABBER_SOURCE_NAME,
    );
  }, [criticalDamageSources]);

  // Whether the worker confirmed each star was baked into staticCriticalDamage. Source activity
  // without a boolean wasActive field is unknown, so it must not be treated as either included
  // or excluded when calculating a toggle adjustment.
  const fightingFinesseInclusion = resolveCriticalDamageSourceInclusion(fightingFinesseSource);
  const backstabberInclusion = resolveCriticalDamageSourceInclusion(backstabberSource);

  const [localFightingFinesseEnabled, setLocalFightingFinesseEnabled] = React.useState<boolean>(
    FIGHTING_FINESSE_DEFAULT_ENABLED,
  );

  const [backstabberEnabled, setBackstabberEnabled] = React.useState<boolean>(
    BACKSTABBER_DEFAULT_ENABLED,
  );

  // Reset the per-player toggles to their defaults when the fight/report context changes.
  // This component instance can be reused across fights (rows are keyed only by player.id),
  // so without this a toggle flipped on for one fight would leak into the next. Fall back to
  // the global Fighting Finesse setting so an explicit global toggle still applies.
  // (We can't key on the always-on source's wasActive — it is always true and never changes.)
  React.useEffect(() => {
    // When a companion snapshot matched this player, its slotted CP is authoritative: seed
    // Fighting Finesse enabled only when it is actually slotted. Otherwise fall back to the
    // report-wide global toggle so an explicit global setting still applies.
    setLocalFightingFinesseEnabled(
      companionCritEvidence
        ? companionCritEvidence.fightingFinesseSlotted
        : (globalFightingFinesseEnabledProp ?? FIGHTING_FINESSE_DEFAULT_ENABLED),
    );
    // Backstabber depends on flanking, which is undetectable even with a snapshot, so it stays
    // off by default; slotted only decides whether it was baked (and thus togglable).
    setBackstabberEnabled(BACKSTABBER_DEFAULT_ENABLED);
    // globalFightingFinesseEnabledProp is intentionally read but not a trigger here; the
    // effect below handles global-toggle changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, fightId, companionCritEvidence]);

  // Sync local state with global state when global changes — unless companion evidence exists,
  // in which case it is authoritative and the report-wide toggle must not fabricate Fighting
  // Finesse for a player we know the truth of.
  React.useEffect(() => {
    if (companionCritEvidence) return;
    if (globalFightingFinesseEnabledProp !== undefined) {
      setLocalFightingFinesseEnabled(globalFightingFinesseEnabledProp);
    }
  }, [globalFightingFinesseEnabledProp, companionCritEvidence]);

  // Individual state always takes priority (local state)
  const fightingFinesseEnabled = localFightingFinesseEnabled;

  // Total critical damage to subtract for toggleable always-on sources that are currently
  // disabled — gated on whether the worker actually baked each star in (fightingFinesseIncluded
  // / backstabberIncluded), so an evidence-excluded star is never subtracted twice.
  const critDamageAdjustment = React.useMemo(
    () =>
      computeCritDamageAdjustment({
        fightingFinesseInclusion,
        fightingFinesseEnabled,
        backstabberInclusion,
        backstabberEnabled,
      }),
    [fightingFinesseInclusion, fightingFinesseEnabled, backstabberInclusion, backstabberEnabled],
  );

  const adjustedCriticalDamageData = React.useMemo(() => {
    if (!criticalDamageData) {
      return null;
    }

    const rawDataPoints = Array.isArray(criticalDamageData.dataPoints)
      ? criticalDamageData.dataPoints
      : [];
    const adjustedDataPoints = rawDataPoints.filter(isCriticalDamageDataPoint).map((point) => ({
      ...point,
      criticalDamage: Math.max(0, point.criticalDamage - critDamageAdjustment),
    }));

    const hasValidSamples = adjustedDataPoints.length > 0;
    const adjustedEffective =
      hasValidSamples && isFiniteNumber(criticalDamageData.effectiveCriticalDamage)
        ? Math.max(0, criticalDamageData.effectiveCriticalDamage - critDamageAdjustment)
        : null;
    const adjustedMaximum = hasValidSamples
      ? Math.max(...adjustedDataPoints.map((point) => point.criticalDamage))
      : null;

    // Time at cap must stay filtered to active-combat data points, matching the worker's
    // calculation. Fall back to all data points if active intervals weren't provided.
    const rawActiveCombatIntervals = criticalDamageData.activeCombatIntervals;
    const activeCombatIntervalsAreValid =
      rawActiveCombatIntervals === undefined ||
      (Array.isArray(rawActiveCombatIntervals) && rawActiveCombatIntervals.every(isCombatInterval));
    const capDataPoints =
      rawActiveCombatIntervals === undefined
        ? adjustedDataPoints
        : activeCombatIntervalsAreValid
          ? filterDataPointsByActiveCombat(adjustedDataPoints, rawActiveCombatIntervals)
          : [];

    const adjustedTimeAtCapPercentage =
      capDataPoints.length > 0
        ? (capDataPoints.filter((point) => point.criticalDamage >= 125).length /
            capDataPoints.length) *
          100
        : null;

    const invalidSampleCount = rawDataPoints.length - adjustedDataPoints.length;
    const invalidMetrics =
      !isFiniteNumber(criticalDamageData.effectiveCriticalDamage) ||
      !isFiniteNumber(criticalDamageData.timeAtCapPercentage);
    const dataQualityMessage = !hasValidSamples
      ? 'No valid critical damage samples were received.'
      : invalidSampleCount > 0 || invalidMetrics || !activeCombatIntervalsAreValid
        ? 'Some critical damage measurements were invalid and were omitted.'
        : undefined;

    return {
      ...criticalDamageData,
      dataPoints: adjustedDataPoints,
      effectiveCriticalDamage: adjustedEffective,
      maximumCriticalDamage: adjustedMaximum,
      timeAtCapPercentage: adjustedTimeAtCapPercentage,
      inactiveCombatIntervals: Array.isArray(criticalDamageData.inactiveCombatIntervals)
        ? criticalDamageData.inactiveCombatIntervals.filter(isCombatInterval)
        : [],
      dataQualityMessage,
    };
  }, [criticalDamageData, critDamageAdjustment]);

  const adjustedCriticalDamageSources = React.useMemo(() => {
    return criticalDamageSources.map((source) => {
      if (source.source === 'always_on' && source.name === FIGHTING_FINESSE_SOURCE_NAME) {
        return {
          ...source,
          wasActive: fightingFinesseInclusion === 'included' && fightingFinesseEnabled,
        };
      }
      if (source.source === 'always_on' && source.name === BACKSTABBER_SOURCE_NAME) {
        return {
          ...source,
          wasActive: backstabberInclusion === 'included' && backstabberEnabled,
        };
      }
      return { ...source, wasActive: source.wasActive === true };
    });
  }, [
    criticalDamageSources,
    fightingFinesseInclusion,
    fightingFinesseEnabled,
    backstabberInclusion,
    backstabberEnabled,
  ]);

  // Only offer a toggle for stars the worker actually baked in (included). A star companion
  // evidence proved isn't slotted is shown inactive but not togglable — the subtract-only model
  // can't ADD back a contribution the worker never included.
  const toggleableSourceNames = React.useMemo(() => {
    const names = new Set<string>();
    if (fightingFinesseInclusion === 'included') names.add(FIGHTING_FINESSE_SOURCE_NAME);
    if (backstabberInclusion === 'included') names.add(BACKSTABBER_SOURCE_NAME);
    return names.size > 0 ? names : undefined;
  }, [fightingFinesseInclusion, backstabberInclusion]);

  const dataQualityMessage = React.useMemo(() => {
    const numericDataQualityMessage = adjustedCriticalDamageData?.dataQualityMessage;
    const sourceActivityIsUnknown =
      fightingFinesseInclusion === 'unknown' || backstabberInclusion === 'unknown';
    if (!sourceActivityIsUnknown) return numericDataQualityMessage;

    const sourceMessage =
      'Fighting Finesse or Backstabber activity could not be confirmed, so those sources cannot be toggled.';
    return numericDataQualityMessage
      ? `${numericDataQualityMessage} ${sourceMessage}`
      : sourceMessage;
  }, [
    adjustedCriticalDamageData?.dataQualityMessage,
    fightingFinesseInclusion,
    backstabberInclusion,
  ]);

  const handleSourceToggle = React.useCallback((sourceName: string, nextValue: boolean) => {
    if (sourceName === FIGHTING_FINESSE_SOURCE_NAME) {
      setLocalFightingFinesseEnabled(nextValue);
    } else if (sourceName === BACKSTABBER_SOURCE_NAME) {
      setBackstabberEnabled(nextValue);
    }
  }, []);

  if (!player) {
    return null;
  }

  return (
    <PlayerCriticalDamageDetailsView
      id={id}
      player={player}
      name={name}
      expanded={expanded}
      isLoading={isLoading}
      criticalDamageData={adjustedCriticalDamageData}
      dataQualityMessage={dataQualityMessage}
      criticalDamageSources={adjustedCriticalDamageSources}
      toggleableSourceNames={toggleableSourceNames}
      onSourceToggle={handleSourceToggle}
      criticalMultiplier={null}
      fightDurationMs={fightDurationMs}
      reportId={reportId}
      fightId={fightId}
      onExpandChange={onExpandChange}
      phaseTransitionInfo={phaseTransitionInfo}
    />
  );
};
