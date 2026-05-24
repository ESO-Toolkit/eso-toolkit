/**
 * Set Assignment Manager Component
 * Provides a unified interface for assigning support sets to tanks and healers
 * with visual tracking of which sets are assigned and to whom
 */

import {
  Shield as ShieldIcon,
  Favorite as FavoriteIcon,
  OpenInNew as OpenInNewIcon,
  SwapHoriz as SwapHorizIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  useTheme,
  Button,
  ButtonGroup,
  IconButton,
} from '@mui/material';
import React, { useMemo, useState, useCallback } from 'react';

import { KnownSetIDs } from '../types/abilities';
import {
  RECOMMENDED_SETS,
  RECOMMENDED_5PIECE_SETS,
  RECOMMENDED_2PIECE_SETS,
  RECOMMENDED_1PIECE_SETS,
  QUICK_TANK_5PIECE_SETS,
  QUICK_TANK_MONSTER_SETS,
  QUICK_FLEXIBLE_5PIECE_SETS,
  QUICK_FLEXIBLE_MONSTER_SETS,
  QUICK_FLEXIBLE_MYTHICS,
  QUICK_HEALER_5PIECE_SETS,
  QUICK_HEALER_MONSTER_SETS,
  QUICK_HEALER_MYTHICS,
  TANK_SETS,
  HEALER_SETS,
  FLEXIBLE_SETS,
  MONSTER_SETS,
  ALL_5PIECE_SETS,
  SetCategory,
  TankSetup,
  HealerSetup,
  SupportUltimate,
  HealerChampionPoint,
  canAssignToFivePieceSlot,
  canAssignToMonsterSlot,
  validateCompatibility,
} from '../types/roster';
import { getEsoHubSetUrl } from '../utils/esoHubLinks';
import { Logger, LogLevel } from '../utils/logger';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';
import { getSetDisplayName, findSetIdByName } from '../utils/setNameUtils';
import type { SlotKey } from '../utils/slotKey';
import { makeSlotKey } from '../utils/slotKey';

const logger = new Logger({ level: LogLevel.WARN, contextPrefix: 'SetAssignmentManager' });

/**
 * Determine the primary role(s) for a set in Quick Assignment UI
 * Uses explicit QUICK_* arrays for clear categorization
 */
const getSetRole = (setId: KnownSetIDs): 'tank' | 'healer' | 'both' => {
  // Check Quick Assignment arrays for explicit role
  if (QUICK_TANK_5PIECE_SETS.includes(setId) || QUICK_TANK_MONSTER_SETS.includes(setId)) {
    return 'tank';
  }

  if (
    QUICK_HEALER_5PIECE_SETS.includes(setId) ||
    QUICK_HEALER_MONSTER_SETS.includes(setId) ||
    QUICK_HEALER_MYTHICS.includes(setId)
  ) {
    return 'healer';
  }

  if (
    QUICK_FLEXIBLE_5PIECE_SETS.includes(setId) ||
    QUICK_FLEXIBLE_MONSTER_SETS.includes(setId) ||
    QUICK_FLEXIBLE_MYTHICS.includes(setId)
  ) {
    return 'both';
  }

  // Fallback to category-based logic for sets not in Quick Assignment
  if (FLEXIBLE_SETS.includes(setId)) return 'both';
  if (TANK_SETS.includes(setId)) return 'tank';
  if (HEALER_SETS.includes(setId)) return 'healer';

  return 'both'; // Default for unknown sets
};

interface SetAssignment {
  setName: string;
  assignedTo: string[]; // Array of role names (e.g., "Tank 1", "Healer 2")
  isRecommended: boolean;
  category: SetCategory;
}

interface SetAssignmentManagerProps {
  tanks: TankSetup[];
  healers: HealerSetup[];
  onAssignSet: (setName: string, slotKey: SlotKey, slot: 'set1' | 'set2' | 'monster') => void;
  onUpdateUltimate?: (slotKey: SlotKey, ultimate: string | null) => void;
  onUpdateHealerCP?: (slotKey: SlotKey, championPoint: HealerChampionPoint | null) => void;
}

