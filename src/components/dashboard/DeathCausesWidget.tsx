import SkullIcon from '@mui/icons-material/Dangerous';
import { List, ListItem, ListItemIcon, ListItemText, Typography, Chip, Box } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { useDeathEvents } from '../../hooks/events/useDeathEvents';
import { usePlayerData } from '../../hooks/usePlayerData';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';
import { DeathEvent } from '../../types/combatlogEvents';
import { abilityIdMapper } from '../../utils/abilityIdMapper';

import { BaseWidget } from './BaseWidget';

interface DeathCausesWidgetProps {
  id: string;
  scope: WidgetScope;
  reportId: string;
  fights: FightFragment[];
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
}

interface DeathSummary {
  playerName: string;
  playerId: number;
  deathCount: number;
  topCause?: {
    abilityId: number;
    abilityName: string | null;
    sourceId: number;
    sourceName: string | null;
    count: number;
  };
}

export const DeathCausesWidget: React.FC<DeathCausesWidgetProps> = ({
  id,
  scope,
  reportId,
  fights,
  onRemove,
  onScopeChange,
}) => {
  // Always fetch data for up to 5 fights (to satisfy rules of hooks)
  const fight0 = fights[0];
  const fight1 = fights[1];
  const fight2 = fights[2];
  const fight3 = fights[3];
  const fight4 = fights[4];

  const { deathEvents: deaths0, isDeathEventsLoading: loading0 } = useDeathEvents({
    context: { reportCode: reportId, fightId: fight0?.id ?? -1 },
  });
  const { deathEvents: deaths1, isDeathEventsLoading: loading1 } = useDeathEvents({
    context: { reportCode: reportId, fightId: fight1?.id ?? -1 },
  });
  const { deathEvents: deaths2, isDeathEventsLoading: loading2 } = useDeathEvents({
    context: { reportCode: reportId, fightId: fight2?.id ?? -1 },
  });
  const { deathEvents: deaths3, isDeathEventsLoading: loading3 } = useDeathEvents({
    context: { reportCode: reportId, fightId: fight3?.id ?? -1 },
  });
  const { deathEvents: deaths4, isDeathEventsLoading: loading4 } = useDeathEvents({
    context: { reportCode: reportId, fightId: fight4?.id ?? -1 },
  });

  const { playerData, isPlayerDataLoading } = usePlayerData({
    context: { reportCode: reportId, fightId: fight0?.id ?? -1 },
  });

  // Select which fights to use based on scope
  const relevantDeathEvents = React.useMemo(() => {
    const allFightData = [
      { fight: fight0, deaths: deaths0, loading: loading0 },
      { fight: fight1, deaths: deaths1, loading: loading1 },
      { fight: fight2, deaths: deaths2, loading: loading2 },
      { fight: fight3, deaths: deaths3, loading: loading3 },
      { fight: fight4, deaths: deaths4, loading: loading4 },
    ];

    let numFights = fights.length;
    if (scope === 'most-recent') numFights = 1;
    else if (scope === 'last-3') numFights = 3;
    else if (scope === 'last-5') numFights = 5;

    return allFightData.slice(0, Math.min(numFights, 5));
  }, [
    scope,
    fights.length,
    fight0,
    fight1,
    fight2,
    fight3,
    fight4,
    deaths0,
    deaths1,
    deaths2,
    deaths3,
    deaths4,
    loading0,
    loading1,
    loading2,
    loading3,
    loading4,
  ]);

  const isLoading =
    isPlayerDataLoading || relevantDeathEvents.some((data) => data.loading && data.fight);

  const deathSummaries = React.useMemo((): DeathSummary[] => {
    if (!playerData?.playersById) return [];

    // Aggregate death events from all relevant fights
    const allDeathEvents = relevantDeathEvents.flatMap((data) =>
      data.fight && data.deaths ? data.deaths : [],
    );

    const playerDeathMap = new Map<
      number,
      { count: number; causes: Map<string, { abilityId: number; sourceId: number; count: number }> }
    >();

    allDeathEvents.forEach((event: DeathEvent) => {
      if (event.targetIsFriendly && event.targetID) {
        const existing = playerDeathMap.get(event.targetID);
        const causeKey = `${event.abilityGameID || 0}-${event.sourceID || 0}`;
        
        if (existing) {
          existing.count++;
          if (event.abilityGameID) {
            const causeData = existing.causes.get(causeKey);
            if (causeData) {
              causeData.count++;
            } else {
              existing.causes.set(causeKey, {
                abilityId: event.abilityGameID,
                sourceId: event.sourceID || 0,
                count: 1,
              });
            }
          }
        } else {
          const causes = new Map<string, { abilityId: number; sourceId: number; count: number }>();
          if (event.abilityGameID) {
            causes.set(causeKey, {
              abilityId: event.abilityGameID,
              sourceId: event.sourceID || 0,
              count: 1,
            });
          }
          playerDeathMap.set(event.targetID, { count: 1, causes });
        }
      }
    });

    const summaries: DeathSummary[] = [];
    playerDeathMap.forEach((data, playerId) => {
      const player = playerData.playersById[playerId];
      if (!player) return;

      let topCause:
        | { abilityId: number; abilityName: string | null; sourceId: number; sourceName: string | null; count: number }
        | undefined;
      let maxCount = 0;
      data.causes.forEach((causeData) => {
        if (causeData.count > maxCount) {
          maxCount = causeData.count;
          const abilityData = abilityIdMapper.getAbilityById(causeData.abilityId);
          const sourcePlayer = playerData.playersById[causeData.sourceId];
          topCause = {
            abilityId: causeData.abilityId,
            abilityName: abilityData?.name || null,
            sourceId: causeData.sourceId,
            sourceName: sourcePlayer?.name || null,
            count: causeData.count,
          };
        }
      });

      summaries.push({
        playerName: player.name,
        playerId,
        deathCount: data.count,
        topCause,
      });
    });

    return summaries.sort((a, b) => b.deathCount - a.deathCount);
  }, [relevantDeathEvents, playerData]);

  const isEmpty = deathSummaries.length === 0;

  return (
    <BaseWidget
      id={id}
      title="Death Causes"
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      ) : (
        <List dense>
          {deathSummaries.map((summary) => (
            <ListItem key={summary.playerId}>
              <ListItemIcon>
                <SkullIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{summary.playerName}</Typography>
                    <Chip label={`${summary.deathCount}x`} size="small" color="error" />
                  </Box>
                }
                secondary={
                  summary.topCause ? (
                    <>
                      <Typography component="span" variant="body2">
                        {summary.topCause.abilityName || `Ability ${summary.topCause.abilityId}`} (
                        {summary.topCause.count}x)
                      </Typography>
                      {summary.topCause.sourceName && (
                        <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                          from {summary.topCause.sourceName}
                        </Typography>
                      )}
                    </>
                  ) : (
                    'No specific cause tracked'
                  )
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </BaseWidget>
  );
};
