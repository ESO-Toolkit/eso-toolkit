import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { usePlayerData } from '../../../hooks';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { CriticalDamageValues } from '../../../types/abilities';
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
    () => {
      return fightingFinesseSource?.wasActive ?? true;
    },
  );

  const [backstabberEnabled, setBackstabberEnabled] = React.useState<boolean>(
    BACKSTABBER_DEFAULT_ENABLED,
  );

  React.useEffect(() => {
    const defaultActive = fightingFinesseSource?.wasActive ?? true;
    setLocalFightingFinesseEnabled((prev) => (prev === defaultActive ? prev : defaultActive));
  }, [fightingFinesseSource?.wasActive]);

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

    const adjustedTimeAtCapPercentage =
      adjustedDataPoints.length > 0
        ? (adjustedDataPoints.filter((point) => point.criticalDamage >= 125).length /
            adjustedDataPoints.length) *
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
      onExpandChange={onExpandChange}
      phaseTransitionInfo={phaseTransitionInfo}
    />
  );
};
