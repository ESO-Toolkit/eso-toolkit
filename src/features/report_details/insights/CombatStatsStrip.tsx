import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import React from 'react';

import mundusIcon from '../../../assets/MundusStone.png';
import type { MetricIntent } from '../../../components/MetricPill';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConsumableItem {
  label: string;
  emoji: string;
  ariaLabel: string;
  tooltip: string;
  display: string;
  color?: string;
  isMundus?: boolean;
  testId?: string;
}

interface CombatStatPill {
  label: string;
  value: string | number;
  suffix?: string;
  intent: MetricIntent;
  tooltip: string;
  /** Visual rendering category */
  category?: 'gauge' | 'hero' | 'secondary';
  /** Raw numeric value for gauge fill calculation */
  numericValue?: number;
}

export interface CombatStatsStripProps {
  consumables: ConsumableItem[];
  combatStats: CombatStatPill[];
  resources?: {
    maxMagicka: number;
    maxHealth: number;
    maxStamina: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const INTENT_COLORS: Record<MetricIntent, { dark: string; light: string }> = {
  success: { dark: '#4cd964', light: '#059669' },
  warning: { dark: '#ff9800', light: '#f97316' },
  danger: { dark: '#ff6666', light: '#dc2626' },
  info: { dark: '#7ee8ff', light: '#0ea5e9' },
  neutral: { dark: '#94a3b8', light: '#64748b' },
};

const getIntentColor = (intent: MetricIntent, isDark: boolean): string =>
  isDark ? INTENT_COLORS[intent].dark : INTENT_COLORS[intent].light;

/* ------------------------------------------------------------------ */
/*  Consumables Row (chip badges)                                      */
/* ------------------------------------------------------------------ */

const ConsumablesRow: React.FC<{ items: ConsumableItem[] }> = React.memo(
  ({ items }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

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
        {items.map((item) => (
          <Tooltip
            key={item.label}
            title={item.tooltip}
            enterTouchDelay={0}
            leaveTouchDelay={3000}
          >
            <Box
              component="span"
              data-testid={item.testId}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                px: 0.75,
                py: 0.25,
                borderRadius: '6px',
                background: isDark
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.03)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              {item.isMundus ? (
                <img
                  src={mundusIcon}
                  alt=""
                  style={{ width: 11, height: 11 }}
                />
              ) : (
                <span
                  role="img"
                  aria-label={item.ariaLabel}
                  style={{ fontSize: '0.7rem' }}
                >
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
                  lineHeight: 1,
                }}
              >
                {item.display}
              </Box>
            </Box>
          </Tooltip>
        ))}
      </Box>
    );
  },
);
ConsumablesRow.displayName = 'ConsumablesRow';

/* ------------------------------------------------------------------ */
/*  Mini Arc Gauge (SVG semicircle)                                    */
/* ------------------------------------------------------------------ */

const GAUGE_CX = 28;
const GAUGE_CY = 30;
const GAUGE_R = 22;
const GAUGE_SW = 6;
const GAUGE_ARC_LEN = Math.PI * GAUGE_R;
const GAUGE_PATH = `M ${GAUGE_CX - GAUGE_R} ${GAUGE_CY} A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${GAUGE_CX + GAUGE_R} ${GAUGE_CY}`;

const MiniArcGauge: React.FC<{
  value: number;
  displayValue: string;
  label: string;
  intent: MetricIntent;
  tooltip: string;
  min?: number;
  max?: number;
}> = React.memo(
  ({ value, displayValue, label, intent, tooltip, min = 80, max = 175 }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const color = getIntentColor(intent, isDark);
    const fillPct = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const fillLen = GAUGE_ARC_LEN * fillPct;
    const trackColor = isDark
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(0,0,0,0.08)';

    return (
      <Tooltip title={tooltip} arrow>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 60,
          }}
        >
          <svg
            width={56}
            height={36}
            viewBox="0 0 56 36"
            aria-hidden="true"
            style={{ overflow: 'visible' }}
          >
            {/* background track */}
            <path
              d={GAUGE_PATH}
              fill="none"
              stroke={trackColor}
              strokeWidth={GAUGE_SW}
              strokeLinecap="round"
            />
            {/* filled arc */}
            {fillPct > 0 && (
              <path
                d={GAUGE_PATH}
                fill="none"
                stroke={color}
                strokeWidth={GAUGE_SW}
                strokeLinecap="round"
                strokeDasharray={`${fillLen} ${GAUGE_ARC_LEN}`}
                style={{
                  filter: isDark
                    ? `drop-shadow(0 0 4px ${color}66)`
                    : 'none',
                  transition: 'stroke-dasharray 0.6s ease',
                }}
              />
            )}
            {/* value text */}
            <text
              x={GAUGE_CX}
              y={GAUGE_CY - 8}
              textAnchor="middle"
              dominantBaseline="auto"
              fill={isDark ? '#ffffff' : '#1e293b'}
              fontSize="13"
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {displayValue}
            </text>
          </svg>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6rem',
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              mt: -0.75,
              lineHeight: 1,
            }}
          >
            {label}
          </Typography>
        </Box>
      </Tooltip>
    );
  },
);
MiniArcGauge.displayName = 'MiniArcGauge';

