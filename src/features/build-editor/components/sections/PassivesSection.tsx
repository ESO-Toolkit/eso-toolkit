/**
 * Passives Section — searchable skill passives with animated chip selection.
 */

import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { getSkillById, searchSkills } from '../../../loadout-manager/data/skillLineSkills';
import { togglePassive } from '../../store/buildEditorSlice';

export const PassivesSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();
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
    <Stack spacing={1.5}>
      <TextField
        size="small"
        fullWidth
        placeholder="Search passives (2+ chars)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Results */}
      {results.length > 0 && (
        <Stack spacing={0.5}>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontWeight: 700, fontSize: 10 }}
          >
            Search Results
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
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
                  sx={{ cursor: 'pointer', fontWeight: active ? 700 : 400, fontSize: 11 }}
                />
              );
            })}
          </Box>
        </Stack>
      )}

      {/* Selected passives */}
      {setup.passives.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, mb: 0.5, display: 'block', fontSize: 11 }}
          >
            Selected ({setup.passives.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <AnimatePresence>
              {setup.passives.map((id) => {
                const skill = getSkillById(id);
                return (
                  <motion.div
                    key={id}
                    layout={!prefersReduced}
                    initial={prefersReduced ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={prefersReduced ? undefined : { scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Chip
                      label={skill?.name ?? `Passive #${id}`}
                      size="small"
                      onDelete={() => dispatch(togglePassive(id))}
                      color="primary"
                      variant="filled"
                      sx={{ fontWeight: 700, fontSize: 11 }}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Box>
        </Box>
      )}

      {setup.passives.length === 0 && query.length < 2 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            background: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
            border: `1px dashed ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06)}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="caption" color="text.disabled">
            Search for passives above to add them
          </Typography>
        </Box>
      )}
    </Stack>
  );
};
