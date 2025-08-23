import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectDamagePanelData } from '../../../store/crossSliceSelectors';

import DamageDonePanelView from './DamageDonePanelView';

interface DamageDonePanelProps {
  fight: { startTime?: number; endTime?: number };
}

/**
 * Smart component that handles data processing and state management for damage done panel
 */
const DamageDonePanel: React.FC<DamageDonePanelProps> = ({ fight }) => {
  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const { events, players, characters, masterData } = useSelector(selectDamagePanelData);

  // Memoize damage calculations to prevent unnecessary recalculations
  const damageStatistics = useMemo(() => {
    const damageByPlayer: Record<number, number> = {};
    const damageEventsBySource: Record<number, number> = {};

    // OPTIMIZED: Events are already filtered to damage events by the selector
    events.forEach((event) => {
      if ('sourceID' in event && event.sourceID != null) {
        const playerId = Number(event.sourceID);
        const amount = 'amount' in event ? Number(event.amount) || 0 : 0;
        if (!damageByPlayer[playerId]) {
          damageByPlayer[playerId] = 0;
        }
        damageByPlayer[playerId] += amount;
        if (!damageEventsBySource[playerId]) {
          damageEventsBySource[playerId] = 0;
        }
        damageEventsBySource[playerId]++;
      }
    });

    return { damageByPlayer, damageEventsBySource };
  }, [events]);

  const fightDuration = useMemo(() => {
    if (fight && fight.startTime != null && fight.endTime != null) {
      return (Number(fight.endTime) - Number(fight.startTime)) / 1000;
    }
    return 1;
  }, [fight]);

  const isPlayerActor = useMemo(() => {
    return (id: string | number) => {
      const actor = masterData.actorsById[id];
      return actor && actor.type === 'Player';
    };
  }, [masterData.actorsById]);

  const damageRows = useMemo(() => {
    return Object.entries(damageStatistics.damageByPlayer)
      .filter(([id]) => isPlayerActor(id))
      .map(([id, total]) => {
        const totalDamage = Number(total);
        let name: string | undefined;

        // Prefer masterData actor name if available
        const actor = masterData.actorsById[id];
        if (actor) {
          name = actor.displayName ?? actor.name ?? `Player ${id}`;
        } else {
          // Fallback to previous logic
          const playerInfo = players[id] || {};
          const charId = Number(id);
          if (characters[charId]) {
            const charName = characters[charId].name;
            const displayName = playerInfo.displayName || characters[charId].displayName;
            name = displayName ? `${charName} (${displayName})` : charName;
          } else if (typeof playerInfo.name === 'string') {
            const displayName = playerInfo.displayName;
            name = displayName ? `${playerInfo.name} (${displayName})` : playerInfo.name;
          } else {
            name = `Player ${id}`;
          }
        }

        const iconUrl = actor?.icon
          ? `https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`
          : undefined;

        return {
          id,
          name,
          total: totalDamage,
          dps: fightDuration > 0 ? totalDamage / fightDuration : 0,
          iconUrl,
        };
      })
      .sort((a, b) => b.dps - a.dps);
  }, [
    damageStatistics.damageByPlayer,
    isPlayerActor,
    masterData.actorsById,
    players,
    characters,
    fightDuration,
  ]);

  return <DamageDonePanelView damageRows={damageRows} />;
};

export default DamageDonePanel;
