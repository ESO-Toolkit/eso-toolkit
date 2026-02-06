import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { List, ListItem, ListItemIcon, ListItemText, Chip, Box } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { usePlayerData } from '../../hooks/usePlayerData';
import { useBuffLookupTask } from '../../hooks/workerTasks/useBuffLookupTask';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';

import { BaseWidget } from './BaseWidget';

interface LowBuffUptimesWidgetProps {
  id: string;
  scope: WidgetScope;
  reportId: string;
  fights: FightFragment[];
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
}

// Key buffs to monitor uptime for
const UPTIME_BUFFS = [
  { id: 61746, name: 'Major Brutality', minUptime: 95, roles: ['dps' as const] },
  { id: 61747, name: 'Major Sorcery', minUptime: 95, roles: ['dps' as const] },
];

interface LowUptimeInfo {
  playerName: string;
  buffName: string;
  uptime: number;
  expected: number;
}

export const LowBuffUptimesWidget: React.FC<LowBuffUptimesWidgetProps> = ({
  id,
  scope,
  reportId,
  fights,
  onRemove,
  onScopeChange,
}) => {
  // Always fetch data for up to 5 fights
  const fight0 = fights[0];
  const fight1 = fights[1];
  const fight2 = fights[2];
  const fight3 = fights[3];
  const fight4 = fights[4];

  const { buffLookupData: buffs0 } = useBuffLookupTask({
    context: { reportCode: reportId, fightId: fight0?.id ?? -1 },
  });
  const { buffLookupData: buffs1 } = useBuffLookupTask({
    context: { reportCode: reportId, fightId: fight1?.id ?? -1 },
  });
  const { buffLookupData: buffs2 } = useBuffLookupTask({
    context: { reportCode: reportId, fightId: fight2?.id ?? -1 },
  });
  const { buffLookupData: buffs3 } = useBuffLookupTask({
    context: { reportCode: reportId, fightId: fight3?.id ?? -1 },
  });
  const { buffLookupData: buffs4 } = useBuffLookupTask({
    context: { reportCode: reportId, fightId: fight4?.id ?? -1 },
  });

  const { playerData } = usePlayerData({
    context: { reportCode: reportId, fightId: fight0?.id ?? -1 },
  });

  // Select fights based on scope
  const relevantFights = React.useMemo(() => {
    const allData = [
      { fight: fight0, buffs: buffs0 },
      { fight: fight1, buffs: buffs1 },
      { fight: fight2, buffs: buffs2 },
      { fight: fight3, buffs: buffs3 },
      { fight: fight4, buffs: buffs4 },
    ];

    let numFights = fights.length;
    if (scope === 'most-recent') numFights = 1;
    else if (scope === 'last-3') numFights = 3;
    else if (scope === 'last-5') numFights = 5;

    return allData.slice(0, Math.min(numFights, 5));
  }, [
    scope,
    fights.length,
    fight0,
    fight1,
    fight2,
    fight3,
    fight4,
    buffs0,
    buffs1,
    buffs2,
    buffs3,
    buffs4,
  ]);

  const lowUptimes = React.useMemo((): LowUptimeInfo[] => {
    if (!playerData?.playersById) return [];

    // Calculate average uptime across all fights
    const playerBuffUptimes = new Map<
      string,
      {
        playerName: string;
        buffName: string;
        totalUptime: number;
        totalDuration: number;
        minUptime: number;
      }
    >();

    relevantFights.forEach(({ fight, buffs }) => {
      if (!fight || !buffs) return;

      const fightDuration = (fight.endTime ?? fight.startTime) - fight.startTime;
      if (fightDuration <= 0) return;

      Object.values(playerData.playersById).forEach((player) => {
        UPTIME_BUFFS.forEach((buff) => {
          if (!(buff.roles as readonly string[]).includes(player.role)) return;

          const intervals = buffs.buffIntervals[buff.id.toString()] || [];
          const playerIntervals = intervals.filter((interval) => interval.targetID === player.id);

          // Calculate uptime for this fight
          let fightUptime = 0;
          playerIntervals.forEach((interval) => {
            const start = Math.max(interval.start, fight.startTime);
            const end = Math.min(interval.end, fight.endTime ?? fight.startTime);
            fightUptime += Math.max(0, end - start);
          });

          const key = `${player.id}|${buff.id}`;
          const existing = playerBuffUptimes.get(key);
          if (existing) {
            existing.totalUptime += fightUptime;
            existing.totalDuration += fightDuration;
          } else {
            playerBuffUptimes.set(key, {
              playerName: player.name,
              buffName: buff.name,
              totalUptime: fightUptime,
              totalDuration: fightDuration,
              minUptime: buff.minUptime,
            });
          }
        });
      });
    });

    // Filter for low uptimes
    const lowUptimeResults: LowUptimeInfo[] = [];
    playerBuffUptimes.forEach((data) => {
      if (data.totalDuration <= 0) return;
      const avgUptimePercent = (data.totalUptime / data.totalDuration) * 100;

      if (avgUptimePercent < data.minUptime) {
        lowUptimeResults.push({
          playerName: data.playerName,
          buffName: data.buffName,
          uptime: Math.round(avgUptimePercent),
          expected: data.minUptime,
        });
      }
    });

    return lowUptimeResults.sort((a, b) => a.uptime - b.uptime);
  }, [playerData, relevantFights]);

  const isEmpty = lowUptimes.length === 0;

  return (
    <BaseWidget
      id={id}
      title="Low Buff Uptimes"
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      <List dense>
        {lowUptimes.map((item, idx) => (
          <ListItem key={idx}>
            <ListItemIcon>
              <TrendingDownIcon color="warning" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {item.playerName}
                  <Chip
                    label={`${item.uptime}%`}
                    size="small"
                    color="warning"
                    sx={{ minWidth: 50 }}
                  />
                </Box>
              }
              secondary={`${item.buffName} (expected ${item.expected}%)`}
            />
          </ListItem>
        ))}
      </List>
    </BaseWidget>
  );
};
