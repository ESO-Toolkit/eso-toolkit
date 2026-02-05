import WarningIcon from '@mui/icons-material/Warning';
import { Box, CircularProgress, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { usePlayerData } from '../../hooks/usePlayerData';
import { useMultiFightBuffLookup } from '../../hooks/workerTasks/useMultiFightBuffLookup';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';
import { isBuffActiveOnTarget } from '../../utils/BuffLookupUtils';

import { BaseWidget } from './BaseWidget';

interface MissingBuffsWidgetProps {
  id: string;
  scope: WidgetScope;
  reportId: string;
  fights: FightFragment[];
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
}

// Key buffs to check for (Major Brutality, Major Sorcery, etc.)
const IMPORTANT_BUFFS = [
  { id: 61746, name: 'Major Brutality', roles: ['dps' as const] },
  { id: 61747, name: 'Major Sorcery', roles: ['dps' as const] },
  { id: 61744, name: 'Minor Berserk', roles: ['dps' as const] },
];

interface MissingBuffInfo {
  buffName: string;
  playerNames: string[];
}

export const MissingBuffsWidget: React.FC<MissingBuffsWidgetProps> = ({
  id,
  scope,
  reportId,
  fights,
  onRemove,
  onScopeChange,
}) => {
  // Load buff data for multiple fights
  const { fightBuffData, isLoading: isBuffDataLoading } = useMultiFightBuffLookup({
    reportCode: reportId,
    fights,
    scope,
  });

  // Get player data from most recent fight for player information
  const mostRecentFight = fights[0];
  const { playerData } = usePlayerData({
    context: { reportCode: reportId, fightId: mostRecentFight?.id ?? -1 },
  });

  const missingBuffs = React.useMemo((): MissingBuffInfo[] => {
    if (!playerData?.playersById || fightBuffData.size === 0) return [];

    // Get list of fights we're analyzing based on fightBuffData
    const analyzedFights = fights.filter((fight) => fightBuffData.has(fight.id));
    if (analyzedFights.length === 0) return [];

    // Track players missing each buff across all analyzed fights
    const buffToPlayersMap = new Map<string, Set<string>>();

    analyzedFights.forEach((fight) => {
      const buffLookupData = fightBuffData.get(fight.id);
      if (!buffLookupData) return;

      const fightMidpoint = (fight.startTime + (fight.endTime ?? fight.startTime)) / 2;

      Object.values(playerData.playersById).forEach((player) => {
        IMPORTANT_BUFFS.forEach((buff) => {
          if (!(buff.roles as readonly string[]).includes(player.role)) return;

          const hasBuffAtMidpoint = isBuffActiveOnTarget(
            buffLookupData,
            buff.id,
            fightMidpoint,
            player.id,
          );

          if (!hasBuffAtMidpoint) {
            if (!buffToPlayersMap.has(buff.name)) {
              buffToPlayersMap.set(buff.name, new Set());
            }
            buffToPlayersMap.get(buff.name)!.add(player.name);
          }
        });
      });
    });

    // Return buffs grouped by buff name with list of players missing each buff
    const missing: MissingBuffInfo[] = [];
    buffToPlayersMap.forEach((playerSet, buffName) => {
      missing.push({ buffName, playerNames: Array.from(playerSet).sort() });
    });

    // Sort by number of players missing (most to least)
    return missing.sort((a, b) => b.playerNames.length - a.playerNames.length);
  }, [playerData, fightBuffData, fights]);

  const isEmpty = missingBuffs.length === 0;

  return (
    <BaseWidget
      id={id}
      title="Missing Buffs"
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
          {missingBuffs.map((item, idx) => (
            <ListItem key={idx}>
              <ListItemIcon>
                <WarningIcon color="warning" />
              </ListItemIcon>
              <ListItemText
                primary={item.buffName}
                secondary={`Missing on: ${item.playerNames.join(', ')}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </BaseWidget>
  );
};

