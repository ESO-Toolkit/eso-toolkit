import DangerousIcon from '@mui/icons-material/Dangerous';
import { Box, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { useDeathEvents } from '../../hooks/events/useDeathEvents';
import { usePlayerData } from '../../hooks/usePlayerData';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';
import { DeathEvent } from '../../types/combatlogEvents';
import { abilityIdMapper } from '../../utils/abilityIdMapper';

import { BaseWidget, WidgetPlayerAvatar, WidgetRolePill } from './BaseWidget';

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
  playerClass: string;
  playerRole: string;
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
    fight0, fight1, fight2, fight3, fight4,
    deaths0, deaths1, deaths2, deaths3, deaths4,
    loading0, loading1, loading2, loading3, loading4,
  ]);

  const isLoading =
    isPlayerDataLoading || relevantDeathEvents.some((data) => data.loading && data.fight);

  const deathSummaries = React.useMemo((): DeathSummary[] => {
    if (!playerData?.playersById) return [];

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
        | {
            abilityId: number;
            abilityName: string | null;
            sourceId: number;
            sourceName: string | null;
            count: number;
          }
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
        playerClass: player.type,
        playerRole: player.role,
        deathCount: data.count,
        topCause,
      });
    });

    return summaries.sort((a, b) => b.deathCount - a.deathCount);
  }, [relevantDeathEvents, playerData]);

  const isEmpty = !isLoading && deathSummaries.length === 0;

  return (
    <BaseWidget
      id={id}
      title="Death Causes"
      subtitle="Sorted by deaths"
      kind="deaths"
      icon={<DangerousIcon />}
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      {isLoading ? (
        <Box sx={{ p: '20px 16px', fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
          Loading…
        </Box>
      ) : (
        deathSummaries.map((summary) => (
          <Box
            key={summary.playerId}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              p: '10px 16px',
              borderBottom: '1px solid rgba(148,163,184,0.06)',
              fontSize: 13,
              '&:last-child': { borderBottom: 'none' },
              '&:hover': { background: 'rgba(56,189,248,0.03)' },
            }}
          >
            <WidgetPlayerAvatar className={summary.playerClass} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 600,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: 13,
                  }}
                >
                  {summary.playerName}
                </Typography>
                <WidgetRolePill role={summary.playerRole} />
              </Box>
              {summary.topCause && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    mt: '4px',
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'monospace',
                  }}
                >
                  <Typography
                    component="span"
                    sx={{ color: '#ffc5c5', fontWeight: 600, fontFamily: 'inherit', fontSize: 12 }}
                  >
                    {summary.topCause.abilityName ?? `Ability ${summary.topCause.abilityId}`}
                  </Typography>
                  <span>× {summary.topCause.count}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>←</span>
                  {summary.topCause.sourceName && (
                    <span style={{ color: 'rgba(255,255,255,0.72)' }}>
                      {summary.topCause.sourceName}
                    </span>
                  )}
                </Box>
              )}
            </Box>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 22,
                height: 22,
                px: '6px',
                borderRadius: '9999px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'monospace',
                background: 'rgba(255,102,102,0.15)',
                color: '#ff9a9a',
                border: '1px solid rgba(255,102,102,0.3)',
              }}
            >
              {summary.deathCount}
            </Box>
          </Box>
        ))
      )}
    </BaseWidget>
  );
};
