/**
 * Set Assignment Manager Component
 * Provides a unified interface for assigning support sets to tanks and healers
 * with visual tracking of which sets are assigned and to whom
 */

import {
  Shield as ShieldIcon,
  Favorite as FavoriteIcon,
  SwapHoriz as SwapHorizIcon,
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
  ListItemText,
  useTheme,
  Tabs,
  Tab,
  Button,
  ButtonGroup,
} from '@mui/material';
import React, { useMemo, useState, useCallback } from 'react';

import { KnownSetIDs } from '../types/abilities';
import {
  RECOMMENDED_SETS,
  RECOMMENDED_5PIECE_SETS,
  RECOMMENDED_2PIECE_SETS,
  RECOMMENDED_1PIECE_SETS,
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
 * Determine the primary role(s) for a set based on data analysis
 * Data source: 62 players across 37 boss fights (November 2025, trash excluded)
 * Note: Perfected and non-perfected versions combined
 */
const getSetRole = (setId: KnownSetIDs): 'tank' | 'healer' | 'both' => {
  // Default based on category
  if (TANK_SETS.includes(setId)) return 'tank';
  if (HEALER_SETS.includes(setId)) return 'healer';
  if (FLEXIBLE_SETS.includes(setId)) return 'both';

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

      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ minWidth: 30 }}>
            {roleLabel}:
          </Typography>
          <ButtonGroup size="small" variant="outlined">
            {Object.values(SupportUltimate).map((ult) => (
              <Button
                key={ult}
                variant={roleData.ultimate === ult ? 'contained' : 'outlined'}
                onClick={() => onUpdateUltimate(role, roleData.ultimate === ult ? null : ult)}
                sx={{
                  minWidth: 80,
                  fontSize: '0.7rem',
                  py: 0.5,
                  bgcolor: roleData.ultimate === ult ? color : undefined,
                  color: roleData.ultimate === ult ? 'white' : undefined,
                  '&:hover': {
                    bgcolor: roleData.ultimate === ult ? color : undefined,
                  },
                }}
              >
                {formatUltimateLabel(ult)}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
      );
    },
    [onUpdateUltimate, formatUltimateLabel],
  );

  // Helper to render CP selector
  const renderCPSelector = useCallback(
    (role: 'healer1' | 'healer2', healer: HealerSetup, roleLabel: string, color: string) => {
      if (!onUpdateHealerCP) return null;

      return (
        <Box>
          <Typography variant="body2" fontWeight="bold" gutterBottom sx={{ color }}>
            ❤️ {roleLabel} Champion Point
          </Typography>
          <ButtonGroup size="small" variant="outlined">
            {Object.values(HealerChampionPoint).map((cp) => (
              <Button
                key={cp}
                variant={healer.championPoint === cp ? 'contained' : 'outlined'}
                onClick={() => onUpdateHealerCP(role, healer.championPoint === cp ? null : cp)}
                sx={{
                  minWidth: 140,
                  fontSize: '0.75rem',
                  py: 0.5,
                  bgcolor: healer.championPoint === cp ? color : undefined,
                  color: healer.championPoint === cp ? 'white' : undefined,
                  '&:hover': {
                    bgcolor: healer.championPoint === cp ? color : undefined,
                  },
                }}
              >
                {cp}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
      );
    },
    [onUpdateHealerCP],
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
    return Array.from(RECOMMENDED_SETS).map((setId) => {
      const setName = getSetDisplayName(setId);
      return {
        setName,
        assignedTo: setAssignments.get(setName) || [],
        isRecommended: true,
        category: SetCategory.RECOMMENDED,
      };
    });
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
      return is5PieceSet(assignment.setName) && filterByRole(assignment, role);
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
    (assignment: SetAssignment) => {
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
                  gap: 0.5,
                  justifyContent: 'flex-start',
                  width: '100%',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: roleBadge.color,
                    color: 'white',
                    mr: 0.5,
                  }}
                >
                  {roleBadge.icon}
                </Box>
                <span>{assignment.setName}</span>
              </Box>
            }
            color={isAssigned ? 'success' : 'default'}
            variant={isAssigned ? 'filled' : 'outlined'}
            onClick={(e) => handleSetClick(assignment.setName, e)}
            onContextMenu={(e) => handleClearSet(assignment.setName, e)}
            sx={{
              m: 0.5,
              cursor: 'pointer',
              justifyContent: 'flex-start',
              '&:hover': {
                backgroundColor: isAssigned ? 'success.dark' : 'primary.light',
                transform: 'scale(1.05)',
                transition: 'all 0.2s',
              },
            }}
          />
        </Tooltip>
      );
    },
    [getRoleBadgeConfig, handleSetClick, handleClearSet],
  );

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        🎯 Set Assignment Manager
      </Typography>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="Quick Assignment" />
        <Tab label="All Sets" />
      </Tabs>

      {/* Tab Panel 0: Quick Assignment (Recommended Sets) */}
      {activeTab === 0 && (
        <Box>
          {/* Recommended Sets - Always Visible */}
          <Box sx={{ mb: 2 }}>
            {/* 5-Piece Sets Section - Three Columns by Role */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                {/* Tank Column */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 0.5,
                      fontWeight: 'bold',
                      color: roleColors.tank,
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
                        borderRadius: '50%',
                        bgcolor: roleColors.tank,
                        color: 'white',
                      }}
                    >
                      <ShieldIcon sx={{ fontSize: 10 }} />
                    </Box>
                    Tank Sets
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {recommendedAssignments
                      .filter((a) => is5PieceSetWithRole(a, 'tank'))
                      .map(renderSetChip)}
                  </Box>
                </Box>

                {/* Both/Flexible Column */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 0.5,
                      fontWeight: 'bold',
                      color: roleColors.dps,
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
                        borderRadius: '50%',
                        bgcolor: roleColors.dps,
                        color: 'white',
                      }}
                    >
                      <SwapHorizIcon sx={{ fontSize: 10 }} />
                    </Box>
                    Flexible
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {recommendedAssignments
                      .filter((a) => is5PieceSetWithRole(a, 'both'))
                      .map(renderSetChip)}
                  </Box>
                </Box>

                {/* Healer Column */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 0.5,
                      fontWeight: 'bold',
                      color: roleColors.healer,
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
                        borderRadius: '50%',
                        bgcolor: roleColors.healer,
                        color: 'white',
                      }}
                    >
                      <FavoriteIcon sx={{ fontSize: 10 }} />
                    </Box>
                    Healer Sets
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {recommendedAssignments
                      .filter((a) => is5PieceSetWithRole(a, 'healer'))
                      .map(renderSetChip)}
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* 2-Piece Monster Sets & 1-Piece Mythic Sets Section - Three Columns by Role */}
            <Box sx={{ mb: 1 }}>
              <Typography
                variant="caption"
                sx={{ display: 'block', mb: 1, fontWeight: 'bold', color: 'text.secondary' }}
              >
                2-Piece Monster Sets & 1-Piece Mythics (
                {RECOMMENDED_2PIECE_SETS.length + RECOMMENDED_1PIECE_SETS.length})
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                {/* Tank Column */}
                <Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {recommendedAssignments
                      .filter((a) => is2Or1PieceSetWithRole(a, 'tank'))
                      .map(renderSetChip)}
                  </Box>
                </Box>

                {/* Both/Flexible Column */}
                <Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {recommendedAssignments
                      .filter((a) => is2Or1PieceSetWithRole(a, 'both'))
                      .map(renderSetChip)}
                  </Box>
                </Box>

                {/* Healer Column */}
                <Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {recommendedAssignments
                      .filter((a) => is2Or1PieceSetWithRole(a, 'healer'))
                      .map(renderSetChip)}
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
              <Divider sx={{ mb: 2 }}>
                <Chip label="Ultimate Quick Assign" size="small" />
              </Divider>
              <Stack spacing={2}>
                {/* Tank Ultimates */}
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    gutterBottom
                    sx={{ color: roleColors.tank }}
                  >
                    🛡️ Tank Ultimates
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {renderRoleUltimateSelector('tank1', tank1, 'MT', roleColors.tank)}
                    {renderRoleUltimateSelector('tank2', tank2, 'OT', roleColors.tank)}
                  </Stack>
                </Box>

                {/* Healer Ultimates */}
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    gutterBottom
                    sx={{ color: roleColors.healer }}
                  >
                    ❤️ Healer Ultimates
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
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
              <Divider sx={{ mb: 2 }}>
                <Chip label="Healer Champion Points" size="small" />
              </Divider>
              <Stack spacing={2}>
                {renderCPSelector('healer1', healer1, 'H1', roleColors.healer)}
                {renderCPSelector('healer2', healer2, 'H2', roleColors.healer)}
              </Stack>
            </Box>
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
              <Box>{allSets.filter((s) => s.category === SetCategory.TANK).map(renderSetChip)}</Box>
            </Box>
          )}

          {(roleFilter === 'all' || roleFilter === 'healer') && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                Healer Sets
              </Typography>
              <Box>
                {allSets.filter((s) => s.category === SetCategory.HEALER).map(renderSetChip)}
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
                  {allSets.filter((s) => s.category === SetCategory.FLEXIBLE).map(renderSetChip)}
                </Box>
              </Box>

              {/* Monster Sets */}
              <Box>
                <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                  Monster Sets
                </Typography>
                <Box>
                  {allSets.filter((s) => s.category === SetCategory.MONSTER).map(renderSetChip)}
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
            sx: { maxHeight: 500, minWidth: 480 },
          },
        }}
      >
        <MenuItem disabled sx={{ py: 0.5 }}>
          <ListItemText
            primary={`Assign "${selectedSetForAssign}" to:`}
            primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.85rem' }}
          />
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />

        {/* Two-column layout */}
        <Box sx={{ px: 0.5, pb: 0.5, display: 'flex', gap: 1 }}>
          {/* Left Column - Tanks */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{ display: 'block', px: 1, py: 0.25, color: 'text.secondary' }}
            >
              🛡️ Tanks
            </Typography>
            <Divider sx={{ mb: 0.25 }} />

            {/* Tank 1 slots */}
            {selectedSetId && canAssignToFivePieceSlot(selectedSetId) && (
              <>
                <MenuItem dense onClick={() => handleAssignToRole('tank1', 'set1')}>
                  <ListItemText
                    primary="Tank 1 - Set 1"
                    secondary={tank1.gearSets.set1 || 'Empty'}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </MenuItem>
                <MenuItem dense onClick={() => handleAssignToRole('tank1', 'set2')}>
                  <ListItemText
                    primary="Tank 1 - Set 2"
                    secondary={tank1.gearSets.set2 || 'Empty'}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </MenuItem>
              </>
            )}
            {selectedSetId && canAssignToMonsterSlot(selectedSetId) && (
              <MenuItem dense onClick={() => handleAssignToRole('tank1', 'monster')}>
                <ListItemText
                  primary="Tank 1 - Monster"
                  secondary={tank1.gearSets.monsterSet || 'Empty'}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </MenuItem>
            )}

            <Divider sx={{ my: 0.25 }} />

            {/* Tank 2 slots */}
            {selectedSetId && canAssignToFivePieceSlot(selectedSetId) && (
              <>
                <MenuItem dense onClick={() => handleAssignToRole('tank2', 'set1')}>
                  <ListItemText
                    primary="Tank 2 - Set 1"
                    secondary={tank2.gearSets.set1 || 'Empty'}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </MenuItem>
                <MenuItem dense onClick={() => handleAssignToRole('tank2', 'set2')}>
                  <ListItemText
                    primary="Tank 2 - Set 2"
                    secondary={tank2.gearSets.set2 || 'Empty'}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </MenuItem>
              </>
            )}
            {selectedSetId && canAssignToMonsterSlot(selectedSetId) && (
              <MenuItem dense onClick={() => handleAssignToRole('tank2', 'monster')}>
                <ListItemText
                  primary="Tank 2 - Monster"
                  secondary={tank2.gearSets.monsterSet || 'Empty'}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </MenuItem>
            )}
          </Box>

          {/* Right Column - Healers */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{ display: 'block', px: 1, py: 0.25, color: 'text.secondary' }}
            >
              ❤️ Healers
            </Typography>
            <Divider sx={{ mb: 0.25 }} />

            {/* Healer 1 slots */}
            {selectedSetId && canAssignToFivePieceSlot(selectedSetId) && (
              <>
                <MenuItem dense onClick={() => handleAssignToRole('healer1', 'set1')}>
                  <ListItemText
                    primary="Healer 1 - Set 1"
                    secondary={healer1.set1 || 'Empty'}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </MenuItem>
                <MenuItem dense onClick={() => handleAssignToRole('healer1', 'set2')}>
                  <ListItemText
                    primary="Healer 1 - Set 2"
                    secondary={healer1.set2 || 'Empty'}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </MenuItem>
              </>
            )}
            {selectedSetId && canAssignToMonsterSlot(selectedSetId) && (
              <MenuItem dense onClick={() => handleAssignToRole('healer1', 'monster')}>
                <ListItemText
                  primary="Healer 1 - Monster"
                  secondary={healer1.monsterSet || 'Empty'}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </MenuItem>
            )}

            <Divider sx={{ my: 0.25 }} />

            {/* Healer 2 slots */}
            {selectedSetId && canAssignToFivePieceSlot(selectedSetId) && (
              <>
                <MenuItem dense onClick={() => handleAssignToRole('healer2', 'set1')}>
                  <ListItemText
                    primary="Healer 2 - Set 1"
                    secondary={healer2.set1 || 'Empty'}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </MenuItem>
                <MenuItem dense onClick={() => handleAssignToRole('healer2', 'set2')}>
                  <ListItemText
                    primary="Healer 2 - Set 2"
                    secondary={healer2.set2 || 'Empty'}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </MenuItem>
              </>
            )}
            {selectedSetId && canAssignToMonsterSlot(selectedSetId) && (
              <MenuItem dense onClick={() => handleAssignToRole('healer2', 'monster')}>
                <ListItemText
                  primary="Healer 2 - Monster"
                  secondary={healer2.monsterSet || 'Empty'}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </MenuItem>
            )}
          </Box>
        </Box>
      </Menu>
    </Paper>
  );
};
