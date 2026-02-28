/**
 * SetSlotPicker Dialog Component
 *
 * A dialog for selecting gear sets with role-based filtering and search.
 * Shows sets grouped by category with visual indicators for already-assigned sets.
 */

import { Search as SearchIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  useTheme,
} from '@mui/material';
import React, { useCallback, useState, useMemo } from 'react';

import { KnownSetIDs } from '../types/abilities';
import {
  TANK_5PIECE_SETS,
  HEALER_5PIECE_SETS,
  FLEXIBLE_5PIECE_SETS,
  TANK_MONSTER_SETS,
  HEALER_MONSTER_SETS,
  FLEXIBLE_MONSTER_SETS,
  RECOMMENDED_5PIECE_SETS,
  RECOMMENDED_2PIECE_SETS,
  RECOMMENDED_1PIECE_SETS,
  MONSTER_SETS,
  ALL_5PIECE_SETS,
} from '../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';
import { getSetDisplayName } from '../utils/setNameUtils';

import { SetSlotRole, SetSlotType } from './PlayerSetSlot';

interface SetOption {
  id: KnownSetIDs;
  name: string;
  category: 'tank' | 'healer' | 'flexible';
  isRecommended: boolean;
  isAssigned?: boolean;
}

interface SetSlotPickerProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when a set is selected */
  onSetSelected: (setId: KnownSetIDs) => void;
  /** Type of slot being configured */
  slotType: SetSlotType;
  /** Role of the player */
  role: SetSlotRole;
  /** Sets that should be excluded (already assigned to others) */
  excludeSets?: KnownSetIDs[];
}

/**
 * Get available sets based on slot type and role
 */
const getAvailableSets = (
  slotType: SetSlotType,
  role: SetSlotRole,
  excludeSets: KnownSetIDs[] = [],
): SetOption[] => {
  const excludedSetIds = new Set(excludeSets);
  const sets: SetOption[] = [];

  // Helper to add a set if not excluded
  const addSet = (
    setId: KnownSetIDs,
    category: 'tank' | 'healer' | 'flexible',
    isRecommended: boolean,
  ): void => {
    if (excludedSetIds.has(setId)) {
      sets.push({
        id: setId,
        name: getSetDisplayName(setId),
        category,
        isRecommended,
        isAssigned: true,
      });
    } else {
      sets.push({
        id: setId,
        name: getSetDisplayName(setId),
        category,
        isRecommended,
      });
    }
  };

  // Determine which sets to show based on slot type
  if (slotType === 'monster') {
    // Monster slot - show monster sets only
    const isMonsterSet = (setId: KnownSetIDs): boolean => {
      return MONSTER_SETS.includes(setId);
    };

    // Add tank monster sets
    TANK_MONSTER_SETS.forEach((setId) => {
      if (isMonsterSet(setId)) {
        const isRecommended = RECOMMENDED_2PIECE_SETS.includes(setId);
        addSet(setId, 'tank', isRecommended);
      }
    });

    // Add healer monster sets
    HEALER_MONSTER_SETS.forEach((setId) => {
      if (isMonsterSet(setId) && !TANK_MONSTER_SETS.includes(setId)) {
        const isRecommended = RECOMMENDED_2PIECE_SETS.includes(setId);
        addSet(setId, 'healer', isRecommended);
      }
    });

    // Add flexible monster sets
    FLEXIBLE_MONSTER_SETS.forEach((setId) => {
      if (
        isMonsterSet(setId) &&
        !TANK_MONSTER_SETS.includes(setId) &&
        !HEALER_MONSTER_SETS.includes(setId)
      ) {
        const isRecommended = RECOMMENDED_2PIECE_SETS.includes(setId);
        addSet(setId, 'flexible', isRecommended);
      }
    });

    // Add mythic sets (1-piece)
    RECOMMENDED_1PIECE_SETS.forEach((setId) => {
      addSet(setId, 'flexible', true);
    });
  } else {
    // set1 or set2 - show 5-piece sets
    const is5PieceSet = (setId: KnownSetIDs): boolean => {
      return ALL_5PIECE_SETS.includes(setId);
    };

    // Add role-specific sets
    if (role === 'tank') {
      TANK_5PIECE_SETS.forEach((setId) => {
        if (is5PieceSet(setId)) {
          const isRecommended = RECOMMENDED_5PIECE_SETS.includes(setId);
          addSet(setId, 'tank', isRecommended);
        }
      });
    } else if (role === 'healer') {
      HEALER_5PIECE_SETS.forEach((setId) => {
        if (is5PieceSet(setId)) {
          const isRecommended = RECOMMENDED_5PIECE_SETS.includes(setId);
          addSet(setId, 'healer', isRecommended);
        }
      });
    }

    // Add flexible sets
    FLEXIBLE_5PIECE_SETS.forEach((setId) => {
      if (
        is5PieceSet(setId) &&
        !TANK_5PIECE_SETS.includes(setId) &&
        !HEALER_5PIECE_SETS.includes(setId)
      ) {
        const isRecommended = RECOMMENDED_5PIECE_SETS.includes(setId);
        addSet(setId, 'flexible', isRecommended);
      }
    });
  }

  // Sort: recommended first, then by category, then by name
  return sets.sort((a, b) => {
    if (a.isRecommended !== b.isRecommended) {
      return a.isRecommended ? -1 : 1;
    }
    if (a.category !== b.category) {
      const categoryOrder = { tank: 0, healer: 1, flexible: 2 };
      return categoryOrder[a.category] - categoryOrder[b.category];
    }
    return a.name.localeCompare(b.name);
  });
};

