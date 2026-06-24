/**
 * SetupStatsStrip — compact, gear-derived stat preview for a loadout setup.
 *
 * A LoadoutSetup carries no character context (race/class/mundus/attributes), so
 * the stats here are GEAR-DERIVED using standard PvE buff assumptions. Built on the
 * neutral `@/engine` (via the loadout adapter) and the neutral `@/components/stats`
 * primitives — it imports NO build-editor components, preserving the one-way
 * dependency.
 */

import { ExpandMore as ExpandIcon, InfoOutlined } from '@mui/icons-material';
import { Box, Collapse, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useId, useMemo, useState } from 'react';

import { StatBreakdown } from '@/components/stats/StatBreakdown';
import { StatGauge } from '@/components/stats/StatGauge';
import { StatHealthBadge } from '@/components/stats/StatHealthBadge';
import { calculateBuildStats, calculateSurvivability, loadoutSetupToEngineInputs } from '@/engine';
import type { LoadoutStatContext } from '@/engine';

import type { GearConfig, LoadoutSetup } from '../types/loadout.types';

interface SetupStatsStripProps {
  setup: LoadoutSetup;
  /** Optional character context (race/class/mundus) to enrich the gear-derived stats. */
  context?: LoadoutStatContext;
}

function hasAnyGear(gear: GearConfig): boolean {
  return Object.entries(gear).some(([key, piece]) => key !== 'mythic' && Boolean(piece?.id));
}

const SetupStatsStripComponent: React.FC<SetupStatsStripProps> = ({ setup, context }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [breakdownExpanded, setBreakdownExpanded] = useState(false);
  const breakdownId = useId();

  const gearPresent = hasAnyGear(setup.gear ?? {});

  const { stats, survivability } = useMemo(() => {
    const { setup: engineSetup, build } = loadoutSetupToEngineInputs(setup, context);
    return {
      stats: calculateBuildStats(engineSetup, build),
      survivability: calculateSurvivability(engineSetup, build),
    };
  }, [setup, context]);

  const labelSx = {
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    fontFamily: 'Space Grotesk, Inter, system-ui',
  };

  return (
    <Box
      sx={{
        borderRadius: 2,
        p: { xs: 1.5, md: 2 },
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={labelSx}>
          Gear-Derived Stats
        </Typography>
        <Tooltip
          arrow
          title="Estimated from this setup's gear using standard PvE buff assumptions. A loadout has no character context (race, class, mundus, attributes, champion points), so these reflect gear only."
        >
          <InfoOutlined
            sx={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}
          />
        </Tooltip>
        {gearPresent && (
          <>
            <Box sx={{ flex: 1 }} />
            <StatHealthBadge survivability={survivability} variant="compact" />
          </>
        )}
      </Stack>

      {!gearPresent ? (
        <Typography
          sx={{
            fontSize: 12,
            fontStyle: 'italic',
            color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
            py: 1,
          }}
        >
          Add gear to preview stats.
        </Typography>
      ) : (
        <>
          {/* Gauges */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(78px, 1fr))',
              gap: 1.5,
              justifyItems: 'center',
              py: 0.5,
            }}
          >
            <StatGauge label="Penetration" result={stats.penetration} size={64} />
            <StatGauge label="Crit Damage" result={stats.critDamage} isPercent size={64} />
            <StatGauge label="Crit Chance" result={stats.critChance} isPercent size={64} />
            <StatGauge label="Armor" result={stats.armor} size={64} />
          </Box>

          {/* Source breakdown (collapsible) */}
          <Box
            onClick={() => setBreakdownExpanded((v) => !v)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              mt: 1,
              py: 0.75,
              minHeight: 44,
              borderRadius: 1,
              '&:hover': { background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
            }}
            role="button"
            aria-expanded={breakdownExpanded}
            aria-controls={breakdownId}
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setBreakdownExpanded((v) => !v);
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
          <Collapse in={breakdownExpanded} timeout={200} id={breakdownId}>
            <Stack spacing={0.5} sx={{ pl: 1, pt: 0.5 }}>
              <StatBreakdown label="Penetration" result={stats.penetration} />
              <StatBreakdown label="Critical Damage" result={stats.critDamage} isPercent />
              <StatBreakdown label="Critical Chance" result={stats.critChance} isPercent />
              <StatBreakdown label="Armor" result={stats.armor} />
            </Stack>
          </Collapse>
        </>
      )}
    </Box>
  );
};

export const SetupStatsStrip = React.memo(SetupStatsStripComponent);
