import { Box, Typography } from '@mui/material';
import React from 'react';

import { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { type ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import { BuildIssue } from '../../../utils/detectBuildIssues';
import { PlayerGearSetRecord } from '../../../utils/gearUtilities';
import { getSkeletonForTab, TAB_IDS } from '../../../utils/getSkeletonForTab';

import { LazyPlayerCard as PlayerCard } from './LazyPlayerCard';

function formatDuration(startTime: number, endTime: number): string {
  const durationMs = endTime - startTime;
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

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
    ]);

    if (isLoading) {
      return getSkeletonForTab(TAB_IDS.PLAYERS, false);
    }

    if (!playerActors || Object.keys(playerActors).length === 0) {
      return (
        <Box sx={{ p: 3 }}>
          <Typography>No player data available.</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 300,
              letterSpacing: '0.05em',
            }}
          >
            Players
          </Typography>
          {fightStartTime && fightEndTime && (
            <Box display="flex" alignItems="center">
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '0.85rem',
                  letterSpacing: '0.02em',
                }}
              >
                {formatDuration(fightStartTime, fightEndTime)}
              </Typography>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
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
              reportId={reportId}
              fightId={fightId}
              playerGear={playerData.playerGear}
            />
          ))}
        </Box>
      </Box>
    );
  },
);
