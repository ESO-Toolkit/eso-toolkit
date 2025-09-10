import { Box, Typography } from '@mui/material';
import React from 'react';

import { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { type ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import { BuildIssue } from '../../../utils/detectBuildIssues';
import { PlayerGearSetRecord } from '../../../utils/gearUtilities';
import { getSkeletonForTab, TabId } from '../../../utils/getSkeletonForTab';

import { LazyPlayerCard as PlayerCard } from './LazyPlayerCard';

interface PlayersPanelViewProps {
  playerActors: Record<string, PlayerDetailsWithRole> | undefined;
  mundusBuffsByPlayer: Record<string, Array<{ name: string; id: number }>>;
  championPointsByPlayer: Record<
    string,
    Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }>
  >;
  aurasByPlayer: Record<string, Array<{ name: string; id: number; stacks?: number }>>;
  scribingSkillsByPlayer: Record<string, GrimoireData[]>;
  buildIssuesByPlayer: Record<string, BuildIssue[]>;
  classAnalysisByPlayer: Record<string, ClassAnalysisResult>;
  deathsByPlayer: Record<string, number>;
  resurrectsByPlayer: Record<string, number>;
  cpmByPlayer: Record<string, number>;
  maxHealthByPlayer: Record<string, number>;
  maxStaminaByPlayer: Record<string, number>;
  maxMagickaByPlayer: Record<string, number>;
  reportId?: string | null;
  fightId?: string | null;
  isLoading: boolean;
  playerGear: Record<number, PlayerGearSetRecord[]>;
  fightStartTime?: number;
  fightEndTime?: number;
}

export const PlayersPanelView: React.FC<PlayersPanelViewProps> = React.memo(
  ({
    playerActors,
    mundusBuffsByPlayer,
    championPointsByPlayer,
    aurasByPlayer,
    scribingSkillsByPlayer,
    buildIssuesByPlayer,
    classAnalysisByPlayer,
    deathsByPlayer,
    resurrectsByPlayer,
    cpmByPlayer,
    maxHealthByPlayer,
    maxStaminaByPlayer,
    maxMagickaByPlayer,
    reportId,
    fightId,
    isLoading,
    playerGear,
    fightStartTime,
    fightEndTime,
  }) => {
    // Memoize player data transformations to prevent recreating objects on each render
    const playerCards = React.useMemo(() => {
      if (!playerActors) return [];

      return Object.values(playerActors).map((player) => {
        const playerDataSet = playerGear?.[Number(player.id)];
        const mundusBuffs = mundusBuffsByPlayer?.[String(player.id)] ?? [];
        const championPoints = championPointsByPlayer?.[String(player.id)] ?? [];
        const auras = aurasByPlayer?.[String(player.id)] ?? [];
        const scribingSkills = scribingSkillsByPlayer?.[String(player.id)] ?? [];
        const buildIssues = buildIssuesByPlayer[String(player.id)] || [];
        const classAnalysis = classAnalysisByPlayer[String(player.id)];
        const deaths = deathsByPlayer?.[String(player.id)] ?? 0;
        const resurrects = resurrectsByPlayer?.[String(player.id)] ?? 0;
        const cpm = Math.round(cpmByPlayer?.[String(player.id)] ?? 0);
        const maxHealth = maxHealthByPlayer?.[String(player.id)] ?? 0;
        const maxStamina = maxStaminaByPlayer?.[String(player.id)] ?? 0;
        const maxMagicka = maxMagickaByPlayer?.[String(player.id)] ?? 0;
        const playerGearSets = (playerDataSet ?? [])
          .sort((a, b) => b.count - a.count)
          .filter((s) => s.count > 0);

        return {
          key: player.id,
          player,
          mundusBuffs,
          championPoints,
          auras,
          scribingSkills,
          buildIssues,
          classAnalysis,
          deaths,
          resurrects,
          cpm,
          maxHealth,
          maxStamina,
          maxMagicka,
          playerGear: playerGearSets,
        };
      });
    }, [
      playerActors,
      playerGear,
      mundusBuffsByPlayer,
      championPointsByPlayer,
      aurasByPlayer,
      scribingSkillsByPlayer,
      buildIssuesByPlayer,
      classAnalysisByPlayer,
      deathsByPlayer,
      resurrectsByPlayer,
      cpmByPlayer,
      maxHealthByPlayer,
      maxStaminaByPlayer,
      maxMagickaByPlayer,
    ]);

    if (isLoading) {
      return getSkeletonForTab(TabId.PLAYERS, false);
    }

    if (!playerActors || Object.keys(playerActors).length === 0) {
      return (
        <Box sx={{ p: 3 }}>
          <Typography>No player data available.</Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: { xs: 0, md: 2 },
          alignItems: 'stretch',
          minHeight: '400px', // Prevent CLS when cards load
        }}
      >
        {playerCards.map((playerData) => (
          <PlayerCard
            key={String(playerData.key)}
            player={playerData.player}
            mundusBuffs={playerData.mundusBuffs}
            championPoints={playerData.championPoints}
            auras={playerData.auras}
            scribingSkills={playerData.scribingSkills}
            buildIssues={playerData.buildIssues}
            classAnalysis={playerData.classAnalysis}
            deaths={playerData.deaths}
            resurrects={playerData.resurrects}
            cpm={playerData.cpm}
            maxHealth={playerData.maxHealth}
            maxStamina={playerData.maxStamina}
            maxMagicka={playerData.maxMagicka}
            reportId={reportId}
            fightId={fightId}
            playerGear={playerData.playerGear}
          />
        ))}
      </Box>
    );
  },
);
