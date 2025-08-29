import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useCombatantInfoEvents, useSelectedTargetIds } from '../../../hooks';
import { useDebuffLookup } from '../../../hooks/useDebuffEvents';
import { useFriendlyBuffLookup } from '../../../hooks/useFriendlyBuffEvents';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
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
  const selectedTargetIds = useSelectedTargetIds();

  // Get combatant info events
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const playerCombatantInfo =
    combatantInfoEvents.find((info) => info.sourceID.toString() === id) || null;

  // Get buff/debuff lookups for BuffLookup functionality
  const { debuffsLookup, isDebuffEventsLoading } = useDebuffLookup();
  const { friendlyBuffsLookup, isFriendlyBuffEventsLoading } = useFriendlyBuffLookup();

  const isLoading =
    isCombatantInfoEventsLoading || isDebuffEventsLoading || isFriendlyBuffEventsLoading;

  // Get all penetration sources with active states using BuffLookup
  const allSources = React.useMemo(() => {
    if (!debuffsLookup || !friendlyBuffsLookup || !playerCombatantInfo) {
      return [];
    }
    return getAllPenetrationSourcesWithActiveState(
      friendlyBuffsLookup, // Use buff lookup for friendly buffs
      debuffsLookup, // Use debuff lookup for enemy debuffs
      playerCombatantInfo,
      player
    );
  }, [debuffsLookup, friendlyBuffsLookup, playerCombatantInfo, player]);

  // Calculate base penetration for this specific player
  const playerBasePenetration = React.useMemo(() => {
    if (!playerCombatantInfo) return 0;
    return calculateStaticPenetration(playerCombatantInfo, player);
  }, [playerCombatantInfo, player]);

  // Calculate penetration data using BuffLookup approach
  const penetrationData = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime || !debuffsLookup || !friendlyBuffsLookup) {
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

      // Calculate dynamic penetration from debuffs against all selected targets
      // Use the best penetration value from all targets (debuffs may apply to different targets)
      let dynamicPenetration = 0;

      if (selectedTargetIds.size > 0) {
        // Calculate penetration for each target and take the maximum
        // This accounts for cases where different debuffs may be on different targets
        const targetPenetrations = Array.from(selectedTargetIds).map((targetId) =>
          calculateDynamicPenetrationAtTimestamp(
            friendlyBuffsLookup, // Check buffs on this player
            debuffsLookup, // Check debuffs on the target
            voxelTimestamp,
            parseInt(id, 10), // Player ID (for buff checks)
            targetId // Target ID (for debuff checks)
          )
        );
        dynamicPenetration = Math.max(...targetPenetrations, 0);
      }

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
  }, [
    fight,
    debuffsLookup,
    friendlyBuffsLookup,
    playerBasePenetration,
    selectedTargetIds,
    id,
    name,
  ]);

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