/* ------------------------------------------------------------------ */
/*  Hero Stat (prominent value — DPS, HPS, etc.)                      */
/* ------------------------------------------------------------------ */

const HeroStat: React.FC<{
  value: string | number;
  suffix?: string;
  label: string;
  intent: MetricIntent;
  tooltip: string;
}> = React.memo(({ value, suffix, label, intent, tooltip }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const color = getIntentColor(intent, isDark);

  return (
    <Tooltip title={tooltip} arrow>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 0.25,
          minWidth: 72,
          borderRadius: '12px',
          background: isDark
            ? 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(3,7,18,0.4) 100%)'
            : 'rgba(255,255,255,0.7)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Typography
          component="div"
          sx={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            textShadow: isDark ? `0 0 16px ${color}30` : 'none',
          }}
        >
          {value}
          {suffix}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.6rem',
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
});
HeroStat.displayName = 'HeroStat';

/* ------------------------------------------------------------------ */
/*  Stat Icons & Visual Badges                                         */
/* ------------------------------------------------------------------ */

const ICON_S = 12;

/** Inline SVG icon resolved by stat label */
const StatIconSvg: React.FC<{
  label: string;
  color: string;
  isDark: boolean;
}> = React.memo(({ label, color, isDark }) => {
  const k = label.toLowerCase();
  return (
    <svg
      width={ICON_S}
      height={ICON_S}
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {k === 'cpm' && (
        <path d="M10.5 0 5 7.5h3L6.5 15 12 7.5H9z" fill={color} />
      )}
      {k === 'dist' && (
        <>
          <path
            d="M8 1C5.5 1 3.5 3 3.5 5.5 3.5 9 8 15 8 15s4.5-6 4.5-9.5C12.5 3 10.5 1 8 1z"
            fill={color}
            opacity={0.9}
          />
          <circle
            cx={8}
            cy={5.5}
            r={1.8}
            fill={isDark ? '#0f172a' : '#fff'}
          />
        </>
      )}
      {k === 'res' && (
        <path
          d="M8 14C2 9.5 1 6 3.5 3.5 5 2 7 2.5 8 4c1-1.5 3-2 4.5-.5C15 6 14 9.5 8 14z"
          fill={color}
        />
      )}
    </svg>
  );
});
StatIconSvg.displayName = 'StatIconSvg';

/* ---- Bar Swap Badge (F/B/S color-coded letter blocks) ------------- */

const BAR_SWAP_COLORS: Record<string, { dark: string; light: string }> = {
  F: { dark: '#5eaef7', light: '#2563eb' },
  B: { dark: '#fbbf24', light: '#d97706' },
  S: { dark: '#64748b', light: '#94a3b8' },
};

const BarSwapBadge: React.FC<{
  value: string;
  tooltip: string;
  isDark: boolean;
}> = React.memo(({ value, tooltip, isDark }) => (
  <Tooltip title={tooltip} arrow>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        px: 0.5,
        py: 0.25,
        borderRadius: '6px',
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      {value.split('').map((ch, i) => {
        const upper = ch.toUpperCase();
        const colors = BAR_SWAP_COLORS[upper] ?? BAR_SWAP_COLORS.S;
        const bg = isDark ? colors.dark : colors.light;
        return (
          <Box
            key={`${upper}${i}`}
            sx={{
              width: 14,
              height: 16,
              borderRadius: '3px',
              background: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark ? `0 0 4px ${bg}40` : 'none',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.55rem',
                fontWeight: 800,
                color: isDark ? '#0f172a' : '#fff',
                lineHeight: 1,
                userSelect: 'none',
              }}
            >
              {upper}
            </Typography>
          </Box>
        );
      })}
    </Box>
  </Tooltip>
));
BarSwapBadge.displayName = 'BarSwapBadge';

