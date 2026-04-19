import SpeedIcon from '@mui/icons-material/Speed';
import { Box, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { useDamageEventsLookup } from '../../hooks/events/useDamageEvents';
import { usePlayerData } from '../../hooks/usePlayerData';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';
import { DamageEvent } from '../../types/combatlogEvents';
import { msToSeconds } from '../../utils/fightDuration';

import { BaseWidget, WidgetPlayerAvatar, WidgetRolePill } from './BaseWidget';

interface LowDpsWidgetProps {
  id: string;
  scope: WidgetScope;
  reportId: string;
  fights: FightFragment[];
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
}

interface LowDpsPlayer {
  name: string;
  playerClass: string;
  playerRole: string;
  dps: number;
  expected: number;
}

const DPS_THRESHOLD = 50000;

const fmt = (n: number): string => (n / 1000).toFixed(1) + 'k';

export const LowDpsWidget: React.FC<LowDpsWidgetProps> = ({
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

  const { damageEventsByPlayer: damage0 } = useDamageEventsLookup({
    context: { reportCode: reportId, fightId: fight0?.id ?? -1 },
  });
  const { damageEventsByPlayer: damage1 } = useDamageEventsLookup({
    context: { reportCode: reportId, fightId: fight1?.id ?? -1 },
  });
  const { damageEventsByPlayer: damage2 } = useDamageEventsLookup({
    context: { reportCode: reportId, fightId: fight2?.id ?? -1 },
  });
  const { damageEventsByPlayer: damage3 } = useDamageEventsLookup({
    context: { reportCode: reportId, fightId: fight3?.id ?? -1 },
  });
  const { damageEventsByPlayer: damage4 } = useDamageEventsLookup({
    context: { reportCode: reportId, fightId: fight4?.id ?? -1 },
  });

  const { playerData } = usePlayerData({
    context: { reportCode: reportId, fightId: fight0?.id ?? -1 },
  });

  const relevantFights = React.useMemo(() => {
    const allData = [
      { fight: fight0, damage: damage0 },
      { fight: fight1, damage: damage1 },
      { fight: fight2, damage: damage2 },
      { fight: fight3, damage: damage3 },
      { fight: fight4, damage: damage4 },
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
    damage0, damage1, damage2, damage3, damage4,
  ]);

  const lowDpsPlayers = React.useMemo((): LowDpsPlayer[] => {
    if (!playerData?.playersById) return [];

    const playerDpsMap = new Map<
      number,
      { name: string; playerClass: string; playerRole: string; totalDamage: number; totalDuration: number }
    >();

    relevantFights.forEach(({ fight, damage }) => {
      if (!fight || !damage) return;

      const fightDurationMs = (fight.endTime ?? fight.startTime) - fight.startTime;
      if (fightDurationMs <= 0) return;

      Object.values(playerData.playersById).forEach((player) => {
        if (player.role !== 'dps') return;

        const playerDamageEvents = damage[player.id] || [];
        const totalDamage = playerDamageEvents.reduce(
          (sum: number, event: DamageEvent) => sum + (event.amount || 0),
          0,
        );

        const existing = playerDpsMap.get(player.id);
        if (existing) {
          existing.totalDamage += totalDamage;
          existing.totalDuration += fightDurationMs;
        } else {
          playerDpsMap.set(player.id, {
            name: player.name,
            playerClass: player.type,
            playerRole: player.role,
            totalDamage,
            totalDuration: fightDurationMs,
          });
        }
      });
    });

    const lowPerformers: LowDpsPlayer[] = [];
    playerDpsMap.forEach((data) => {
      if (data.totalDuration <= 0) return;
      const avgDps = data.totalDamage / msToSeconds(data.totalDuration);

      if (avgDps < DPS_THRESHOLD) {
        lowPerformers.push({
          name: data.name,
          playerClass: data.playerClass,
          playerRole: data.playerRole,
          dps: Math.round(avgDps),
          expected: DPS_THRESHOLD,
        });
      }
    });

    return lowPerformers.sort((a, b) => a.dps - b.dps);
  }, [playerData, relevantFights]);

  const isEmpty = lowDpsPlayers.length === 0;

  return (
    <BaseWidget
      id={id}
      title="Low DPS"
      subtitle={`Threshold ${(DPS_THRESHOLD / 1000).toFixed(0)}k`}
      kind="dps"
      icon={<SpeedIcon />}
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      {lowDpsPlayers.map((player, idx) => {
        const pct = Math.min((player.dps / player.expected) * 100, 100);
        return (
          <Box
            key={idx}
            sx={{
              p: '12px 16px',
              borderBottom: '1px solid rgba(148,163,184,0.06)',
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <WidgetPlayerAvatar className={player.playerClass} size={26} />
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography sx={{ fontWeight: 600, color: '#ffffff', fontSize: 13 }}>
                  {player.name}
                </Typography>
                <WidgetRolePill role={player.playerRole} />
              </Box>
            </Box>

            {/* Bar */}
            <Box
              sx={{
                mt: '6px',
                height: 8,
                borderRadius: '4px',
                background: 'rgba(148,163,184,0.08)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  borderRadius: '4px 0 0 4px',
                  background: 'linear-gradient(90deg, rgba(255,102,102,.7), rgba(255,154,74,.9))',
                }}
              />
              {/* Target marker */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -2,
                  right: 0,
                  width: 2,
                  height: 12,
                  background: 'rgba(255,255,255,0.6)',
                }}
              />
            </Box>

            {/* Values */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mt: '4px',
                fontFamily: 'monospace',
                fontSize: 11,
              }}
            >
              <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#ff6666' }}>
                {fmt(player.dps)} DPS
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                target {fmt(player.expected)}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </BaseWidget>
  );
};