export const SetAssignmentManager: React.FC<SetAssignmentManagerProps> = ({
  tanks,
  healers,
  onAssignSet,
  onUpdateUltimate,
  onUpdateHealerCP,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const roleColors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;

  const [assignMenuAnchor, setAssignMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSetForAssign, setSelectedSetForAssign] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [roleFilter, setRoleFilter] = useState<'all' | 'tank' | 'healer'>('all');

  // Convert selected set name to ID for validation
  const selectedSetId = useMemo(() => {
    return selectedSetForAssign ? findSetIdByName(selectedSetForAssign) : undefined;
  }, [selectedSetForAssign]);

  const handleTabChange = (newValue: number): void => {
    setActiveTab(newValue);
  };

  // Helper function to add set assignments
  const addSetToAssignments = useCallback(
    (assignments: Map<string, string[]>, setId: KnownSetIDs | undefined, label: string): void => {
      if (setId) {
        const setName = getSetDisplayName(setId);
        const existing = assignments.get(setName) || [];
        assignments.set(setName, [...existing, label]);
      }
    },
    [],
  );

  // Helper to format ultimate button labels
  const formatUltimateLabel = useCallback((ult: SupportUltimate): string => {
    return ult.replace('Aggressive ', '').replace('Glacial ', '').replace('Greater Storm ', '');
  }, []);

  // Helper to render role ultimate selector
  const renderRoleUltimateSelector = useCallback(
    (
      slotKey: SlotKey,
      roleData: { ultimate: SupportUltimate | string | null },
      roleLabel: string,
      color: string,
    ) => {
      if (!onUpdateUltimate) return null;

      const isPrimary = roleLabel === 'MT' || roleLabel === 'H1';
      return (
        <Box key={slotKey} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 0.875,
              py: 0.4,
              borderRadius: '6px',
              minWidth: 32,
              bgcolor: isPrimary
                ? `${color}18`
                : isDarkMode
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(15,23,42,0.02)',
              border: `1px solid ${isPrimary ? `${color}35` : `${color}20`}`,
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: isPrimary ? 700 : 500,
                fontFamily: '"Space Grotesk", sans-serif',
                color: isPrimary ? color : `${color}99`,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                lineHeight: 1,
              }}
            >
              {roleLabel}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: 0.625,
              flex: 1,
            }}
          >
            {Object.values(SupportUltimate).map((ult) => {
              const isSelected = roleData.ultimate === ult;
              return (
                <Box
                  key={ult}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${formatUltimateLabel(ult)} ultimate for ${roleLabel}`}
                  onClick={() => onUpdateUltimate(slotKey, roleData.ultimate === ult ? null : ult)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onUpdateUltimate(slotKey, roleData.ultimate === ult ? null : ult);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 1.25,
                    py: 0.625,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    border: '1px solid',
                    bgcolor: isDarkMode
                      ? isSelected
                        ? `${color}18`
                        : 'rgba(255,255,255,0.03)'
                      : isSelected
                        ? `${color}15`
                        : 'rgba(15,23,42,0.03)',
                    borderColor: isDarkMode
                      ? isSelected
                        ? `${color}55`
                        : 'rgba(255,255,255,0.07)'
                      : isSelected
                        ? `${color}45`
                        : 'rgba(15,23,42,0.07)',
                    boxShadow: isSelected
                      ? isDarkMode
                        ? `0 0 14px ${color}45, 0 2px 8px rgba(0,0,0,0.2)`
                        : `0 0 10px ${color}35, 0 1px 4px rgba(0,0,0,0.06)`
                      : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      bgcolor: isDarkMode
                        ? isSelected
                          ? `${color}25`
                          : 'rgba(255,255,255,0.06)'
                        : isSelected
                          ? `${color}20`
                          : 'rgba(15,23,42,0.05)',
                      borderColor: isDarkMode
                        ? isSelected
                          ? `${color}70`
                          : 'rgba(255,255,255,0.13)'
                        : isSelected
                          ? `${color}60`
                          : 'rgba(15,23,42,0.11)',
                      boxShadow: isSelected
                        ? isDarkMode
                          ? `0 0 20px ${color}55, 0 4px 12px rgba(0,0,0,0.25)`
                          : `0 0 14px ${color}45, 0 3px 8px rgba(0,0,0,0.08)`
                        : isDarkMode
                          ? '0 4px 12px rgba(0,0,0,0.25)'
                          : '0 3px 8px rgba(15,23,42,0.08)',
                    },
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected
                        ? isDarkMode
                          ? 'rgba(255,255,255,0.9)'
                          : 'rgba(15,23,42,0.9)'
                        : isDarkMode
                          ? 'rgba(255,255,255,0.45)'
                          : 'rgba(15,23,42,0.4)',
                      transition: 'color 0.2s',
                      lineHeight: 1.2,
                    }}
                  >
                    {formatUltimateLabel(ult)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      );
    },
    [onUpdateUltimate, formatUltimateLabel, isDarkMode],
  );

  // Helper to render CP selector
  const renderCPSelector = useCallback(
    (slotKey: SlotKey, healer: HealerSetup, roleLabel: string, color: string) => {
      if (!onUpdateHealerCP) return null;

      const isPrimary = roleLabel === 'H1';
      return (
        <Box key={slotKey} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 0.875,
              py: 0.4,
              borderRadius: '6px',
              minWidth: 32,
              bgcolor: isPrimary
                ? `${color}18`
                : isDarkMode
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(15,23,42,0.02)',
              border: `1px solid ${isPrimary ? `${color}35` : `${color}20`}`,
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: isPrimary ? 700 : 500,
                fontFamily: '"Space Grotesk", sans-serif',
                color: isPrimary ? color : `${color}99`,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                lineHeight: 1,
              }}
            >
              {roleLabel}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)' },
              gap: 0.625,
            }}
          >
            {Object.values(HealerChampionPoint).map((cp) => {
              const isSelected = healer.championPoint === cp;
              return (
                <Box
                  key={cp}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${cp} champion point for ${roleLabel}`}
                  onClick={() => onUpdateHealerCP(slotKey, healer.championPoint === cp ? null : cp)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onUpdateHealerCP(slotKey, healer.championPoint === cp ? null : cp);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 1.5,
                    py: 0.625,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    border: '1px solid',
                    bgcolor: isDarkMode
                      ? isSelected
                        ? `${color}18`
                        : 'rgba(255,255,255,0.03)'
                      : isSelected
                        ? `${color}15`
                        : 'rgba(15,23,42,0.03)',
                    borderColor: isDarkMode
                      ? isSelected
                        ? `${color}55`
                        : 'rgba(255,255,255,0.07)'
                      : isSelected
                        ? `${color}45`
                        : 'rgba(15,23,42,0.07)',
                    boxShadow: isSelected
                      ? isDarkMode
                        ? `0 0 14px ${color}45, 0 2px 8px rgba(0,0,0,0.2)`
                        : `0 0 10px ${color}35, 0 1px 4px rgba(0,0,0,0.06)`
                      : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      bgcolor: isDarkMode
                        ? isSelected
                          ? `${color}25`
                          : 'rgba(255,255,255,0.06)'
                        : isSelected
                          ? `${color}20`
                          : 'rgba(15,23,42,0.05)',
                      borderColor: isDarkMode
                        ? isSelected
                          ? `${color}70`
                          : 'rgba(255,255,255,0.13)'
                        : isSelected
                          ? `${color}60`
                          : 'rgba(15,23,42,0.11)',
                      boxShadow: isSelected
                        ? isDarkMode
                          ? `0 0 20px ${color}55, 0 4px 12px rgba(0,0,0,0.25)`
                          : `0 0 14px ${color}45, 0 3px 8px rgba(0,0,0,0.08)`
                        : isDarkMode
                          ? '0 4px 12px rgba(0,0,0,0.25)'
                          : '0 3px 8px rgba(15,23,42,0.08)',
                    },
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected
                        ? isDarkMode
                          ? 'rgba(255,255,255,0.9)'
                          : 'rgba(15,23,42,0.9)'
                        : isDarkMode
                          ? 'rgba(255,255,255,0.45)'
                          : 'rgba(15,23,42,0.4)',
                      transition: 'color 0.2s',
                      lineHeight: 1.2,
                    }}
                  >
                    {cp}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      );
    },
    [onUpdateHealerCP, isDarkMode],
  );

  // Helper functions to categorize sets by slot type
  const is5PieceSet = useCallback((setName: string): boolean => {
    const setId = findSetIdByName(setName);
    return setId !== undefined && RECOMMENDED_5PIECE_SETS.includes(setId);
  }, []);

  const is2PieceSet = useCallback((setName: string): boolean => {
    const setId = findSetIdByName(setName);
    return setId !== undefined && RECOMMENDED_2PIECE_SETS.includes(setId);
  }, []);

  const is1PieceSet = useCallback((setName: string): boolean => {
    const setId = findSetIdByName(setName);
    return setId !== undefined && RECOMMENDED_1PIECE_SETS.includes(setId);
  }, []);

  // Calculate which sets are assigned and to whom
  const setAssignments = useMemo(() => {
    const assignments = new Map<string, string[]>();

    // Helper to process tank gear sets
    const processTankSets = (tank: TankSetup, tankLabel: string): void => {
      addSetToAssignments(assignments, tank.gearSets.set1, `${tankLabel} (Set 1)`);
      addSetToAssignments(assignments, tank.gearSets.set2, `${tankLabel} (Set 2)`);
      addSetToAssignments(assignments, tank.gearSets.monsterSet, `${tankLabel} (Monster)`);
      tank.gearSets.additionalSets?.forEach((set) => {
        addSetToAssignments(assignments, set, `${tankLabel} (Additional)`);
      });
    };

    // Helper to process healer sets
    const processHealerSets = (healer: HealerSetup, healerLabel: string): void => {
      addSetToAssignments(assignments, healer.set1, `${healerLabel} (Set 1)`);
      addSetToAssignments(assignments, healer.set2, `${healerLabel} (Set 2)`);
      addSetToAssignments(assignments, healer.monsterSet, `${healerLabel} (Monster)`);
      healer.additionalSets?.forEach((set) => {
        addSetToAssignments(assignments, set, `${healerLabel} (Additional)`);
      });
    };

    // Process all roles
    tanks.forEach((tank, i) => processTankSets(tank, `Tank ${i + 1}`));
    healers.forEach((healer, i) => processHealerSets(healer, `Healer ${i + 1}`));

    return assignments;
  }, [tanks, healers, addSetToAssignments]);

  // Memoized recommended assignments
  const recommendedAssignments: SetAssignment[] = useMemo(() => {
    const assignments = Array.from(RECOMMENDED_SETS).map((setId) => {
      const setName = getSetDisplayName(setId);

      return {
        setName,
        assignedTo: setAssignments.get(setName) || [],
        isRecommended: true,
        category: SetCategory.RECOMMENDED,
      };
    });

    return assignments;
  }, [setAssignments]);

  const allSets = useMemo(() => {
    const sets: SetAssignment[] = [];
    const addedSetNames = new Set<string>();
    const recommendedSetIds = RECOMMENDED_SETS as readonly KnownSetIDs[];

    // Helper to add a set if not already added
    const addSet = (setName: string, category: SetCategory): void => {
      if (!addedSetNames.has(setName)) {
        addedSetNames.add(setName);
        sets.push({
          setName,
          assignedTo: setAssignments.get(setName) || [],
          isRecommended: false,
          category,
        });
      }
    };

    // Helper to process a set category
    const processSets = (
      setList: readonly KnownSetIDs[],
      category: SetCategory,
      requireFivePieceCheck: boolean = true,
    ): void => {
      setList.forEach((setId) => {
        const setName = getSetDisplayName(setId);
        const isRecommended = recommendedSetIds.includes(setId);
        const is5PieceCompatible = !requireFivePieceCheck || ALL_5PIECE_SETS.includes(setId);

        if (!isRecommended && is5PieceCompatible) {
          addSet(setName, category);
        }
      });
    };

    // Process all set categories
    processSets(TANK_SETS, SetCategory.TANK);
    processSets(HEALER_SETS, SetCategory.HEALER);
    processSets(FLEXIBLE_SETS, SetCategory.FLEXIBLE);
    processSets(MONSTER_SETS, SetCategory.MONSTER, false);

    return sets;
  }, [setAssignments]);

  // Helper to extract all gear set names from a setup
  const getTankGearSets = useCallback((tank: TankSetup): (string | undefined)[] => {
    return [
      tank.gearSets.set1 ? getSetDisplayName(tank.gearSets.set1) : undefined,
      tank.gearSets.set2 ? getSetDisplayName(tank.gearSets.set2) : undefined,
      tank.gearSets.monsterSet ? getSetDisplayName(tank.gearSets.monsterSet) : undefined,
      ...(tank.gearSets.additionalSets?.map((setId) => getSetDisplayName(setId)) || []),
    ];
  }, []);

  const getHealerGearSets = useCallback((healer: HealerSetup): (string | undefined)[] => {
    return [
      healer.set1 ? getSetDisplayName(healer.set1) : undefined,
      healer.set2 ? getSetDisplayName(healer.set2) : undefined,
      healer.monsterSet ? getSetDisplayName(healer.monsterSet) : undefined,
      ...(healer.additionalSets?.map((setId) => getSetDisplayName(setId)) || []),
    ];
  }, []);

  // Helper functions to filter assignments by role
  const filterByRole = useCallback(
    (assignment: SetAssignment, role: 'tank' | 'healer' | 'both'): boolean => {
      const setId = findSetIdByName(assignment.setName);
      return setId !== undefined && getSetRole(setId) === role;
    },
    [],
  );

  const is5PieceSetWithRole = useCallback(
    (assignment: SetAssignment, role: 'tank' | 'healer' | 'both'): boolean => {
      const is5Piece = is5PieceSet(assignment.setName);
      const hasRole = filterByRole(assignment, role);
      return is5Piece && hasRole;
    },
    [filterByRole, is5PieceSet],
  );

  const is2Or1PieceSetWithRole = useCallback(
    (assignment: SetAssignment, role: 'tank' | 'healer' | 'both'): boolean => {
      return (
        (is2PieceSet(assignment.setName) || is1PieceSet(assignment.setName)) &&
        filterByRole(assignment, role)
      );
    },
    [filterByRole, is1PieceSet, is2PieceSet],
  );

  // Calculate compatibility warnings for each role
  const tankWarnings = useMemo(
    () => tanks.map((tank) => validateCompatibility(getTankGearSets(tank), tank.ultimate)),
    [tanks, getTankGearSets],
  );
  const healerWarnings = useMemo(
    () =>
      healers.map((healer) => validateCompatibility(getHealerGearSets(healer), healer.ultimate)),
    [healers, getHealerGearSets],
  );

  const handleSetClick = useCallback(
    (setName: string, event: React.MouseEvent<HTMLDivElement>): void => {
      // Left-click: Open assignment menu
      setSelectedSetForAssign(setName);
      setAssignMenuAnchor(event.currentTarget);
    },
    [],
  );

  const handleClearSet = useCallback(
    (setName: string, event: React.MouseEvent<HTMLDivElement>): void => {
      event.preventDefault();

      // Find all roles that have this set and clear it
      const assignments = setAssignments.get(setName);

      if (assignments && assignments.length > 0) {
        // Clear from each assigned role
        // Assignment format: "Tank 1 (Set 1)", "Healer 2 (Monster)", etc.
        assignments.forEach((assignment) => {
          const roleMatch = assignment.match(/(Tank|Healer) (\d+) \((.*?)\)/);
          if (roleMatch) {
            const roleType = roleMatch[1].toLowerCase();
            const roleNum = parseInt(roleMatch[2], 10);
            const slotType = roleMatch[3]; // "Set 1", "Set 2", "Monster", "Additional"
            const slotKey = makeSlotKey(roleType as 'tank' | 'healer', roleNum - 1);

            // Determine which slot to clear (skip Additional sets as they're handled differently)
            if (slotType === 'Monster') {
              onAssignSet('', slotKey, 'monster');
            } else if (slotType === 'Set 1') {
              onAssignSet('', slotKey, 'set1');
            } else if (slotType === 'Set 2') {
              onAssignSet('', slotKey, 'set2');
            }
          }
        });
      }
    },
    [setAssignments, onAssignSet],
  );

  const handleAssignToRole = useCallback(
    (slotKey: SlotKey, slot: 'set1' | 'set2' | 'monster'): void => {
      if (!selectedSetForAssign) {
        return;
      }

      // Convert set name to ID for validation
      const setId = findSetIdByName(selectedSetForAssign);
      if (!setId) {
        // Invalid set - log and ignore
        logger.warn('Unknown set name:', selectedSetForAssign);
        setAssignMenuAnchor(null);
        setSelectedSetForAssign(null);
        return;
      }

      // Validate slot restrictions
      if (slot === 'monster') {
        // Monster slot can only accept monster sets (2-piece)
        if (!canAssignToMonsterSlot(setId)) {
          // Invalid assignment - log and ignore
          logger.warn('Cannot assign 5-piece set to monster slot:', selectedSetForAssign);
          setAssignMenuAnchor(null);
          setSelectedSetForAssign(null);
          return;
        }
      } else if (slot === 'set1' || slot === 'set2') {
        // Set1/Set2 slots can only accept 5-piece sets
        if (!canAssignToFivePieceSlot(setId)) {
          // Invalid assignment - log and ignore
          logger.warn(`Cannot assign monster/mythic set to ${slot} slot:`, selectedSetForAssign);
          setAssignMenuAnchor(null);
          setSelectedSetForAssign(null);
          return;
        }
      }

      onAssignSet(selectedSetForAssign, slotKey, slot);
      setAssignMenuAnchor(null);
      setSelectedSetForAssign(null);
    },
    [selectedSetForAssign, onAssignSet],
  );

  const handleCloseMenu = useCallback((): void => {
    setAssignMenuAnchor(null);
    setSelectedSetForAssign(null);
  }, []);

  // Memoize role badge configuration to avoid recreating on every render
  const getRoleBadgeConfig = useCallback(
    (role: 'tank' | 'healer' | 'both') => {
      if (role === 'tank') {
        return {
          icon: <ShieldIcon sx={{ fontSize: 16 }} />,
          label: 'Tank',
          color: roleColors.tank,
        };
      }
      if (role === 'healer') {
        return {
          icon: <FavoriteIcon sx={{ fontSize: 16 }} />,
          label: 'Healer',
          color: roleColors.healer,
        };
      }
      return {
        icon: <SwapHorizIcon sx={{ fontSize: 16 }} />,
        label: 'Both (Tank/Healer)',
        color: roleColors.dps,
      };
    },
    [roleColors],
  );

  const renderSetChip = useCallback(
    (assignment: SetAssignment, grow = false) => {
      const isAssigned = assignment.assignedTo.length > 0;
      const setId = findSetIdByName(assignment.setName);
      const role = setId ? getSetRole(setId) : 'both'; // Default to 'both' if set not found
      const roleBadge = getRoleBadgeConfig(role);

      return (
        <Tooltip
          key={assignment.setName}
          title={
            <Box>
              <Typography variant="caption" sx={{ display: 'block' }}>
                <strong>{assignment.setName}</strong> ({roleBadge.label})
              </Typography>
              {isAssigned && (
                <Typography variant="caption" sx={{ display: 'block' }}>
                  Assigned to: {assignment.assignedTo.join(', ')}
                </Typography>
              )}
              {!isAssigned && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Click to assign this set to a role
                </Typography>
              )}
            </Box>
          }
          disableInteractive
          enterDelay={500}
          leaveDelay={0}
        >
          <Chip
            label={
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  width: 'auto',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 16,
                    height: 16,
                    color: isAssigned
                      ? roleBadge.color
                      : isDarkMode
                        ? 'rgba(255,255,255,0.25)'
                        : 'rgba(15,23,42,0.2)',
                    flexShrink: 0,
                    transition: 'color 0.2s',
                  }}
                >
                  {roleBadge.icon}
                </Box>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: isAssigned ? 600 : 400,
                    color: isAssigned
                      ? isDarkMode
                        ? 'rgba(255,255,255,0.9)'
                        : 'rgba(15,23,42,0.9)'
                      : isDarkMode
                        ? 'rgba(255,255,255,0.45)'
                        : 'rgba(15,23,42,0.4)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.3,
                    transition: 'color 0.2s',
                  }}
                >
                  {assignment.setName}
                </Typography>
                <Box
                  component="a"
                  href={getEsoHubSetUrl(assignment.setName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  aria-label={`${assignment.setName} on ESO-Hub`}
                  title="View on ESO-Hub"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)',
                    lineHeight: 0,
                    flexShrink: 0,
                    '&:hover': {
                      color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.7)',
                    },
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 10 }} />
                </Box>
              </Box>
            }
            color="default"
            variant="outlined"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => handleSetClick(assignment.setName, e)}
            onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
              handleClearSet(assignment.setName, e)
            }
            sx={{
              m: 0.5,
              cursor: 'pointer',
              justifyContent: 'center',
              borderRadius: '8px',
              ...(grow && { flex: 1, height: 'auto', minHeight: 34 }),
              bgcolor: isDarkMode
                ? isAssigned
                  ? `${roleBadge.color}18`
                  : 'rgba(255,255,255,0.03)'
                : isAssigned
                  ? `${roleBadge.color}15`
                  : 'rgba(15,23,42,0.03)',
              borderColor: isDarkMode
                ? isAssigned
                  ? `${roleBadge.color}55`
                  : 'rgba(255,255,255,0.07)'
                : isAssigned
                  ? `${roleBadge.color}45`
                  : 'rgba(15,23,42,0.07)',
              boxShadow: isAssigned
                ? isDarkMode
                  ? `0 0 14px ${roleBadge.color}45, 0 2px 8px rgba(0,0,0,0.2)`
                  : `0 0 10px ${roleBadge.color}35, 0 1px 4px rgba(0,0,0,0.06)`
                : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '& .MuiChip-label': {
                px: 0.75,
                width: 'auto',
              },
              '&:hover': {
                transform: 'translateY(-1px)',
                bgcolor: isDarkMode
                  ? isAssigned
                    ? `${roleBadge.color}25`
                    : 'rgba(255,255,255,0.06)'
                  : isAssigned
                    ? `${roleBadge.color}20`
                    : 'rgba(15,23,42,0.05)',
                borderColor: isDarkMode
                  ? isAssigned
                    ? `${roleBadge.color}70`
                    : 'rgba(255,255,255,0.13)'
                  : isAssigned
                    ? `${roleBadge.color}60`
                    : 'rgba(15,23,42,0.11)',
                boxShadow: isAssigned
                  ? isDarkMode
                    ? `0 0 20px ${roleBadge.color}55, 0 4px 12px rgba(0,0,0,0.25)`
                    : `0 0 14px ${roleBadge.color}45, 0 3px 8px rgba(0,0,0,0.08)`
                  : isDarkMode
                    ? '0 4px 12px rgba(0,0,0,0.25)'
                    : '0 3px 8px rgba(15,23,42,0.08)',
              },
            }}
          />
        </Tooltip>
      );
    },
    [getRoleBadgeConfig, handleSetClick, handleClearSet, isDarkMode],
  );

  // Helper to render a single gear slot MenuItem for a tank
  const renderTankSlotMenuItem = useCallback(
    (tank: TankSetup, slotKey: SlotKey, slotType: 'set1' | 'set2' | 'monster', color: string) => {
      const slotLabels = { set1: 'Set 1', set2: 'Set 2', monster: 'Monster' } as const;
      const slotLabel = slotLabels[slotType];
      const slotValue = slotType === 'monster' ? tank.gearSets.monsterSet : tank.gearSets[slotType];

      return (
        <MenuItem
          key={slotType}
          dense
          onClick={() => handleAssignToRole(slotKey, slotType)}
          sx={{
            px: 1.5,
            py: 0.875,
            gap: 0.75,
            borderLeft: slotValue
              ? `3px solid ${color}`
              : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
            background: slotValue
              ? `linear-gradient(90deg, ${color}1a 0%, ${color}06 100%)`
              : 'transparent',
            transition: 'all 0.15s ease',
            '&:hover': {
              background: slotValue
                ? `linear-gradient(90deg, ${color}28 0%, ${color}10 100%)`
                : `${color}0f`,
              borderLeftColor: slotValue ? color : `${color}50`,
            },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: slotValue ? `${color}cc` : 'text.disabled',
                lineHeight: 1.2,
                mb: 0.25,
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {slotLabel}
            </Typography>
            <Typography
              variant="caption"
             
              sx={{ fontWeight: slotValue ? 600 : 400,
                display: 'block',
                color: slotValue ? 'text.primary' : 'text.disabled',
                fontStyle: slotValue ? 'normal' : 'italic',
                lineHeight: 1.3,
                fontSize: '0.8rem',
              }}
              noWrap
            >
              {slotValue ? getSetDisplayName(slotValue) : '\u2014 empty \u2014'}
            </Typography>
          </Box>
          {slotValue && (
            <Tooltip title="Clear slot">
              <IconButton
                size="small"
                aria-label="Clear slot"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onAssignSet('', slotKey, slotType);
                }}
                sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
              >
                <ClearIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
          )}
        </MenuItem>
      );
    },
    [handleAssignToRole, onAssignSet, isDarkMode],
  );

  // Helper to render a single gear slot MenuItem for a healer
  const renderHealerSlotMenuItem = useCallback(
    (
      healer: HealerSetup,
      slotKey: SlotKey,
      slotType: 'set1' | 'set2' | 'monster',
      color: string,
    ) => {
      const slotLabels = { set1: 'Set 1', set2: 'Set 2', monster: 'Monster' } as const;
      const slotLabel = slotLabels[slotType];
      const slotValue = slotType === 'monster' ? healer.monsterSet : healer[slotType];

      return (
        <MenuItem
          key={slotType}
          dense
          onClick={() => handleAssignToRole(slotKey, slotType)}
          sx={{
            px: 1.5,
            py: 0.875,
            gap: 0.75,
            borderLeft: slotValue
              ? `3px solid ${color}`
              : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
            background: slotValue
              ? `linear-gradient(90deg, ${color}1a 0%, ${color}06 100%)`
              : 'transparent',
            transition: 'all 0.15s ease',
            '&:hover': {
              background: slotValue
                ? `linear-gradient(90deg, ${color}28 0%, ${color}10 100%)`
                : `${color}0f`,
              borderLeftColor: slotValue ? color : `${color}50`,
            },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: slotValue ? `${color}cc` : 'text.disabled',
                lineHeight: 1.2,
                mb: 0.25,
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {slotLabel}
            </Typography>
            <Typography
              variant="caption"
             
              sx={{ fontWeight: slotValue ? 600 : 400,
                display: 'block',
                color: slotValue ? 'text.primary' : 'text.disabled',
                fontStyle: slotValue ? 'normal' : 'italic',
                lineHeight: 1.3,
                fontSize: '0.8rem',
              }}
              noWrap
            >
              {slotValue ? getSetDisplayName(slotValue) : '\u2014 empty \u2014'}
            </Typography>
          </Box>
          {slotValue && (
            <Tooltip title="Clear slot">
              <IconButton
                size="small"
                aria-label="Clear slot"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onAssignSet('', slotKey, slotType);
                }}
                sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
              >
                <ClearIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
          )}
        </MenuItem>
      );
    },
    [handleAssignToRole, onAssignSet, isDarkMode],
  );

  // Render all 3 gear slots for a single tank in the assignment menu
  const renderTankGearSlots = useCallback(
    (tank: TankSetup, index: number) => {
      const slotKey = makeSlotKey('tank', index);
      const label = index === 0 ? 'MT' : `OT${index > 1 ? index : ''}`;
      const isPrimary = index === 0;
      const color = roleColors.tank;

      return (
        <Box
          key={`tank-${index}`}
          sx={{
            borderRadius: '10px',
            overflow: 'hidden',
            border: isDarkMode
              ? `1px solid ${color}${isPrimary ? '28' : '18'}`
              : `1px solid ${color}${isPrimary ? '35' : '22'}`,
          }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 0.625,
              background: isPrimary
                ? `linear-gradient(90deg, ${color}2a 0%, ${color}0a 70%, transparent 100%)`
                : `linear-gradient(90deg, ${color}14 0%, transparent 70%)`,
              borderBottom: `1px solid ${color}${isPrimary ? '1e' : '12'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <ShieldIcon
              sx={{
                fontSize: '0.75rem',
                color: color,
                ...(isPrimary
                  ? { filter: isDarkMode ? `drop-shadow(0 0 4px ${color}80)` : 'none' }
                  : { opacity: 0.5 }),
              }}
            />
            <Typography
              variant="caption"
             
              sx={{ fontWeight: isPrimary ? 700 : 600,
                color: isPrimary ? color : `${color}80`,
                fontSize: '0.675rem',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                ...(isPrimary && {
                  textShadow: isDarkMode ? `0 0 10px ${color}50` : 'none',
                }),
              }}
            >
              {label} {'\u00B7'} Tank {index + 1}
            </Typography>
          </Box>
          {selectedSetId && canAssignToFivePieceSlot(selectedSetId) && (
            <>
              {renderTankSlotMenuItem(tank, slotKey, 'set1', color)}
              {renderTankSlotMenuItem(tank, slotKey, 'set2', color)}
            </>
          )}
          {selectedSetId &&
            canAssignToMonsterSlot(selectedSetId) &&
            renderTankSlotMenuItem(tank, slotKey, 'monster', color)}
        </Box>
      );
    },
    [roleColors, isDarkMode, selectedSetId, renderTankSlotMenuItem],
  );

  // Render all 3 gear slots for a single healer in the assignment menu
  const renderHealerGearSlots = useCallback(
    (healer: HealerSetup, index: number) => {
      const slotKey = makeSlotKey('healer', index);
      const label = `H${index + 1}`;
      const isPrimary = index === 0;
      const color = roleColors.healer;

      return (
        <Box
          key={`healer-${index}`}
          sx={{
            borderRadius: '10px',
            overflow: 'hidden',
            border: isDarkMode
              ? `1px solid ${color}${isPrimary ? '28' : '18'}`
              : `1px solid ${color}${isPrimary ? '35' : '22'}`,
          }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 0.625,
              background: isPrimary
                ? `linear-gradient(90deg, ${color}2a 0%, ${color}0a 70%, transparent 100%)`
                : `linear-gradient(90deg, ${color}14 0%, transparent 70%)`,
              borderBottom: `1px solid ${color}${isPrimary ? '1e' : '12'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <FavoriteIcon
              sx={{
                fontSize: '0.75rem',
                color: color,
                ...(isPrimary
                  ? { filter: isDarkMode ? `drop-shadow(0 0 4px ${color}80)` : 'none' }
                  : { opacity: 0.5 }),
              }}
            />
            <Typography
              variant="caption"
             
              sx={{ fontWeight: isPrimary ? 700 : 600,
                color: isPrimary ? color : `${color}80`,
                fontSize: '0.675rem',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                ...(isPrimary && {
                  textShadow: isDarkMode ? `0 0 10px ${color}50` : 'none',
                }),
              }}
            >
              {label} {'\u00B7'} Healer {index + 1}
            </Typography>
          </Box>
          {selectedSetId && canAssignToFivePieceSlot(selectedSetId) && (
            <>
              {renderHealerSlotMenuItem(healer, slotKey, 'set1', color)}
              {renderHealerSlotMenuItem(healer, slotKey, 'set2', color)}
            </>
          )}
          {selectedSetId &&
            canAssignToMonsterSlot(selectedSetId) &&
            renderHealerSlotMenuItem(healer, slotKey, 'monster', color)}
        </Box>
      );
    },
    [roleColors, isDarkMode, selectedSetId, renderHealerSlotMenuItem],
  );

  return (
    <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
      {/* Header + Segmented Tabs */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1.5, sm: 0 },
          mb: 2.5,
        }}
      >
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                : 'linear-gradient(135deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.02) 100%)',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <SwapHorizIcon
              sx={{
                fontSize: '1rem',
                color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
              }}
            />
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                lineHeight: 1,
                mb: 0.375,
              }}
            >
              Roster
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '1.05rem',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                background: isDarkMode
                  ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Set Assignments
            </Typography>
          </Box>
        </Box>

        {/* Segmented Pill Tabs */}
        <Box
          sx={{
            display: 'flex',
            borderRadius: '10px',
            padding: '3px',
            minWidth: { xs: 'auto', sm: 200 },
            background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {(['Quick Assign', 'All Sets'] as const).map((label, index) => (
            <Box
              key={label}
              onClick={() => handleTabChange(index)}
              sx={{
                flex: '1 1 auto',
                minWidth: 0,
                textAlign: 'center',
                px: 1.75,
                py: 0.625,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: activeTab === index ? 600 : 500,
                letterSpacing: '0.01em',
                color:
                  activeTab === index
                    ? isDarkMode
                      ? '#f1f5f9'
                      : '#0f172a'
                    : isDarkMode
                      ? 'rgba(255,255,255,0.45)'
                      : 'rgba(0,0,0,0.45)',
                background:
                  activeTab === index
                    ? isDarkMode
                      ? 'rgba(255,255,255,0.09)'
                      : 'rgba(255,255,255,0.85)'
                    : 'transparent',
                boxShadow:
                  activeTab === index
                    ? isDarkMode
                      ? '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)'
                      : '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'
                    : 'none',
                transition: 'all 0.15s ease',
                userSelect: 'none',
                '&:hover': {
                  color:
                    activeTab === index
                      ? undefined
                      : isDarkMode
                        ? 'rgba(255,255,255,0.7)'
                        : 'rgba(0,0,0,0.7)',
                  background:
                    activeTab === index
                      ? undefined
                      : isDarkMode
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(0,0,0,0.03)',
                },
              }}
            >
              {label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Tab Panel 0: Quick Assignment (Recommended Sets) */}
      {activeTab === 0 && (
        <Box>
          {/* Recommended Sets - Always Visible */}
          <Box sx={{ mb: 2 }}>
            {/* 5-Piece Sets Section - Three Columns by Role */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: { xs: 1.5, sm: 2 },
                }}
              >
                {/* Tank Column */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '10px',
                    bgcolor: isDarkMode ? `${roleColors.tank}0a` : `${roleColors.tank}06`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1.5,
                      pb: 1,
                      borderBottom: `1px solid ${roleColors.tank}30`,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 0.875,
                        py: 0.4,
                        borderRadius: '6px',
                        bgcolor: `${roleColors.tank}18`,
                        border: `1px solid ${roleColors.tank}35`,
                      }}
                    >
                      <ShieldIcon sx={{ fontSize: 11, color: roleColors.tank }} />
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          fontFamily: '"Space Grotesk", sans-serif',
                          color: roleColors.tank,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          lineHeight: 1,
                        }}
                      >
                        Tank
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                    {recommendedAssignments
                      .filter((a) => is5PieceSetWithRole(a, 'tank'))
                      .map((a) => renderSetChip(a, true))}
                  </Box>
                </Box>

                {/* Both/Flexible Column */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '10px',
                    bgcolor: isDarkMode ? `${roleColors.dps}0a` : `${roleColors.dps}06`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1.5,
                      pb: 1,
                      borderBottom: `1px solid ${roleColors.dps}30`,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 0.875,
                        py: 0.4,
                        borderRadius: '6px',
                        bgcolor: `${roleColors.dps}18`,
                        border: `1px solid ${roleColors.dps}35`,
                      }}
                    >
                      <SwapHorizIcon sx={{ fontSize: 11, color: roleColors.dps }} />
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          fontFamily: '"Space Grotesk", sans-serif',
                          color: roleColors.dps,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          lineHeight: 1,
                        }}
                      >
                        Flexible
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                    {recommendedAssignments
                      .filter((a) => is5PieceSetWithRole(a, 'both'))
                      .map((a) => renderSetChip(a, true))}
                  </Box>
                </Box>

                {/* Healer Column */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '10px',
                    bgcolor: isDarkMode ? `${roleColors.healer}0a` : `${roleColors.healer}06`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1.5,
                      pb: 1,
                      borderBottom: `1px solid ${roleColors.healer}30`,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 0.875,
                        py: 0.4,
                        borderRadius: '6px',
                        bgcolor: `${roleColors.healer}18`,
                        border: `1px solid ${roleColors.healer}35`,
                      }}
                    >
                      <FavoriteIcon sx={{ fontSize: 11, color: roleColors.healer }} />
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          fontFamily: '"Space Grotesk", sans-serif',
                          color: roleColors.healer,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          lineHeight: 1,
                        }}
                      >
                        Healer
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                    {recommendedAssignments
                      .filter((a) => is5PieceSetWithRole(a, 'healer'))
                      .map((a) => renderSetChip(a, true))}
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* 2-Piece Monster Sets & 1-Piece Mythic Sets Section - Three Columns by Role */}
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                  }}
                />
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '20px',
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)'}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      fontFamily: '"Space Grotesk", sans-serif',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Monster &amp; Mythic
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 18,
                      height: 16,
                      px: 0.5,
                      borderRadius: '4px',
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: 'text.secondary',
                      lineHeight: 1,
                    }}
                  >
                    {RECOMMENDED_2PIECE_SETS.length + RECOMMENDED_1PIECE_SETS.length}
                  </Box>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: { xs: 1.5, sm: 2 },
                }}
              >
                {/* Tank Column */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '10px',
                    bgcolor: isDarkMode ? `${roleColors.tank}0a` : `${roleColors.tank}06`,
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                    {recommendedAssignments
                      .filter((a) => is2Or1PieceSetWithRole(a, 'tank'))
                      .map((a) => renderSetChip(a, true))}
                  </Box>
                </Box>

                {/* Both/Flexible Column */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '10px',
                    bgcolor: isDarkMode ? `${roleColors.dps}0a` : `${roleColors.dps}06`,
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                    {recommendedAssignments
                      .filter((a) => is2Or1PieceSetWithRole(a, 'both'))
                      .map((a) => renderSetChip(a, true))}
                  </Box>
                </Box>

                {/* Healer Column */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '10px',
                    bgcolor: isDarkMode ? `${roleColors.healer}0a` : `${roleColors.healer}06`,
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                    {recommendedAssignments
                      .filter((a) => is2Or1PieceSetWithRole(a, 'healer'))
                      .map((a) => renderSetChip(a, true))}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Compatibility Warnings */}
          {(tankWarnings.some((w) => w.length > 0) || healerWarnings.some((w) => w.length > 0)) && (
            <Box sx={{ mt: 2 }}>
              <Stack spacing={1}>
                {tankWarnings.map((warnings, i) =>
                  warnings.map((warning, j) => (
                    <Alert key={`tank-${i}-${j}`} severity="warning" sx={{ py: 0.5 }}>
                      Tank {i + 1}: {warning}
                    </Alert>
                  )),
                )}
                {healerWarnings.map((warnings, i) =>
                  warnings.map((warning, j) => (
                    <Alert key={`healer-${i}-${j}`} severity="warning" sx={{ py: 0.5 }}>
                      Healer {i + 1}: {warning}
                    </Alert>
                  )),
                )}
              </Stack>
            </Box>
          )}

          {/* Ultimate Quick Selector */}
          {onUpdateUltimate && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                {/* Tank Ultimates */}
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1,
                      pb: 0.75,
                      borderBottom: `1px solid ${roleColors.tank}30`,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 0.875,
                        py: 0.4,
                        borderRadius: '6px',
                        bgcolor: `${roleColors.tank}18`,
                        border: `1px solid ${roleColors.tank}35`,
                      }}
                    >
                      <ShieldIcon sx={{ fontSize: 11, color: roleColors.tank }} />
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          fontFamily: '"Space Grotesk", sans-serif',
                          color: roleColors.tank,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          lineHeight: 1,
                        }}
                      >
                        Tank Ultimates
                      </Typography>
                    </Box>
                  </Box>
                  <Stack spacing={0.75} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
                    {tanks.map((tank, i) =>
                      renderRoleUltimateSelector(
                        makeSlotKey('tank', i),
                        tank,
                        i === 0 ? 'MT' : `OT${i > 1 ? i : ''}`,
                        roleColors.tank,
                      ),
                    )}
                  </Stack>
                </Box>

                {/* Healer Ultimates */}
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1,
                      pb: 0.75,
                      borderBottom: `1px solid ${roleColors.healer}30`,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 0.875,
                        py: 0.4,
                        borderRadius: '6px',
                        bgcolor: `${roleColors.healer}18`,
                        border: `1px solid ${roleColors.healer}35`,
                      }}
                    >
                      <FavoriteIcon sx={{ fontSize: 11, color: roleColors.healer }} />
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          fontFamily: '"Space Grotesk", sans-serif',
                          color: roleColors.healer,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          lineHeight: 1,
                        }}
                      >
                        Healer Ultimates
                      </Typography>
                    </Box>
                  </Box>
                  <Stack spacing={0.75} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
                    {healers.map((healer, i) =>
                      renderRoleUltimateSelector(
                        makeSlotKey('healer', i),
                        healer,
                        `H${i + 1}`,
                        roleColors.healer,
                      ),
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          )}

          {/* Healer Champion Points Quick Selector */}
          {onUpdateHealerCP && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 1.5,
                  pb: 0.75,
                  borderBottom: `1px solid ${roleColors.healer}30`,
                }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 0.875,
                    py: 0.4,
                    borderRadius: '6px',
                    bgcolor: `${roleColors.healer}18`,
                    border: `1px solid ${roleColors.healer}35`,
                  }}
                >
                  <FavoriteIcon sx={{ fontSize: 11, color: roleColors.healer }} />
                  <Typography
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      fontFamily: '"Space Grotesk", sans-serif',
                      color: roleColors.healer,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      lineHeight: 1,
                    }}
                  >
                    Champion Points
                  </Typography>
                </Box>
              </Box>
              <Stack spacing={0.75} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
                {healers.map((healer, i) =>
                  renderCPSelector(
                    makeSlotKey('healer', i),
                    healer,
                    `H${i + 1}`,
                    roleColors.healer,
                  ),
                )}
              </Stack>
            </Box>
          )}

          {/* Quick Stats */}
          <Box
            sx={{
              mt: 3,
              pt: 2,
              borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}`,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.875,
                px: 1.5,
                py: 0.75,
                borderRadius: '10px',
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)'}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  color: 'text.secondary',
                  fontFamily: '"Space Grotesk", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                }}
              >
                Sets Assigned
              </Typography>
              <Box
                sx={{
                  minWidth: 22,
                  height: 20,
                  px: 0.75,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor:
                    setAssignments.size > 0
                      ? isDarkMode
                        ? 'rgba(56,189,248,0.18)'
                        : 'rgba(8,145,178,0.12)'
                      : isDarkMode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(15,23,42,0.06)',
                  border:
                    setAssignments.size > 0
                      ? `1px solid ${isDarkMode ? 'rgba(56,189,248,0.4)' : 'rgba(8,145,178,0.3)'}`
                      : 'none',
                  boxShadow:
                    setAssignments.size > 0
                      ? isDarkMode
                        ? '0 0 8px rgba(56,189,248,0.3)'
                        : '0 0 6px rgba(8,145,178,0.2)'
                      : 'none',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color:
                      setAssignments.size > 0
                        ? isDarkMode
                          ? '#38bdf8'
                          : '#0891b2'
                        : 'text.secondary',
                    lineHeight: 1,
                  }}
                >
                  {setAssignments.size}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Tab Panel 1: All Sets (Advanced) */}
      {activeTab === 1 && (
        <Box>
          {/* Role Filter Buttons */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Filter by Role:
            </Typography>
            <ButtonGroup size="small" variant="outlined">
              <Button
                variant={roleFilter === 'all' ? 'contained' : 'outlined'}
                onClick={() => setRoleFilter('all')}
              >
                All Sets
              </Button>
              <Button
                variant={roleFilter === 'tank' ? 'contained' : 'outlined'}
                onClick={() => setRoleFilter('tank')}
                sx={{ color: roleFilter === 'tank' ? 'white' : roleColors.tank }}
              >
                Tank Sets
              </Button>
              <Button
                variant={roleFilter === 'healer' ? 'contained' : 'outlined'}
                onClick={() => setRoleFilter('healer')}
                sx={{ color: roleFilter === 'healer' ? 'white' : roleColors.healer }}
              >
                Healer Sets
              </Button>
            </ButtonGroup>
          </Box>

          {/* Legend */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'action.hover' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
              Legend:
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ShieldIcon sx={{ fontSize: 14, color: roleColors.tank }} />
                <Typography variant="caption">Tank-specific set</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FavoriteIcon sx={{ fontSize: 14, color: roleColors.healer }} />
                <Typography variant="caption">Healer-specific set</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SwapHorizIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption">Flexible (Tank/Healer)</Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Filtered Sets */}
          {(roleFilter === 'all' || roleFilter === 'tank') && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Tank Sets
              </Typography>
              <Box>
                {allSets
                  .filter((s) => s.category === SetCategory.TANK)
                  .map((a) => renderSetChip(a))}
              </Box>
            </Box>
          )}

          {(roleFilter === 'all' || roleFilter === 'healer') && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Healer Sets
              </Typography>
              <Box>
                {allSets
                  .filter((s) => s.category === SetCategory.HEALER)
                  .map((a) => renderSetChip(a))}
              </Box>
            </Box>
          )}

          {roleFilter === 'all' && (
            <>
              {/* Flexible Sets */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Flexible (Tank/Healer)
                </Typography>
                <Box>
                  {allSets
                    .filter((s) => s.category === SetCategory.FLEXIBLE)
                    .map((a) => renderSetChip(a))}
                </Box>
              </Box>

              {/* Monster Sets */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Monster Sets
                </Typography>
                <Box>
                  {allSets
                    .filter((s) => s.category === SetCategory.MONSTER)
                    .map((a) => renderSetChip(a))}
                </Box>
              </Box>
            </>
          )}

          {/* Quick Stats */}
          <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Stack direction="row" spacing={3} sx={{ justifyContent: 'center' }}>
              <Typography variant="caption">
                <strong>Total Sets Assigned:</strong> {setAssignments.size}
              </Typography>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Assignment Menu */}
      <Menu
        anchorEl={assignMenuAnchor}
        open={Boolean(assignMenuAnchor)}
        onClose={handleCloseMenu}
        slotProps={{
          paper: {
            sx: {
              maxHeight: 560,
              minWidth: { xs: 'calc(100vw - 32px)', sm: 500 },
              borderRadius: '14px',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.10)'
                : '1px solid rgba(0,0,0,0.10)',
              backdropFilter: isDarkMode ? 'blur(24px) saturate(180%)' : undefined,
              background: isDarkMode ? 'rgba(14,18,27,0.96)' : 'rgba(255,255,255,0.98)',
              boxShadow: isDarkMode
                ? '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
              : 'linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.01) 100%)',
            borderBottom: isDarkMode
              ? '1px solid rgba(255,255,255,0.07)'
              : '1px solid rgba(0,0,0,0.07)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              display: 'block',
              lineHeight: 1,
              mb: 0.625,
              fontSize: '0.625rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Quick assign
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            {selectedSetForAssign}
          </Typography>
        </Box>

        {/* Two-column body */}
        <Box
          sx={{
            px: { xs: 1, sm: 1.5 },
            pt: 1.25,
            pb: 1.25,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
          }}
        >
          {/* Left Column - Tanks */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {tanks.map((tank, i) => (
              <React.Fragment key={`tank-${i}`}>{renderTankGearSlots(tank, i)}</React.Fragment>
            ))}
          </Box>

          {/* Right Column - Healers */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {healers.map((healer, i) => (
              <React.Fragment key={`healer-${i}`}>
                {renderHealerGearSlots(healer, i)}
              </React.Fragment>
            ))}
          </Box>
        </Box>
      </Menu>
    </Paper>
  );
};
