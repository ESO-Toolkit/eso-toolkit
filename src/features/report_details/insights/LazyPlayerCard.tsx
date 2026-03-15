import React, { Suspense } from 'react';

import { PlayerCardSkeleton } from '../../../components/PlayersSkeleton';
import type { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import type { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import type { ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import type { BuildIssue } from '../../../utils/detectBuildIssues';
import type { PlayerGearSetRecord } from '../../../utils/gearUtilities';
import type { PotionStreamResult } from '../../../utils/potionDetectionUtils';
import type { BarSwapAnalysisResult } from '../../parse_analysis/utils/parseAnalysisUtils';

import type { StatChipId } from './statChipConfig';

// Lazy load the PlayerCard component
const PlayerCard = React.lazy(() =>
  import('./PlayerCard').then((module) => ({
    default: module.PlayerCard,
  })),
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
  /** Per-player potion classification from the live fight event stream (Path B detection) */
  potionStreamResult?: PotionStreamResult;
  /** Player's DPS value */
  dpsValue?: number;
  /** Player's HPS value */
  hpsValue?: number;
  /** Player's total damage dealt */
  totalDamage?: number;
  /** Player's total critical hit damage */
  totalCritDamage?: number;
  /** Player's critical DPS (crit damage / duration) */
  critDps?: number;
  /** Player's critical hit chance percentage */
  critChance?: number;
  /** Ordered list of visible stat chip IDs (from customization preferences) */
  visibleChips?: StatChipId[];
  /** Test ID for testing */
  'data-testid'?: string;
}

// Wrapper component with suspense boundary
export const LazyPlayerCard: React.FC<PlayerCardProps> = (props) => {
  const { 'data-testid': _dataTestId, ...playerCardProps } = props;
  return (
    <Suspense fallback={<PlayerCardSkeleton />}>
      <PlayerCard {...playerCardProps} />
    </Suspense>
  );
};
