import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { PenetrationSourceWithActiveState } from '../../../utils/PenetrationUtils';

import { PlayerPenetrationDetailsView } from './PlayerPenetrationDetailsView';

interface PenetrationDataPoint {
  timestamp: number;
  penetration: number;
  relativeTime: number; // Time since fight start in seconds
}

interface PlayerPenetrationData {
  playerId: string;
  playerName: string;
  dataPoints: PenetrationDataPoint[];
  max: number;
  effective: number;
  timeAtCapPercentage: number;
  penetrationSources: PenetrationSourceWithActiveState[];
  playerBasePenetration: number;
}

interface PlayerPenetrationDetailsProps {
  id: string;
  name: string;
  fight: FightFragment;
  player: PlayerDetailsWithRole;
  expanded?: boolean;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  penetrationData: PlayerPenetrationData | null;
  isLoading: boolean;
  phaseTransitionInfo?: PhaseTransitionInfo;
}

export const PlayerPenetrationDetails: React.FC<PlayerPenetrationDetailsProps> = ({
  id,
  name,
  fight,
  player,
  expanded = false,
  onExpandChange,
  penetrationData,
  isLoading,
  phaseTransitionInfo,
}) => {
  return (
    <PlayerPenetrationDetailsView
      id={id}
      name={name}
      expanded={expanded}
      isLoading={isLoading}
      player={player}
      penetrationData={penetrationData}
      penetrationSources={penetrationData?.penetrationSources || []}
      playerBasePenetration={penetrationData?.playerBasePenetration || 0}
      fightDurationSeconds={(fight.endTime - fight.startTime) / 1000}
      onExpandChange={onExpandChange}
      phaseTransitionInfo={phaseTransitionInfo}
    />
  );
};
