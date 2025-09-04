import { useMemo } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { DamageEvent, HealEvent, DeathEvent } from '../../../types/combatlogEvents';

interface Actor {
  id: number;
  name: string;
  type: 'player' | 'enemy' | 'boss';
  position: [number, number, number];
  rotation: number;
  isAlive: boolean;
}

interface FightEvents {
  damage: DamageEvent[];
  heal: HealEvent[];
  death: DeathEvent[];
}

interface UseActorPositionsParams {
  fight?: FightFragment;
  events: FightEvents | null;
  currentTime: number;
}

export const useActorPositions = ({
  fight,
  events,
  currentTime,
}: UseActorPositionsParams): Actor[] => {
  return useMemo(() => {
    if (!fight || !events) return [];

    const actors: Actor[] = [];
    const currentTimestamp = fight.startTime + currentTime;

    // Get all unique actor IDs from events
    const actorIds = new Set<number>();

    // Collect actor IDs from events up to current time
    [...events.damage, ...events.heal, ...events.death]
      .filter((event) => event.timestamp <= currentTimestamp)
      .forEach((event) => {
        if ('sourceID' in event) actorIds.add(event.sourceID);
        if ('targetID' in event) actorIds.add(event.targetID);
      });

    // Create actors with simulated positions
    Array.from(actorIds).forEach((actorId, index) => {
      // Determine actor type based on friendliness
      const isPlayer = fight.friendlyPlayers?.includes(actorId) ?? false;
      const isBoss = fight.enemyNPCs?.some((npc) => npc?.id === actorId) ?? false;

      let type: 'player' | 'enemy' | 'boss' = 'enemy';
      if (isPlayer) type = 'player';
      else if (isBoss) type = 'boss';

      // Generate realistic positioning
      let position: [number, number, number];
      let rotation: number;

      if (type === 'boss') {
        // Boss typically in center
        position = [0, 0, 0];
        rotation = (currentTime / 10000) % (Math.PI * 2); // Slowly rotating
      } else if (type === 'player') {
        // Players arranged in a circle around the boss
        const angle = (index * Math.PI * 2) / Math.max(1, fight.friendlyPlayers?.length ?? 1);
        const radius = 8 + Math.sin(currentTime / 5000 + index) * 2; // Some movement
        position = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
        rotation = angle + Math.PI; // Face toward center
      } else {
        // Enemies scattered around
        const angle = (index * Math.PI * 2) / 5 + currentTime / 8000;
        const radius = 12 + Math.cos(currentTime / 3000 + index) * 3;
        position = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
        rotation = angle + Math.PI + Math.sin(currentTime / 4000) * 0.5;
      }

      // Check if actor is alive at current time
      const deathEvent = events.death.find(
        (event) => event.targetID === actorId && event.timestamp <= currentTimestamp,
      );
      const isAlive = !deathEvent;

      // Only show alive actors or recently dead ones
      if (isAlive || (deathEvent && currentTimestamp - deathEvent.timestamp < 5000)) {
        actors.push({
          id: actorId,
          name: `Actor ${actorId}`, // We'll improve this with real names later
          type,
          position: isAlive ? position : [position[0], -1, position[2]], // Dead actors sink down
          rotation,
          isAlive,
        });
      }
    });

    return actors;
  }, [fight, events, currentTime]);
};
