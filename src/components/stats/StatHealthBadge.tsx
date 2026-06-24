/**
 * StatHealthBadge — compact survivability badge: Max Health, Effective HP, and
 * damage mitigation %.
 *
 * Neutral / presentational: takes a pure `Survivability` (from @/engine) and
 * renders it, so the Build Editor, Loadout Manager, cards and comparator can all
 * reuse it. EHP is split physical/spell in the data (surfaced via tooltip); the
 * headline EHP is the worst-case (lower) channel.
 *
 * ⚠️ Health / EHP are research-derived estimates pending in-game validation —
 * the tooltip says so. See the engine constants + PR for sources.
 */

import { FavoriteBorder, Security, Shield } from '@mui/icons-material';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import type { Survivability } from '@/engine';

export interface StatHealthBadgeProps {
  survivability: Survivability;
  /** `compact` = inline pill (cards / strips); `full` = labelled tile row. */
  variant?: 'compact' | 'full';
}

/** 24,531 → "24.5k" for compact display; full numbers stay grouped. */
function abbreviate(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

const DISCLAIMER =
  'Estimated from documented ESO formulas (pending in-game validation). Excludes gear set bonuses, food, champion-point damage reductions and most situational buffs.';

const StatHealthBadgeComponent: React.FC<StatHealthBadgeProps> = ({
  survivability,
  variant = 'compact',
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { health, physical, spell } = survivability;
  // Worst-case (lower) channel is the survivability floor.
  const worst = physical.ehp <= spell.ehp ? physical : spell;
  const ehp = worst.ehp;
  const mitigationPct = Math.round(worst.mitigation * 100);

  const ehpTooltip = `Effective HP = Max Health ÷ (1 − mitigation). Physical ${physical.ehp.toLocaleString()} · Spell ${spell.ehp.toLocaleString()}. ${DISCLAIMER}`;

  const heartColor = '#f87171';
  const shieldColor = isDark ? '#38bdf8' : '#0284c7';
  const mitColor = isDark ? '#a78bfa' : '#7c3aed';

  if (variant === 'compact') {
    return (
      <Tooltip arrow title={ehpTooltip}>
        <Stack
          direction="row"
          spacing={1}
          role="group"
          tabIndex={0}
          aria-label={`Max Health ${health.total.toLocaleString()}, Effective HP ${ehp.toLocaleString()} (worst-case of Physical ${physical.ehp.toLocaleString()} and Spell ${spell.ehp.toLocaleString()}), ${mitigationPct}% mitigation. Estimate pending in-game validation.`}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1,
            py: 0.4,
            borderRadius: '999px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            fontFamily: 'Space Grotesk, Inter, system-ui',
          }}
        >
          <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
            <FavoriteBorder sx={{ fontSize: 13, color: heartColor }} />
            <Typography
              sx={{ fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
            >
              {abbreviate(health.total)}
            </Typography>
          </Stack>
          <Box
            sx={{
              width: '1px',
              height: 12,
              backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
            }}
          />
          <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
            <Shield sx={{ fontSize: 13, color: shieldColor }} />
            <Typography
              sx={{ fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
            >
              {abbreviate(ehp)}
            </Typography>
          </Stack>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 600,
              color: mitColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {mitigationPct}%
          </Typography>
        </Stack>
      </Tooltip>
    );
  }

  // Full variant — three labelled tiles.
  const Tile: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    title?: string;
  }> = ({ icon, label, value, color, title }) => (
    <Tooltip arrow title={title ?? ''} disableHoverListener={!title}>
      <Box
        sx={{
          flex: 1,
          minWidth: 84,
          px: 1.25,
          py: 1,
          borderRadius: 2,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.25 }}>
          <Box sx={{ display: 'flex', color }}>{icon}</Box>
          <Typography
            sx={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            {label}
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 700,
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Tooltip>
  );

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }} useFlexGap>
      <Tile
        icon={<FavoriteBorder sx={{ fontSize: 14 }} />}
        label="Max Health"
        value={health.total.toLocaleString()}
        color={heartColor}
        title={DISCLAIMER}
      />
      <Tile
        icon={<Shield sx={{ fontSize: 14 }} />}
        label="Effective HP"
        value={ehp.toLocaleString()}
        color={shieldColor}
        title={ehpTooltip}
      />
      <Tile
        icon={<Security sx={{ fontSize: 14 }} />}
        label="Mitigation"
        value={`${mitigationPct}%`}
        color={mitColor}
        title={`Damage mitigation from ${worst.resistance.toLocaleString()} resistance (660 resistance = 1%, cap 50%).`}
      />
    </Stack>
  );
};

export const StatHealthBadge = React.memo(StatHealthBadgeComponent);