/* ---- Death / Survived Badge --------------------------------------- */

const DeathBadge: React.FC<{
  count: number;
  tooltip: string;
  isDark: boolean;
  intent: MetricIntent;
}> = React.memo(({ count, tooltip, isDark, intent }) => {
  const color = getIntentColor(intent, isDark);
  const survived = count === 0;

  return (
    <Tooltip title={tooltip} arrow>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.4,
          px: 0.75,
          py: 0.25,
          borderRadius: '6px',
          background: `${color}${isDark ? '12' : '0a'}`,
          border: `1px solid ${color}30`,
        }}
      >
        <svg
          width={ICON_S}
          height={ICON_S}
          viewBox="0 0 16 16"
          aria-hidden="true"
          style={{ flexShrink: 0, display: 'block' }}
        >
          {survived ? (
            <>
              <path
                d="M8 1 3 3.5v4c0 3.5 2.2 6.2 5 7.5 2.8-1.3 5-4 5-7.5v-4L8 1z"
                fill={color}
                opacity={0.85}
              />
              <path
                d="M5.8 8l1.5 1.5 3-3"
                stroke={isDark ? '#0f172a' : '#fff'}
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <>
              <ellipse
                cx={8}
                cy={6.5}
                rx={5}
                ry={4.5}
                fill={color}
                opacity={0.9}
              />
              <circle
                cx={6}
                cy={5.8}
                r={1.2}
                fill={isDark ? '#0f172a' : '#fff'}
              />
              <circle
                cx={10}
                cy={5.8}
                r={1.2}
                fill={isDark ? '#0f172a' : '#fff'}
              />
              <rect
                x={7.2}
                y={10.5}
                width={1.6}
                height={3}
                rx={0.5}
                fill={color}
                opacity={0.9}
              />
            </>
          )}
        </svg>
        {count > 0 && (
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {count}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
});
DeathBadge.displayName = 'DeathBadge';

/* ------------------------------------------------------------------ */
/*  Secondary Stat Row (visual icon badges)                            */
/* ------------------------------------------------------------------ */

const ICON_STAT_LABELS = new Set(['cpm', 'dist', 'res']);

const SecondaryStatRow: React.FC<{ stats: CombatStatPill[] }> = React.memo(
  ({ stats }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    if (stats.length === 0) return null;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flexWrap: 'wrap',
        }}
      >
        {stats.map((stat) => {
          const color =
            stat.intent === 'neutral'
              ? isDark
                ? '#94a3b8'
                : '#64748b'
              : getIntentColor(stat.intent, isDark);

          /* Bar-swap → color-coded letter blocks */
          if (stat.label === 'Bars') {
            return (
              <BarSwapBadge
                key={stat.label}
                value={String(stat.value)}
                tooltip={stat.tooltip}
                isDark={isDark}
              />
            );
          }

          /* Deaths → skull / shield-check icon */
          if (stat.label === 'Deaths') {
            return (
              <DeathBadge
                key={stat.label}
                count={Number(stat.value)}
                tooltip={stat.tooltip}
                isDark={isDark}
                intent={stat.intent}
              />
            );
          }

          /* Generic icon-badge (CPM, Dist, Res, …) */
          const hasIcon = ICON_STAT_LABELS.has(stat.label.toLowerCase());

          return (
            <Tooltip key={stat.label} title={stat.tooltip} arrow>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.4,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: '6px',
                  background: isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                }}
              >
                {hasIcon && (
                  <StatIconSvg
                    label={stat.label}
                    color={color}
                    isDark={isDark}
                  />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                  {stat.suffix}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    );
  },
);
SecondaryStatRow.displayName = 'SecondaryStatRow';

/* ------------------------------------------------------------------ */
/*  Resource Bars (horizontal gradient bars — ESO-style)               */
/* ------------------------------------------------------------------ */

const RESOURCE_SEGMENTS = [
  {
    key: 'magicka' as const,
    label: 'Magicka',
    colorDark: '#5eaef7',
    colorLight: '#3b82f6',
    gradientDark: 'linear-gradient(90deg, #339af0, #74c0fc)',
    gradientLight: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
  },
  {
    key: 'health' as const,
    label: 'Health',
    colorDark: '#f87171',
    colorLight: '#dc2626',
    gradientDark: 'linear-gradient(90deg, #ee5a5a, #ff8a8a)',
    gradientLight: 'linear-gradient(90deg, #b91c1c, #f87171)',
  },
  {
    key: 'stamina' as const,
    label: 'Stamina',
    colorDark: '#4ade80',
    colorLight: '#16a34a',
    gradientDark: 'linear-gradient(90deg, #37b24d, #6bcf7f)',
    gradientLight: 'linear-gradient(90deg, #047857, #34d399)',
  },
] as const;

/** Abbreviate large numbers: 34745 → "34.7k" */
const abbreviateResource = (val: number): string => {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toLocaleString();
};

const ResourceBars: React.FC<{
  maxMagicka: number;
  maxHealth: number;
  maxStamina: number;
}> = React.memo(({ maxMagicka, maxHealth, maxStamina }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const values: Record<string, number> = {
    magicka: maxMagicka,
    health: maxHealth,
    stamina: maxStamina,
  };
  const total = maxMagicka + maxHealth + maxStamina;
  if (total <= 0) return null;

  // Build segments with percentage widths
  const segments = RESOURCE_SEGMENTS.map((cfg) => ({
    ...cfg,
    value: values[cfg.key],
    pct: (values[cfg.key] / total) * 100,
  })).filter((s) => s.value > 0);

  return (
    <Tooltip
      title={segments
        .map((s) => `${s.label}: ${s.value.toLocaleString()}`)
        .join(' · ')}
      arrow
    >
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height: 18,
          borderRadius: '9px',
          overflow: 'hidden',
          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }}
      >
        {segments.map((seg, idx) => (
          <Box
            key={seg.key}
            sx={{
              width: `${seg.pct}%`,
              height: '100%',
              background: isDark ? seg.gradientDark : seg.gradientLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              // Subtle separator between segments
              borderRight:
                idx < segments.length - 1
                  ? `1px solid ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'}`
                  : 'none',
              transition: 'width 0.5s ease',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            {/* Value inside bar — only show if segment is wide enough */}
            {seg.pct > 15 && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: isDark ? 'rgba(255,255,255,0.95)' : '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {abbreviateResource(seg.value)}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Tooltip>
  );
});
ResourceBars.displayName = 'ResourceBars';

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const CombatStatsStrip: React.FC<CombatStatsStripProps> = React.memo(
  ({ consumables, combatStats, resources }) => {
    // Group stats by rendering category
    const gauges = combatStats.filter((s) => s.category === 'gauge');
    const heroes = combatStats.filter((s) => s.category === 'hero');
    const secondary = combatStats.filter(
      (s) => !s.category || s.category === 'secondary',
    );

    const hasGaugesOrHeroes = gauges.length > 0 || heroes.length > 0;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {/* Consumables + secondary stats — unified single row */}
        {(consumables.length > 0 || secondary.length > 0) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 0.5,
              minHeight: 24,
            }}
          >
            {/* Left: consumables */}
            <ConsumablesRow items={consumables} />

            {/* Right: secondary stats */}
            <SecondaryStatRow stats={secondary} />
          </Box>
        )}

        {/* Performance gauges + hero stat */}
        {hasGaugesOrHeroes && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            {gauges[0] && gauges[0].numericValue != null && (
              <MiniArcGauge
                value={gauges[0].numericValue}
                displayValue={`${gauges[0].value}${gauges[0].suffix ?? ''}`}
                label={gauges[0].label}
                intent={gauges[0].intent}
                tooltip={gauges[0].tooltip}
                min={0}
                max={100}
              />
            )}
            {heroes.map((h) => (
              <HeroStat
                key={h.label}
                value={h.value}
                suffix={h.suffix}
                label={h.label}
                intent={h.intent}
                tooltip={h.tooltip}
              />
            ))}
            {gauges[1] && gauges[1].numericValue != null && (
              <MiniArcGauge
                value={gauges[1].numericValue}
                displayValue={`${gauges[1].value}${gauges[1].suffix ?? ''}`}
                label={gauges[1].label}
                intent={gauges[1].intent}
                tooltip={gauges[1].tooltip}
                min={50}
                max={125}
              />
            )}
          </Box>
        )}

        {/* Resource bars */}
        {resources &&
          (resources.maxMagicka > 0 ||
            resources.maxHealth > 0 ||
            resources.maxStamina > 0) && (
            <ResourceBars
              maxMagicka={resources.maxMagicka}
              maxHealth={resources.maxHealth}
              maxStamina={resources.maxStamina}
            />
          )}
      </Box>
    );
  },
);
CombatStatsStrip.displayName = 'CombatStatsStrip';
