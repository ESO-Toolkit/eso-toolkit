import { Typography, Box, Chip } from '@mui/material';
import React from 'react';

import {
  useCurrentFight,
  useDamageEvents,
  useHealingEvents,
  useCastEvents,
  usePlayerData,
  useReportMasterData,
} from '../../../hooks';
import { DamageEvent, HealEvent, UnifiedCastEvent } from '../../../types/combatlogEvents';
import { formatDuration } from '../../../utils/fightDuration';
import { timestampToFightTime } from '../../../utils/fightTimeUtils';
import { resolveActorName } from '../../../utils/resolveActorName';
import { BaseWidget, WidgetProps } from '../components/BaseWidget';

interface FirstEventInfo {
  player: string;
  playerName: string;
  role: string | null;
  event: 'damage' | 'heal' | 'cast';
  ability: string;
  timestamp: number;
  fightTime: string;
  amount?: number;
}

export const FirstPlayerEventWidget: React.FC<WidgetProps> = ({ onRemove }) => {
  const { fight, isFightLoading } = useCurrentFight();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { castEvents, isCastEventsLoading } = useCastEvents();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  const isLoading =
    isFightLoading ||
    isDamageEventsLoading ||
    isHealingEventsLoading ||
    isCastEventsLoading ||
    isPlayerDataLoading ||
    isMasterDataLoading;

  const firstEventInfo = React.useMemo((): FirstEventInfo | null => {
    if (
      !damageEvents ||
      !healingEvents ||
      !castEvents ||
      !playerData?.playersById ||
      !reportMasterData?.abilitiesById ||
      !fight
    ) {
      return null;
    }

    // Create a combined array of all player events with type information
    const allPlayerEvents: Array<{
      event: DamageEvent | HealEvent | UnifiedCastEvent;
      type: 'damage' | 'heal' | 'cast';
    }> = [
      ...damageEvents
        .filter(
          (event) => event.sourceIsFriendly && fight.friendlyPlayers?.includes(event.sourceID),
        )
        .map((event) => ({ event, type: 'damage' as const })),
      ...healingEvents
        .filter(
          (event) => event.sourceIsFriendly && fight.friendlyPlayers?.includes(event.sourceID),
        )
        .map((event) => ({ event, type: 'heal' as const })),
      ...castEvents
        .filter(
          (event) => event.sourceIsFriendly && fight.friendlyPlayers?.includes(event.sourceID),
        )
        .map((event) => ({ event, type: 'cast' as const })),
    ];

    if (allPlayerEvents.length === 0) {
      return null;
    }

    // Sort by timestamp to find the earliest event
    allPlayerEvents.sort((a, b) => a.event.timestamp - b.event.timestamp);

    const firstEvent = allPlayerEvents[0];
    const sourcePlayer = playerData.playersById[firstEvent.event.sourceID];

    if (!sourcePlayer) {
      return null;
    }

    const playerName = resolveActorName(sourcePlayer, String(firstEvent.event.sourceID));
    const role = sourcePlayer.role || null;

    // Get ability information
    const ability = reportMasterData.abilitiesById[firstEvent.event.abilityGameID];
    const abilityName = ability?.name || `Ability ${firstEvent.event.abilityGameID}`;

    // Get amount for damage/healing events
    let amount: number | undefined;
    if (firstEvent.type === 'damage' && 'amount' in firstEvent.event) {
      amount = firstEvent.event.amount;
    } else if (firstEvent.type === 'heal' && 'amount' in firstEvent.event) {
      amount = firstEvent.event.amount;
    }

    // Convert timestamp to fight time and format as duration
    const fightTimeMs = timestampToFightTime(firstEvent.event.timestamp, fight);
    const fightTimeFormatted = formatDuration(fightTimeMs);

    return {
      player: String(firstEvent.event.sourceID),
      playerName,
      role,
      event: firstEvent.type,
      ability: abilityName,
      timestamp: firstEvent.event.timestamp,
      fightTime: fightTimeFormatted,
      amount,
    };
  }, [
    damageEvents,
    healingEvents,
    castEvents,
    playerData?.playersById,
    reportMasterData?.abilitiesById,
    fight,
  ]);

  const getRoleColor = (role: string | null): 'primary' | 'success' | 'secondary' | 'default' => {
    switch (role?.toLowerCase()) {
      case 'tank':
        return 'primary';
      case 'healer':
        return 'success';
      case 'dps':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getEventColor = (eventType: string): 'error' | 'success' | 'info' | 'default' => {
    switch (eventType) {
      case 'damage':
        return 'error';
      case 'heal':
        return 'success';
      case 'cast':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatAmount = (amount: number | undefined, eventType: string): string => {
    if (amount === undefined) return '';
    return ` (${amount.toLocaleString()})`;
  };

  return (
    <BaseWidget title="First Player Event" onRemove={onRemove} isLoading={isLoading}>
      {firstEventInfo ? (
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              First action at {firstEventInfo.fightTime}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {firstEventInfo.playerName}
            </Typography>
            {firstEventInfo.role && (
              <Chip
                label={firstEventInfo.role}
                size="small"
                color={getRoleColor(firstEventInfo.role)}
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={firstEventInfo.event}
              size="small"
              color={getEventColor(firstEventInfo.event)}
              sx={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
            />
            <Typography variant="body2">
              {firstEventInfo.ability}
              {formatAmount(firstEventInfo.amount, firstEventInfo.event)}
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary">
            This was the very first action taken by any player in this fight.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No player events found in this fight.
          </Typography>
        </Box>
      )}
    </BaseWidget>
  );
};
