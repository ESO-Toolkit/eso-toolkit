import TimerIcon from '@mui/icons-material/Timer';
import { Box, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { usePlayerData } from '../../hooks/usePlayerData';
import { useBuffLookupTask } from '../../hooks/workerTasks/useBuffLookupTask';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';

import { BaseWidget, WidgetPlayerAvatar } from './BaseWidget';

interface LowBuffUptimesWidgetProps {
  id: string;
  scope: WidgetScope;
  reportId: string;
  fights: FightFragment[];
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
}

const UPTIME_BUFFS = [
  { id: 61746, name: 'Major Brutality', minUptime: 95, roles: ['dps' as const] },
  { id: 61747, name: 'Major Sorcery', minUptime: 95, roles: ['dps' as const] },
];

interface LowUptimeInfo {
  playerName: string;
  playerClass: string;
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
    fight0, fight1, fight2, fight3, fight4,
    buffs0, buffs1, buffs2, buffs3, buffs4,
  ]);

  const lowUptimes = React.useMemo((): LowUptimeInfo[] => {
    if (!playerData?.playersById) return [];

    const playerBuffUptimes = new Map<
      string,
      {
        playerName: string;
        playerClass: string;
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
              playerClass: player.type,
              buffName: buff.name,
              totalUptime: fightUptime,
              totalDuration: fightDuration,
              minUptime: buff.minUptime,
            });
          }
        });
      });
    });

    const lowUptimeResults: LowUptimeInfo[] = [];
    playerBuffUptimes.forEach((data) => {
      if (data.totalDuration <= 0) return;
      const avgUptimePercent = (data.totalUptime / data.totalDuration) * 100;

      if (avgUptimePercent < data.minUptime) {
        lowUptimeResults.push({
          playerName: data.playerName,
          playerClass: data.playerClass,
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
      subtitle="Expected ≥ 95%"
      kind="uptime"
      icon={<TimerIcon />}
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      {lowUptimes.map((item, idx) => (
        <Box
          key={idx}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            alignItems: 'center',
            gap: '12px',
            p: '10px 16px',
            borderBottom: '1px solid rgba(148,163,184,0.06)',
            fontSize: 13,
            '&:last-child': { borderBottom: 'none' },
            '&:hover': { background: 'rgba(56,189,248,0.03)' },
          }}
        >
          {/* Player info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 140 }}>
            <WidgetPlayerAvatar className={item.playerClass} size={26} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <Typography
                sx={{ fontWeight: 600, color: '#ffffff', fontSize: 12.5, lineHeight: 1.2 }}
              >
                {item.playerName}
              </Typography>
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 500,
                  fontFamily: 'monospace',
                  color: 'rgba(255,255,255,0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  lineHeight: 1,
                }}
              >
                {item.buffName}
              </Typography>
            </Box>
          </Box>

          {/* Progress track */}
          <Box sx={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
            {/* Track bg */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '9px',
                height: '2px',
                borderRadius: '1px',
                background: 'rgba(148,163,184,0.12)',
              }}
            />
            {/* Fill */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: '8px',
                height: '4px',
                width: `${item.uptime}%`,
                borderRadius: '2px',
                background: '#c57fff',
                boxShadow: '0 0 10px #c57fff',
                opacity: 0.8,
              }}
            />
            {/* Target marker */}
            <Box
              sx={{
                position: 'absolute',
                left: `${item.expected}%`,
                top: '4px',
                width: '2px',
                height: '12px',
                background: '#5ce572',
                opacity: 0.8,
                '&::after': {
                  content: '"95%"',
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 8,
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: '#5ce572',
                  letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                  opacity: 0.8,
                },
              }}
            />
          </Box>

          {/* Value */}
          <Box sx={{ minWidth: 70, textAlign: 'right' }}>
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 700,
                color: '#c57fff',
                lineHeight: 1,
              }}
            >
              {item.uptime}%
            </Typography>
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: 10,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.2)',
                lineHeight: 1,
                mt: '2px',
              }}
            >
              of {item.expected}%
            </Typography>
          </Box>
        </Box>
      ))}
    </BaseWidget>
  );
};
