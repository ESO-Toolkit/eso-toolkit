import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { usePlayerData } from '../../../hooks';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { CriticalDamageValues } from '../../../types/abilities';
import { filterDataPointsByActiveCombat } from '../../../utils/activeCombatTimeUtils';
import { CriticalDamageSourceWithActiveState } from '../../../utils/CritDamageUtils';

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
}) => {
  const { playerData } = usePlayerData();
  const { reportId, fightId } = useSelectedReportAndFight();

  // Get player data
  const player = React.useMemo(() => {
    if (!playerData?.playersById) return null;
    return playerData.playersById[id] || null;
  }, [playerData, id]);

  const fightDurationMs = fight?.endTime && fight?.startTime ? fight.endTime - fight.startTime : 1;

  const fightingFinesseSource = React.useMemo(() => {
    return criticalDamageData?.criticalDamageSources?.find(
      (source) => source.source === 'always_on' && source.name === FIGHTING_FINESSE_SOURCE_NAME,
    );
  }, [criticalDamageData?.criticalDamageSources]);

  const backstabberSource = React.useMemo(() => {
    return criticalDamageData?.criticalDamageSources?.find(
      (source) => source.source === 'always_on' && source.name === BACKSTABBER_SOURCE_NAME,
    );
  }, [criticalDamageData?.criticalDamageSources]);

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
    setLocalFightingFinesseEnabled(
      globalFightingFinesseEnabledProp ?? FIGHTING_FINESSE_DEFAULT_ENABLED,
    );
    setBackstabberEnabled(BACKSTABBER_DEFAULT_ENABLED);
    // globalFightingFinesseEnabledProp is intentionally read but not a trigger here; the
    // effect below handles global-toggle changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, fightId]);

  // Sync local state with global state when global changes
  React.useEffect(() => {
    if (globalFightingFinesseEnabledProp !== undefined) {
      setLocalFightingFinesseEnabled(globalFightingFinesseEnabledProp);
    }
  }, [globalFightingFinesseEnabledProp]);

  // Individual state always takes priority (local state)
  const fightingFinesseEnabled = localFightingFinesseEnabled;

  // Total critical damage to subtract for toggleable always-on sources that are
  // currently disabled. Both Fighting Finesse and Backstabber are baked into the
  // static critical damage, so turning either off removes its contribution.
  const critDamageAdjustment = React.useMemo(() => {
    let adjustment = 0;
    if (fightingFinesseSource && !fightingFinesseEnabled) {
      adjustment += CriticalDamageValues.FIGHTING_FINESSE;
    }
    if (backstabberSource && !backstabberEnabled) {
      adjustment += CriticalDamageValues.BACKSTABBER;
    }
    return adjustment;
  }, [fightingFinesseSource, fightingFinesseEnabled, backstabberSource, backstabberEnabled]);

  const adjustedCriticalDamageData = React.useMemo(() => {
    if (!criticalDamageData) {
      return null;
    }

    if (critDamageAdjustment === 0) {
      return criticalDamageData;
    }

    const adjustment = critDamageAdjustment;

    const adjustedDataPoints = criticalDamageData.dataPoints.map((point) => ({
      ...point,
      criticalDamage: Math.max(0, point.criticalDamage - adjustment),
    }));

    const adjustedEffective = Math.max(0, criticalDamageData.effectiveCriticalDamage - adjustment);
    const adjustedMaximum =
      adjustedDataPoints.length > 0
        ? Math.max(...adjustedDataPoints.map((point) => point.criticalDamage))
        : 0;

    // Time at cap must stay filtered to active-combat data points, matching the worker's
    // calculation. Fall back to all data points if active intervals weren't provided.
    const activeCombatIntervals = criticalDamageData.activeCombatIntervals;
    const capDataPoints = activeCombatIntervals
      ? filterDataPointsByActiveCombat(adjustedDataPoints, activeCombatIntervals)
      : adjustedDataPoints;

    const adjustedTimeAtCapPercentage =
      capDataPoints.length > 0
        ? (capDataPoints.filter((point) => point.criticalDamage >= 125).length /
            capDataPoints.length) *
          100
        : 0;

    return {
      ...criticalDamageData,
      dataPoints: adjustedDataPoints,
      effectiveCriticalDamage: adjustedEffective,
      maximumCriticalDamage: adjustedMaximum,
      timeAtCapPercentage: adjustedTimeAtCapPercentage,
      staticCriticalDamage: Math.max(0, criticalDamageData.staticCriticalDamage - adjustment),
    };
  }, [criticalDamageData, critDamageAdjustment]);

  const adjustedCriticalDamageSources = React.useMemo(() => {
    const sources = criticalDamageData?.criticalDamageSources ?? [];
    return sources.map((source) => {
      if (source.source === 'always_on' && source.name === FIGHTING_FINESSE_SOURCE_NAME) {
        return {
          ...source,
          wasActive: fightingFinesseEnabled,
        };
      }
      if (source.source === 'always_on' && source.name === BACKSTABBER_SOURCE_NAME) {
        return {
          ...source,
          wasActive: backstabberEnabled,
        };
      }
      return source;
    });
  }, [criticalDamageData?.criticalDamageSources, fightingFinesseEnabled, backstabberEnabled]);

  const toggleableSourceNames = React.useMemo(() => {
    const names = new Set<string>();
    for (const source of adjustedCriticalDamageSources) {
      if (
        source.source === 'always_on' &&
        (source.name === FIGHTING_FINESSE_SOURCE_NAME || source.name === BACKSTABBER_SOURCE_NAME)
      ) {
        names.add(source.name);
      }
    }
    return names.size > 0 ? names : undefined;
  }, [adjustedCriticalDamageSources]);

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
