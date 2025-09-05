import { Box, Typography } from '@mui/material';
import React from 'react';

import { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { BuffLookupData } from '../../../utils/BuffLookupUtils';
import { type ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import { BuildIssue } from '../../../utils/detectBuildIssues';
import { PlayerGearSetRecord } from '../../../utils/gearUtilities';

import { PlayerCard } from './PlayerCard';

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
  reportId?: string | null;
  fightId?: string | null;
  isLoading: boolean;
  playerGear: Record<number, PlayerGearSetRecord[]>;
  fightStartTime?: number;
  fightEndTime?: number;
  friendlyBuffLookup?: BuffLookupData | null;
}

export const PlayersPanelView: React.FC<PlayersPanelViewProps> = ({
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
  reportId,
  fightId,
  isLoading,
  playerGear,
  fightStartTime,
  fightEndTime,
  friendlyBuffLookup,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading players...</Typography>
      </Box>
    );
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
        }}
      >
        {playerActors &&
          Object.values(playerActors).map((player) => {
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
            const playerGearSets = (playerDataSet ?? [])
              .sort((a, b) => b.count - a.count)
              .filter((s) => s.count > 0);

            return (
              <PlayerCard
                key={player.id}
                player={player}
                mundusBuffs={mundusBuffs}
                championPoints={championPoints}
                auras={auras}
                scribingSkills={scribingSkills}
                buildIssues={buildIssues}
                classAnalysis={classAnalysis}
                deaths={deaths}
                resurrects={resurrects}
                cpm={cpm}
                reportId={reportId}
                fightId={fightId}
                playerGear={playerGearSets}
                friendlyBuffLookup={friendlyBuffLookup}
              />
            );
          })}
      </Box>
    </Box>
  );
};
