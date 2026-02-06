import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { useDamageEventsLookup } from '../../hooks/events/useDamageEvents';
import { usePlayerData } from '../../hooks/usePlayerData';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';
import { DamageEvent } from '../../types/combatlogEvents';

import { BaseWidget } from './BaseWidget';

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
  dps: number;
  expected: number;
}

const DPS_THRESHOLD = 50000;

export const LowDpsWidget: React.FC<LowDpsWidgetProps> = ({
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

  // Select fights based on scope
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
    fight0,
    fight1,
    fight2,
    fight3,
    fight4,
    damage0,
    damage1,
    damage2,
    damage3,
    damage4,
  ]);

  const lowDpsPlayers = React.useMemo((): LowDpsPlayer[] => {
    if (!playerData?.playersById) return [];

    // Calculate average DPS across all fights for each player
    const playerDpsMap = new Map<
      number,
      { name: string; totalDamage: number; totalDuration: number }
    >();

    relevantFights.forEach(({ fight, damage }) => {
      if (!fight || !damage) return;

      const fightDuration = ((fight.endTime ?? fight.startTime) - fight.startTime) / 1000;
      if (fightDuration <= 0) return;

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
          existing.totalDuration += fightDuration;
        } else {
          playerDpsMap.set(player.id, {
            name: player.name,
            totalDamage,
            totalDuration: fightDuration,
          });
        }
      });
    });

    const lowPerformers: LowDpsPlayer[] = [];
    playerDpsMap.forEach((data) => {
      if (data.totalDuration <= 0) return;
      const avgDps = data.totalDamage / data.totalDuration;

      if (avgDps < DPS_THRESHOLD) {
        lowPerformers.push({
          name: data.name,
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
      title="Low DPS Performers"
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Player</TableCell>
            <TableCell align="right">Actual DPS</TableCell>
            <TableCell align="right">Expected</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lowDpsPlayers.map((player, idx) => (
            <TableRow key={idx}>
              <TableCell>{player.name}</TableCell>
              <TableCell align="right">
                <Typography color="error">{player.dps.toLocaleString()}</Typography>
              </TableCell>
              <TableCell align="right">{player.expected.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </BaseWidget>
  );
};
