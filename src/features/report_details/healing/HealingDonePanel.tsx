import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectHealingPanelData } from '../../../store/crossSliceSelectors';

import HealingDonePanelView from './HealingDonePanelView';

interface HealingDonePanelProps {
  fight: { startTime?: number; endTime?: number };
}

/**
 * Smart component that handles data processing and state management for healing done panel
 */
const HealingDonePanel: React.FC<HealingDonePanelProps> = ({ fight }) => {
  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const { events, players, characters, masterData } = useSelector(selectHealingPanelData);

  // Memoize healing calculations to prevent unnecessary recalculations
  const healingStatistics = useMemo(() => {
    const healingByPlayer: Record<number, { raw: number; overheal: number }> = {};

    // OPTIMIZED: Events are already filtered to healing events by the selector
    events.forEach((event) => {
      if ('sourceID' in event && event.sourceID != null) {
        const playerId = Number(event.sourceID);
        const amount = 'amount' in event ? Number(event.amount) || 0 : 0;
        const overheal = 'overheal' in event ? Number(event.overheal) || 0 : 0;
        if (!healingByPlayer[playerId]) {
          healingByPlayer[playerId] = { raw: 0, overheal: 0 };
        }
        healingByPlayer[playerId].raw += amount;
        healingByPlayer[playerId].overheal += overheal;
      }
    });

    return healingByPlayer;
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

  const healingRows = useMemo(() => {
    return Object.entries(healingStatistics)
      .filter(([id]) => isPlayerActor(id))
      .map(([id, { raw, overheal }]) => {
        let name: string | undefined;
        const actor = masterData.actorsById[id];
        if (actor) {
          name = actor.displayName ?? actor.name ?? `Player ${id}`;
        } else {
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
          raw,
          hps: fightDuration > 0 ? raw / fightDuration : 0,
          overheal,
          iconUrl,
        };
      })
      .sort((a, b) => b.hps - a.hps);
  }, [healingStatistics, isPlayerActor, masterData.actorsById, players, characters, fightDuration]);

  return <HealingDonePanelView healingRows={healingRows} />;
};

export default HealingDonePanel;
