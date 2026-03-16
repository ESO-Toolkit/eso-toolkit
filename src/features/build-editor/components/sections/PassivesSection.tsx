/**
 * Passives Section — glass-style search input, accent-themed chips with
 * ESO-Hub skill icons, animated selection with glass empty state.
 */

import { Avatar, Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useDeferredValue, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { getSkillById, searchSkills } from '../../../loadout-manager/data/skillLineSkills';
import { togglePassive } from '../../store/buildEditorSlice';
import { glassInputSx } from '../primitives/glassInputSx';

const ICON_URL = 'https://eso-hub.com/storage/icons/';

/** Render a skill icon Avatar for Chip usage (or null if no icon). */
const SkillIcon: React.FC<{ icon?: string; name: string }> = ({ icon, name }) =>
  icon ? (
    <Avatar
      src={`${ICON_URL}${icon}.png`}
      alt={name}
      sx={{ width: 20, height: 20, bgcolor: 'transparent' }}
      imgProps={{ loading: 'lazy' }}
    />
  ) : null;

export const PassivesSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const [query, setQuery] = useState('');
  // Defers the expensive search to a lower-priority update, preventing input lag
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    if (deferredQuery.length < 2) return [];
    return searchSkills(deferredQuery)
      .filter((s) => s.isPassive)
      .slice(0, 60);
  }, [deferredQuery]);

  /** Accent chip styles for selected state */
  const accentChipSx = {
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 11,
    fontFamily: 'Space Grotesk, Inter, system-ui',
    background:
      'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.22), rgba(var(--be-accent-rgb, 56, 189, 248), 0.10))',
    border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)',
    color: 'var(--be-accent, #38bdf8)',
    boxShadow: '0 0 8px rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)',
    '& .MuiChip-deleteIcon': {
      color: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.60)',
      '&:hover': { color: 'var(--be-accent, #38bdf8)' },
    },
  };

  return (
    <Stack spacing={1.5}>
      {/* Glass search input */}
      <TextField
        size="small"
        fullWidth
        placeholder="Search passives (2+ chars)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        inputProps={{
          'aria-label': 'Search passive abilities',
          'aria-describedby': 'passives-hint',
        }}
        sx={glassInputSx(isDark)}
      />

      {/* Results — glass-style chips with skill icons */}
      {results.length > 0 && (
        <Stack spacing={0.5}>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            Search Results
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {results.map((skill) => {
              const active = setup.passives.includes(skill.id);
              return (
                <Chip
                  key={skill.id}
                  avatar={<SkillIcon icon={skill.icon} name={skill.name} />}
                  label={skill.name}
                  size="small"
                  onClick={() => dispatch(togglePassive(skill.id))}
                  variant={active ? 'filled' : 'outlined'}
                  sx={
                    active
                      ? { ...accentChipSx, cursor: 'pointer' }
                      : {
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: 11,
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
                          backdropFilter: 'blur(4px)',
                          transition: 'all 0.15s',
                          '&:hover': {
                            borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.30)',
                            background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.05)',
                          },
                        }
                  }
                />
              );
            })}
          </Box>
        </Stack>
      )}

      {/* Selected passives — accent-themed with animated layout & icons */}
      {setup.passives.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              mb: 0.75,
              display: 'block',
              fontSize: 11,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
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
                      avatar={<SkillIcon icon={skill?.icon} name={skill?.name ?? ''} />}
                      label={skill?.name ?? `Passive #${id}`}
                      size="small"
                      onDelete={() => dispatch(togglePassive(id))}
                      variant="filled"
                      sx={accentChipSx}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Box>
        </Box>
      )}

      {/* Glass empty state */}
      {setup.passives.length === 0 && query.length < 2 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            border: `1px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 3,
          }}
        >
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontStyle: 'italic' }}
          >
            Search for passives above to add them
          </Typography>
        </Box>
      )}
    </Stack>
  );
};
