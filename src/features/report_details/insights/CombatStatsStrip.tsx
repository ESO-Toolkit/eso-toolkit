import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import React from 'react';

import mundusIcon from '../../../assets/MundusStone.png';
import { MetricPill } from '../../../components/MetricPill';
import type { MetricIntent } from '../../../components/MetricPill';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConsumableItem {
  label: string;
  emoji: string;
  ariaLabel: string;
  tooltip: string;
  /** Bold display text (e.g. "THIEF", "DCT", "3×TRI") */
  display: string;
  /** Optional color override for the display text */
  color?: string;
  /** If true, render the mundus stone icon instead of an emoji */
  isMundus?: boolean;
  /** Optional testId for the span */
  testId?: string;
}

interface CombatStatPill {
  label: string;
  value: string | number;
  suffix?: string;
  intent: MetricIntent;
  tooltip: string;
}

export interface CombatStatsStripProps {
  /** Consumable items (mundus, food, potion) — rendered as a compact dot-separated row */
  consumables: ConsumableItem[];
  /** Combat stat pills (crit dmg, CPM, deaths, etc.) — rendered as MetricPill components */
  combatStats: CombatStatPill[];
  /** Resource pool values */
  resources?: {
    maxMagicka: number;
    maxHealth: number;
    maxStamina: number;
  };
  /** Champion points */
  championPoints?: Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }>;
  /** Activity counters — deaths, resurrects, and other encounter facts */
  activity?: {
    deaths: number;
    resurrects: number;
    /** Optional link URL for CPM */
    cpmUrl?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const ConsumablesRow: React.FC<{ items: ConsumableItem[] }> = React.memo(({ items }) => {
  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flexWrap: 'wrap',
        minHeight: 24,
      }}
    >
      {items.map((item, idx) => (
        <React.Fragment key={item.label}>
          {idx > 0 && (
            <Typography
              component="span"
              variant="caption"
              sx={{ color: 'text.secondary', fontSize: '0.7rem', mx: 0.25 }}
            >
              ·
            </Typography>
          )}
          <Tooltip title={item.tooltip} enterTouchDelay={0} leaveTouchDelay={3000}>
            <Box
              component="span"
              data-testid={item.testId}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              {item.isMundus ? (
                <img src={mundusIcon} alt="" style={{ width: 12, height: 12 }} />
              ) : (
                <span role="img" aria-label={item.ariaLabel} style={{ fontSize: '0.8rem' }}>
                  {item.emoji}
                </span>
              )}
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: 8, sm: 9, md: 10 },
                  letterSpacing: '.01em',
                  color: item.color ?? 'text.secondary',
                  textTransform: 'uppercase',
                }}
              >
                {item.display}
              </Box>
            </Box>
          </Tooltip>
        </React.Fragment>
      ))}
    </Box>
  );
});
ConsumablesRow.displayName = 'ConsumablesRow';

const CombatStatsPillRow: React.FC<{ stats: CombatStatPill[] }> = React.memo(({ stats }) => {
  if (stats.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: 'flex-start',
      }}
    >
      {stats.map((stat) => (
        <MetricPill
          key={stat.label}
          label={stat.label}
          value={stat.value}
          suffix={stat.suffix}
          intent={stat.intent}
          size="sm"
          tooltip={stat.tooltip}
        />
      ))}
    </Box>
  );
});
CombatStatsPillRow.displayName = 'CombatStatsPillRow';

const ResourcePoolsRow: React.FC<{
  maxMagicka: number;
  maxHealth: number;
  maxStamina: number;
}> = React.memo(({ maxMagicka, maxHealth, maxStamina }) => {
  const theme = useTheme();

  if (maxMagicka <= 0 && maxHealth <= 0 && maxStamina <= 0) return null;

  const pools = [
    {
      key: 'magicka',
      value: maxMagicka,
      label: 'Max Magicka',
      gradientDark:
        'radial-gradient(circle at 30% 30%, #8cc8ff 0%, #74c0fc 50%, #339af0 100%)',
      gradientLight:
        'radial-gradient(circle at 30% 30%, #60a5fa 0%, #2563eb 50%, #1d4ed8 100%)',
      shadowDark:
        '0 0 8px rgba(116, 192, 252, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
      shadowLight:
        '0 0 6px rgba(37, 99, 235, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
    },
    {
      key: 'health',
      value: maxHealth,
      label: 'Max Health',
      gradientDark:
        'radial-gradient(circle at 30% 30%, #ff8a8a 0%, #ff6b6b 50%, #ee5a5a 100%)',
      gradientLight:
        'radial-gradient(circle at 30% 30%, #f87171 0%, #dc2626 50%, #b91c1c 100%)',
      shadowDark:
        '0 0 8px rgba(255, 107, 107, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
      shadowLight:
        '0 0 6px rgba(220, 38, 38, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
    },
    {
      key: 'stamina',
      value: maxStamina,
      label: 'Max Stamina',
      gradientDark:
        'radial-gradient(circle at 30% 30%, #6bcf7f 0%, #51cf66 50%, #37b24d 100%)',
      gradientLight:
        'radial-gradient(circle at 30% 30%, #34d399 0%, #059669 50%, #047857 100%)',
      shadowDark:
        '0 0 8px rgba(81, 207, 102, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
      shadowLight:
        '0 0 6px rgba(5, 150, 105, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
    },
  ].filter((p) => p.value > 0);

  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
      }}
    >
      {pools.map((pool) => (
        <Box
          key={pool.key}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            flex: 1,
          }}
        >
          <Tooltip title={pool.label} enterTouchDelay={0} leaveTouchDelay={3000}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: isDark ? pool.gradientDark : pool.gradientLight,
                boxShadow: isDark ? pool.shadowDark : pool.shadowLight,
                cursor: 'default',
              }}
            />
          </Tooltip>
          <Typography
            variant="caption"
            sx={{
              color: isDark ? '#ffffff' : '#374151',
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            {pool.value.toLocaleString()}
          </Typography>
        </Box>
      ))}
    </Box>
  );
});
ResourcePoolsRow.displayName = 'ResourcePoolsRow';

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const CombatStatsStrip: React.FC<CombatStatsStripProps> = React.memo(
  ({ consumables, combatStats, resources }) => {
    const theme = useTheme();

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {/* Consumables row */}
        <ConsumablesRow items={consumables} />

        {/* Combat stat pills */}
        <CombatStatsPillRow stats={combatStats} />

        {/* Resource pools */}
        {resources &&
          (resources.maxMagicka > 0 ||
            resources.maxHealth > 0 ||
            resources.maxStamina > 0) && (
            <Box
              sx={{
                p: 1,
                borderRadius: '10px',
                background:
                  'linear-gradient(135deg, rgb(153 210 255 / 15%) 0%, rgb(255 210 210 / 33%) 55%, rgb(177 255 205 / 29%) 100%)',
                border:
                  theme.palette.mode === 'dark'
                    ? '1px solid rgba(255,255,255,0.05)'
                    : '1px solid rgba(0,0,0,0.05)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <ResourcePoolsRow
                maxMagicka={resources.maxMagicka}
                maxHealth={resources.maxHealth}
                maxStamina={resources.maxStamina}
              />
            </Box>
          )}
      </Box>
    );
  },
);

CombatStatsStrip.displayName = 'CombatStatsStrip';
