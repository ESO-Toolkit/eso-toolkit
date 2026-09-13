import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import type { PlayerPenetrationData } from '../../../workers/calculations/CalculatePenetration';

import { PlayerPenetrationDetailsView } from './PlayerPenetrationDetailsView';

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
      playerBasePenetration={penetrationData?.playerBasePenetration ?? null}
      fightDurationMs={fight.endTime - fight.startTime}
      onExpandChange={onExpandChange}
      phaseTransitionInfo={phaseTransitionInfo}
    />
  );
};
