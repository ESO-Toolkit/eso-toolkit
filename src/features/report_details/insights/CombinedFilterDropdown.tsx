import FilterListIcon from '@mui/icons-material/FilterList';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PersonIcon from '@mui/icons-material/Person';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  Skeleton,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import type { ReportActorFragment } from '../../../graphql/gql/graphql';
import { useReportMasterData } from '../../../hooks';
import { useSelectedFight } from '../../../hooks/useSelectedFight';
import { ALL_TARGETS_SENTINEL, ALL_ENEMIES_SENTINEL } from '../../../hooks/useSelectedTargetIds';
import {
  selectSelectedFriendlyPlayerId,
  selectSelectedTargetIds,
} from '../../../store/ui/uiSelectors';
import { setSelectedFriendlyPlayerId, setSelectedTargetIds } from '../../../store/ui/uiSlice';
import { useAppDispatch } from '../../../store/useAppDispatch';

const SECTION_HEADER_SX = {
  px: 2,
  pt: 1.5,
  pb: 0.5,
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
} as const;

interface CombinedFilterDropdownProps {
  players: Array<{ id: number; name: string; displayName?: string | null }>;
}

const CombinedFilterDropdownComponent: React.FC<CombinedFilterDropdownProps> = ({ players }) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const popoverId = open ? 'combined-filter-popover' : undefined;

  const fight = useSelectedFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const rawSelectedTargetIds = useSelector(selectSelectedTargetIds);
  const selectedFriendlyPlayerId = useSelector(selectSelectedFriendlyPlayerId);

  const selectedTargetIds = React.useMemo(
    () => rawSelectedTargetIds || [],
    [rawSelectedTargetIds],
  );

  const targetsList = React.useMemo(() => {
    if (!fight?.enemyNPCs || !reportMasterData?.actorsById) return [];
    const actorsById = reportMasterData.actorsById;
    const validEnemies = fight.enemyNPCs
      .filter((npc): npc is { id: number } => npc?.id != null)
      .map((npc) => ({ id: npc.id, actor: actorsById[npc.id] }))
      .filter((enemy) => enemy.actor && enemy.actor.name);

    const enemyGroups = validEnemies.reduce(
      (acc, enemy) => {
        const name = enemy.actor.name;
        if (name && !acc[name]) acc[name] = [];
        if (name) acc[name].push(enemy);
        return acc;
      },
      {} as Record<string, Array<{ id: number; actor: ReportActorFragment }>>,
    );

    return validEnemies
      .filter((enemy) => {
        const name = enemy.actor.name;
        if (!name) return false;
        const sameNameEnemies = enemyGroups[name];
        if (sameNameEnemies && sameNameEnemies.length === 1) return true;
        return enemy.actor.subType === 'Boss';
      })
      .map((enemy) => ({ id: enemy.id, name: enemy.actor.name }));
  }, [reportMasterData?.actorsById, fight?.enemyNPCs]);

  const isAllBosses = React.useMemo(
    () => selectedTargetIds.includes(ALL_TARGETS_SENTINEL) || selectedTargetIds.length === 0,
    [selectedTargetIds],
  );
  const isAllEnemies = React.useMemo(
    () => selectedTargetIds.includes(ALL_ENEMIES_SENTINEL),
    [selectedTargetIds],
  );
  const individualTargets = React.useMemo(
    () =>
      selectedTargetIds.filter((id) => id !== ALL_TARGETS_SENTINEL && id !== ALL_ENEMIES_SENTINEL),
    [selectedTargetIds],
  );

  const handleToggleAllBosses = React.useCallback(() => {
    dispatch(setSelectedTargetIds([ALL_TARGETS_SENTINEL]));
  }, [dispatch]);

  const handleToggleAllEnemies = React.useCallback(() => {
    dispatch(setSelectedTargetIds([ALL_ENEMIES_SENTINEL]));
  }, [dispatch]);

  const handleToggleTarget = React.useCallback(
    (targetId: number) => {
      if (isAllBosses || isAllEnemies) {
        dispatch(setSelectedTargetIds([targetId]));
        return;
      }
      const isCurrentlySelected = individualTargets.includes(targetId);
      if (isCurrentlySelected) {
        const newTargets = individualTargets.filter((id) => id !== targetId);
        dispatch(setSelectedTargetIds(newTargets));
      } else {
        dispatch(setSelectedTargetIds([...individualTargets, targetId]));
      }
    },
    [dispatch, isAllBosses, isAllEnemies, individualTargets],
  );

  const handleSelectPlayer = React.useCallback(
    (playerId: number | null) => {
      dispatch(setSelectedFriendlyPlayerId(playerId));
    },
    [dispatch],
  );

  const targetLabel = React.useMemo(() => {
    if (isAllEnemies) return 'All Enemies';
    if (isAllBosses) return 'All Bosses';
    if (individualTargets.length === 1) {
      const target = targetsList.find((t) => t.id === individualTargets[0]);
      return target?.name || '1 target';
    }
    return `${individualTargets.length} targets`;
  }, [isAllBosses, isAllEnemies, individualTargets, targetsList]);

  const playerLabel = React.useMemo(() => {
    if (!selectedFriendlyPlayerId) return 'All Players';
    const player = players.find((p) => p.id === selectedFriendlyPlayerId);
    if (!player) return `Player ${selectedFriendlyPlayerId}`;
    if (player.displayName) return `${player.name} (${player.displayName})`;
    return player.name;
  }, [selectedFriendlyPlayerId, players]);

  const popoverSx = React.useMemo(
    () => ({
      '& .MuiPaper-root': {
        mt: 1,
        borderRadius: '12px',
        border: isDarkMode
          ? '1px solid rgba(56, 189, 248, 0.2)'
          : '1px solid rgba(59, 130, 246, 0.15)',
        background: isDarkMode
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.97) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(51, 65, 85, 0.93) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%)',
        backdropFilter: 'blur(16px)',
        boxShadow: isDarkMode
          ? '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 80px rgba(56, 189, 248, 0.08)'
          : '0 12px 40px rgba(0, 0, 0, 0.1), 0 0 60px rgba(59, 130, 246, 0.05)',
        minWidth: 260,
        maxWidth: 320,
        maxHeight: '70vh',
        overflowY: 'auto',
      },
    }),
    [isDarkMode],
  );

  const sectionHeaderSx = SECTION_HEADER_SX;

  const listItemSx = React.useMemo(
    () => ({
      borderRadius: '8px',
      mx: 0.75,
      py: 0.5,
      px: 1,
      transition: 'background-color 150ms ease',
      '&:hover': {
        background: isDarkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(59, 130, 246, 0.06)',
      },
    }),
    [isDarkMode],
  );

  const checkboxSx = React.useMemo(
    () => ({
      p: 0.5,
      color: isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.5)',
      '&.Mui-checked': {
        color: isDarkMode ? '#38bdf8' : '#3b82f6',
      },
    }),
    [isDarkMode],
  );

  if (isMasterDataLoading) {
    return <Skeleton variant="rounded" width={200} height={36} />;
  }

  if (!fight?.enemyNPCs?.length) return null;

  return (
    <>
      <Button
        aria-controls={popoverId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={
          <KeyboardArrowDownIcon
            sx={{
              transition: 'transform 0.2s ease',
              transform: open ? 'rotate(180deg)' : 'none',
              fontSize: '1.1rem !important',
            }}
          />
        }
        sx={{
          textTransform: 'none',
          fontFamily: 'Inter, system-ui',
          fontWeight: 500,
          fontSize: '0.825rem',
          color: isDarkMode ? '#e2e8f0' : '#1e293b',
          borderRadius: '10px',
          px: 2,
          py: 0.875,
          position: 'relative',
          background: isDarkMode
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 50%, rgba(51, 65, 85, 0.7) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 50%, rgba(241, 245, 249, 0.85) 100%)',
          border: isDarkMode
            ? '1px solid rgba(56, 189, 248, 0.2)'
            : '1px solid rgba(59, 130, 246, 0.15)',
          boxShadow: isDarkMode
            ? '0 2px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(56, 189, 248, 0.1)'
            : '0 1px 8px rgba(59, 130, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 50%, rgba(51, 65, 85, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(248, 250, 252, 0.98) 100%)',
            boxShadow: isDarkMode
              ? '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(56, 189, 248, 0.1), inset 0 1px 0 rgba(56, 189, 248, 0.15)'
              : '0 3px 16px rgba(59, 130, 246, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.35)' : 'rgba(59, 130, 246, 0.25)',
          },
          ...(open && {
            borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.5)' : 'rgba(59, 130, 246, 0.4)',
            boxShadow: isDarkMode
              ? '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(56, 189, 248, 0.15)'
              : '0 3px 16px rgba(59, 130, 246, 0.15)',
          }),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon sx={{ fontSize: '1rem', opacity: 0.6 }} />
          <Box
            component="span"
            sx={{
              color: isDarkMode ? '#38bdf8' : '#3b82f6',
              fontWeight: 600,
            }}
          >
            {targetLabel}
          </Box>
          <Box
            component="span"
            sx={{
              opacity: 0.3,
              mx: 0.25,
              fontSize: '0.7rem',
            }}
          >
            ·
          </Box>
          <Box component="span" sx={{ opacity: 0.8 }}>
            {playerLabel}
          </Box>
        </Box>
      </Button>

      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={popoverSx}
      >
        {/* Target Section */}
        <Box sx={sectionHeaderSx}>
          <GpsFixedIcon
            sx={{
              fontSize: '0.85rem',
              color: isDarkMode ? '#38bdf8' : '#3b82f6',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isDarkMode ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)',
            }}
          >
            Target
          </Typography>
        </Box>

        <Box role="listbox" aria-label="Target filter" aria-multiselectable="true" sx={{ pb: 0.5 }}>
          <ListItemButton
            role="option"
            aria-selected={isAllBosses}
            onClick={handleToggleAllBosses}
            selected={isAllBosses}
            sx={{
              ...listItemSx,
              '&.Mui-selected': {
                background: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.08)',
                '&:hover': {
                  background: isDarkMode ? 'rgba(56, 189, 248, 0.18)' : 'rgba(59, 130, 246, 0.12)',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Checkbox size="small" checked={isAllBosses} sx={checkboxSx} tabIndex={-1} />
            </ListItemIcon>
            <ListItemText
              primary="All Bosses"
              slotProps={{
                primary: {
                  sx: {
                    fontSize: '0.825rem',
                    fontWeight: isAllBosses ? 600 : 400,
                    fontFamily: 'Inter, system-ui',
                    color: isAllBosses
                      ? isDarkMode
                        ? '#38bdf8'
                        : '#3b82f6'
                      : isDarkMode
                        ? '#e2e8f0'
                        : '#1e293b',
                  },
                },
              }}
            />
          </ListItemButton>

          <ListItemButton
            role="option"
            aria-selected={isAllEnemies}
            onClick={handleToggleAllEnemies}
            selected={isAllEnemies}
            sx={{
              ...listItemSx,
              '&.Mui-selected': {
                background: isDarkMode ? 'rgba(168, 85, 247, 0.12)' : 'rgba(139, 69, 255, 0.08)',
                '&:hover': {
                  background: isDarkMode ? 'rgba(168, 85, 247, 0.18)' : 'rgba(139, 69, 255, 0.12)',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Checkbox
                size="small"
                checked={isAllEnemies}
                sx={{
                  ...checkboxSx,
                  '&.Mui-checked': {
                    color: isDarkMode ? '#a855f7' : '#8b45ff',
                  },
                }}
                tabIndex={-1}
              />
            </ListItemIcon>
            <ListItemText
              primary="All Enemies"
              slotProps={{
                primary: {
                  sx: {
                    fontSize: '0.825rem',
                    fontWeight: isAllEnemies ? 600 : 400,
                    fontFamily: 'Inter, system-ui',
                    color: isAllEnemies
                      ? isDarkMode
                        ? '#a855f7'
                        : '#8b45ff'
                      : isDarkMode
                        ? '#e2e8f0'
                        : '#1e293b',
                  },
                },
              }}
            />
          </ListItemButton>

          {targetsList.map((target) => {
            const isSelected =
              !isAllBosses && !isAllEnemies && individualTargets.includes(target.id);
            return (
              <ListItemButton
                key={target.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleToggleTarget(target.id)}
                selected={isSelected}
                sx={{
                  ...listItemSx,
                  '&.Mui-selected': {
                    background: isDarkMode ? 'rgba(34, 197, 94, 0.12)' : 'rgba(5, 150, 105, 0.08)',
                    '&:hover': {
                      background: isDarkMode
                        ? 'rgba(34, 197, 94, 0.18)'
                        : 'rgba(5, 150, 105, 0.12)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Checkbox
                    size="small"
                    checked={isSelected}
                    sx={{
                      ...checkboxSx,
                      '&.Mui-checked': {
                        color: isDarkMode ? '#22c55e' : '#059669',
                      },
                    }}
                    tabIndex={-1}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={target.name}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: '0.825rem',
                        fontWeight: isSelected ? 600 : 400,
                        fontFamily: 'Inter, system-ui',
                        color: isSelected
                          ? isDarkMode
                            ? '#22c55e'
                            : '#059669'
                          : isDarkMode
                            ? '#e2e8f0'
                            : '#1e293b',
                      },
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
        </Box>

        <Divider
          sx={{
            borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(59, 130, 246, 0.08)',
            mx: 1.5,
          }}
        />

        {/* Player Section */}
        <Box sx={sectionHeaderSx}>
          <PersonIcon
            sx={{
              fontSize: '0.85rem',
              color: isDarkMode ? '#38bdf8' : '#3b82f6',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isDarkMode ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)',
            }}
          >
            Player
          </Typography>
        </Box>

        <Box role="listbox" aria-label="Player filter" sx={{ pb: 1 }}>
          <ListItemButton
            role="option"
            aria-selected={!selectedFriendlyPlayerId}
            onClick={() => handleSelectPlayer(null)}
            selected={!selectedFriendlyPlayerId}
            sx={{
              ...listItemSx,
              '&.Mui-selected': {
                background: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.08)',
                '&:hover': {
                  background: isDarkMode ? 'rgba(56, 189, 248, 0.18)' : 'rgba(59, 130, 246, 0.12)',
                },
              },
            }}
          >
            <ListItemText
              primary="All Players"
              slotProps={{
                primary: {
                  sx: {
                    fontSize: '0.825rem',
                    fontWeight: !selectedFriendlyPlayerId ? 600 : 400,
                    fontFamily: 'Inter, system-ui',
                    color: !selectedFriendlyPlayerId
                      ? isDarkMode
                        ? '#38bdf8'
                        : '#3b82f6'
                      : isDarkMode
                        ? '#e2e8f0'
                        : '#1e293b',
                  },
                },
              }}
            />
          </ListItemButton>

          {players.map((player) => {
            const isSelected = selectedFriendlyPlayerId === player.id;
            return (
              <ListItemButton
                key={player.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectPlayer(player.id)}
                selected={isSelected}
                sx={{
                  ...listItemSx,
                  '&.Mui-selected': {
                    background: isDarkMode
                      ? 'rgba(56, 189, 248, 0.12)'
                      : 'rgba(59, 130, 246, 0.08)',
                    '&:hover': {
                      background: isDarkMode
                        ? 'rgba(56, 189, 248, 0.18)'
                        : 'rgba(59, 130, 246, 0.12)',
                    },
                  },
                }}
              >
                <ListItemText
                  primary={player.name}
                  secondary={player.displayName || undefined}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: '0.825rem',
                        fontWeight: isSelected ? 600 : 400,
                        fontFamily: 'Inter, system-ui',
                        color: isSelected
                          ? isDarkMode
                            ? '#38bdf8'
                            : '#3b82f6'
                          : isDarkMode
                            ? '#e2e8f0'
                            : '#1e293b',
                      },
                    },
                    secondary: {
                      sx: {
                        fontSize: '0.7rem',
                        fontFamily: 'Inter, system-ui',
                        color: isDarkMode ? 'rgba(148, 163, 184, 0.6)' : 'rgba(100, 116, 139, 0.6)',
                        lineHeight: 1.3,
                      },
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
        </Box>
      </Popover>
    </>
  );
};

export const CombinedFilterDropdown = React.memo(CombinedFilterDropdownComponent);
