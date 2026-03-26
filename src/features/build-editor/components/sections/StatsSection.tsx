/**
 * StatsSection — Real-time stat preview with gauges, buff toggles, and breakdowns.
 * Computes penetration, crit damage, crit chance, and armor from the current build.
 */

import { ExpandMore as ExpandIcon } from '@mui/icons-material';
import { Box, Checkbox, Collapse, FormControlLabel, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import {
  CRIT_DMG_BUFFS,
  CRIT_DMG_GEAR,
  DEFAULT_STAT_OVERRIDES,
  PEN_BUFFS,
} from '../../engine/stat-constants';
import { calculateBuildStats } from '../../engine/stat-engine';
import type { StatOverrides } from '../../engine/stat-types';
import { setStatOverrides as setStatOverridesAction } from '../../store/buildEditorSlice';
import { StatBreakdown } from '../primitives/StatBreakdown';
import { StatGauge } from '../primitives/StatGauge';

export const StatsSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const [buffsExpanded, setBuffsExpanded] = useState(false);
  const [breakdownExpanded, setBreakdownExpanded] = useState(false);

  // Resolve overrides — use stored overrides or canonical defaults
  const overrides: StatOverrides = useMemo(
    () => setup.statOverrides ?? DEFAULT_STAT_OVERRIDES,
    [setup.statOverrides],
  );

  // Compute stats
  const stats = useMemo(
    () => calculateBuildStats(setup, build, overrides),
    [setup, build, overrides],
  );

  // Update helpers
  const updateOverrides = useCallback(
    (patch: Partial<StatOverrides>) => {
      dispatch(setStatOverridesAction({ ...overrides, ...patch }));
    },
    [dispatch, overrides],
  );

  const toggleBuff = useCallback(
    (name: string) => {
      updateOverrides({
        buffs: { ...overrides.buffs, [name]: !overrides.buffs[name] },
      });
    },
    [overrides, updateOverrides],
  );

  // All available buff toggles for current game mode
  const availableBuffs = useMemo(() => {
    const mode = build.gameMode;
    return [
      ...PEN_BUFFS.filter((b) => b.modes.includes(mode)),
      ...CRIT_DMG_BUFFS.filter((b) => b.modes.includes(mode)),
      ...CRIT_DMG_GEAR.filter((b) => b.modes.includes(mode)),
    ];
  }, [build.gameMode]);

  const labelSx = {
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    fontFamily: 'Space Grotesk, Inter, system-ui',
  };

  return (
    <Stack spacing={2}>
      {/* Gauges row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
          gap: 2,
          justifyItems: 'center',
          py: 1,
        }}
      >
        <StatGauge label="Penetration" result={stats.penetration} />
        <StatGauge label="Crit Damage" result={stats.critDamage} isPercent />
        <StatGauge label="Crit Chance" result={stats.critChance} isPercent />
        <StatGauge label="Armor" result={stats.armor} />
      </Box>

      {/* Buff toggles (expandable) */}
      <Box>
        <Box
          onClick={() => setBuffsExpanded(!buffsExpanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            py: 0.5,
            px: 0.5,
            borderRadius: 1,
            transition: 'background 0.15s',
            '&:hover': {
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            },
          }}
          role="button"
          aria-expanded={buffsExpanded}
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setBuffsExpanded(!buffsExpanded);
            }
          }}
        >
          <ExpandIcon
            sx={{
              fontSize: 16,
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
              transform: buffsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={labelSx}>
            Buff Toggles
          </Typography>
        </Box>

        <Collapse in={buffsExpanded} timeout={200}>
          <Box sx={{ pl: 1, pt: 0.5 }}>
            {/* Buff checkboxes */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 0,
              }}
            >
              {availableBuffs.map((buff) => (
                <FormControlLabel
                  key={buff.name}
                  control={
                    <Checkbox
                      checked={overrides.buffs[buff.name] ?? buff.defaultEnabled}
                      onChange={() => toggleBuff(buff.name)}
                      size="small"
                      sx={{
                        color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)',
                        '&.Mui-checked': { color: 'var(--be-accent, #38bdf8)' },
                        p: 0.5,
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                      }}
                    >
                      {buff.name}
                      <Box
                        component="span"
                        sx={{
                          fontSize: 9,
                          ml: 0.5,
                          color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.28)',
                        }}
                      >
                        ({buff.value}
                        {buff.stat === 'critDamage' ? '%' : ''})
                      </Box>
                    </Typography>
                  }
                  sx={{ m: 0, py: 0.15 }}
                />
              ))}
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* Source breakdowns (expandable) */}
      <Box>
        <Box
          onClick={() => setBreakdownExpanded(!breakdownExpanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            py: 0.5,
            px: 0.5,
            borderRadius: 1,
            transition: 'background 0.15s',
            '&:hover': {
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            },
          }}
          role="button"
          aria-expanded={breakdownExpanded}
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setBreakdownExpanded(!breakdownExpanded);
            }
          }}
        >
          <ExpandIcon
            sx={{
              fontSize: 16,
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
              transform: breakdownExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={labelSx}>
            Source Breakdown
          </Typography>
        </Box>

        <Collapse in={breakdownExpanded} timeout={200}>
          <Stack spacing={0.5} sx={{ pl: 1, pt: 0.5 }}>
            <StatBreakdown label="Penetration" result={stats.penetration} />
            <StatBreakdown label="Critical Damage" result={stats.critDamage} isPercent />
            <StatBreakdown label="Critical Chance" result={stats.critChance} isPercent />
            <StatBreakdown label="Armor" result={stats.armor} />
          </Stack>
        </Collapse>
      </Box>
    </Stack>
  );
};
