/**
 * Set Assignment Manager Component
 * Provides a unified interface for assigning support sets to tanks and healers
 * with visual tracking of which sets are assigned and to whom
 */

import {
  Shield as ShieldIcon,
  Favorite as FavoriteIcon,
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
  SetCategory,
  TankSetup,
  HealerSetup,
  SupportUltimate,
  HealerChampionPoint,
  canAssignToFivePieceSlot,
  canAssignToMonsterSlot,
  validateCompatibility,
} from '../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';
import { getSetDisplayName, findSetIdByName } from '../utils/setNameUtils';

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
  tank1: TankSetup;
  tank2: TankSetup;
  healer1: HealerSetup;
  healer2: HealerSetup;
  onAssignSet: (
    setName: string,
    role: 'tank1' | 'tank2' | 'healer1' | 'healer2',
    slot: 'set1' | 'set2' | 'monster',
  ) => void;
  onUpdateUltimate?: (
    role: 'tank1' | 'tank2' | 'healer1' | 'healer2',
    ultimate: string | null,
  ) => void;
  onUpdateHealerCP?: (
    role: 'healer1' | 'healer2',
    championPoint: HealerChampionPoint | null,
  ) => void;
}

export const SetAssignmentManager: React.FC<SetAssignmentManagerProps> = ({
  tank1,
  tank2,
  healer1,
  healer2,
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
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
      role: 'tank1' | 'tank2' | 'healer1' | 'healer2',
      roleData: { ultimate: SupportUltimate | string | null },
      roleLabel: string,
      color: string,
    ) => {
      if (!onUpdateUltimate) return null;

      const isPrimary = roleLabel === 'MT' || roleLabel === 'H1';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
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
                  onClick={() => onUpdateUltimate(role, roleData.ultimate === ult ? null : ult)}
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
    (role: 'healer1' | 'healer2', healer: HealerSetup, roleLabel: string, color: string) => {
      if (!onUpdateHealerCP) return null;

      const isPrimary = roleLabel === 'H1';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
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
                  onClick={() => onUpdateHealerCP(role, healer.championPoint === cp ? null : cp)}
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
    processTankSets(tank1, 'Tank 1');
    processTankSets(tank2, 'Tank 2');
    processHealerSets(healer1, 'Healer 1');
    processHealerSets(healer2, 'Healer 2');

    return assignments;
  }, [tank1, tank2, healer1, healer2, addSetToAssignments]);

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
        const is5PieceCompatible = !requireFivePieceCheck || canAssignToFivePieceSlot(setId);

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
  const tank1Warnings = useMemo(
    () => validateCompatibility(getTankGearSets(tank1), tank1.ultimate),
    [tank1, getTankGearSets],
  );

  const tank2Warnings = useMemo(
    () => validateCompatibility(getTankGearSets(tank2), tank2.ultimate),
    [tank2, getTankGearSets],
  );

  const healer1Warnings = useMemo(
    () => validateCompatibility(getHealerGearSets(healer1), healer1.ultimate),
    [healer1, getHealerGearSets],
  );

  const healer2Warnings = useMemo(
    () => validateCompatibility(getHealerGearSets(healer2), healer2.ultimate),
    [healer2, getHealerGearSets],
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
            const roleNum = roleMatch[2];
            const slotType = roleMatch[3]; // "Set 1", "Set 2", "Monster", "Additional"
            const role = `${roleType}${roleNum}` as 'tank1' | 'tank2' | 'healer1' | 'healer2';

            // Determine which slot to clear (skip Additional sets as they're handled differently)
            if (slotType === 'Monster') {
              onAssignSet('', role, 'monster');
            } else if (slotType === 'Set 1') {
              onAssignSet('', role, 'set1');
            } else if (slotType === 'Set 2') {
              onAssignSet('', role, 'set2');
            }
          }
        });
      }
    },
    [setAssignments, onAssignSet],
  );

  const handleAssignToRole = useCallback(
    (role: 'tank1' | 'tank2' | 'healer1' | 'healer2', slot: 'set1' | 'set2' | 'monster'): void => {
      if (!selectedSetForAssign) {
        return;
      }

      // Convert set name to ID for validation
      const setId = findSetIdByName(selectedSetForAssign);
      if (!setId) {
        // Invalid set - silently ignore
        setAssignMenuAnchor(null);
        setSelectedSetForAssign(null);
        return;
      }

      // Validate slot restrictions
      if (slot === 'monster') {
        // Monster slot can only accept monster sets (2-piece)
        if (!canAssignToMonsterSlot(setId)) {
          // Invalid assignment - silently ignore
          setAssignMenuAnchor(null);
          setSelectedSetForAssign(null);
          return;
        }
      } else if (slot === 'set1' || slot === 'set2') {
        // Set1/Set2 slots can only accept 5-piece sets
        if (!canAssignToFivePieceSlot(setId)) {
          // Invalid assignment - silently ignore
          setAssignMenuAnchor(null);
          setSelectedSetForAssign(null);
          return;
        }
      }

      onAssignSet(selectedSetForAssign, role, slot);
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
              <Typography variant="caption" display="block">
                <strong>{assignment.setName}</strong> ({roleBadge.label})
              </Typography>
              {isAssigned && (
                <Typography variant="caption" display="block">
                  Assigned to: {assignment.assignedTo.join(', ')}
                </Typography>
              )}
              {!isAssigned && (
                <Typography variant="caption" display="block" color="text.secondary">
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
              onClick={() => handleTabChange(null as unknown as React.SyntheticEvent, index)}
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
          {(tank1Warnings.length > 0 ||
            tank2Warnings.length > 0 ||
            healer1Warnings.length > 0 ||
            healer2Warnings.length > 0) && (
            <Box sx={{ mt: 2 }}>
              <Stack spacing={1}>
                {tank1Warnings.map((warning, index) => (
                  <Alert key={`tank1-${index}`} severity="warning" sx={{ py: 0.5 }}>
                    🛡️ Tank 1: {warning}
                  </Alert>
                ))}
                {tank2Warnings.map((warning, index) => (
                  <Alert key={`tank2-${index}`} severity="warning" sx={{ py: 0.5 }}>
                    🛡️ Tank 2: {warning}
                  </Alert>
                ))}
                {healer1Warnings.map((warning, index) => (
                  <Alert key={`healer1-${index}`} severity="warning" sx={{ py: 0.5 }}>
                    ❤️ Healer 1: {warning}
                  </Alert>
                ))}
                {healer2Warnings.map((warning, index) => (
                  <Alert key={`healer2-${index}`} severity="warning" sx={{ py: 0.5 }}>
                    ❤️ Healer 2: {warning}
                  </Alert>
                ))}
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
                    {renderRoleUltimateSelector('tank1', tank1, 'MT', roleColors.tank)}
                    {renderRoleUltimateSelector('tank2', tank2, 'OT', roleColors.tank)}
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
                    {renderRoleUltimateSelector('healer1', healer1, 'H1', roleColors.healer)}
                    {renderRoleUltimateSelector('healer2', healer2, 'H2', roleColors.healer)}
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
                {renderCPSelector('healer1', healer1, 'H1', roleColors.healer)}
                {renderCPSelector('healer2', healer2, 'H2', roleColors.healer)}
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
            <Typography variant="body2" fontWeight="bold">
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
                🛡️ Tank Sets
              </Button>
              <Button
                variant={roleFilter === 'healer' ? 'contained' : 'outlined'}
                onClick={() => setRoleFilter('healer')}
                sx={{ color: roleFilter === 'healer' ? 'white' : roleColors.healer }}
              >
                ❤️ Healer Sets
              </Button>
            </ButtonGroup>
          </Box>

          {/* Legend */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'action.hover' }}>
            <Typography variant="caption" fontWeight="bold" sx={{ display: 'block', mb: 0.5 }}>
              Legend:
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
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
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
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
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
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
                <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
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
                <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
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
            <Stack direction="row" spacing={3} justifyContent="center">
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
          <Typography variant="body2" fontWeight={700} noWrap sx={{ letterSpacing: '-0.01em' }}>
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
            {/* MT / Tank 1 card */}
            <Box
              sx={{
                borderRadius: '10px',
                overflow: 'hidden',
                border: isDarkMode
                  ? `1px solid ${roleColors.tank}28`
                  : `1px solid ${roleColors.tank}35`,
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.625,
                  background: `linear-gradient(90deg, ${roleColors.tank}2a 0%, ${roleColors.tank}0a 70%, transparent 100%)`,
                  borderBottom: `1px solid ${roleColors.tank}1e`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <ShieldIcon
                  sx={{
                    fontSize: '0.75rem',
                    color: roleColors.tank,
                    filter: isDarkMode ? `drop-shadow(0 0 4px ${roleColors.tank}80)` : 'none',
                  }}
                />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{
                    color: roleColors.tank,
                    fontSize: '0.675rem',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    textShadow: isDarkMode ? `0 0 10px ${roleColors.tank}50` : 'none',
                  }}
                >
                  MT · Tank 1
                </Typography>
              </Box>
              {selectedSetId && canAssignToFivePieceSlot(selectedSetId) && (
                <>
                  <MenuItem
                    dense
                    onClick={() => handleAssignToRole('tank1', 'set1')}
                    sx={{
                      px: 1.5,
                      py: 0.875,
                      gap: 0.75,
                      borderLeft: tank1.gearSets.set1
                        ? `3px solid ${roleColors.tank}`
                        : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                      background: tank1.gearSets.set1
                        ? `linear-gradient(90deg, ${roleColors.tank}1a 0%, ${roleColors.tank}06 100%)`
                        : 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        background: tank1.gearSets.set1
                          ? `linear-gradient(90deg, ${roleColors.tank}28 0%, ${roleColors.tank}10 100%)`
                          : `${roleColors.tank}0f`,
                        borderLeftColor: tank1.gearSets.set1
                          ? roleColors.tank
                          : `${roleColors.tank}50`,
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: tank1.gearSets.set1 ? `${roleColors.tank}cc` : 'text.disabled',
                          lineHeight: 1.2,
                          mb: 0.25,
                          fontSize: '0.6rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Set 1
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={tank1.gearSets.set1 ? 600 : 400}
                        sx={{
                          display: 'block',
                          color: tank1.gearSets.set1 ? 'text.primary' : 'text.disabled',
                          fontStyle: tank1.gearSets.set1 ? 'normal' : 'italic',
                          lineHeight: 1.3,
                          fontSize: '0.8rem',
                        }}
                        noWrap
                      >
                        {tank1.gearSets.set1 ? getSetDisplayName(tank1.gearSets.set1) : '— empty —'}
                      </Typography>
                    </Box>
                    {tank1.gearSets.set1 && (
                      <Tooltip title="Clear slot">
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onAssignSet('', 'tank1', 'set1');
                          }}
                          sx={{
                            p: 0.25,
                            color: 'text.disabled',
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </MenuItem>
                  <MenuItem
                    dense
                    onClick={() => handleAssignToRole('tank1', 'set2')}
                    sx={{
                      px: 1.5,
                      py: 0.875,
                      gap: 0.75,
                      borderLeft: tank1.gearSets.set2
                        ? `3px solid ${roleColors.tank}`
                        : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                      background: tank1.gearSets.set2
                        ? `linear-gradient(90deg, ${roleColors.tank}1a 0%, ${roleColors.tank}06 100%)`
                        : 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        background: tank1.gearSets.set2
                          ? `linear-gradient(90deg, ${roleColors.tank}28 0%, ${roleColors.tank}10 100%)`
                          : `${roleColors.tank}0f`,
                        borderLeftColor: tank1.gearSets.set2
                          ? roleColors.tank
                          : `${roleColors.tank}50`,
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: tank1.gearSets.set2 ? `${roleColors.tank}cc` : 'text.disabled',
                          lineHeight: 1.2,
                          mb: 0.25,
                          fontSize: '0.6rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Set 2
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={tank1.gearSets.set2 ? 600 : 400}
                        sx={{
                          display: 'block',
                          color: tank1.gearSets.set2 ? 'text.primary' : 'text.disabled',
                          fontStyle: tank1.gearSets.set2 ? 'normal' : 'italic',
                          lineHeight: 1.3,
                          fontSize: '0.8rem',
                        }}
                        noWrap
                      >
                        {tank1.gearSets.set2 ? getSetDisplayName(tank1.gearSets.set2) : '— empty —'}
                      </Typography>
                    </Box>
                    {tank1.gearSets.set2 && (
                      <Tooltip title="Clear slot">
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onAssignSet('', 'tank1', 'set2');
                          }}
                          sx={{
                            p: 0.25,
                            color: 'text.disabled',
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </MenuItem>
                </>
              )}
              {selectedSetId && canAssignToMonsterSlot(selectedSetId) && (
                <MenuItem
                  dense
                  onClick={() => handleAssignToRole('tank1', 'monster')}
                  sx={{
                    px: 1.5,
                    py: 0.875,
                    gap: 0.75,
                    borderLeft: tank1.gearSets.monsterSet
                      ? `3px solid ${roleColors.tank}`
                      : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                    background: tank1.gearSets.monsterSet
                      ? `linear-gradient(90deg, ${roleColors.tank}1a 0%, ${roleColors.tank}06 100%)`
                      : 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      background: tank1.gearSets.monsterSet
                        ? `linear-gradient(90deg, ${roleColors.tank}28 0%, ${roleColors.tank}10 100%)`
                        : `${roleColors.tank}0f`,
                      borderLeftColor: tank1.gearSets.monsterSet
                        ? roleColors.tank
                        : `${roleColors.tank}50`,
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: tank1.gearSets.monsterSet ? `${roleColors.tank}cc` : 'text.disabled',
                        lineHeight: 1.2,
                        mb: 0.25,
                        fontSize: '0.6rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      Monster
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={tank1.gearSets.monsterSet ? 600 : 400}
                      sx={{
                        display: 'block',
                        color: tank1.gearSets.monsterSet ? 'text.primary' : 'text.disabled',
                        fontStyle: tank1.gearSets.monsterSet ? 'normal' : 'italic',
                        lineHeight: 1.3,
                        fontSize: '0.8rem',
                      }}
                      noWrap
                    >
                      {tank1.gearSets.monsterSet
                        ? getSetDisplayName(tank1.gearSets.monsterSet)
                        : '— empty —'}
                    </Typography>
                  </Box>
                  {tank1.gearSets.monsterSet && (
                    <Tooltip title="Clear slot">
                      <IconButton
                        size="small"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          onAssignSet('', 'tank1', 'monster');
                        }}
                        sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                      >
                        <ClearIcon sx={{ fontSize: '0.875rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </MenuItem>
              )}
            </Box>

            {/* OT / Tank 2 card — muted */}
            <Box
              sx={{
                borderRadius: '10px',
                overflow: 'hidden',
                border: isDarkMode
                  ? `1px solid ${roleColors.tank}18`
                  : `1px solid ${roleColors.tank}22`,
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.625,
                  background: `linear-gradient(90deg, ${roleColors.tank}14 0%, transparent 70%)`,
                  borderBottom: `1px solid ${roleColors.tank}12`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <ShieldIcon sx={{ fontSize: '0.75rem', color: roleColors.tank, opacity: 0.5 }} />
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{
                    color: `${roleColors.tank}80`,
                    fontSize: '0.675rem',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}
                >
                  OT · Tank 2
                </Typography>
              </Box>
              {selectedSetId && canAssignToFivePieceSlot(selectedSetId) && (
                <>
                  <MenuItem
                    dense
                    onClick={() => handleAssignToRole('tank2', 'set1')}
                    sx={{
                      px: 1.5,
                      py: 0.875,
                      gap: 0.75,
                      borderLeft: tank2.gearSets.set1
                        ? `3px solid ${roleColors.tank}`
                        : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                      background: tank2.gearSets.set1
                        ? `linear-gradient(90deg, ${roleColors.tank}1a 0%, ${roleColors.tank}06 100%)`
                        : 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        background: tank2.gearSets.set1
                          ? `linear-gradient(90deg, ${roleColors.tank}28 0%, ${roleColors.tank}10 100%)`
                          : `${roleColors.tank}0f`,
                        borderLeftColor: tank2.gearSets.set1
                          ? roleColors.tank
                          : `${roleColors.tank}50`,
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: tank2.gearSets.set1 ? `${roleColors.tank}cc` : 'text.disabled',
                          lineHeight: 1.2,
                          mb: 0.25,
                          fontSize: '0.6rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Set 1
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={tank2.gearSets.set1 ? 600 : 400}
                        sx={{
                          display: 'block',
                          color: tank2.gearSets.set1 ? 'text.primary' : 'text.disabled',
                          fontStyle: tank2.gearSets.set1 ? 'normal' : 'italic',
                          lineHeight: 1.3,
                          fontSize: '0.8rem',
                        }}
                        noWrap
                      >
                        {tank2.gearSets.set1 ? getSetDisplayName(tank2.gearSets.set1) : '— empty —'}
                      </Typography>
                    </Box>
                    {tank2.gearSets.set1 && (
                      <Tooltip title="Clear slot">
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onAssignSet('', 'tank2', 'set1');
                          }}
                          sx={{
                            p: 0.25,
                            color: 'text.disabled',
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </MenuItem>
                  <MenuItem
                    dense
                    onClick={() => handleAssignToRole('tank2', 'set2')}
                    sx={{
                      px: 1.5,
                      py: 0.875,
                      gap: 0.75,
                      borderLeft: tank2.gearSets.set2
                        ? `3px solid ${roleColors.tank}`
                        : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                      background: tank2.gearSets.set2
                        ? `linear-gradient(90deg, ${roleColors.tank}1a 0%, ${roleColors.tank}06 100%)`
                        : 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        background: tank2.gearSets.set2
                          ? `linear-gradient(90deg, ${roleColors.tank}28 0%, ${roleColors.tank}10 100%)`
                          : `${roleColors.tank}0f`,
                        borderLeftColor: tank2.gearSets.set2
                          ? roleColors.tank
                          : `${roleColors.tank}50`,
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: tank2.gearSets.set2 ? `${roleColors.tank}cc` : 'text.disabled',
                          lineHeight: 1.2,
                          mb: 0.25,
                          fontSize: '0.6rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Set 2
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={tank2.gearSets.set2 ? 600 : 400}
                        sx={{
                          display: 'block',
                          color: tank2.gearSets.set2 ? 'text.primary' : 'text.disabled',
                          fontStyle: tank2.gearSets.set2 ? 'normal' : 'italic',
                          lineHeight: 1.3,
                          fontSize: '0.8rem',
                        }}
                        noWrap
                      >
                        {tank2.gearSets.set2 ? getSetDisplayName(tank2.gearSets.set2) : '— empty —'}
                      </Typography>
                    </Box>
                    {tank2.gearSets.set2 && (
                      <Tooltip title="Clear slot">
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onAssignSet('', 'tank2', 'set2');
                          }}
                          sx={{
                            p: 0.25,
                            color: 'text.disabled',
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </MenuItem>
                </>
              )}
              {selectedSetId && canAssignToMonsterSlot(selectedSetId) && (
                <MenuItem
                  dense
                  onClick={() => handleAssignToRole('tank2', 'monster')}
                  sx={{
                    px: 1.5,
                    py: 0.875,
                    gap: 0.75,
                    borderLeft: tank2.gearSets.monsterSet
                      ? `3px solid ${roleColors.tank}`
                      : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                    background: tank2.gearSets.monsterSet
                      ? `linear-gradient(90deg, ${roleColors.tank}1a 0%, ${roleColors.tank}06 100%)`
                      : 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      background: tank2.gearSets.monsterSet
                        ? `linear-gradient(90deg, ${roleColors.tank}28 0%, ${roleColors.tank}10 100%)`
                        : `${roleColors.tank}0f`,
                      borderLeftColor: tank2.gearSets.monsterSet
                        ? roleColors.tank
                        : `${roleColors.tank}50`,
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: tank2.gearSets.monsterSet ? `${roleColors.tank}cc` : 'text.disabled',
                        lineHeight: 1.2,
                        mb: 0.25,
                        fontSize: '0.6rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      Monster
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={tank2.gearSets.monsterSet ? 600 : 400}
                      sx={{
                        display: 'block',
                        color: tank2.gearSets.monsterSet ? 'text.primary' : 'text.disabled',
                        fontStyle: tank2.gearSets.monsterSet ? 'normal' : 'italic',
                        lineHeight: 1.3,
                        fontSize: '0.8rem',
                      }}
                      noWrap
                    >
                      {tank2.gearSets.monsterSet
                        ? getSetDisplayName(tank2.gearSets.monsterSet)
                        : '— empty —'}
                    </Typography>
                  </Box>
                  {tank2.gearSets.monsterSet && (
                    <Tooltip title="Clear slot">
                      <IconButton
                        size="small"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          onAssignSet('', 'tank2', 'monster');
                        }}
                        sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                      >
                        <ClearIcon sx={{ fontSize: '0.875rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </MenuItem>
              )}
            </Box>
          </Box>

          {/* Right Column - Healers */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* H1 / Healer 1 card */}
            <Box
              sx={{
                borderRadius: '10px',
                overflow: 'hidden',
                border: isDarkMode
                  ? `1px solid ${roleColors.healer}28`
                  : `1px solid ${roleColors.healer}35`,
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.625,
                  background: `linear-gradient(90deg, ${roleColors.healer}2a 0%, ${roleColors.healer}0a 70%, transparent 100%)`,
                  borderBottom: `1px solid ${roleColors.healer}1e`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <FavoriteIcon
                  sx={{
                    fontSize: '0.75rem',
                    color: roleColors.healer,
                    filter: isDarkMode ? `drop-shadow(0 0 4px ${roleColors.healer}80)` : 'none',
                  }}
                />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{
                    color: roleColors.healer,
                    fontSize: '0.675rem',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    textShadow: isDarkMode ? `0 0 10px ${roleColors.healer}50` : 'none',
                  }}
                >
                  H1 · Healer 1
                </Typography>
              </Box>
              {selectedSetId && canAssignToFivePieceSlot(selectedSetId) && (
                <>
                  <MenuItem
                    dense
                    onClick={() => handleAssignToRole('healer1', 'set1')}
                    sx={{
                      px: 1.5,
                      py: 0.875,
                      gap: 0.75,
                      borderLeft: healer1.set1
                        ? `3px solid ${roleColors.healer}`
                        : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                      background: healer1.set1
                        ? `linear-gradient(90deg, ${roleColors.healer}1a 0%, ${roleColors.healer}06 100%)`
                        : 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        background: healer1.set1
                          ? `linear-gradient(90deg, ${roleColors.healer}28 0%, ${roleColors.healer}10 100%)`
                          : `${roleColors.healer}0f`,
                        borderLeftColor: healer1.set1
                          ? roleColors.healer
                          : `${roleColors.healer}50`,
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: healer1.set1 ? `${roleColors.healer}cc` : 'text.disabled',
                          lineHeight: 1.2,
                          mb: 0.25,
                          fontSize: '0.6rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Set 1
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={healer1.set1 ? 600 : 400}
                        sx={{
                          display: 'block',
                          color: healer1.set1 ? 'text.primary' : 'text.disabled',
                          fontStyle: healer1.set1 ? 'normal' : 'italic',
                          lineHeight: 1.3,
                          fontSize: '0.8rem',
                        }}
                        noWrap
                      >
                        {healer1.set1 ? getSetDisplayName(healer1.set1) : '— empty —'}
                      </Typography>
                    </Box>
                    {healer1.set1 && (
                      <Tooltip title="Clear slot">
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onAssignSet('', 'healer1', 'set1');
                          }}
                          sx={{
                            p: 0.25,
                            color: 'text.disabled',
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </MenuItem>
                  <MenuItem
                    dense
                    onClick={() => handleAssignToRole('healer1', 'set2')}
                    sx={{
                      px: 1.5,
                      py: 0.875,
                      gap: 0.75,
                      borderLeft: healer1.set2
                        ? `3px solid ${roleColors.healer}`
                        : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                      background: healer1.set2
                        ? `linear-gradient(90deg, ${roleColors.healer}1a 0%, ${roleColors.healer}06 100%)`
                        : 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        background: healer1.set2
                          ? `linear-gradient(90deg, ${roleColors.healer}28 0%, ${roleColors.healer}10 100%)`
                          : `${roleColors.healer}0f`,
                        borderLeftColor: healer1.set2
                          ? roleColors.healer
                          : `${roleColors.healer}50`,
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: healer1.set2 ? `${roleColors.healer}cc` : 'text.disabled',
                          lineHeight: 1.2,
                          mb: 0.25,
                          fontSize: '0.6rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Set 2
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={healer1.set2 ? 600 : 400}
                        sx={{
                          display: 'block',
                          color: healer1.set2 ? 'text.primary' : 'text.disabled',
                          fontStyle: healer1.set2 ? 'normal' : 'italic',
                          lineHeight: 1.3,
                          fontSize: '0.8rem',
                        }}
                        noWrap
                      >
                        {healer1.set2 ? getSetDisplayName(healer1.set2) : '— empty —'}
                      </Typography>
                    </Box>
                    {healer1.set2 && (
                      <Tooltip title="Clear slot">
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onAssignSet('', 'healer1', 'set2');
                          }}
                          sx={{
                            p: 0.25,
                            color: 'text.disabled',
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </MenuItem>
                </>
              )}
              {selectedSetId && canAssignToMonsterSlot(selectedSetId) && (
                <MenuItem
                  dense
                  onClick={() => handleAssignToRole('healer1', 'monster')}
                  sx={{
                    px: 1.5,
                    py: 0.875,
                    gap: 0.75,
                    borderLeft: healer1.monsterSet
                      ? `3px solid ${roleColors.healer}`
                      : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                    background: healer1.monsterSet
                      ? `linear-gradient(90deg, ${roleColors.healer}1a 0%, ${roleColors.healer}06 100%)`
                      : 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      background: healer1.monsterSet
                        ? `linear-gradient(90deg, ${roleColors.healer}28 0%, ${roleColors.healer}10 100%)`
                        : `${roleColors.healer}0f`,
                      borderLeftColor: healer1.monsterSet
                        ? roleColors.healer
                        : `${roleColors.healer}50`,
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: healer1.monsterSet ? `${roleColors.healer}cc` : 'text.disabled',
                        lineHeight: 1.2,
                        mb: 0.25,
                        fontSize: '0.6rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      Monster
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={healer1.monsterSet ? 600 : 400}
                      sx={{
                        display: 'block',
                        color: healer1.monsterSet ? 'text.primary' : 'text.disabled',
                        fontStyle: healer1.monsterSet ? 'normal' : 'italic',
                        lineHeight: 1.3,
                        fontSize: '0.8rem',
                      }}
                      noWrap
                    >
                      {healer1.monsterSet ? getSetDisplayName(healer1.monsterSet) : '— empty —'}
                    </Typography>
                  </Box>
                  {healer1.monsterSet && (
                    <Tooltip title="Clear slot">
                      <IconButton
                        size="small"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          onAssignSet('', 'healer1', 'monster');
                        }}
                        sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                      >
                        <ClearIcon sx={{ fontSize: '0.875rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </MenuItem>
              )}
            </Box>

            {/* H2 / Healer 2 card — muted */}
            <Box
              sx={{
                borderRadius: '10px',
                overflow: 'hidden',
                border: isDarkMode
                  ? `1px solid ${roleColors.healer}18`
                  : `1px solid ${roleColors.healer}22`,
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.625,
                  background: `linear-gradient(90deg, ${roleColors.healer}14 0%, transparent 70%)`,
                  borderBottom: `1px solid ${roleColors.healer}12`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <FavoriteIcon
                  sx={{ fontSize: '0.75rem', color: roleColors.healer, opacity: 0.5 }}
                />
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{
                    color: `${roleColors.healer}80`,
                    fontSize: '0.675rem',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}
                >
                  H2 · Healer 2
                </Typography>
              </Box>
              {selectedSetId && canAssignToFivePieceSlot(selectedSetId) && (
                <>
                  <MenuItem
                    dense
                    onClick={() => handleAssignToRole('healer2', 'set1')}
                    sx={{
                      px: 1.5,
                      py: 0.875,
                      gap: 0.75,
                      borderLeft: healer2.set1
                        ? `3px solid ${roleColors.healer}`
                        : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                      background: healer2.set1
                        ? `linear-gradient(90deg, ${roleColors.healer}1a 0%, ${roleColors.healer}06 100%)`
                        : 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        background: healer2.set1
                          ? `linear-gradient(90deg, ${roleColors.healer}28 0%, ${roleColors.healer}10 100%)`
                          : `${roleColors.healer}0f`,
                        borderLeftColor: healer2.set1
                          ? roleColors.healer
                          : `${roleColors.healer}50`,
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: healer2.set1 ? `${roleColors.healer}cc` : 'text.disabled',
                          lineHeight: 1.2,
                          mb: 0.25,
                          fontSize: '0.6rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Set 1
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={healer2.set1 ? 600 : 400}
                        sx={{
                          display: 'block',
                          color: healer2.set1 ? 'text.primary' : 'text.disabled',
                          fontStyle: healer2.set1 ? 'normal' : 'italic',
                          lineHeight: 1.3,
                          fontSize: '0.8rem',
                        }}
                        noWrap
                      >
                        {healer2.set1 ? getSetDisplayName(healer2.set1) : '— empty —'}
                      </Typography>
                    </Box>
                    {healer2.set1 && (
                      <Tooltip title="Clear slot">
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onAssignSet('', 'healer2', 'set1');
                          }}
                          sx={{
                            p: 0.25,
                            color: 'text.disabled',
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </MenuItem>
                  <MenuItem
                    dense
                    onClick={() => handleAssignToRole('healer2', 'set2')}
                    sx={{
                      px: 1.5,
                      py: 0.875,
                      gap: 0.75,
                      borderLeft: healer2.set2
                        ? `3px solid ${roleColors.healer}`
                        : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                      background: healer2.set2
                        ? `linear-gradient(90deg, ${roleColors.healer}1a 0%, ${roleColors.healer}06 100%)`
                        : 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        background: healer2.set2
                          ? `linear-gradient(90deg, ${roleColors.healer}28 0%, ${roleColors.healer}10 100%)`
                          : `${roleColors.healer}0f`,
                        borderLeftColor: healer2.set2
                          ? roleColors.healer
                          : `${roleColors.healer}50`,
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: healer2.set2 ? `${roleColors.healer}cc` : 'text.disabled',
                          lineHeight: 1.2,
                          mb: 0.25,
                          fontSize: '0.6rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Set 2
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={healer2.set2 ? 600 : 400}
                        sx={{
                          display: 'block',
                          color: healer2.set2 ? 'text.primary' : 'text.disabled',
                          fontStyle: healer2.set2 ? 'normal' : 'italic',
                          lineHeight: 1.3,
                          fontSize: '0.8rem',
                        }}
                        noWrap
                      >
                        {healer2.set2 ? getSetDisplayName(healer2.set2) : '— empty —'}
                      </Typography>
                    </Box>
                    {healer2.set2 && (
                      <Tooltip title="Clear slot">
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onAssignSet('', 'healer2', 'set2');
                          }}
                          sx={{
                            p: 0.25,
                            color: 'text.disabled',
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </MenuItem>
                </>
              )}
              {selectedSetId && canAssignToMonsterSlot(selectedSetId) && (
                <MenuItem
                  dense
                  onClick={() => handleAssignToRole('healer2', 'monster')}
                  sx={{
                    px: 1.5,
                    py: 0.875,
                    gap: 0.75,
                    borderLeft: healer2.monsterSet
                      ? `3px solid ${roleColors.healer}`
                      : `3px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                    background: healer2.monsterSet
                      ? `linear-gradient(90deg, ${roleColors.healer}1a 0%, ${roleColors.healer}06 100%)`
                      : 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      background: healer2.monsterSet
                        ? `linear-gradient(90deg, ${roleColors.healer}28 0%, ${roleColors.healer}10 100%)`
                        : `${roleColors.healer}0f`,
                      borderLeftColor: healer2.monsterSet
                        ? roleColors.healer
                        : `${roleColors.healer}50`,
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: healer2.monsterSet ? `${roleColors.healer}cc` : 'text.disabled',
                        lineHeight: 1.2,
                        mb: 0.25,
                        fontSize: '0.6rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      Monster
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={healer2.monsterSet ? 600 : 400}
                      sx={{
                        display: 'block',
                        color: healer2.monsterSet ? 'text.primary' : 'text.disabled',
                        fontStyle: healer2.monsterSet ? 'normal' : 'italic',
                        lineHeight: 1.3,
                        fontSize: '0.8rem',
                      }}
                      noWrap
                    >
                      {healer2.monsterSet ? getSetDisplayName(healer2.monsterSet) : '— empty —'}
                    </Typography>
                  </Box>
                  {healer2.monsterSet && (
                    <Tooltip title="Clear slot">
                      <IconButton
                        size="small"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          onAssignSet('', 'healer2', 'monster');
                        }}
                        sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                      >
                        <ClearIcon sx={{ fontSize: '0.875rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </MenuItem>
              )}
            </Box>
          </Box>
        </Box>
      </Menu>
    </Paper>
  );
};
