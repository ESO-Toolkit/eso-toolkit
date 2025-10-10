import { Box, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { HealingDoneTableSkeleton } from '../../../components/HealingDoneTableSkeleton';
import { FightFragment } from '../../../graphql/generated';
import {
  useCastEvents,
  useHealingEvents,
  useReportMasterData,
  usePlayerData,
  useDeathEvents,
} from '../../../hooks';
import { KnownAbilities } from '../../../types/abilities';
import { HealEvent } from '../../../types/combatlogEvents';
import { resolveActorName } from '../../../utils/resolveActorName';

import { HealingDonePanelView } from './HealingDonePanelView';

interface HealingDonePanelProps {
  fight: FightFragment;
}

/**
 * Smart component that handles data processing and state management for healing done panel
 */
export const HealingDonePanel: React.FC<HealingDonePanelProps> = ({ fight }) => {
  // Use hooks to get data
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { castEvents, isCastEventsLoading } = useCastEvents();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();

  const masterData = useMemo(
    () => reportMasterData || { actorsById: {}, abilitiesById: {} },
    [reportMasterData],
  );

  // Compute loading state
  const isLoading =
    isHealingEventsLoading ||
    isMasterDataLoading ||
    isCastEventsLoading ||
    isPlayerDataLoading ||
    isDeathEventsLoading;

  // Memoize healing calculations to prevent unnecessary recalculations
  const healingStatistics = useMemo(() => {
    const healingByPlayer: Record<number, { raw: number; overheal: number }> = {};

    healingEvents.forEach((event: HealEvent) => {
      if ('sourceID' in event && event.sourceID != null) {
        const playerId = event.sourceID;
        const amount = event.amount ?? 0;
        const overheal = event.overheal ?? 0;
        if (!healingByPlayer[playerId]) {
          healingByPlayer[playerId] = { raw: 0, overheal: 0 };
        }
        healingByPlayer[playerId].raw += amount;
        healingByPlayer[playerId].overheal += overheal;
      }
    });

    return healingByPlayer;
  }, [healingEvents]);

  const resByPlayer = useMemo(() => {
    const result: Record<string, number> = {};

    for (const event of castEvents) {
      if (event.type !== 'cast') continue;

      if (event.abilityGameID === KnownAbilities.RESURRECT) {
        result[event.sourceID] = (result[event.sourceID] || 0) + 1;
      }
    }

    return result;
  }, [castEvents]);

  const deathsByPlayer = useMemo(() => {
    const counts: Record<string, number> = {};
    const fightNum = fight?.id ? Number(fight.id) : undefined;

    for (const ev of deathEvents) {
      if (
        ev.type === 'death' &&
        (fightNum == null || (typeof ev.fight === 'number' && ev.fight === fightNum))
      ) {
        const target = ev.targetID;
        if (target != null) {
          const key = String(target);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }
    return counts;
  }, [deathEvents, fight]);

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

  // Helper function to determine player role
  const getPlayerRole = useMemo(() => {
    return (playerId: string | number): 'dps' | 'tank' | 'healer' => {
      if (!playerData?.playersById) return 'dps';

      // Try both string and numeric keys since playerData might use either
      const player = playerData.playersById[playerId] || playerData.playersById[Number(playerId)];
      const role = player?.role;

      // The role should already be normalized in the store
      if (role === 'tank') return 'tank';
      if (role === 'healer') return 'healer';
      if (role === 'dps') return 'dps';

      return 'dps'; // default fallback
    };
  }, [playerData]);

  const healingRows = useMemo(() => {
    return Object.entries(healingStatistics)
      .filter(([id]) => isPlayerActor(id))
      .map(([id, { raw, overheal }]) => {
        const actor = masterData.actorsById[id];
        const name = resolveActorName(actor, id, null);

        const iconUrl = actor?.icon
          ? `https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`
          : undefined;

        const ressurects = resByPlayer[id] || 0;
        const deaths = deathsByPlayer[id] || 0;
        const role = getPlayerRole(id);

        // Calculate overheal percentage: (overheal / (raw + overheal)) * 100
        const totalHealing = raw + overheal;
        const overhealPercentage = totalHealing > 0 ? (overheal / totalHealing) * 100 : 0;

        return {
          id,
          name,
          raw,
          hps: fightDuration > 0 ? raw / fightDuration : 0,
          overhealHps: fightDuration > 0 ? overheal / fightDuration : 0,
          overheal,
          overhealPercentage,
          iconUrl,
          ressurects,
          deaths,
          role,
        };
      })
      .sort((a, b) => b.hps - a.hps);
  }, [
    healingStatistics,
    isPlayerActor,
    masterData.actorsById,
    fightDuration,
    resByPlayer,
    deathsByPlayer,
    getPlayerRole,
  ]);

  // Show table skeleton while data is being fetched
  if (isLoading) {
    return <HealingDoneTableSkeleton rowCount={8} />;
  }

  // Show no data message if we have no healing data but aren't loading
  if (healingRows.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No healing data available for this fight
        </Typography>
      </Box>
    );
  }

  return (
    <Box data-testid="healing-done-panel">
      <HealingDonePanelView healingRows={healingRows} />
    </Box>
  );
};
