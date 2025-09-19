import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Alert,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
} from '@mui/material';
import React from 'react';

import { useCurrentFight } from '../../../hooks';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { getSetCount } from '../../../utils/gearUtilities';
import { BaseWidget, WidgetProps } from '../components/BaseWidget';

// Known support sets that provide group buffs and shouldn't be duplicated
// These are sets where having multiple people wear them doesn't stack or is wasteful
const SUPPORT_SETS_TO_CHECK = [
  // Monster sets that provide group buffs
  { setId: 147, name: 'Symphony of Blades', reason: "Group buff doesn't stack" },
  { setId: 148, name: 'Catalyst', reason: "Group buff doesn't stack" },
  { setId: 149, name: 'Nazaray', reason: "Group buff doesn't stack" },
  { setId: 150, name: 'Synergistic Shielding', reason: 'Group resource return' },
  { setId: 151, name: 'Magma Incarnate', reason: "Group buff doesn't stack" },

  // Trial sets with group effects
  { setId: 152, name: 'Pearlescent Ward', reason: 'Group armor buff' },
  { setId: 153, name: 'Saxhleel Champion', reason: 'Group resources from healing' },
  { setId: 154, name: 'Perfected Saxhleel Champion', reason: 'Group resources from healing' },

  // Healing sets that are typically single-healer responsibility
  { setId: 155, name: "Jorvuld's Guidance", reason: "Buff extension doesn't stack" },
  { setId: 156, name: 'Spell Power Cure', reason: 'Redundant group healing buffs' },
  { setId: 157, name: 'Powerful Assault', reason: 'Group weapon damage buff' },

  // Tank sets that provide group benefits
  { setId: 158, name: "Torug's Pact", reason: 'Enchantment effectiveness' },
  { setId: 159, name: 'Yolnahkriin', reason: 'Group critical chance and damage' },
  { setId: 160, name: 'Turning Tide', reason: 'Major Vulnerability application' },
];

// Helper function to determine if a player is a support role
const isSupportRole = (role: string): boolean => {
  return role === 'tank' || role === 'healer';
};

/**
 * Widget that displays if the same support set is being worn by multiple support players
 */
