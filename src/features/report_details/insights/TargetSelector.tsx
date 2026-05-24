import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Skeleton,
  Typography,
  useTheme,
  Checkbox,
  ListItemText,
  Chip,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import type { ReportActorFragment } from '../../../graphql/gql/graphql';
import { useReportMasterData } from '../../../hooks';
import { useSelectedFight } from '../../../hooks/useSelectedFight';
import { ALL_TARGETS_SENTINEL, ALL_ENEMIES_SENTINEL } from '../../../hooks/useSelectedTargetIds';
import { selectSelectedTargetIds } from '../../../store/ui/uiSelectors';
import { setSelectedTargetIds } from '../../../store/ui/uiSlice';
import { useAppDispatch } from '../../../store/useAppDispatch';

const ALL_BOSSES_SENTINEL = ALL_TARGETS_SENTINEL.toString();
const ALL_ENEMIES_SENTINEL_STR = ALL_ENEMIES_SENTINEL.toString();

const TargetSelectorComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const fight = useSelectedFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const rawSelectedTargetIds = useSelector(selectSelectedTargetIds);

  // Memoize selectedTargetIds with defensive fallback
  const selectedTargetIds = React.useMemo(() => {
    return rawSelectedTargetIds || [];
  }, [rawSelectedTargetIds]);

  // Convert selectedTargetIds to string array for the Select component
  const selectValue = React.useMemo(() => {
    // If "All Enemies" is explicitly selected, show "All Enemies"
    if (selectedTargetIds.includes(ALL_ENEMIES_SENTINEL)) {
      return [ALL_ENEMIES_SENTINEL_STR];
    }
    // If empty selection or "All Bosses" is explicitly selected, show "All Bosses"
    if (selectedTargetIds.includes(ALL_TARGETS_SENTINEL) || selectedTargetIds.length === 0) {
      return [ALL_BOSSES_SENTINEL];
    }
    return selectedTargetIds
      .map((id) => id.toString())
      .filter(
        (id) => id !== ALL_TARGETS_SENTINEL.toString() && id !== ALL_ENEMIES_SENTINEL.toString(),
      );
  }, [selectedTargetIds]);

  const handleTargetChange = React.useCallback(
    (event: SelectChangeEvent<string[]>): void => {
      const value = event.target.value as string[];
      const previousValue = selectValue;

      // Use setTimeout with 0 delay to make state update immediate (next tick)
      setTimeout(() => {
        // Check current and previous sentinel states
        const wasAllBossesSelected = previousValue.includes(ALL_BOSSES_SENTINEL);
        const isAllBossesSelected = value.includes(ALL_BOSSES_SENTINEL);
        const wasAllEnemiesSelected = previousValue.includes(ALL_ENEMIES_SENTINEL_STR);
        const isAllEnemiesSelected = value.includes(ALL_ENEMIES_SENTINEL_STR);

        // Get individual targets (excluding both sentinels)
        const individualTargets = value.filter(
          (id) => id !== ALL_BOSSES_SENTINEL && id !== ALL_ENEMIES_SENTINEL_STR,
        );

        if (isAllEnemiesSelected && !wasAllEnemiesSelected) {
          // "All Enemies" was just selected - set to ALL_ENEMIES_SENTINEL
          dispatch(setSelectedTargetIds([ALL_ENEMIES_SENTINEL]));
        } else if (!isAllEnemiesSelected && wasAllEnemiesSelected) {
          // "All Enemies" was deselected - handle remaining selection
          if (isAllBossesSelected) {
            // Switch to "All Bosses"
            dispatch(setSelectedTargetIds([ALL_TARGETS_SENTINEL]));
          } else if (individualTargets.length > 0) {
            // Switch to individual targets
            const targetIds = individualTargets.map((id) => Number(id)).filter((id) => !isNaN(id));
            dispatch(setSelectedTargetIds(targetIds));
          } else {
            // Nothing selected, default to "All Bosses"
            dispatch(setSelectedTargetIds([]));
          }
        } else if (isAllBossesSelected && !wasAllBossesSelected && individualTargets.length === 0) {
          // "All Bosses" was just selected alone - set to ALL_TARGETS_SENTINEL
          dispatch(setSelectedTargetIds([ALL_TARGETS_SENTINEL]));
        } else if (isAllBossesSelected && !wasAllBossesSelected && individualTargets.length > 0) {
          // "All Bosses" was selected while individual targets were already selected
          // This means user wants to switch from individual targets to "All Bosses"
          dispatch(setSelectedTargetIds([ALL_TARGETS_SENTINEL]));
        } else if (!isAllBossesSelected && wasAllBossesSelected && !isAllEnemiesSelected) {
          // "All Bosses" was deselected (and "All Enemies" not selected) - use individual targets
          if (individualTargets.length === 0) {
            // Nothing selected, default back to "All Bosses"
            dispatch(setSelectedTargetIds([]));
          } else {
            const targetIds = individualTargets.map((id) => Number(id)).filter((id) => !isNaN(id));
            dispatch(setSelectedTargetIds(targetIds));
          }
        } else if (individualTargets.length > 0 && !isAllEnemiesSelected) {
          // Individual targets were selected - switch to individual mode (ignore "All Bosses" state)
          const targetIds = individualTargets.map((id) => Number(id)).filter((id) => !isNaN(id));
          dispatch(setSelectedTargetIds(targetIds));
        } else if (individualTargets.length > 0 && isAllEnemiesSelected && wasAllEnemiesSelected) {
          // Individual targets were selected while "All Enemies" was already selected
          // This means user wants to switch from "All Enemies" to specific individual targets
          const targetIds = individualTargets.map((id) => Number(id)).filter((id) => !isNaN(id));
          dispatch(setSelectedTargetIds(targetIds));
        } else if (value.length === 0) {
          // Nothing selected, default to "All Bosses"
          dispatch(setSelectedTargetIds([]));
        }
        // If sentinels remain unchanged, do nothing
      }, 0);
    },
    [dispatch, selectValue],
  );

  const targetsList = React.useMemo(() => {
    if (!fight?.enemyNPCs || !reportMasterData?.actorsById) {
      return [];
    }

    const actorsById = reportMasterData.actorsById;

    const validEnemies = fight.enemyNPCs
      .filter((npc): npc is { id: number } => npc?.id != null)
      .map((npc) => ({
        id: npc.id,
        actor: actorsById[npc.id],
      }))
      .filter((enemy) => enemy.actor && enemy.actor.name);

    const enemyGroups = validEnemies.reduce(
      (acc, enemy) => {
        const name = enemy.actor.name;
        if (name && !acc[name]) {
          acc[name] = [];
        }
        if (name) {
          acc[name].push(enemy);
        }
        return acc;
      },
      {} as Record<string, Array<{ id: number; actor: ReportActorFragment }>>,
    );

    const filteredEnemies = validEnemies.filter((enemy) => {
      const name = enemy.actor.name;
      if (!name) return false;

      const sameNameEnemies = enemyGroups[name];

      if (sameNameEnemies && sameNameEnemies.length === 1) {
        return true; // Unique name
      }

      return enemy.actor.subType === 'Boss'; // Multiple names - only Boss subtype
    });

    return filteredEnemies.map((enemy) => ({
      id: enemy.id,
      name: enemy.actor.name,
    }));
  }, [reportMasterData?.actorsById, fight?.enemyNPCs]);

  // Custom render value for multi-select display
  const renderValue = React.useCallback(
    (selected: string[]) => {
      // If "All Enemies" is selected
      if (selected.includes(ALL_ENEMIES_SENTINEL_STR)) {
        return (
          <Chip
            label="All Enemies"
            size="small"
            sx={{
              bgcolor: isDarkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(139, 69, 255, 0.1)',
              color: isDarkMode ? '#a855f7' : '#8b45ff',
              fontWeight: 600,
            }}
          />
        );
      }

      // If "All Bosses" is explicitly selected or no selection (empty = all bosses)
      if (selected.includes(ALL_BOSSES_SENTINEL) || selected.length === 0) {
        return (
          <Chip
            label="All Bosses"
            size="small"
            sx={{
              bgcolor: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkMode ? '#38bdf8' : '#3b82f6',
              fontWeight: 600,
            }}
          />
        );
      }

      if (selected.length === 0) {
        return <span style={{ opacity: 0.7 }}>Select targets...</span>;
      }

      if (selected.length === 1) {
        const target = targetsList.find((t) => t.id?.toString() === selected[0]);
        return target?.name || selected[0];
      }

      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selected.slice(0, 2).map((value) => {
            const target = targetsList.find((t) => t.id?.toString() === value);
            return (
              <Chip
                key={value}
                label={target?.name || value}
                size="small"
                sx={{
                  bgcolor: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(5, 150, 105, 0.1)',
                  color: isDarkMode ? '#22c55e' : '#059669',
                  fontWeight: 500,
                }}
              />
            );
          })}
          {selected.length > 2 && (
            <Chip
              label={`+${selected.length - 2} more`}
              size="small"
              sx={{
                bgcolor: isDarkMode ? 'rgba(107, 114, 128, 0.2)' : 'rgba(107, 114, 128, 0.1)',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                fontWeight: 500,
              }}
            />
          )}
        </Box>
      );
    },
    [isDarkMode, targetsList],
  );

  if (isMasterDataLoading) {
    return (
      <Box
        sx={{ minWidth: { xs: '100%', sm: 180, md: 200 }, maxWidth: { xs: '100%', md: 'none' } }}
      >
        <Skeleton
          variant="rounded"
          width="100%"
          height={56}
          sx={{
            maxWidth: { xs: '100%', sm: 180, md: 200 },
            minWidth: { xs: '100%', sm: 180, md: 200 },
          }}
        />
      </Box>
    );
  }

  if (!fight?.enemyNPCs?.length) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No players available for selection
        </Typography>
      </Box>
    );
  }

  return (
    <FormControl
      fullWidth
      size="small"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          background: isDarkMode
            ? 'rgba(15, 23, 42, 0.6)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '& fieldset': {
            borderColor: isDarkMode
              ? 'rgba(148, 163, 184, 0.2)'
              : 'rgba(148, 163, 184, 0.3)',
          },
          '&:hover fieldset': {
            borderColor: isDarkMode
              ? 'rgba(56, 189, 248, 0.4)'
              : 'rgba(59, 130, 246, 0.4)',
          },
          '&.Mui-focused fieldset': {
            borderColor: isDarkMode ? '#38bdf8' : '#3b82f6',
            borderWidth: '1.5px',
          },
        },
        '& .MuiInputLabel-root': {
          color: isDarkMode ? 'rgba(148, 163, 184, 0.8)' : 'rgba(100, 116, 139, 0.8)',
          background: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          padding: '0 6px',
          borderRadius: '4px',
          '&.Mui-focused': {
            color: isDarkMode ? '#38bdf8' : '#3b82f6',
          },
        },
      }}
    >
      <InputLabel id="target-selector-label" shrink={true}>
        Target
      </InputLabel>
      <Select
        labelId="target-selector-label"
        multiple
        value={selectValue}
        label="Target"
        onChange={handleTargetChange}
        renderValue={renderValue}
        MenuProps={{
          PaperProps: {
            sx: {
              mt: 1,
              borderRadius: 2,
              border: isDarkMode
                ? '1px solid rgba(56, 189, 248, 0.2)'
                : '1px solid rgba(59, 130, 246, 0.15)',
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.9) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
              backdropFilter: 'blur(12px)',
              boxShadow: isDarkMode
                ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(56, 189, 248, 0.1)'
                : '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 40px rgba(59, 130, 246, 0.06)',
              '& .MuiMenuItem-root': {
                fontFamily: 'Inter, system-ui',
                fontWeight: 500,
                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                borderRadius: '6px',
                margin: '2px 6px',
                transition:
                  'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), color 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 100ms cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: isDarkMode
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(147, 51, 234, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.08) 100%)',
                  color: isDarkMode ? '#38bdf8' : '#3b82f6',
                  transform: 'translateX(4px)',
                },
                '&.Mui-selected': {
                  background: isDarkMode
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(147, 51, 234, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.12) 100%)',
                  color: isDarkMode ? '#38bdf8' : '#3b82f6',
                  fontWeight: 600,
                  '&:hover': {
                    background: isDarkMode
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(147, 51, 234, 0.25) 100%)'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.15) 100%)',
                  },
                },
              },
            },
          },
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
        }}
      >
        <MenuItem value={ALL_BOSSES_SENTINEL}>
          <Checkbox
            checked={selectValue.includes(ALL_BOSSES_SENTINEL)}
            sx={{
              color: isDarkMode ? 'rgba(56, 189, 248, 0.7)' : 'rgba(59, 130, 246, 0.7)',
              transition:
                'color 100ms cubic-bezier(0.4, 0, 0.2, 1), transform 100ms cubic-bezier(0.4, 0, 0.2, 1)',
              '&.Mui-checked': {
                color: isDarkMode ? '#38bdf8' : '#3b82f6',
              },
            }}
          />
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isDarkMode
                      ? 'linear-gradient(135deg, #38bdf8 0%, #9333ea 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)',
                    flexShrink: 0,
                  }}
                />
                All Bosses
              </Box>
            }
          />
        </MenuItem>
        <MenuItem value={ALL_ENEMIES_SENTINEL_STR}>
          <Checkbox
            checked={selectValue.includes(ALL_ENEMIES_SENTINEL_STR)}
            sx={{
              color: isDarkMode ? 'rgba(168, 85, 247, 0.7)' : 'rgba(139, 69, 255, 0.7)',
              transition:
                'color 100ms cubic-bezier(0.4, 0, 0.2, 1), transform 100ms cubic-bezier(0.4, 0, 0.2, 1)',
              '&.Mui-checked': {
                color: isDarkMode ? '#a855f7' : '#8b45ff',
              },
            }}
          />
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isDarkMode
                      ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
                      : 'linear-gradient(135deg, #8b45ff 0%, #ec4899 100%)',
                    flexShrink: 0,
                  }}
                />
                All Enemies
              </Box>
            }
          />
        </MenuItem>
        {targetsList.map((target) => (
          <MenuItem key={target.id} value={target.id?.toString() || ''}>
            <Checkbox
              checked={selectValue.includes(target.id?.toString() || '')}
              sx={{
                color: isDarkMode ? 'rgba(34, 197, 94, 0.7)' : 'rgba(5, 150, 105, 0.7)',
                transition:
                  'color 100ms cubic-bezier(0.4, 0, 0.2, 1), transform 100ms cubic-bezier(0.4, 0, 0.2, 1)',
                '&.Mui-checked': {
                  color: isDarkMode ? '#22c55e' : '#059669',
                },
              }}
            />
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isDarkMode
                        ? 'linear-gradient(135deg, #22c55e 0%, #38bdf8 100%)'
                        : 'linear-gradient(135deg, #059669 0%, #3b82f6 100%)',
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Box sx={{ fontWeight: 600 }}>{target.name}</Box>
                    <Box
                      sx={{
                        fontSize: '0.75rem',
                        opacity: 0.7,
                        fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                      }}
                    >
                      ID: {target.id}
                    </Box>
                  </Box>
                </Box>
              }
            />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const TargetSelector = React.memo(TargetSelectorComponent);
