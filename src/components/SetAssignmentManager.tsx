/**
 * Set Assignment Manager Component
 * Provides a unified interface for assigning support sets to tanks and healers
 * with visual tracking of which sets are assigned and to whom
 */

import {
  ExpandMore as ExpandMoreIcon,
  Shield as ShieldIcon,
  Favorite as FavoriteIcon,
  SwapHoriz as SwapHorizIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  ListItemText,
  useTheme,
} from '@mui/material';
import React, { useMemo, useState, useCallback } from 'react';

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
  canAssignToFivePieceSlot,
  canAssignToMonsterSlot,
} from '../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';

/**
 * Determine the primary role(s) for a set based on data analysis
 * Data source: 62 players across 37 boss fights (November 2025, trash excluded)
 * Note: Perfected and non-perfected versions combined
 */
const getSetRole = (setName: string): 'tank' | 'healer' | 'both' => {
  // Tank-exclusive sets (based on data: 0% healer usage or >80% tank)
  const tankExclusive = [
    'Baron Zaudrus',
    'Tremorscale',
    'Pearlescent Ward',
    'Lucent Echoes',
    'Saxhleel Champion',
    'Claw of Yolnahkriin',
    'Nazaray',
  ];

  // Healer-exclusive sets (based on data: 0% tank usage or >90% healer)
  const healerExclusive = [
    'Spell Power Cure',
    'Symphony of Blades',
    "Jorvuld's Guidance",
    'Master Architect',
    'Roaring Opportunist',
    'Combat Physician',
    "Worm's Raiment",
    'Olorime',
    'Martial Knowledge',
    "Zen's Redress",
    "Encratis's Behemoth",
    'Pearls of Ehlnofey',
  ];

  // Flexible sets with cross-role usage
  const flexible = ['Turning Tide', 'War Machine', "Pillager's Profit", 'Powerful Assault'];

  if (tankExclusive.includes(setName)) return 'tank';
  if (healerExclusive.includes(setName)) return 'healer';
  if (flexible.includes(setName)) return 'both';

  // Default based on category
  if ((TANK_SETS as readonly string[]).includes(setName)) return 'tank';
  if ((HEALER_SETS as readonly string[]).includes(setName)) return 'healer';
  if ((FLEXIBLE_SETS as readonly string[]).includes(setName)) return 'both';

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
}

