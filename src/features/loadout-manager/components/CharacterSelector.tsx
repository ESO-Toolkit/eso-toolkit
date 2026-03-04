/**
 * Character Selector Component
 * Compact dropdown selector for characters imported from the addon.
 * Replaces the horizontal pill bar with a standard Select for consistency
 * and to reduce vertical space in the toolbar.
 */

import {
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { setCurrentCharacter, updateCharacterRole } from '../store/loadoutSlice';
import type { ClassSkillLine } from '../types/loadout.types';

const ROLE_OPTIONS = ['DPS', 'Tank', 'Healer', 'Support'] as const;

const formatRole = (role?: string): string => role ?? 'Unknown';

const formatSkillLines = (skillLines?: ClassSkillLine[]): string => {
  if (!skillLines || skillLines.length === 0) return '';
  return skillLines.map((line) => line.split('_')[1]).join(', ');
};

export const CharacterSelector: React.FC = (): React.ReactElement => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const glassTextField = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      backdropFilter: 'blur(12px)',
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
      },
      '&.Mui-focused': {
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        borderColor: theme.palette.primary.main,
      },
    },
  };
  const currentCharacter = useSelector((state: RootState) => state.loadout.currentCharacter);
  const characters = useSelector((state: RootState) => state.loadout.characters);
  const sortedCharacters = useMemo(
    () => [...characters].sort((a, b) => a.name.localeCompare(b.name)),
    [characters],
  );

  const hasCharacters = sortedCharacters.length > 0;

  const handleChange = (event: SelectChangeEvent<string>): void => {
    dispatch(setCurrentCharacter(event.target.value));
  };

  const handleRoleChange = (characterId: string, newRole: string): void => {
    dispatch(updateCharacterRole({ characterId, role: newRole }));
  };

  if (!hasCharacters) {
    return (
      <FormControl size="small" sx={{ minWidth: 200, ...glassTextField }} disabled>
        <InputLabel id="character-select-label">Character</InputLabel>
        <Select labelId="character-select-label" value="" label="Character">
          <MenuItem value="" disabled>
            <Typography variant="body2" color="text.secondary">
              Import Wizard&apos;s Wardrobe data first
            </Typography>
          </MenuItem>
        </Select>
      </FormControl>
    );
  }

  return (
    <>
      <FormControl size="small" sx={{ minWidth: 200, ...glassTextField }}>
        <InputLabel id="character-select-label">Character</InputLabel>
        <Select
          labelId="character-select-label"
          value={currentCharacter ?? ''}
          label="Character"
          onChange={handleChange}
          renderValue={(value) => {
            const char = sortedCharacters.find((c) => c.id === value);
            if (!char) return 'Select character';
            return `${char.name} · ${formatRole(char.role)}`;
          }}
          MenuProps={{
            slotProps: {
              paper: {
                sx: {
                  borderRadius: '10px',
                  backdropFilter: 'blur(12px)',
                  backgroundColor: isDarkMode ? 'rgba(20,20,30,0.92)' : 'rgba(255,255,255,0.94)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                },
              },
            },
          }}
        >
          {sortedCharacters.map((char) => {
            const skillInfo = formatSkillLines(char.skillLines);
            return (
              <MenuItem key={char.id} value={char.id}>
                <ListItemText
                  primary={char.name}
                  secondary={
                    <Stack
                      component="span"
                      direction="row"
                      spacing={0.5}
                      sx={{ display: 'inline-flex' }}
                    >
                      <Typography component="span" variant="caption" color="text.secondary">
                        {formatRole(char.role)}
                      </Typography>
                      {skillInfo && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          · {skillInfo}
                        </Typography>
                      )}
                    </Stack>
                  }
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                />
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {/* Role selector for the currently selected character */}
      {currentCharacter && hasCharacters && (
        <FormControl size="small" sx={{ minWidth: 100, ...glassTextField }}>
          <InputLabel id="role-select-label">Role</InputLabel>
          <Select
            labelId="role-select-label"
            value={sortedCharacters.find((c) => c.id === currentCharacter)?.role ?? 'DPS'}
            label="Role"
            onChange={(e) => handleRoleChange(currentCharacter, e.target.value)}
            MenuProps={{
              slotProps: {
                paper: {
                  sx: {
                    borderRadius: '10px',
                    backdropFilter: 'blur(12px)',
                    backgroundColor: isDarkMode ? 'rgba(20,20,30,0.92)' : 'rgba(255,255,255,0.94)',
                    border: `1px solid ${
                      isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                    }`,
                  },
                },
              },
            }}
          >
            {ROLE_OPTIONS.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </>
  );
};
