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
} from '@mui/material';
import React, { useState, useMemo } from 'react';

import { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { type ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import { BuildIssue } from '../../../utils/detectBuildIssues';
import { PlayerGearSetRecord } from '../../../utils/gearUtilities';
import { resolveActorName } from '../../../utils/resolveActorName';

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

type SortOption =
  | 'alphabetical'
  | 'stamina-high'
  | 'stamina-low'
  | 'hp-high'
  | 'hp-low'
  | 'magicka-high'
  | 'magicka-low';
type RoleFilter = 'all' | 'dps' | 'tank' | 'healer';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('alphabetical');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
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
        filtered = filtered.filter((playerData) => playerData.player.role === roleFilter);
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
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              gap: 2,
              alignItems: 'stretch',
              minHeight: '400px',
            }}
          >
            {/* Generate 4 player card skeletons (typical party size) */}
            {Array.from({ length: 4 }).map((_, index) => (
              <Box
                key={index}
                sx={{
                  marginBottom: 2,
                  minHeight: 380,
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.11)',
                  borderRadius: 1,
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                }}
              />
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              label={`Role: ${roleFilter.toUpperCase()}`}
              size="small"
              onDelete={() => setRoleFilter('all')}
            />
          )}
        </Box>

        {/* Player cards grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: { xs: 0, md: 2 },
            alignItems: 'stretch',
            minHeight: '400px', // Prevent CLS when cards load
          }}
        >
          {filteredAndSortedPlayerCards.map((playerData) => (
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
      </Box>
    );
  },
);
