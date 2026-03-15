/**
 * General Section — build identity: class, role, game mode, races, description, addon import.
 * Glass-style inputs, accent-themed race chips, glass import panel.
 */

import { Alert, Box, Button, Chip, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
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

/** Shared glass input styles — transparent border until hover/focus */
const glassInputSx = (isDark: boolean): Record<string, unknown> => ({
  '& .MuiOutlinedInput-root': {
    fontFamily: 'Space Grotesk, Inter, system-ui',
    fontSize: 13,
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'transparent',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--be-accent, #38bdf8)',
      borderWidth: '1px',
    },
  },
});

/** Shared section label styles */
const sectionLabelSx = {
  fontWeight: 700,
  mb: 0.75,
  display: 'block',
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  fontFamily: 'Space Grotesk, Inter, system-ui',
};

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
        <Typography variant="caption" color="text.secondary" sx={sectionLabelSx}>
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
          sx={glassInputSx(isDark)}
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

      {/* Optimal Races — glass-style chips */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={sectionLabelSx}>
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
                aria-pressed={selected}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: selected ? 700 : 500,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  fontSize: 11,
                  backdropFilter: 'blur(4px)',
                  ...(selected
                    ? {
                        background:
                          'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.22), rgba(var(--be-accent-rgb, 56, 189, 248), 0.10))',
                        border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)',
                        color: 'var(--be-accent, #38bdf8)',
                        boxShadow:
                          '0 0 8px rgba(var(--be-accent-rgb, 56, 189, 248), 0.15)',
                        '&:hover': {
                          background:
                            'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.28), rgba(var(--be-accent-rgb, 56, 189, 248), 0.14))',
                        },
                      }
                    : {
                        borderColor: isDark
                          ? 'rgba(255,255,255,0.10)'
                          : 'rgba(0,0,0,0.10)',
                        color: 'text.secondary',
                        '&:hover': {
                          borderColor:
                            'rgba(var(--be-accent-rgb, 56, 189, 248), 0.30)',
                          background:
                            'rgba(var(--be-accent-rgb, 56, 189, 248), 0.05)',
                        },
                      }),
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Addon Import — glass panel */}
      <Box
        sx={{
          background: isDark
            ? 'rgba(15, 23, 42, 0.50)'
            : 'rgba(248, 250, 252, 0.60)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          borderRadius: 3,
          p: 2,
          boxShadow: isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
            : 'inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={sectionLabelSx}>
          Import from addon string
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', mb: 1.5, fontSize: 10, fontFamily: 'Space Grotesk, Inter, system-ui' }}
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
            sx={glassInputSx(isDark)}
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
                sx={{
                  minWidth: 64,
                  height: 36,
                  mt: 0.5,
                  borderRadius: '99px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 12,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  background:
                    'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.85), rgba(var(--be-accent-rgb, 56, 189, 248), 0.65))',
                  boxShadow: '0 0 10px rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
                  '&:hover': {
                    boxShadow: '0 0 16px rgba(var(--be-accent-rgb, 56, 189, 248), 0.30)',
                  },
                  '&.Mui-disabled': {
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    boxShadow: 'none',
                  },
                }}
              >
                Load
              </Button>
            </Box>
          </Tooltip>
        </Stack>
        <Alert
          severity="info"
          sx={{
            mt: 1.5,
            py: 0.25,
            fontSize: 11,
            borderRadius: 2,
            background: isDark
              ? 'rgba(56, 189, 248, 0.06)'
              : 'rgba(56, 189, 248, 0.04)',
            border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.15)',
            fontFamily: 'Space Grotesk, Inter, system-ui',
          }}
        >
          Addon import is coming soon — configure your build using the sections on this page.
        </Alert>
      </Box>
    </Stack>
  );
};
