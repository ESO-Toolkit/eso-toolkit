import FastfoodIcon from '@mui/icons-material/Fastfood';
import { Box, CircularProgress, Typography } from '@mui/material';
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

import { BaseWidget, WidgetPlayerAvatar } from './BaseWidget';

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

interface FoodPlayerInfo {
  name: string;
  playerClass: string;
  count: number;
  totalFights: number;
  missingByFight: boolean[];
}

export const MissingFoodWidget: React.FC<MissingFoodWidgetProps> = ({
  id,
  scope,
  reportId,
  fights,
  onRemove,
  onScopeChange,
}) => {
  const { fightBuffData, isLoading: isBuffDataLoading } = useMultiFightBuffLookup({
    reportCode: reportId,
    fights,
    scope: 'all-fights',
  });

  const mostRecentFight = fights[0];
  const { playerData } = usePlayerData({
    context: { reportCode: reportId, fightId: mostRecentFight?.id ?? -1 },
  });

  const playersWithoutFood = React.useMemo((): FoodPlayerInfo[] => {
    const analyzedFights = fights.filter((fight) => fightBuffData.has(fight.id));
    if (analyzedFights.length === 0) return [];

    const playerMissing = new Map<
      string,
      { playerClass: string; missing: boolean[]; totalFights: number }
    >();

    const playerFightParticipation = new Map<string, number>();

    analyzedFights.forEach((fight, fightIdx) => {
      const buffLookupData = fightBuffData.get(fight.id);
      if (!buffLookupData) return;

      const buffIds = Object.keys(buffLookupData.buffIntervals);
      const playersInFight = new Set<number>();
      buffIds.forEach((buffId) => {
        const intervals = buffLookupData.buffIntervals[buffId];
        if (intervals) {
          intervals.forEach((interval) => {
            if (interval.targetID) playersInFight.add(interval.targetID);
          });
        }
      });

      const fightMidpoint = (fight.startTime + (fight.endTime ?? fight.startTime)) / 2;

      playersInFight.forEach((playerId) => {
        const player = playerData?.playersById?.[playerId];
        const playerName = player?.name || `Anonymous ${playerId}`;
        const playerClass = player?.type ?? '';

        playerFightParticipation.set(
          playerName,
          (playerFightParticipation.get(playerName) ?? 0) + 1,
        );

        const hasFood = Array.from(ALL_FOOD_BUFF_IDS).some((foodBuffId) =>
          isBuffActiveOnTarget(buffLookupData, foodBuffId, fightMidpoint, playerId),
        );

        if (!hasFood) {
          if (!playerMissing.has(playerName)) {
            playerMissing.set(playerName, {
              playerClass,
              missing: new Array(analyzedFights.length).fill(false),
              totalFights: 0,
            });
          }
          const entry = playerMissing.get(playerName)!;
          entry.missing[fightIdx] = true;
          entry.totalFights++;
        }
      });
    });

    return Array.from(playerMissing.entries())
      .map(([name, data]) => ({
        name,
        playerClass: data.playerClass,
        count: data.totalFights,
        totalFights: playerFightParticipation.get(name) ?? analyzedFights.length,
        missingByFight: data.missing,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [playerData, fightBuffData, fights]);

  const totalFights = fights.filter((f) => fightBuffData.has(f.id)).length;
  const isEmpty = playersWithoutFood.length === 0;

  return (
    <BaseWidget
      id={id}
      title="Missing Food"
      subtitle={`All ${totalFights || fights.length} fights · always full-report`}
      kind="food"
      icon={<FastfoodIcon />}
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      {isBuffDataLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        playersWithoutFood.map((player, idx) => (
          <Box
            key={idx}
            sx={{
              p: '10px 16px',
              borderBottom: '1px solid rgba(148,163,184,0.06)',
              '&:last-child': { borderBottom: 'none' },
              '&:hover': { background: 'rgba(56,189,248,0.03)' },
            }}
          >
            {/* Player header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: '6px' }}>
              <WidgetPlayerAvatar className={player.playerClass} size={26} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <Typography
                  sx={{ fontWeight: 600, color: '#ffffff', fontSize: 13, lineHeight: 1.2 }}
                >
                  {player.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: 'rgba(255,255,255,0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    lineHeight: 1,
                  }}
                >
                  {player.playerClass.toLowerCase()}
                </Typography>
              </Box>
              <Typography
                sx={{
                  ml: 'auto',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                Missing{' '}
                <Box component="b" sx={{ color: '#ff6666', fontWeight: 700 }}>
                  {player.count}
                </Box>{' '}
                / {player.totalFights}
              </Typography>
            </Box>

            {/* Fight dots */}
            <Box sx={{ display: 'flex', gap: '3px', pl: '40px' }}>
              {player.missingByFight.map((miss, fIdx) => (
                <Box
                  key={fIdx}
                  title={`Fight ${fIdx + 1}`}
                  sx={{
                    width: 14,
                    height: 6,
                    borderRadius: '2px',
                    background: miss ? 'rgba(255,102,102,0.55)' : 'rgba(92,229,114,0.35)',
                    boxShadow: miss ? '0 0 4px rgba(255,102,102,0.5)' : 'none',
                  }}
                />
              ))}
            </Box>
          </Box>
        ))
      )}
    </BaseWidget>
  );
};