export const SetAssignmentManager: React.FC<SetAssignmentManagerProps> = ({
  tank1,
  tank2,
  healer1,
  healer2,
  onAssignSet,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const roleColors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;

  const [assignMenuAnchor, setAssignMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSetForAssign, setSelectedSetForAssign] = useState<string | null>(null);

  // Calculate which sets are assigned and to whom
  const setAssignments = useMemo(() => {
    const assignments = new Map<string, string[]>();

    // Check Tank 1
    if (tank1.gearSets.set1) {
      const existing = assignments.get(tank1.gearSets.set1) || [];
      assignments.set(tank1.gearSets.set1, [...existing, 'Tank 1 (Set 1)']);
    }
    if (tank1.gearSets.set2) {
      const existing = assignments.get(tank1.gearSets.set2) || [];
      assignments.set(tank1.gearSets.set2, [...existing, 'Tank 1 (Set 2)']);
    }
    if (tank1.gearSets.monsterSet) {
      const existing = assignments.get(tank1.gearSets.monsterSet) || [];
      assignments.set(tank1.gearSets.monsterSet, [...existing, 'Tank 1 (Monster)']);
    }
    tank1.gearSets.additionalSets?.forEach((set) => {
      const existing = assignments.get(set) || [];
      assignments.set(set, [...existing, 'Tank 1 (Additional)']);
    });

    // Check Tank 2
    if (tank2.gearSets.set1) {
      const existing = assignments.get(tank2.gearSets.set1) || [];
      assignments.set(tank2.gearSets.set1, [...existing, 'Tank 2 (Set 1)']);
    }
    if (tank2.gearSets.set2) {
      const existing = assignments.get(tank2.gearSets.set2) || [];
      assignments.set(tank2.gearSets.set2, [...existing, 'Tank 2 (Set 2)']);
    }
    if (tank2.gearSets.monsterSet) {
      const existing = assignments.get(tank2.gearSets.monsterSet) || [];
      assignments.set(tank2.gearSets.monsterSet, [...existing, 'Tank 2 (Monster)']);
    }
    tank2.gearSets.additionalSets?.forEach((set) => {
      const existing = assignments.get(set) || [];
      assignments.set(set, [...existing, 'Tank 2 (Additional)']);
    });

    // Check Healer 1
    if (healer1.set1) {
      const existing = assignments.get(healer1.set1) || [];
      assignments.set(healer1.set1, [...existing, 'Healer 1 (Set 1)']);
    }
    if (healer1.set2) {
      const existing = assignments.get(healer1.set2) || [];
      assignments.set(healer1.set2, [...existing, 'Healer 1 (Set 2)']);
    }
    if (healer1.monsterSet) {
      const existing = assignments.get(healer1.monsterSet) || [];
      assignments.set(healer1.monsterSet, [...existing, 'Healer 1 (Monster)']);
    }
    healer1.additionalSets?.forEach((set) => {
      const existing = assignments.get(set) || [];
      assignments.set(set, [...existing, 'Healer 1 (Additional)']);
    });

    // Check Healer 2
    if (healer2.set1) {
      const existing = assignments.get(healer2.set1) || [];
      assignments.set(healer2.set1, [...existing, 'Healer 2 (Set 1)']);
    }
    if (healer2.set2) {
      const existing = assignments.get(healer2.set2) || [];
      assignments.set(healer2.set2, [...existing, 'Healer 2 (Set 2)']);
    }
    if (healer2.monsterSet) {
      const existing = assignments.get(healer2.monsterSet) || [];
      assignments.set(healer2.monsterSet, [...existing, 'Healer 2 (Monster)']);
    }
    healer2.additionalSets?.forEach((set) => {
      const existing = assignments.get(set) || [];
      assignments.set(set, [...existing, 'Healer 2 (Additional)']);
    });

    return assignments;
  }, [tank1, tank2, healer1, healer2]);

  // Helper functions to check set membership with proper typing
  const is5PieceSet = useCallback((setName: string): boolean => {
    return (RECOMMENDED_5PIECE_SETS as readonly string[]).includes(setName);
  }, []);

  const is2PieceSet = useCallback((setName: string): boolean => {
    return (RECOMMENDED_2PIECE_SETS as readonly string[]).includes(setName);
  }, []);

  const is1PieceSet = useCallback((setName: string): boolean => {
    return (RECOMMENDED_1PIECE_SETS as readonly string[]).includes(setName);
  }, []);

  const recommendedAssignments: SetAssignment[] = useMemo(() => {
    return Array.from(RECOMMENDED_SETS).map((setName) => ({
      setName,
      assignedTo: setAssignments.get(setName) || [],
      isRecommended: true,
      category: SetCategory.RECOMMENDED,
    }));
  }, [setAssignments]);

  const allSets = useMemo(() => {
    const sets: SetAssignment[] = [];
    const recommendedSetNames = RECOMMENDED_SETS as readonly string[];

    // Add tank sets
    Array.from(TANK_SETS).forEach((setName) => {
      if (!recommendedSetNames.includes(setName)) {
        sets.push({
          setName,
          assignedTo: setAssignments.get(setName) || [],
          isRecommended: false,
          category: SetCategory.TANK,
        });
      }
    });

    // Add healer sets
    Array.from(HEALER_SETS).forEach((setName) => {
      if (!recommendedSetNames.includes(setName)) {
        sets.push({
          setName,
          assignedTo: setAssignments.get(setName) || [],
          isRecommended: false,
          category: SetCategory.HEALER,
        });
      }
    });

    // Add flexible sets
    Array.from(FLEXIBLE_SETS).forEach((setName) => {
      if (!recommendedSetNames.includes(setName)) {
        sets.push({
          setName,
          assignedTo: setAssignments.get(setName) || [],
          isRecommended: false,
          category: SetCategory.FLEXIBLE,
        });
      }
    });

    // Add monster sets
    Array.from(MONSTER_SETS).forEach((setName) => {
      sets.push({
        setName,
        assignedTo: setAssignments.get(setName) || [],
        isRecommended: false,
        category: SetCategory.MONSTER,
      });
    });

    return sets;
  }, [setAssignments]);

  const handleSetClick = useCallback(
    (setName: string, event: React.MouseEvent<HTMLDivElement>): void => {
      setSelectedSetForAssign(setName);
      setAssignMenuAnchor(event.currentTarget);
    },
    [],
  );

  const handleAssignToRole = useCallback(
    (role: 'tank1' | 'tank2' | 'healer1' | 'healer2', slot: 'set1' | 'set2' | 'monster'): void => {
      if (!selectedSetForAssign) {
        return;
      }

      // Validate slot restrictions
      if (slot === 'monster') {
        // Monster slot can only accept monster sets (2-piece)
        if (!canAssignToMonsterSlot(selectedSetForAssign)) {
          // Invalid assignment - silently ignore
          setAssignMenuAnchor(null);
          setSelectedSetForAssign(null);
          return;
        }
      } else if (slot === 'set1' || slot === 'set2') {
        // Set1/Set2 slots can only accept 5-piece sets
        if (!canAssignToFivePieceSlot(selectedSetForAssign)) {
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
      const role = getSetRole(assignment.setName);
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
    [getRoleBadgeConfig, handleSetClick],
  );

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        🎯 Set Assignment Manager
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Top 15 support sets from boss fights (trash excluded). Note: Typical raids need ~8
        five-piece sets + ~4 two-piece monster sets = 12 total support sets.
        <br />
        Role icons:{' '}
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            bgcolor: roleColors.tank,
            color: 'white',
            ml: 0.5,
            mr: 0.25,
            verticalAlign: 'middle',
          }}
        >
          <ShieldIcon sx={{ fontSize: 12 }} />
        </Box>{' '}
        Tank,
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            bgcolor: roleColors.healer,
            color: 'white',
            mx: 0.5,
            verticalAlign: 'middle',
          }}
        >
          <FavoriteIcon sx={{ fontSize: 12 }} />
        </Box>{' '}
        Healer,
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            bgcolor: roleColors.dps,
            color: 'white',
            mx: 0.5,
            verticalAlign: 'middle',
          }}
        >
          <SwapHorizIcon sx={{ fontSize: 12 }} />
        </Box>{' '}
        Both
      </Typography>

      {/* Recommended Sets - Always Visible */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <TrophyIcon color="warning" fontSize="small" />
          Top 15 Recommended Sets (typical 12 set requirement)
        </Typography>

        {/* 5-Piece Sets Section - Three Columns by Role */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', mb: 1, fontWeight: 'bold', color: 'text.secondary' }}
          >
            5-Piece Sets ({RECOMMENDED_5PIECE_SETS.length})
          </Typography>
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
                  .filter((a) => is5PieceSet(a.setName) && getSetRole(a.setName) === 'tank')
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
                  .filter((a) => is5PieceSet(a.setName) && getSetRole(a.setName) === 'both')
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
                  .filter((a) => is5PieceSet(a.setName) && getSetRole(a.setName) === 'healer')
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
                  .filter(
                    (a) =>
                      (is2PieceSet(a.setName) || is1PieceSet(a.setName)) &&
                      getSetRole(a.setName) === 'tank',
                  )
                  .map(renderSetChip)}
              </Box>
            </Box>

            {/* Both/Flexible Column */}
            <Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {recommendedAssignments
                  .filter(
                    (a) =>
                      (is2PieceSet(a.setName) || is1PieceSet(a.setName)) &&
                      getSetRole(a.setName) === 'both',
                  )
                  .map(renderSetChip)}
              </Box>
            </Box>

            {/* Healer Column */}
            <Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {recommendedAssignments
                  .filter(
                    (a) =>
                      (is2PieceSet(a.setName) || is1PieceSet(a.setName)) &&
                      getSetRole(a.setName) === 'healer',
                  )
                  .map(renderSetChip)}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Other Sets - Collapsible */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Additional Sets ({allSets.length} available)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Tank Sets */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              Tank Sets
            </Typography>
            <Box>{allSets.filter((s) => s.category === SetCategory.TANK).map(renderSetChip)}</Box>
          </Box>

          {/* Healer Sets */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              Healer Sets
            </Typography>
            <Box>{allSets.filter((s) => s.category === SetCategory.HEALER).map(renderSetChip)}</Box>
          </Box>

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
        </AccordionDetails>
      </Accordion>

      {/* Quick Stats */}
      <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Stack direction="row" spacing={3} justifyContent="center">
          <Typography variant="caption">
            <strong>Total Sets Assigned:</strong> {setAssignments.size}
          </Typography>
          <Typography variant="caption">
            <strong>Recommended Sets:</strong>{' '}
            {recommendedAssignments.filter((a) => a.assignedTo.length > 0).length}/
            {recommendedAssignments.length}
          </Typography>
        </Stack>
      </Box>

      {/* Assignment Menu */}
      <Menu
        anchorEl={assignMenuAnchor}
        open={Boolean(assignMenuAnchor)}
        onClose={handleCloseMenu}
        slotProps={{
          paper: {
            sx: { maxHeight: 400 },
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

        {/* Tank 1 slots */}
        {selectedSetForAssign && canAssignToFivePieceSlot(selectedSetForAssign) && (
          <>
            <MenuItem dense onClick={() => handleAssignToRole('tank1', 'set1')}>
              <ListItemText
                primary="Tank 1 - Set 1 (5-piece)"
                secondary={tank1.gearSets.set1 || 'Empty'}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </MenuItem>
            <MenuItem dense onClick={() => handleAssignToRole('tank1', 'set2')}>
              <ListItemText
                primary="Tank 1 - Set 2 (5-piece)"
                secondary={tank1.gearSets.set2 || 'Empty'}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </MenuItem>
          </>
        )}
        {selectedSetForAssign && canAssignToMonsterSlot(selectedSetForAssign) && (
          <MenuItem dense onClick={() => handleAssignToRole('tank1', 'monster')}>
            <ListItemText
              primary="Tank 1 - Monster/Mythic"
              secondary={tank1.gearSets.monsterSet || 'Empty'}
              primaryTypographyProps={{ fontSize: '0.875rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </MenuItem>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* Tank 2 slots */}
        {selectedSetForAssign && canAssignToFivePieceSlot(selectedSetForAssign) && (
          <>
            <MenuItem dense onClick={() => handleAssignToRole('tank2', 'set1')}>
              <ListItemText
                primary="Tank 2 - Set 1 (5-piece)"
                secondary={tank2.gearSets.set1 || 'Empty'}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </MenuItem>
            <MenuItem dense onClick={() => handleAssignToRole('tank2', 'set2')}>
              <ListItemText
                primary="Tank 2 - Set 2 (5-piece)"
                secondary={tank2.gearSets.set2 || 'Empty'}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </MenuItem>
          </>
        )}
        {selectedSetForAssign && canAssignToMonsterSlot(selectedSetForAssign) && (
          <MenuItem dense onClick={() => handleAssignToRole('tank2', 'monster')}>
            <ListItemText
              primary="Tank 2 - Monster/Mythic"
              secondary={tank2.gearSets.monsterSet || 'Empty'}
              primaryTypographyProps={{ fontSize: '0.875rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </MenuItem>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* Healer 1 slots */}
        {selectedSetForAssign && canAssignToFivePieceSlot(selectedSetForAssign) && (
          <>
            <MenuItem dense onClick={() => handleAssignToRole('healer1', 'set1')}>
              <ListItemText
                primary="Healer 1 - Set 1 (5-piece)"
                secondary={healer1.set1 || 'Empty'}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </MenuItem>
            <MenuItem dense onClick={() => handleAssignToRole('healer1', 'set2')}>
              <ListItemText
                primary="Healer 1 - Set 2 (5-piece)"
                secondary={healer1.set2 || 'Empty'}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </MenuItem>
          </>
        )}
        {selectedSetForAssign && canAssignToMonsterSlot(selectedSetForAssign) && (
          <MenuItem dense onClick={() => handleAssignToRole('healer1', 'monster')}>
            <ListItemText
              primary="Healer 1 - Monster/Mythic"
              secondary={healer1.monsterSet || 'Empty'}
              primaryTypographyProps={{ fontSize: '0.875rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </MenuItem>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* Healer 2 slots */}
        {selectedSetForAssign && canAssignToFivePieceSlot(selectedSetForAssign) && (
          <>
            <MenuItem dense onClick={() => handleAssignToRole('healer2', 'set1')}>
              <ListItemText
                primary="Healer 2 - Set 1 (5-piece)"
                secondary={healer2.set1 || 'Empty'}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </MenuItem>
            <MenuItem dense onClick={() => handleAssignToRole('healer2', 'set2')}>
              <ListItemText
                primary="Healer 2 - Set 2 (5-piece)"
                secondary={healer2.set2 || 'Empty'}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </MenuItem>
          </>
        )}
        {selectedSetForAssign && canAssignToMonsterSlot(selectedSetForAssign) && (
          <MenuItem dense onClick={() => handleAssignToRole('healer2', 'monster')}>
            <ListItemText
              primary="Healer 2 - Monster/Mythic"
              secondary={healer2.monsterSet || 'Empty'}
              primaryTypographyProps={{ fontSize: '0.875rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};
