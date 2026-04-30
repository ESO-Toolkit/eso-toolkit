import FastfoodIcon from '@mui/icons-material/Fastfood';
import { Box, CircularProgress, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { usePlayerData } from '../../hooks/usePlayerData';
import { useMultiFightBuffLookup } from '../../hooks/workerTasks/useMultiFightBuffLookup';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';
import {
  TRI_STAT_FOOD,
  HEALTH_AND_REGEN_FOOD,
  HEALTH_FOOD,
  MAGICKA_FOOD,
  STAMINA_FOOD,
  INCREASE_MAX_HEALTH_AND_STAMINA,
  INCREASE_MAX_HEALTH_AND_MAGICKA,
  INCREASE_MAX_MAGICKA_AND_STAMINA,
  MAX_STAMINA_AND_MAGICKA_RECOVERY,
  WITCHES_BREW,
  EXPERIENCE_BOOST_FOOD,
} from '../../types/abilities';
import { isBuffActiveOnTarget } from '../../utils/BuffLookupUtils';

import { BaseWidget } from './BaseWidget';

interface MissingFoodWidgetProps {
  id: string;
  scope: WidgetScope;
  reportId: string;
  fights: FightFragment[];
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
}

const ALL_FOOD_BUFF_IDS = new Set([
  ...TRI_STAT_FOOD,
  ...HEALTH_AND_REGEN_FOOD,
  ...HEALTH_FOOD,
  ...MAGICKA_FOOD,
  ...STAMINA_FOOD,
  ...INCREASE_MAX_HEALTH_AND_STAMINA,
  ...INCREASE_MAX_HEALTH_AND_MAGICKA,
  ...INCREASE_MAX_MAGICKA_AND_STAMINA,
  ...MAX_STAMINA_AND_MAGICKA_RECOVERY,
  ...WITCHES_BREW,
  ...EXPERIENCE_BOOST_FOOD,
]);

export const MissingFoodWidget: React.FC<MissingFoodWidgetProps> = ({
  id,
  scope,
  reportId,
  fights,
  onRemove,
  onScopeChange,
}) => {
  // Load buff data for multiple fights
  // Food widget should always check all fights regardless of scope setting
  const { fightBuffData, isLoading: isBuffDataLoading } = useMultiFightBuffLookup({
    reportCode: reportId,
    fights,
    scope: 'all-fights',
  });

  // Get player data from most recent fight for player information
  const mostRecentFight = fights[0];
  const { playerData } = usePlayerData({
    context: { reportCode: reportId, fightId: mostRecentFight?.id ?? -1 },
  });

  const playersWithoutFood = React.useMemo(() => {
    // Get list of fights we're analyzing based on fightBuffData
    const analyzedFights = fights.filter((fight) => fightBuffData.has(fight.id));

    if (analyzedFights.length === 0) return [];
    // Use a map to track: playerName -> { count, playerInfo }
    const playerMissingFoodCount = new Map<string, { count: number; playerName: string }>();

    // Track which players participated in each fight
    const playerFightParticipation = new Map<string, number>();

    analyzedFights.forEach((fight) => {
      const buffLookupData = fightBuffData.get(fight.id);

      if (!buffLookupData) {
        return;
      }

      const buffIds = Object.keys(buffLookupData.buffIntervals);

      // Get unique player IDs who have ANY buffs in this fight
      const playersInFight = new Set<number>();
      buffIds.forEach((buffId) => {
        const intervals = buffLookupData.buffIntervals[buffId];
        if (intervals) {
          intervals.forEach((interval) => {
            if (interval.targetID) {
              playersInFight.add(interval.targetID);
            }
          });
        }
      });

      const fightMidpoint = (fight.startTime + (fight.endTime ?? fight.startTime)) / 2;

      // Check each player who participated in this fight
      playersInFight.forEach((playerId) => {
        const player = playerData?.playersById?.[playerId];
        const playerName = player?.name || `Anonymous ${playerId}`;

        // Track that this player participated in this fight
        playerFightParticipation.set(
          playerName,
          (playerFightParticipation.get(playerName) || 0) + 1,
        );

        const hasFood = Array.from(ALL_FOOD_BUFF_IDS).some((foodBuffId) => {
          return isBuffActiveOnTarget(buffLookupData, foodBuffId, fightMidpoint, playerId);
        });

        if (!hasFood) {
          const current = playerMissingFoodCount.get(playerName);
          playerMissingFoodCount.set(playerName, {
            count: (current?.count || 0) + 1,
            playerName,
          });
        }
      });
    });

    // Convert to array with count information
    return Array.from(playerMissingFoodCount.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalFights: playerFightParticipation.get(name) || 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [playerData, fightBuffData, fights]);

  const isEmpty = playersWithoutFood.length === 0;

  return (
    <BaseWidget
      id={id}
      title="Missing Food/Drink"
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      {isBuffDataLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={40} />
        </Box>
      ) : (
        <List dense>
          {playersWithoutFood.map((player, idx) => (
            <ListItem key={idx}>
              <ListItemIcon>
                <FastfoodIcon color="warning" />
              </ListItemIcon>
              <ListItemText
                primary={player.name}
                secondary={`Missing food in ${player.count} of ${player.totalFights} fight${player.totalFights > 1 ? 's' : ''}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </BaseWidget>
  );
};
