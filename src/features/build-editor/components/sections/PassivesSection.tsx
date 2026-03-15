/**
 * Passives Section — searchable skill passives per skill line.
 */

import {
  Box,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { searchSkills } from '../../../loadout-manager/data/skillLineSkills';
import { togglePassive } from '../../store/buildEditorSlice';

export const PassivesSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (query.length < 2) return [];
    return searchSkills(query)
      .filter((s) => s.isPassive)
      .slice(0, 60);
  }, [query]);

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        fullWidth
        placeholder="Search passives (type 2+ chars)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Results */}
      {results.length > 0 && (
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>
            Search Results
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {results.map((skill) => {
              const active = setup.passives.includes(skill.id);
              return (
                <Chip
                  key={skill.id}
                  label={skill.name}
                  size="small"
                  onClick={() => dispatch(togglePassive(skill.id))}
                  variant={active ? 'filled' : 'outlined'}
                  color={active ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer', fontWeight: active ? 700 : 400 }}
                />
              );
            })}
          </Box>
        </Stack>
      )}

      {/* Selected passives */}
      {setup.passives.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.75, display: 'block' }}>
            Selected Passives ({setup.passives.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {setup.passives.map((id) => (
              <Chip
                key={id}
                label={`Passive #${id}`}
                size="small"
                onDelete={() => dispatch(togglePassive(id))}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {setup.passives.length === 0 && query.length < 2 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            background: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
            border: `1px dashed ${isDark ? alpha('#fff', 0.1) : alpha('#000', 0.08)}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" color="text.disabled">
            Search for a passive skill above to add it to your build
          </Typography>
        </Box>
      )}
    </Stack>
  );
};
