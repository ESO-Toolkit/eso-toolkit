import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  Card,
  CardContent,
  Skeleton,
} from '@mui/material';
import React, { useState, useMemo } from 'react';

import { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { type ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import { BuildIssue } from '../../../utils/detectBuildIssues';
import { PlayerGearSetRecord } from '../../../utils/gearUtilities';
import { resolveActorName } from '../../../utils/resolveActorName';
import { type BarSwapAnalysisResult } from '../../parse_analysis/utils/parseAnalysisUtils';

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
  distanceByPlayer: Record<string, number>;
  reportId?: string | null;
  fightId?: string | null;
  isLoading: boolean;
  playerGear: Record<number, PlayerGearSetRecord[]>;
  fightStartTime?: number;
  fightEndTime?: number;
  /** DPS value (damage/second) per player ID, used to identify the top DPS player */
  dpsValueByPlayer?: Record<string, number>;
  criticalDamageByPlayer?: Record<string, { avg: number; max: number }>;
  /** Bar swap analysis results per player ID, used to show bar setup pattern on DPS cards */
  barSwapByPlayer?: Record<string, BarSwapAnalysisResult>;
}

type SortOption =
  | 'alphabetical'
  | 'stamina-high'
  | 'stamina-low'
  | 'hp-high'
  | 'hp-low'
  | 'magicka-high'
  | 'magicka-low';
type RoleFilter = 'all' | 'dps' | 'tank' | 'healer' | 'supports';

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
    distanceByPlayer,
    reportId,
    fightId,
    isLoading,
    playerGear,
    fightStartTime: _fightStartTime,
    fightEndTime: _fightEndTime,
    dpsValueByPlayer,
    criticalDamageByPlayer,
    barSwapByPlayer,
  }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('alphabetical');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

    // Identify the top DPS player (highest DPS value among DPS-role players)
    const { topDpsPlayerId, topDpsValue } = useMemo(() => {
      if (!dpsValueByPlayer || !playerActors) return { topDpsPlayerId: null, topDpsValue: 0 };
      let bestId: string | null = null;
      let bestDps = 0;
      for (const [id, dps] of Object.entries(dpsValueByPlayer)) {
        const player = playerActors[id];
        if (player?.role === 'dps' && dps > bestDps) {
          bestDps = dps;
          bestId = id;
        }
      }
      return { topDpsPlayerId: bestId, topDpsValue: bestDps };
    }, [dpsValueByPlayer, playerActors]);

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
        const distanceTraveled = distanceByPlayer?.[String(player.id)] ?? null;
        const playerGearSets = (playerDataSet ?? [])
          .sort((a, b) => b.count - a.count)
          .filter((s) => s.count > 0);
        const critDamageSummary = criticalDamageByPlayer?.[String(player.id)];

        const isTopDps = topDpsPlayerId !== null && String(player.id) === topDpsPlayerId;
        const barSwapResult = barSwapByPlayer?.[String(player.id)];

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
          distanceTraveled,
          playerGear: playerGearSets,
          isTopDps,
          totalDps: isTopDps ? topDpsValue : undefined,
          critDamageSummary,
          barSwapResult,
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
      distanceByPlayer,
      topDpsPlayerId,
      topDpsValue,
      criticalDamageByPlayer,
      barSwapByPlayer,
    ]);

    // Filter, search, and sort players
    const filteredAndSortedPlayerCards = useMemo(() => {
      let filtered = playerCards;

      // Apply search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        filtered = filtered.filter((playerData) => {
          // Use the same name resolution logic as the display
          const displayName = resolveActorName(playerData.player).toLowerCase();
          return displayName.includes(searchLower);
        });
      }

      // Apply role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'supports') {
          // Filter for non-DPS (tanks and healers)
          filtered = filtered.filter((playerData) => playerData.player.role !== 'dps');
        } else {
          // Filter for specific role
          filtered = filtered.filter((playerData) => playerData.player.role === roleFilter);
        }
      }

      // Apply sorting
      const sorted = [...filtered].sort((a, b) => {
        switch (sortOption) {
          case 'alphabetical':
            return a.player.name.localeCompare(b.player.name);
          case 'stamina-high':
            return b.maxStamina - a.maxStamina;
          case 'stamina-low':
            return a.maxStamina - b.maxStamina;
          case 'hp-high':
            return b.maxHealth - a.maxHealth;
          case 'hp-low':
            return a.maxHealth - b.maxHealth;
          case 'magicka-high':
            return b.maxMagicka - a.maxMagicka;
          case 'magicka-low':
            return a.maxMagicka - b.maxMagicka;
          default:
            return 0;
        }
      });

      return sorted;
    }, [playerCards, searchTerm, roleFilter, sortOption]);

    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Controls skeleton */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
            <Skeleton variant="rounded" height={40} sx={{ minWidth: { sm: 200 } }} />
            <Skeleton variant="rounded" height={40} sx={{ minWidth: { sm: 180 } }} />
            <Skeleton variant="rounded" height={40} sx={{ minWidth: { sm: 120 } }} />
          </Stack>

          {/* Results summary skeleton */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Skeleton variant="text" width={150} height={20} />
          </Box>

          {/* Player cards grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                // Use 2 columns only for screens 772px and above
                '@media (min-width: 772px)': {
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                },
              },
              gap: { xs: 2, md: 2 },
              alignItems: 'stretch',
              minHeight: '400px',
              width: '100%', // Ensure container doesn't exceed viewport
              maxWidth: '100vw', // Hard constraint to viewport width
            }}
          >
            {/* Generate 4 player card skeletons (typical party size) */}
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} sx={{ marginBottom: 2, minHeight: 380, height: '100%' }}>
                <CardContent
                  sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
                >
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
                      {Array.from({ length: 6 }).map((_, abilityIndex) => (
                        <Skeleton
                          key={abilityIndex}
                          variant="rounded"
                          width={abilityIndex === 5 ? 34 : 32}
                          height={abilityIndex === 5 ? 34 : 32}
                        />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.25 }}>
                      {Array.from({ length: 6 }).map((_, abilityIndex) => (
                        <Skeleton key={abilityIndex + 6} variant="rounded" width={32} height={32} />
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

                    {/* Notable auras */}
                    <Box sx={{ mb: 1 }}>
                      <Skeleton variant="text" height={16} width="35%" sx={{ mb: 1 }} />
                      <Box sx={{ display: 'flex', gap: 1, minHeight: 24 }}>
                        <Skeleton variant="rounded" height={24} width={70} />
                        <Skeleton variant="rounded" height={24} width={80} />
                        <Skeleton variant="rounded" height={24} width={60} />
                      </Box>
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
            ))}
          </Box>
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
      <Box
        data-testid="players-panel-view"
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {/* Controls */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
          <TextField
            label="Search players"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: { sm: 200 } }}
          />

          <FormControl size="small" sx={{ minWidth: { sm: 180 } }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortOption}
              label="Sort by"
              onChange={(e) => setSortOption(e.target.value as SortOption)}
            >
              <MenuItem value="alphabetical">Alphabetical</MenuItem>
              <MenuItem value="stamina-high">Stamina (High to Low)</MenuItem>
              <MenuItem value="stamina-low">Stamina (Low to High)</MenuItem>
              <MenuItem value="hp-high">HP (High to Low)</MenuItem>
              <MenuItem value="hp-low">HP (Low to High)</MenuItem>
              <MenuItem value="magicka-high">Magicka (High to Low)</MenuItem>
              <MenuItem value="magicka-low">Magicka (Low to High)</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { sm: 120 } }}>
            <InputLabel>Filter by role</InputLabel>
            <Select
              value={roleFilter}
              label="Filter by role"
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="dps">DPS</MenuItem>
              <MenuItem value="tank">Tank</MenuItem>
              <MenuItem value="healer">Healer</MenuItem>
              <MenuItem value="supports">Supports (Tanks & Healers)</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Results summary */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredAndSortedPlayerCards.length} of {playerCards.length} players
          </Typography>
          {searchTerm && (
            <Chip
              label={`Search: "${searchTerm}"`}
              size="small"
              onDelete={() => setSearchTerm('')}
            />
          )}
          {roleFilter !== 'all' && (
            <Chip
              label={`Role: ${
                roleFilter === 'supports' ? 'Supports (Tanks & Healers)' : roleFilter.toUpperCase()
              }`}
              size="small"
              onDelete={() => setRoleFilter('all')}
            />
          )}
        </Box>

        {/* Player cards grid */}
        <Box
          data-testid="players-panel-loaded"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              // Use 2 columns only for screens 772px and above
              '@media (min-width: 772px)': {
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              },
            },
            gap: { xs: 2, md: 2 },
            alignItems: 'stretch',
            minHeight: '400px', // Prevent CLS when cards load
            width: '100%', // Ensure container doesn't exceed viewport
            maxWidth: '100vw', // Hard constraint to viewport width
          }}
        >
          {filteredAndSortedPlayerCards.map((playerData) => (
            <Box
              key={playerData.key}
              data-testid={`player-card-${playerData.player.id}`}
              sx={{
                height: '100%', // Accept full height from grid stretch
                minWidth: 0, // Allow shrinking below content width
                maxWidth: '100%', // Don't exceed parent container
                overflow: 'hidden', // Clip individual card overflow if needed
                boxSizing: 'border-box', // Include padding in width calculation
              }}
            >
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
                distanceTraveled={playerData.distanceTraveled}
                reportId={reportId}
                fightId={fightId}
                playerGear={playerData.playerGear}
                isTopDps={playerData.isTopDps}
                totalDps={playerData.totalDps}
                critDamageSummary={playerData.critDamageSummary}
                barSwapResult={playerData.barSwapResult}
              />
            </Box>
          ))}
        </Box>
      </Box>
    );
  },
);

PlayersPanelView.displayName = 'PlayersPanelView';
