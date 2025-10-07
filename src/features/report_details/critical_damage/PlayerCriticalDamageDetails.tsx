import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { usePlayerData } from '../../../hooks';
import { CriticalDamageValues } from '../../../types/abilities';
import { CriticalDamageSourceWithActiveState } from '../../../utils/CritDamageUtils';

import {
  PlayerCriticalDamageDetailsView,
  PlayerCriticalDamageData,
} from './PlayerCriticalDamageDetailsView';

const FIGHTING_FINESSE_SOURCE_NAME = 'Fighting Finesse';

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
}

export const PlayerCriticalDamageDetails: React.FC<PlayerCriticalDamageDetailsProps> = ({
  id,
  name,
  fight,
  expanded = false,
  onExpandChange,
  criticalDamageData,
  isLoading,
}) => {
  const { playerData } = usePlayerData();

  // Get player data
  const player = React.useMemo(() => {
    if (!playerData?.playersById) return null;
    return playerData.playersById[id] || null;
  }, [playerData, id]);

  const fightDurationSeconds =
    fight?.endTime && fight?.startTime ? (fight.endTime - fight.startTime) / 1000 : 1;

  const fightingFinesseSource = React.useMemo(() => {
    return criticalDamageData?.criticalDamageSources?.find(
      (source) => source.source === 'always_on' && source.name === FIGHTING_FINESSE_SOURCE_NAME,
    );
  }, [criticalDamageData?.criticalDamageSources]);

  const [fightingFinesseEnabled, setFightingFinesseEnabled] = React.useState<boolean>(() => {
    return fightingFinesseSource?.wasActive ?? true;
  });

  React.useEffect(() => {
    const defaultActive = fightingFinesseSource?.wasActive ?? true;
    setFightingFinesseEnabled((prev) => (prev === defaultActive ? prev : defaultActive));
  }, [fightingFinesseSource?.wasActive]);

  const adjustedCriticalDamageData = React.useMemo(() => {
    if (!criticalDamageData) {
      return null;
    }

    if (!fightingFinesseSource || fightingFinesseEnabled) {
      return criticalDamageData;
    }

    const adjustment = CriticalDamageValues.FIGHTING_FINESSE;

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
  }, [criticalDamageData, fightingFinesseEnabled, fightingFinesseSource]);

  const adjustedCriticalDamageSources = React.useMemo(() => {
    const sources = criticalDamageData?.criticalDamageSources ?? [];
    return sources.map((source) => {
      if (source.source === 'always_on' && source.name === FIGHTING_FINESSE_SOURCE_NAME) {
        return {
          ...source,
          wasActive: fightingFinesseEnabled,
        };
      }
      return source;
    });
  }, [criticalDamageData?.criticalDamageSources, fightingFinesseEnabled]);

  const toggleableSourceNames = React.useMemo(() => {
    return adjustedCriticalDamageSources.some(
      (source) => source.source === 'always_on' && source.name === FIGHTING_FINESSE_SOURCE_NAME,
    )
      ? new Set<string>([FIGHTING_FINESSE_SOURCE_NAME])
      : undefined;
  }, [adjustedCriticalDamageSources]);

  const handleSourceToggle = React.useCallback((sourceName: string, nextValue: boolean) => {
    if (sourceName === FIGHTING_FINESSE_SOURCE_NAME) {
      setFightingFinesseEnabled(nextValue);
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
      fightDurationSeconds={fightDurationSeconds}
      onExpandChange={onExpandChange}
    />
  );
};
