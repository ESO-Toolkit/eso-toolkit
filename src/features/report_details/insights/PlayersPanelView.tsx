import TuneIcon from '@mui/icons-material/Tune';
import WrapTextIcon from '@mui/icons-material/WrapText';
import {
  Badge,
  Box,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  Tooltip,
} from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';

import { PlayersSkeleton } from '../../../components/PlayersSkeleton';
import { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import type { PlayerRoleResult } from '../../../features/role_detection';
import { toBroadRole, type BroadRole } from '../../../hooks/useRoleDetection';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { type ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import { BuildIssue } from '../../../utils/detectBuildIssues';
import { PlayerGearSetRecord } from '../../../utils/gearUtilities';
import { type PotionStreamResult } from '../../../utils/potionDetectionUtils';
import { resolveActorName } from '../../../utils/resolveActorName';
import { type BarSwapAnalysisResult } from '../../parse_analysis/utils/parseAnalysisUtils';

import { LazyPlayerCard as PlayerCard } from './LazyPlayerCard';
import { STAT_CHIP_IDS } from './statChipConfig';
import { StatChipCustomizationModal } from './StatChipCustomizationModal';
import { useMetricsLayout } from './useMetricsLayout';
import { useStatChipPreferences } from './useStatChipPreferences';

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
  /** HPS value (healing/second) per player ID */
  hpsValueByPlayer?: Record<string, number>;
  /** Total damage dealt per player ID */
  totalDamageByPlayer?: Record<string, number>;
  /** Total critical hit damage per player ID */
  totalCritDamageByPlayer?: Record<string, number>;
  /** Critical DPS (crit damage / duration) per player ID */
  critDpsByPlayer?: Record<string, number>;
  /** Critical hit chance (%) per player ID */
  critChanceByPlayer?: Record<string, number>;
  criticalDamageByPlayer?: Record<string, { avg: number; max: number }>;
  /** Bar swap analysis results per player ID, used to show bar setup pattern on DPS cards */
  barSwapByPlayer?: Record<string, BarSwapAnalysisResult>;
  /** Per-player potion classification from the live fight event stream (Path B detection) */
  potionResultsByPlayer?: Record<string, PotionStreamResult>;
  /** Detected roles from the role detection algorithm, keyed by player ID */
  rolesByPlayerId?: Record<number, PlayerRoleResult>;
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
    hpsValueByPlayer,
    totalDamageByPlayer,
    totalCritDamageByPlayer,
    critDpsByPlayer,
    critChanceByPlayer,
    criticalDamageByPlayer,
    barSwapByPlayer,
    potionResultsByPlayer,
    rolesByPlayerId,
  }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('alphabetical');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [chipModalOpen, setChipModalOpen] = useState(false);

    const { visibleChips, setVisibleChips } = useStatChipPreferences();
    const { metricsLayout, toggleMetricsLayout } = useMetricsLayout();
    const handleOpenChipModal = useCallback(() => setChipModalOpen(true), []);
    const handleCloseChipModal = useCallback(() => setChipModalOpen(false), []);

    // Helper: get the effective broad role for a player, preferring detected role
    const getEffectiveBroadRole = useCallback(
      (playerId: string | number): BroadRole => {
        const detected = rolesByPlayerId?.[Number(playerId)];
        if (detected) return toBroadRole(detected.role);
        return 'dps'; // fallback
      },
      [rolesByPlayerId],
    );

    // Identify the top DPS player (highest DPS value among DPS-role players)
    const { topDpsPlayerId, topDpsValue } = useMemo(() => {
      if (!dpsValueByPlayer || !playerActors) return { topDpsPlayerId: null, topDpsValue: 0 };
      let bestId: string | null = null;
      let bestDps = 0;
      for (const [id, dps] of Object.entries(dpsValueByPlayer)) {
        if (getEffectiveBroadRole(id) === 'dps' && dps > bestDps) {
          bestDps = dps;
          bestId = id;
        }
      }
      return { topDpsPlayerId: bestId, topDpsValue: bestDps };
    }, [dpsValueByPlayer, playerActors, getEffectiveBroadRole]);

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
        const potionStreamResult = potionResultsByPlayer?.[String(player.id)];
        const dpsValue = dpsValueByPlayer?.[String(player.id)];
        const hpsValue = hpsValueByPlayer?.[String(player.id)];
        const totalDamage = totalDamageByPlayer?.[String(player.id)];
        const totalCritDamage = totalCritDamageByPlayer?.[String(player.id)];
        const critDps = critDpsByPlayer?.[String(player.id)];
        const critChance = critChanceByPlayer?.[String(player.id)];

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
          potionStreamResult,
          dpsValue,
          hpsValue,
          totalDamage,
          totalCritDamage,
          critDps,
          critChance,
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
      potionResultsByPlayer,
      dpsValueByPlayer,
      hpsValueByPlayer,
      totalDamageByPlayer,
      totalCritDamageByPlayer,
      critDpsByPlayer,
      critChanceByPlayer,
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
          filtered = filtered.filter(
            (playerData) => getEffectiveBroadRole(playerData.player.id) !== 'dps',
          );
        } else {
          // Filter for specific role
          filtered = filtered.filter(
            (playerData) => getEffectiveBroadRole(playerData.player.id) === roleFilter,
          );
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
    }, [playerCards, searchTerm, roleFilter, sortOption, getEffectiveBroadRole]);

    if (isLoading) {
      return <PlayersSkeleton />;
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

          <Tooltip title="Choose which stat chips are shown on each player card" arrow>
            <Badge
              badgeContent={visibleChips.length}
              color="primary"
              invisible={visibleChips.length === STAT_CHIP_IDS.length}
              max={99}
            >
              <Button
                size="small"
                variant="outlined"
                onClick={handleOpenChipModal}
                startIcon={<TuneIcon />}
                aria-label="Customize stat chips"
                sx={{ alignSelf: 'center', textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                Stats
              </Button>
            </Badge>
          </Tooltip>

          <Tooltip
            title={
              metricsLayout === 'wrap'
                ? 'Metrics: wrap view — click to switch to scroll view'
                : 'Metrics: scroll view — click to switch to wrap view'
            }
            arrow
          >
            <IconButton
              size="small"
              onClick={toggleMetricsLayout}
              sx={{
                alignSelf: 'center',
                border: '1px solid',
                borderColor: metricsLayout === 'wrap' ? 'primary.main' : 'divider',
                borderRadius: 1,
                px: 1,
                color: metricsLayout === 'wrap' ? 'primary.main' : 'inherit',
                bgcolor: metricsLayout === 'wrap' ? 'primary.main' : 'transparent',
                '&:hover': {
                  bgcolor: metricsLayout === 'wrap' ? 'primary.dark' : undefined,
                },
              }}
              aria-label={
                metricsLayout === 'wrap'
                  ? 'Switch to scroll view for metrics'
                  : 'Switch to wrap view for metrics'
              }
              aria-pressed={metricsLayout === 'wrap'}
            >
              <WrapTextIcon
                fontSize="small"
                sx={{ color: metricsLayout === 'wrap' ? 'primary.contrastText' : 'inherit' }}
              />
            </IconButton>
          </Tooltip>
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
                overflow: 'visible', // Allow card to lift on hover without clipping
                boxSizing: 'border-box', // Include padding in width calculation
                paddingTop: '2px', // Give hover translateY(-2px) room at the top
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
                potionStreamResult={playerData.potionStreamResult}
                dpsValue={playerData.dpsValue}
                hpsValue={playerData.hpsValue}
                totalDamage={playerData.totalDamage}
                totalCritDamage={playerData.totalCritDamage}
                critDps={playerData.critDps}
                critChance={playerData.critChance}
                visibleChips={visibleChips}
                detectedRole={rolesByPlayerId?.[Number(playerData.player.id)]}
                metricsLayout={metricsLayout}
              />
            </Box>
          ))}
        </Box>

        <StatChipCustomizationModal
          open={chipModalOpen}
          onClose={handleCloseChipModal}
          visibleChips={visibleChips}
          onSave={setVisibleChips}
        />
      </Box>
    );
  },
);

PlayersPanelView.displayName = 'PlayersPanelView';
