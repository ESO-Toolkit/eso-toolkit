import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { usePlayerData } from '../../../hooks';
import { CriticalDamageSourceWithActiveState } from '../../../utils/CritDamageUtils';

import {
  PlayerCriticalDamageDetailsView,
  PlayerCriticalDamageData,
} from './PlayerCriticalDamageDetailsView';

interface PlayerCriticalDamageDataExtended extends PlayerCriticalDamageData {
  criticalDamageSources: CriticalDamageSourceWithActiveState[];
  staticCriticalDamage: number;
}

interface PlayerCriticalDamageDetailsProps {
  id: number;
  name: string;
  fight: FightFragment;
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

  const fightDurationSeconds = (fight.endTime - fight.startTime) / 1000;

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
      criticalDamageData={criticalDamageData}
      criticalDamageSources={criticalDamageData?.criticalDamageSources || []}
      criticalMultiplier={null}
      fightDurationSeconds={fightDurationSeconds}
      onExpandChange={onExpandChange}
    />
  );
};
