import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import TuneIcon from '@mui/icons-material/Tune';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import WrapTextIcon from '@mui/icons-material/WrapText';
import {
  Badge,
  Box,
  Button,
  IconButton,
  Typography,
  InputBase,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Tooltip,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useState, useMemo, useCallback } from 'react';

import { PlayersSkeleton } from '../../../components/PlayersSkeleton';
import { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { DetectedRole, type PlayerRoleResult } from '../../../features/role_detection';
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
  | 'role'
  | 'alphabetical'
  | 'stamina-high'
  | 'stamina-low'
  | 'hp-high'
  | 'hp-low'
  | 'magicka-high'
  | 'magicka-low';

/**
 * Default display order for player cards by detected role.
 * MT → OT → H1 → H2 → Support DPS → DPS
 */
const ROLE_SORT_ORDER: Record<DetectedRole, number> = {
  [DetectedRole.MainTank]: 0,
  [DetectedRole.OffTank]: 1,
  [DetectedRole.GroupHealer]: 2,
  [DetectedRole.ShieldHealer]: 3,
  [DetectedRole.BuffHealer]: 4,
  [DetectedRole.SupportDPS]: 5,
  [DetectedRole.ParseDPS]: 6,
};
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
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('role');
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
        const playerGearSets = [...(playerDataSet ?? [])]
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
          case 'role': {
            const roleA = rolesByPlayerId?.[Number(a.player.id)];
            const roleB = rolesByPlayerId?.[Number(b.player.id)];
            const orderA = roleA ? ROLE_SORT_ORDER[roleA.role] : 7;
            const orderB = roleB ? ROLE_SORT_ORDER[roleB.role] : 7;
            if (orderA !== orderB) return orderA - orderB;
            return a.player.name.localeCompare(b.player.name);
          }
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
    }, [playerCards, searchTerm, roleFilter, sortOption, getEffectiveBroadRole, rolesByPlayerId]);

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
        {/* Controls toolbar */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1.5,
            p: { xs: 1.5, sm: 2 },
            borderRadius: '14px',
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.7) 50%, rgba(51, 65, 85, 0.6) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: isDarkMode
              ? '1px solid rgba(56, 189, 248, 0.15)'
              : '1px solid rgba(59, 130, 246, 0.12)',
            boxShadow: isDarkMode
              ? '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
              : '0 2px 12px rgba(15, 23, 42, 0.06)',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Search */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: { xs: 1, sm: '0 1 220px' },
              borderRadius: '10px',
              px: 1.5,
              py: 0.75,
              background: isDarkMode
                ? alpha(theme.palette.common.white, 0.04)
                : alpha(theme.palette.common.black, 0.03),
              border: `1px solid ${isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.1)'}`,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:focus-within': {
                borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.4)' : 'rgba(59, 130, 246, 0.35)',
                boxShadow: isDarkMode
                  ? '0 0 0 2px rgba(56, 189, 248, 0.15)'
                  : '0 0 0 2px rgba(59, 130, 246, 0.1)',
                background: isDarkMode
                  ? alpha(theme.palette.common.white, 0.06)
                  : alpha(theme.palette.common.black, 0.01),
              },
            }}
          >
            <SearchIcon sx={{ fontSize: '1.1rem', color: 'text.secondary', opacity: 0.6 }} />
            <InputBase
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                flex: 1,
                fontSize: '0.825rem',
                fontWeight: 500,
                color: 'text.primary',
                '& input::placeholder': {
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  opacity: 1,
                },
              }}
              inputProps={{ 'aria-label': 'Search players' }}
            />
          </Box>

          {/* Sort */}
          <FormControl
            size="small"
            sx={{ minWidth: { xs: '100%', sm: 150 } }}
          >
            <Select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              displayEmpty
              startAdornment={<SortIcon sx={{ fontSize: '1rem', mr: 0.75, color: 'text.secondary', opacity: 0.6 }} />}
              sx={{
                fontSize: '0.825rem',
                fontWeight: 500,
                borderRadius: '10px',
                background: isDarkMode
                  ? alpha(theme.palette.common.white, 0.04)
                  : alpha(theme.palette.common.black, 0.03),
                border: `1px solid ${isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.1)'}`,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '&:hover': {
                  background: isDarkMode
                    ? alpha(theme.palette.common.white, 0.06)
                    : alpha(theme.palette.common.black, 0.05),
                  borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(59, 130, 246, 0.2)',
                },
                '&.Mui-focused': {
                  borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.4)' : 'rgba(59, 130, 246, 0.35)',
                  boxShadow: isDarkMode
                    ? '0 0 0 2px rgba(56, 189, 248, 0.15)'
                    : '0 0 0 2px rgba(59, 130, 246, 0.1)',
                },
                '& .MuiSelect-select': {
                  py: 0.875,
                  pl: 0.5,
                },
              }}
              aria-label="Sort by"
            >
              <MenuItem value="role">Default</MenuItem>
              <MenuItem value="alphabetical">Alphabetical</MenuItem>
              <MenuItem value="stamina-high">Stamina (High → Low)</MenuItem>
              <MenuItem value="stamina-low">Stamina (Low → High)</MenuItem>
              <MenuItem value="hp-high">HP (High → Low)</MenuItem>
              <MenuItem value="hp-low">HP (Low → High)</MenuItem>
              <MenuItem value="magicka-high">Magicka (High → Low)</MenuItem>
              <MenuItem value="magicka-low">Magicka (Low → High)</MenuItem>
            </Select>
          </FormControl>

          {/* Role filter */}
          <FormControl
            size="small"
            sx={{ minWidth: { xs: '100%', sm: 140 } }}
          >
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              displayEmpty
              startAdornment={<ViewStreamIcon sx={{ fontSize: '1rem', mr: 0.75, color: 'text.secondary', opacity: 0.6 }} />}
              sx={{
                fontSize: '0.825rem',
                fontWeight: 500,
                borderRadius: '10px',
                background: isDarkMode
                  ? alpha(theme.palette.common.white, 0.04)
                  : alpha(theme.palette.common.black, 0.03),
                border: `1px solid ${isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.1)'}`,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '&:hover': {
                  background: isDarkMode
                    ? alpha(theme.palette.common.white, 0.06)
                    : alpha(theme.palette.common.black, 0.05),
                  borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(59, 130, 246, 0.2)',
                },
                '&.Mui-focused': {
                  borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.4)' : 'rgba(59, 130, 246, 0.35)',
                  boxShadow: isDarkMode
                    ? '0 0 0 2px rgba(56, 189, 248, 0.15)'
                    : '0 0 0 2px rgba(59, 130, 246, 0.1)',
                },
                '& .MuiSelect-select': {
                  py: 0.875,
                  pl: 0.5,
                },
              }}
              aria-label="Filter by role"
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="dps">DPS</MenuItem>
              <MenuItem value="tank">Tank</MenuItem>
              <MenuItem value="healer">Healer</MenuItem>
              <MenuItem value="supports">Supports</MenuItem>
            </Select>
          </FormControl>

          {/* Spacer on desktop */}
          <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />

          {/* Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Choose which stat chips are shown on each player card" arrow>
              <Badge
                badgeContent={visibleChips.length}
                color="primary"
                invisible={visibleChips.length === STAT_CHIP_IDS.length}
                max={99}
              >
                <Button
                  size="small"
                  onClick={handleOpenChipModal}
                  startIcon={<TuneIcon sx={{ fontSize: '1rem !important' }} />}
                  aria-label="Customize stat chips"
                  sx={{
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    borderRadius: '10px',
                    px: 1.5,
                    py: 0.75,
                    color: isDarkMode ? '#e2e8f0' : '#334155',
                    background: isDarkMode
                      ? alpha(theme.palette.common.white, 0.04)
                      : alpha(theme.palette.common.black, 0.03),
                    border: `1px solid ${isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.1)'}`,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: isDarkMode
                        ? 'rgba(56, 189, 248, 0.1)'
                        : 'rgba(59, 130, 246, 0.08)',
                      borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(59, 130, 246, 0.2)',
                      color: isDarkMode ? '#93c5fd' : '#2563eb',
                    },
                  }}
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
                  borderRadius: '10px',
                  p: 0.875,
                  color: isDarkMode ? '#e2e8f0' : '#334155',
                  background: metricsLayout === 'wrap'
                    ? (isDarkMode ? alpha('#38bdf8', 0.15) : alpha('#3b82f6', 0.1))
                    : (isDarkMode ? alpha(theme.palette.common.white, 0.04) : alpha(theme.palette.common.black, 0.03)),
                  border: `1px solid ${
                    metricsLayout === 'wrap'
                      ? (isDarkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(59, 130, 246, 0.25)')
                      : (isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.1)')
                  }`,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    background: metricsLayout === 'wrap'
                      ? (isDarkMode ? alpha('#38bdf8', 0.22) : alpha('#3b82f6', 0.15))
                      : (isDarkMode ? alpha(theme.palette.common.white, 0.08) : alpha(theme.palette.common.black, 0.06)),
                    borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(59, 130, 246, 0.2)',
                  },
                }}
                aria-label={
                  metricsLayout === 'wrap'
                    ? 'Switch to scroll view for metrics'
                    : 'Switch to wrap view for metrics'
                }
                aria-pressed={metricsLayout === 'wrap'}
              >
                <WrapTextIcon sx={{ fontSize: '1.1rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Results summary + active filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.8rem',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            Showing{' '}
            <Box
              component="span"
              sx={{ color: 'text.primary', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
            >
              {filteredAndSortedPlayerCards.length}
            </Box>
            {' '}of{' '}
            <Box
              component="span"
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {playerCards.length}
            </Box>
            {' '}players
          </Typography>
          {searchTerm && (
            <Chip
              label={`"${searchTerm}"`}
              size="small"
              onDelete={() => setSearchTerm('')}
              sx={{
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 500,
                height: 24,
                background: isDarkMode
                  ? alpha('#38bdf8', 0.12)
                  : alpha('#3b82f6', 0.08),
                border: `1px solid ${isDarkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
                color: isDarkMode ? '#93c5fd' : '#2563eb',
                '& .MuiChip-deleteIcon': {
                  fontSize: '0.9rem',
                  color: isDarkMode ? '#93c5fd' : '#3b82f6',
                  '&:hover': { color: isDarkMode ? '#bfdbfe' : '#1d4ed8' },
                },
              }}
            />
          )}
          {roleFilter !== 'all' && (
            <Chip
              label={roleFilter === 'supports' ? 'Supports' : roleFilter.toUpperCase()}
              size="small"
              onDelete={() => setRoleFilter('all')}
              sx={{
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 500,
                height: 24,
                background: isDarkMode
                  ? alpha('#38bdf8', 0.12)
                  : alpha('#3b82f6', 0.08),
                border: `1px solid ${isDarkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
                color: isDarkMode ? '#93c5fd' : '#2563eb',
                '& .MuiChip-deleteIcon': {
                  fontSize: '0.9rem',
                  color: isDarkMode ? '#93c5fd' : '#3b82f6',
                  '&:hover': { color: isDarkMode ? '#bfdbfe' : '#1d4ed8' },
                },
              }}
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