export const SupportSetConflictWidget: React.FC<WidgetProps> = ({ onRemove }) => {
  const { fight, isFightLoading } = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();

  const isLoading = isFightLoading || isPlayerDataLoading;

  // Analyze support set conflicts
  const setConflicts = React.useMemo(() => {
    const conflicts: Array<{
      setName: string;
      reason: string;
      players: Array<{ id: number; name: string; role: string; pieceCount: number }>;
    }> = [];

    if (!playerData?.playersById) {
      return conflicts;
    }

    // Get all support players
    const supportPlayers = Object.values(playerData.playersById).filter(
      (player) => player && isSupportRole(player.role || 'dps'),
    );

    if (supportPlayers.length < 2) {
      return conflicts; // No conflicts possible with less than 2 support players
    }

    // Check each support set for conflicts
    SUPPORT_SETS_TO_CHECK.forEach(({ setId, name, reason }) => {
      const playersWithSet: Array<{
        id: number;
        name: string;
        role: string;
        pieceCount: number;
      }> = [];

      supportPlayers.forEach((player) => {
        if (!player?.id || !player?.combatantInfo?.gear) return;

        const gear = player.combatantInfo.gear;
        const pieceCount = getSetCount(gear, setId);

        // Consider it equipped if they have 5+ pieces (full set) or 2+ pieces for monster sets
        const isEquipped = pieceCount >= 5 || (pieceCount >= 2 && name.includes('Monster'));

        if (isEquipped) {
          playersWithSet.push({
            id: player.id,
            name: player.name,
            role: player.role || 'unknown',
            pieceCount,
          });
        }
      });

      // If multiple support players have the same set, it's a conflict
      if (playersWithSet.length > 1) {
        conflicts.push({
          setName: name,
          reason,
          players: playersWithSet,
        });
      }
    });

    return conflicts;
  }, [playerData?.playersById]);

  // Also check for any duplicate set IDs among support players (more general check)
  const generalSetDuplicates = React.useMemo(() => {
    const duplicates: Array<{
      setId: number;
      setName: string;
      players: Array<{ id: number; name: string; role: string; pieceCount: number }>;
    }> = [];

    if (!playerData?.playersById) {
      return duplicates;
    }

    const supportPlayers = Object.values(playerData.playersById).filter(
      (player) => player && isSupportRole(player.role || 'dps'),
    );

    if (supportPlayers.length < 2) {
      return duplicates;
    }

    // Track all sets by set ID
    const setTracker = new Map<
      number,
      Array<{
        id: number;
        name: string;
        role: string;
        pieceCount: number;
      }>
    >();

    supportPlayers.forEach((player) => {
      if (!player?.id || !player?.combatantInfo?.gear) return;

      const gear = player.combatantInfo.gear;
      const setIds = new Set<number>();

      gear.forEach((piece) => {
        if (piece.setID && piece.setID > 0) {
          setIds.add(piece.setID);
        }
      });

      setIds.forEach((setId) => {
        const pieceCount = getSetCount(gear, setId);

        // Only consider sets with significant piece counts
        if (pieceCount >= 5 || pieceCount >= 2) {
          if (!setTracker.has(setId)) {
            setTracker.set(setId, []);
          }
          setTracker.get(setId)!.push({
            id: player.id,
            name: player.name,
            role: player.role || 'unknown',
            pieceCount,
          });
        }
      });
    });

    // Find sets worn by multiple players
    setTracker.forEach((players, setId) => {
      if (players.length > 1) {
        // Skip if already covered by specific support set checks
        const isAlreadyChecked = SUPPORT_SETS_TO_CHECK.some(
          (supportSet) => supportSet.setId === setId,
        );
        if (!isAlreadyChecked) {
          duplicates.push({
            setId,
            setName: `Set ID ${setId}`, // We'd need a lookup table for actual names
            players,
          });
        }
      }
    });

    return duplicates;
  }, [playerData?.playersById]);

  const totalConflicts = setConflicts.length + generalSetDuplicates.length;

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'tank':
        return 'primary';
      case 'healer':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <BaseWidget title="Support Set Conflicts" onRemove={onRemove} isLoading={isLoading}>
      {!fight ? (
        <Typography variant="body2" color="text.secondary">
          No fight data available
        </Typography>
      ) : totalConflicts === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
          <CheckCircleIcon fontSize="small" />
          <Typography variant="body2">No support set conflicts detected</Typography>
        </Box>
      ) : (
        <Box>
          <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
            <Typography variant="body2">
              {totalConflicts} support set conflict{totalConflicts !== 1 ? 's' : ''} detected
            </Typography>
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Multiple support players wearing the same sets may result in wasted group buffs or
            inefficient coordination.
          </Typography>

          <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
            {/* Specific support set conflicts */}
            {setConflicts.map((conflict, index) => (
              <ListItem
                key={`conflict-${index}`}
                sx={{ py: 0.5, flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <WarningIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {conflict.setName}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.75rem', color: 'warning.main' }}
                      >
                        {conflict.reason}
                      </Typography>
                    }
                  />
                </Box>
                <Box sx={{ ml: 4, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {conflict.players.map((player) => (
                    <Chip
                      key={player.id}
                      label={`${player.name} (${player.pieceCount}pc)`}
                      size="small"
                      color={getRoleColor(player.role) as any}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </ListItem>
            ))}

            {/* General set duplicates */}
            {generalSetDuplicates.map((duplicate, index) => (
              <ListItem
                key={`duplicate-${index}`}
                sx={{ py: 0.5, flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PeopleIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {duplicate.setName}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.75rem', color: 'warning.main' }}
                      >
                        Multiple support players wearing same set
                      </Typography>
                    }
                  />
                </Box>
                <Box sx={{ ml: 4, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {duplicate.players.map((player) => (
                    <Chip
                      key={player.id}
                      label={`${player.name} (${player.pieceCount}pc)`}
                      size="small"
                      color={getRoleColor(player.role) as any}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </BaseWidget>
  );
};
