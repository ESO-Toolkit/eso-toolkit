import { Box, Skeleton, Card, CardContent } from '@mui/material';
import React, { Suspense } from 'react';

import type { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import type { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import type { ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import type { BuildIssue } from '../../../utils/detectBuildIssues';
import type { PlayerGearSetRecord } from '../../../utils/gearUtilities';
import type { BarSwapAnalysisResult } from '../../parse_analysis/utils/parseAnalysisUtils';

// Lazy load the PlayerCard component
const PlayerCard = React.lazy(() =>
  import('./PlayerCard').then((module) => ({
    default: module.PlayerCard,
  })),
);

// Loading fallback for player cards
interface PlayerCardLoadingFallbackProps {
  /** Test ID for testing */
  'data-testid'?: string;
}

const PlayerCardLoadingFallback: React.FC<PlayerCardLoadingFallbackProps> = ({
  'data-testid': dataTestId = 'player-card-loading-fallback',
}) => (
  <Card data-testid={dataTestId} sx={{ marginBottom: 2, minHeight: 380, height: '100%' }}>
    <CardContent sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Player header section */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1.5 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" height={22} width="45%" sx={{ mb: 0.5 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" height={14} width="20%" />
          </Box>
        </Box>
      </Box>

      {/* Class/skill line info */}
      <Box sx={{ mb: 1.5 }}>
        <Skeleton variant="text" height={16} width="70%" sx={{ mb: 0.5 }} />
        <Skeleton variant="text" height={14} width="50%" />
      </Box>

      {/* Abilities/talents grid - 2 rows of 6 */}
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1.25, mb: 1.25 }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              width={index === 5 ? 34 : 32}
              height={index === 5 ? 34 : 32}
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25 }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index + 6} variant="rounded" width={32} height={32} />
          ))}
        </Box>
      </Box>

      {/* Gear chips */}
      <Box sx={{ mb: 1.5, pt: 0.9, pb: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, minHeight: 48 }}>
          <Skeleton variant="rounded" height={24} width={80} />
          <Skeleton variant="rounded" height={24} width={100} />
          <Skeleton variant="rounded" height={24} width={90} />
          <Skeleton variant="rounded" height={24} width={70} />
        </Box>
      </Box>

      {/* Bottom status section */}
      <Box
        sx={{
          mt: 'auto',
          p: 1,
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 1,
          backgroundColor: 'rgba(0,0,0,0.04)',
          minHeight: 120,
        }}
      >
        {/* Mundus and stats row */}
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', minHeight: 28 }}>
          <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
            <Skeleton variant="rounded" height={20} width={60} />
          </Box>
          <Skeleton variant="text" height={16} width="40%" />
        </Box>

        {/* Champion points */}
        <Box>
          <Skeleton variant="text" height={16} width="40%" sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', gap: 1, minHeight: 24 }}>
            <Skeleton variant="rounded" height={24} width={90} />
            <Skeleton variant="rounded" height={24} width={85} />
          </Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export interface PlayerCardProps {
  key?: string;
  player: PlayerDetailsWithRole;
  mundusBuffs: Array<{ name: string; id: number }>;
  championPoints: Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }>;
  auras: Array<{ name: string; id: number; stacks?: number }>;
  scribingSkills: GrimoireData[];
  buildIssues: BuildIssue[];
  classAnalysis?: ClassAnalysisResult;
  deaths: number;
  resurrects: number;
  cpm: number;
  maxHealth: number;
  maxStamina: number;
  maxMagicka: number;
  distanceTraveled: number | null;
  reportId?: string | null;
  fightId?: string | null;
  playerGear: PlayerGearSetRecord[];
  /** Whether this player is the top DPS in the fight */
  isTopDps?: boolean;
  /** The player's total DPS value (used in the badge label) */
  totalDps?: number;
  critDamageSummary?: { avg: number; max: number };
  /** Bar swap analysis result, used to display bar setup pattern on DPS cards */
  barSwapResult?: BarSwapAnalysisResult;
  /** Test ID for testing */
  'data-testid'?: string;
}

// Wrapper component with suspense boundary
export const LazyPlayerCard: React.FC<PlayerCardProps> = (props) => {
  const { 'data-testid': dataTestId, ...playerCardProps } = props;
  return (
    <Suspense fallback={<PlayerCardLoadingFallback data-testid={dataTestId} />}>
      <PlayerCard {...playerCardProps} />
    </Suspense>
  );
};
