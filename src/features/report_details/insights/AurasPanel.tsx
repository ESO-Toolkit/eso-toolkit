import React from 'react';

import { useCombatantInfoEvents, usePlayerData } from '../../../hooks';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { CombatantAura } from '../../../types/combatlogEvents';
import { resolveActorName } from '../../../utils/resolveActorName';

import { AurasPanelView } from './AurasPanelView';

export interface AuraData extends Record<string, unknown> {
  auraName: string;
  auraId: number;
  icon: string;
  players: string[];
  playerCount: number;
  maxStacks: number;
  totalStacks: number;
}

/**
 * Experimental panel that shows all auras used in the fight and which players have them
 */
export const AurasPanel: React.FC = () => {
  // Get report/fight context
  const { reportId, fightId } = useSelectedReportAndFight();

  // Get data hooks
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();

  // Process auras data
  const aurasData = React.useMemo(() => {
    if (!combatantInfoEvents || combatantInfoEvents.length === 0 || !playerData?.playersById) {
      return [];
    }

    // Map to track unique auras and their usage
    const auraMap = new Map<
      number,
      {
        aura: CombatantAura;
        playerIds: Set<number>;
        maxStacks: number;
        totalStacks: number;
      }
    >();

    // Process each combatant info event
    combatantInfoEvents.forEach((event) => {
      if (!event.auras || event.auras.length === 0) return;

      event.auras.forEach((aura) => {
        const existing = auraMap.get(aura.ability);
        if (existing) {
          // Add this player to the aura usage
          existing.playerIds.add(event.sourceID);
          existing.maxStacks = Math.max(existing.maxStacks, aura.stacks || 1);
          existing.totalStacks += aura.stacks || 1;
        } else {
          // First time seeing this aura
          auraMap.set(aura.ability, {
            aura,
            playerIds: new Set([event.sourceID]),
            maxStacks: aura.stacks || 1,
            totalStacks: aura.stacks || 1,
          });
        }
      });
    });

    // Convert to final format
    const result: AuraData[] = [];
    auraMap.forEach(({ aura, playerIds, maxStacks, totalStacks }) => {
      // Get player names
      const players: string[] = [];
      playerIds.forEach((playerId) => {
        const playerActor = playerData.playersById[playerId];
        if (playerActor) {
          const playerName = resolveActorName(playerActor, playerId, 'Unknown Player');
          players.push(playerName);
        }
      });

      // Sort players alphabetically for consistent display
      players.sort();

      result.push({
        auraName: aura.name,
        auraId: aura.ability,
        icon: aura.icon,
        players,
        playerCount: players.length,
        maxStacks,
        totalStacks,
      });
    });

    // Sort by most used auras first (by player count, then by name)
    return result.sort((a, b) => {
      if (a.playerCount !== b.playerCount) {
        return b.playerCount - a.playerCount; // Descending by player count
      }
      return a.auraName.localeCompare(b.auraName); // Ascending by name
    });
  }, [combatantInfoEvents, playerData]);

  const isLoading = isPlayerDataLoading || isCombatantInfoEventsLoading;

  return (
    <AurasPanelView
      aurasData={aurasData}
      isLoading={isLoading}
      reportId={reportId}
      fightId={fightId}
    />
  );
};
