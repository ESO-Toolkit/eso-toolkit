/**
 * General Section — build name, description, class, role, game mode, races, addon import.
 */

import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import {
  ESO_CLASSES,
  ESO_GAME_MODES,
  ESO_RACES,
  ESO_ROLES,
} from '../../data/esoStaticData';
import {
  setAddonImportString,
  setBuildClass,
  setBuildDescription,
  setBuildGameMode,
  setBuildName,
  setBuildRaces,
  setBuildRole,
} from '../../store/buildEditorSlice';

export const GeneralSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build } = useSelector((s: RootState) => s.buildEditor);

  const panelBg = isDark ? alpha('#0f172a', 0.9) : alpha('#ffffff', 0.95);
  const borderColor = isDark ? alpha('#38bdf8', 0.18) : alpha('#0f172a', 0.12);

  const toggleRace = (raceId: string): void => {
    const next = build.races.includes(raceId)
      ? build.races.filter((r) => r !== raceId)
      : [...build.races, raceId];
    dispatch(setBuildRaces(next));
  };

  return (
    <Stack spacing={3}>
      {/* Build Name */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
          Build Name <Box component="span" color="error.main">*</Box>
        </Typography>
        <TextField
          fullWidth
          size="small"
          id="build-name"
          placeholder="Build Name"
          value={build.name}
          onChange={(e) => dispatch(setBuildName(e.target.value))}
          inputProps={{ maxLength: 80 }}
        />
      </Box>

      {/* Short description */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
          Short description
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          size="small"
          id="build-description"
          placeholder="A short introduction text"
          value={build.shortDescription}
          onChange={(e) => dispatch(setBuildDescription(e.target.value))}
          inputProps={{ maxLength: 500 }}
        />
      </Box>

      {/* Class */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
          Class
        </Typography>
        <Select
          fullWidth
          size="small"
          value={build.esoClass}
          onChange={(e) => dispatch(setBuildClass(e.target.value as typeof build.esoClass))}
        >
          {ESO_CLASSES.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: c.color,
                    flexShrink: 0,
                  }}
                />
                {c.label}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Combat Role */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
          Combat Role
        </Typography>
        <Select
          fullWidth
          size="small"
          value={build.role}
          onChange={(e) => dispatch(setBuildRole(e.target.value as typeof build.role))}
        >
          {ESO_ROLES.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: r.color,
                    flexShrink: 0,
                  }}
                />
                {r.label}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Game Mode */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
          Game Mode
        </Typography>
        <Select
          fullWidth
          size="small"
          value={build.gameMode}
          onChange={(e) => dispatch(setBuildGameMode(e.target.value as typeof build.gameMode))}
        >
          {ESO_GAME_MODES.map((m) => (
            <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
          ))}
        </Select>
      </Box>

      {/* Optimal Races */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
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
          background: panelBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 2,
          p: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
          Import from addon string
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
          Import a build from <strong>Combat Metrics</strong> or <strong>Caro&apos;s Skill Point Saver</strong> addon export strings.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            fullWidth
            size="small"
            id="addon-import"
            placeholder="Addon export string"
            value={build.addonImportString}
            onChange={(e) => dispatch(setAddonImportString(e.target.value))}
            multiline
            minRows={2}
          />
          <Tooltip title={build.addonImportString.length < 10 ? 'Paste an export string first' : 'Load build'}>
            <Box>
              <Button
                variant="contained"
                size="small"
                disabled={build.addonImportString.length < 10}
                sx={{ minWidth: 64, height: 36, alignSelf: 'flex-start', mt: 0.5 }}
              >
                Load
              </Button>
            </Box>
          </Tooltip>
        </Stack>
        <Alert severity="info" sx={{ mt: 1.5, py: 0.25, fontSize: 11 }}>
          Addon import is coming soon — manually configure your build using the tabs below.
        </Alert>
      </Box>
    </Stack>
  );
};
