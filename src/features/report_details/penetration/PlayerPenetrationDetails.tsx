import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { useCombatantInfoEvents } from '../../../hooks';
import { useDebuffLookup } from '../../../hooks/useDebuffEvents';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import {
  getAllPenetrationSourcesWithActiveState,
  calculateStaticPenetration,
  calculateDynamicPenetrationAtTimestamp,
} from '../../../utils/PenetrationUtils';

import { PlayerPenetrationDetailsView } from './PlayerPenetrationDetailsView';

interface PenetrationDataPoint {
  timestamp: number;
  penetration: number;
  relativeTime: number; // Time since fight start in seconds
}

interface PlayerPenetrationDetailsProps {
  id: string;
  name: string;
  fight: FightFragment;
  player: PlayerDetailsWithRole;
  expanded?: boolean;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const PlayerPenetrationDetails: React.FC<PlayerPenetrationDetailsProps> = ({
  id,
  name,
  fight,
  player,
  expanded = false,
  onExpandChange,
}) => {
  const selectedTargetId = useSelector(selectSelectedTargetId);

  // Get combatant info events
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const playerCombatantInfo =
    combatantInfoEvents.find((info) => info.sourceID.toString() === id) || null;

  // Get buff/debuff lookups for BuffLookup functionality
  const { debuffsLookup, isDebuffEventsLoading } = useDebuffLookup();

  const isLoading = isCombatantInfoEventsLoading || isDebuffEventsLoading;

  // Get all penetration sources with active states using BuffLookup
  const allSources = React.useMemo(() => {
    if (!debuffsLookup || !playerCombatantInfo) {
      return [];
    }
    return getAllPenetrationSourcesWithActiveState(
      debuffsLookup,
      debuffsLookup,
      playerCombatantInfo,
      player
    );
  }, [debuffsLookup, playerCombatantInfo, player]);

  // Calculate base penetration for this specific player
  const playerBasePenetration = React.useMemo(() => {
    if (!playerCombatantInfo) return 0;
    return calculateStaticPenetration(playerCombatantInfo, player);
  }, [playerCombatantInfo, player]);

  // Calculate penetration data using BuffLookup approach
  const penetrationData = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime || !debuffsLookup) {
      return null;
    }

    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;
    const fightDurationSeconds = (fightEnd - fightStart) / 1000;

    // Create data points using efficient BuffLookup approach
    const dataPoints: PenetrationDataPoint[] = [];

    // Calculate penetration for each second using voxelization
    const voxelSizeSeconds = 1;
    const numVoxels = Math.ceil(fightDurationSeconds / voxelSizeSeconds);
    const cap = 18200; // Penetration cap
    let timeAtCapCount = 0;

    for (let i = 0; i < numVoxels; i++) {
      const voxelTimestamp = fightStart + i * voxelSizeSeconds * 1000;

      // Calculate dynamic penetration from debuffs using BuffLookup
      const dynamicPenetration = calculateDynamicPenetrationAtTimestamp(
        null, // No buff lookup needed currently
        debuffsLookup,
        voxelTimestamp,
        selectedTargetId
      );

      const totalPenetration = playerBasePenetration + dynamicPenetration;

      dataPoints.push({
        timestamp: voxelTimestamp,
        penetration: totalPenetration,
        relativeTime: i * voxelSizeSeconds,
      });

      // Count time at cap
      if (totalPenetration >= cap) {
        timeAtCapCount++;
      }
    }

    const timeAtCapPercentage = numVoxels > 0 ? (timeAtCapCount / numVoxels) * 100 : 0;

    const maxPenetration = Math.max(...dataPoints.map((point) => point.penetration), 0);
    const effectivePenetration =
      dataPoints.reduce((sum, point) => sum + point.penetration, 0) / dataPoints.length;

    return {
      playerId: id,
      playerName: name,
      dataPoints,
      max: maxPenetration,
      effective: effectivePenetration,
      timeAtCapPercentage,
    };
  }, [fight, debuffsLookup, playerBasePenetration, selectedTargetId, id, name]);

  return (
    <PlayerPenetrationDetailsView
      id={id}
      name={name}
      expanded={expanded}
      isLoading={isLoading}
      player={player}
      penetrationData={penetrationData}
      penetrationSources={allSources}
      playerBasePenetration={playerBasePenetration}
      fightDurationSeconds={(fight.endTime - fight.startTime) / 1000}
      onExpandChange={onExpandChange}
    />
  );
};
