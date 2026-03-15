/**
 * General Section — build identity: class, role, game mode, races, description, addon import.
 * Uses IconPickerGrid for class/role/gameMode, Chip grid for races.
 */

import { Alert, Box, Button, Chip, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { ESO_CLASSES, ESO_GAME_MODES, ESO_RACES, ESO_ROLES } from '../../data/esoStaticData';
import {
  setAddonImportString,
  setBuildClass,
  setBuildDescription,
  setBuildGameMode,
  setBuildRaces,
  setBuildRole,
} from '../../store/buildEditorSlice';
import type { CombatRole, ESOClass, GameMode } from '../../types/build.types';
import { IconPickerGrid } from '../primitives/IconPickerGrid';

export const GeneralSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build } = useSelector((s: RootState) => s.buildEditor);

  const toggleRace = (raceId: string): void => {
    const next = build.races.includes(raceId)
      ? build.races.filter((r) => r !== raceId)
      : [...build.races, raceId];
    dispatch(setBuildRaces(next));
  };

  return (
    <Stack spacing={2.5}>
      {/* Short description */}
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
        >
          Short Description
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          placeholder="A short introduction text"
          value={build.shortDescription}
          onChange={(e) => dispatch(setBuildDescription(e.target.value))}
          inputProps={{ maxLength: 500 }}
        />
      </Box>

      {/* Class — IconPickerGrid */}
      <IconPickerGrid
        label="Class"
        options={ESO_CLASSES.map((c) => ({
          id: c.id,
          label: c.label,
          color: c.color,
        }))}
        value={build.esoClass}
        onChange={(id) => dispatch(setBuildClass(id as ESOClass))}
        columns={4}
      />

      {/* Combat Role — IconPickerGrid */}
      <IconPickerGrid
        label="Combat Role"
        options={ESO_ROLES.map((r) => ({
          id: r.id,
          label: r.shortLabel,
          color: r.color,
          description: r.label,
        }))}
        value={build.role}
        onChange={(id) => dispatch(setBuildRole(id as CombatRole))}
        columns={5}
      />

      {/* Game Mode — IconPickerGrid */}
      <IconPickerGrid
        label="Game Mode"
        options={ESO_GAME_MODES.map((m) => ({
          id: m.id,
          label: m.label,
        }))}
        value={build.gameMode}
        onChange={(id) => dispatch(setBuildGameMode(id as GameMode))}
        columns={3}
      />

      {/* Optimal Races — Chip grid */}
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, mb: 0.75, display: 'block' }}
        >
          Optimal Races
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {ESO_RACES.map((race) => {
            const selected = build.races.includes(race.id);
            return (
              <Chip
                key={race.id}
                label={race.label}
                size="small"
                onClick={() => toggleRace(race.id)}
                variant={selected ? 'filled' : 'outlined'}
                color={selected ? 'primary' : 'default'}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontWeight: selected ? 700 : 400,
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Addon Import */}
      <Box
        sx={{
          background: isDark ? alpha('#0f172a', 0.6) : alpha('#f8fafc', 0.7),
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: 2,
          p: 2,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
        >
          Import from addon string
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', mb: 1.5, fontSize: 10 }}
        >
          Import from <strong>Combat Metrics</strong> or{' '}
          <strong>Caro&apos;s Skill Point Saver</strong>.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            fullWidth
            size="small"
            placeholder="Addon export string"
            value={build.addonImportString}
            onChange={(e) => dispatch(setAddonImportString(e.target.value))}
            multiline
            minRows={2}
          />
          <Tooltip
            title={
              build.addonImportString.length < 10 ? 'Paste an export string first' : 'Load build'
            }
          >
            <Box>
              <Button
                variant="contained"
                size="small"
                disabled={build.addonImportString.length < 10}
                sx={{ minWidth: 64, height: 36, mt: 0.5 }}
              >
                Load
              </Button>
            </Box>
          </Tooltip>
        </Stack>
        <Alert severity="info" sx={{ mt: 1.5, py: 0.25, fontSize: 11 }}>
          Addon import is coming soon — configure your build using the sections on this page.
        </Alert>
      </Box>
    </Stack>
  );
};