/**
 * SetSlotPicker Dialog Component
 */
export const SetSlotPicker: React.FC<SetSlotPickerProps> = ({
  open,
  onClose,
  onSetSelected,
  slotType,
  role,
  excludeSets = [],
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const roleColors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;

  const [searchQuery, setSearchQuery] = useState('');

  // Get all available sets
  const allSets = useMemo(
    () => getAvailableSets(slotType, role, excludeSets),
    [slotType, role, excludeSets],
  );

  // Filter sets by search query
  const filteredSets = useMemo(() => {
    if (!searchQuery.trim()) {
      return allSets;
    }
    const query = searchQuery.toLowerCase();
    return allSets.filter((set) => set.name.toLowerCase().includes(query));
  }, [allSets, searchQuery]);

  // Group sets by category
  const setsByCategory = useMemo(() => {
    const groups: Record<string, SetOption[]> = {
      tank: [],
      healer: [],
      flexible: [],
    };

    filteredSets.forEach((set) => {
      groups[set.category].push(set);
    });

    return groups;
  }, [filteredSets]);

  // Handle set selection
  const handleSetSelect = useCallback(
    (setId: KnownSetIDs) => {
      onSetSelected(setId);
      setSearchQuery('');
      onClose();
    },
    [onSetSelected, onClose],
  );

  // Get category label and color
  const getCategoryInfo = useCallback(
    (category: string) => {
      switch (category) {
        case 'tank':
          return {
            label: role === 'tank' ? 'Tank Sets' : 'Tank (Off-Role)',
            color: roleColors.tank,
          };
        case 'healer':
          return {
            label: role === 'healer' ? 'Healer Sets' : 'Healer (Off-Role)',
            color: roleColors.healer,
          };
        case 'flexible':
          return {
            label: 'Flexible Sets',
            color: roleColors.dps,
          };
        default:
          return {
            label: 'Other',
            color: roleColors.dps,
          };
      }
    },
    [role, roleColors],
  );

  // Get dialog title
  const getDialogTitle = useCallback(() => {
    const slotLabel =
      slotType === 'set1'
        ? 'Primary 5-Piece (Body)'
        : slotType === 'set2'
          ? 'Secondary 5-Piece (Jewelry)'
          : 'Monster/Mythic Set';
    const roleLabel = role === 'tank' ? 'Tank' : 'Healer';
    return `${roleLabel} - ${slotLabel}`;
  }, [slotType, role]);

  // Render a set item
  const renderSetItem = useCallback(
    (set: SetOption) => {
      const categoryInfo = getCategoryInfo(set.category);

      return (
        <ListItem
          key={set.id}
          disablePadding
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            '&:last-child': { borderBottom: 'none' },
          }}
        >
          <ListItemButton
            onClick={() => handleSetSelect(set.id)}
            disabled={set.isAssigned}
            sx={{
              opacity: set.isAssigned ? 0.5 : 1,
              bgcolor: set.isRecommended ? 'action.hover' : 'transparent',
            }}
          >
            {/* Category indicator */}
            <Box
              sx={{
                width: 4,
                height: 40,
                bgcolor: categoryInfo.color,
                mr: 1.5,
                borderRadius: 0.5,
              }}
            />
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1">{set.name}</Typography>
                  {set.isRecommended && (
                    <Chip
                      label="Recommended"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: 'success.main',
                        color: 'white',
                      }}
                    />
                  )}
                  {set.isAssigned && (
                    <Chip
                      label="Already Assigned"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: 'warning.main',
                        color: 'white',
                      }}
                    />
                  )}
                </Box>
              }
              secondary={categoryInfo.label}
              secondaryTypographyProps={{
                variant: 'caption',
                sx: { color: categoryInfo.color },
              }}
            />
            {set.isAssigned && (
              <CheckIcon
                sx={{
                  fontSize: 18,
                  color: 'text.disabled',
                  ml: 1,
                }}
              />
            )}
          </ListItemButton>
        </ListItem>
      );
    },
    [theme, getCategoryInfo, handleSetSelect],
  );

  // Count sets by category
  const categoryCounts = useMemo(() => {
    return {
      tank: setsByCategory.tank.length,
      healer: setsByCategory.healer.length,
      flexible: setsByCategory.flexible.length,
    };
  }, [setsByCategory]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '70vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="div">
          {getDialogTitle()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Select a gear set for this slot
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Search input */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search sets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Category counts */}
        {!searchQuery && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`Tank: ${categoryCounts.tank}`}
              size="small"
              sx={{
                bgcolor: `${roleColors.tank}20`,
                color: roleColors.tank,
                border: `1px solid ${roleColors.tank}40`,
              }}
            />
            <Chip
              label={`Healer: ${categoryCounts.healer}`}
              size="small"
              sx={{
                bgcolor: `${roleColors.healer}20`,
                color: roleColors.healer,
                border: `1px solid ${roleColors.healer}40`,
              }}
            />
            <Chip
              label={`Flexible: ${categoryCounts.flexible}`}
              size="small"
              sx={{
                bgcolor: `${roleColors.dps}20`,
                color: roleColors.dps,
                border: `1px solid ${roleColors.dps}40`,
              }}
            />
          </Box>
        )}

        {/* Sets list */}
        {filteredSets.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">
              No sets found matching &ldquo;{searchQuery}&rdquo;
            </Typography>
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
            <List disablePadding>
              {/* Tank sets */}
              {setsByCategory.tank.length > 0 && (
                <>
                  {setsByCategory.tank.map(renderSetItem)}
                  {(setsByCategory.healer.length > 0 || setsByCategory.flexible.length > 0) && (
                    <Divider />
                  )}
                </>
              )}

              {/* Healer sets */}
              {setsByCategory.healer.length > 0 && (
                <>
                  {setsByCategory.healer.map(renderSetItem)}
                  {setsByCategory.flexible.length > 0 && <Divider />}
                </>
              )}

              {/* Flexible sets */}
              {setsByCategory.flexible.map(renderSetItem)}
            </List>
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Named export only - prefer named exports for consistency
