import { SvgIcon, useTheme } from '@mui/material';
import React from 'react';

import type { StatChipId } from './statChipConfig';
import { getChipIconColor } from './statChipConfig';

/**
 * Icon dimension — either a fixed pixel value or a responsive map keyed by
 * MUI breakpoint (e.g. `{ xs: 18, md: 16 }`). Responsive sizing lets the metric
 * row render larger, touch-friendly icons on mobile while staying compact on
 * desktop.
 */
type ResponsiveSize = number | Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number>>;

interface StatChipIconProps {
  chipId: StatChipId;
  size?: ResponsiveSize;
  /** Explicit colour override — when omitted the icon uses its category colour. */
  color?: string;
}

/** Stroke style — bolder than text for visual distinction. */
const strokeSx = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Filled accent — solid dots / highlights to anchor the eye. */
const fillSx = { fill: 'currentColor', stroke: 'none' };

export const StatChipIcon: React.FC<StatChipIconProps> = ({
  chipId,
  size = { xs: 18, sm: 16, md: 16 },
  color,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const resolvedColor = color ?? getChipIconColor(chipId, isDark);
  const renderIcon = (): React.ReactNode => {
    switch (chipId) {
      // ── DPS: crossed swords ───────────────────────────────────
      case 'dps':
        return (
          <g style={strokeSx}>
            {/* Blade 1: top-left to bottom-right */}
            <path d="M6 4 L17 17" />
            <path d="M5 7.5 L9.5 5" />
            {/* Blade 2: top-right to bottom-left */}
            <path d="M18 4 L7 17" />
            <path d="M14.5 5 L19 7.5" />
            {/* Center clash */}
            <circle cx="12" cy="10.5" r="1.2" style={fillSx} />
          </g>
        );
      // ── HPS: heart with plus (healing) ────────────────────────
      case 'hps':
        return (
          <g style={strokeSx}>
            <path d="M12 17 L5.5 10.5 C4 9 4 6.5 5.5 5.3 C7 4 9 4.2 10.5 5.5 L12 7.2 L13.5 5.5 C15 4.2 17 4 18.5 5.3 C20 6.5 20 9 18.5 10.5 Z" />
            <path d="M12 10 L12 14" />
            <path d="M10 12 L14 12" />
          </g>
        );
      // ── Crit %: crosshairs ────────────────────────────────────
      case 'critChance':
        return (
          <g style={strokeSx}>
            <circle cx="12" cy="11" r="5" />
            <circle cx="12" cy="11" r="1.2" style={fillSx} />
            <path d="M12 4 L12 6 M12 16 L12 18 M5 11 L7 11 M17 11 L19 11" />
          </g>
        );
      // ── Crit Multi: lightning bolt (crit multiplier) ────────────
      case 'critDamage':
        return (
          <g style={strokeSx}>
            <path d="M14 3 L9 11 L12.5 11 L10 19 L18 9 L13.5 9 L16 3 Z" />
            <circle cx="12.5" cy="11" r="0.8" style={fillSx} />
          </g>
        );
      // ── Total Dmg: crossed swords + sum bars below ─────────────
      case 'totalDamage':
        return (
          <g style={strokeSx}>
            {/* Crossed swords (same shape as DPS, compressed into top) */}
            <path d="M6 2 L17 14" />
            <path d="M5 5.5 L9.5 3" />
            <path d="M18 2 L7 14" />
            <path d="M14.5 3 L19 5.5" />
            <circle cx="12" cy="8" r="1" style={fillSx} />
            {/* Sum indicator: double bar underneath */}
            <path d="M7 18 L17 18 M7 21 L17 21" />
          </g>
        );
      // ── Total Crit Dmg: flame + sum bars below ────────────
      case 'totalCritDamage':
        return (
          <g style={strokeSx}>
            {/* Flame (same shape as critDps, compressed into top) */}
            <path d="M12 15 C16 14 17 10 15 7.5 C14.3 6.5 13.8 5 14.2 3.5 C12.2 4.8 11 6.8 11.5 8.5 C10 8 8.8 9.3 9 11 C9.3 13 10.5 14.5 12 15 Z" />
            <circle cx="12" cy="11" r="1" style={fillSx} />
            {/* Sum indicator: double bar underneath */}
            <path d="M7 18 L17 18 M7 21 L17 21" />
          </g>
        );
      // ── Crit DPS: flame (critical fire damage) ────────────────
      case 'critDps':
        return (
          <g style={strokeSx}>
            <path d="M12 17 C16 16 17 12 15 9.5 C14.3 8.5 13.8 7 14.2 5.5 C12.2 6.8 11 8.8 11.5 10.5 C10 10 8.8 11.3 9 13 C9.3 15 10.5 16.5 12 17 Z" />
            <circle cx="12" cy="13" r="1.2" style={fillSx} />
            <path d="M12 9 L12 11" />
          </g>
        );
      // ── Mundus: standing stone with glow ──────────────────────
      case 'mundus':
        return (
          <g style={strokeSx}>
            {/* Standing stone pillar with arched top */}
            <path d="M9 19 L9 7 C9 3.5 10.5 2.5 12 2.5 C13.5 2.5 15 3.5 15 7 L15 19" />
            {/* Base */}
            <path d="M7 19 L17 19" />
            {/* Glowing diamond symbol */}
            <path d="M12 5.5 L14 9 L12 12.5 L10 9 Z" style={fillSx} />
          </g>
        );
      // ── Food: bowl with steam ─────────────────────────────────
      case 'food':
        return (
          <g style={strokeSx}>
            <path d="M5 11.5 C6 14.5 8.5 16 12 16 C15.5 16 18 14.5 19 11.5 Z" />
            <path d="M4.5 10 L19.5 10" />
            <path d="M9 7.5 C9 5.5 10.5 4.5 12 4.5" />
            <path d="M15 7.5 C15 5.5 13.5 4.5 12 4.5" />
            <circle cx="12" cy="13" r="0.8" style={fillSx} />
          </g>
        );
      // ── Potion: flask ─────────────────────────────────────────
      case 'potion':
        return (
          <g style={strokeSx}>
            <path d="M10 4 L14 4" />
            <path d="M10.8 4 L10.8 7 L7.5 11 C6.8 12 7.5 14.5 10 15.5 C11.2 16 12.8 16 14 15.5 C16.5 14.5 17.2 12 16.5 11 L13.2 7 L13.2 4" />
            <path d="M9 12.5 L15 12.5" />
            <circle cx="12" cy="10" r="0.9" style={fillSx} />
          </g>
        );
      // ── Deaths: skull ─────────────────────────────────────────
      case 'deaths':
        return (
          <g style={strokeSx}>
            {/* Cranium */}
            <path d="M12 3 C8 3 5.5 5.8 5.5 9.5 C5.5 12.5 7 14 8.5 14.5 L8.5 16 L15.5 16 L15.5 14.5 C17 14 18.5 12.5 18.5 9.5 C18.5 5.8 16 3 12 3 Z" />
            {/* Eye sockets */}
            <circle cx="9.3" cy="9.5" r="1.6" style={fillSx} />
            <circle cx="14.7" cy="9.5" r="1.6" style={fillSx} />
            {/* Nasal cavity */}
            <path d="M11.2 12.5 L12 13.5 L12.8 12.5" />
            {/* Teeth */}
            <path d="M9 16 L9 17.5 M11 16 L11 17.5 M13 16 L13 17.5 M15 16 L15 17.5" />
            <path d="M8.5 17.5 L15.5 17.5" />
          </g>
        );
      // ── Resurrects: upward arrow through line (revive) ─────
      case 'resurrects':
        return (
          <g style={strokeSx}>
            {/* Ground line */}
            <path d="M6 14 L18 14" />
            {/* Upward arrow shaft through the line */}
            <path d="M12 18 L12 5" />
            {/* Arrowhead */}
            <path d="M8.5 8.5 L12 5 L15.5 8.5" />
            <circle cx="12" cy="5" r="0.9" style={fillSx} />
          </g>
        );
      // ── CPM: clock face (casts per minute) ────────────────
      case 'cpm':
        return (
          <g style={strokeSx}>
            <circle cx="12" cy="10.5" r="7" />
            <circle cx="12" cy="10.5" r="0.9" style={fillSx} />
            <path d="M12 5.5 L12 10.5" />
            <path d="M12 10.5 L16 13" />
            <path d="M12 4 L12 5 M12 16 L12 17 M5.5 10.5 L6.5 10.5 M17.5 10.5 L18.5 10.5" />
          </g>
        );
      // ── Distance: double-headed horizontal arrow ──────────
      case 'distance':
        return (
          <g style={strokeSx}>
            {/* Horizontal shaft */}
            <path d="M4 11 L20 11" />
            {/* Left arrowhead */}
            <path d="M7.5 8 L4 11 L7.5 14" />
            {/* Right arrowhead */}
            <path d="M16.5 8 L20 11 L16.5 14" />
            {/* Tick marks */}
            <path d="M10 9 L10 13 M14 9 L14 13" />
            <circle cx="12" cy="11" r="0.8" style={fillSx} />
          </g>
        );
      // ── Bar Pattern: two bars with arrows ─────────────────────
      case 'barPattern':
        return (
          <g style={strokeSx}>
            <rect x="4.5" y="6" width="9" height="3" rx="0.8" />
            <rect x="10.5" y="13" width="9" height="3" rx="0.8" />
            <path d="M14 7.5 L17.5 7.5" />
            <path d="M16 5.8 L17.8 7.5 L16 9.2" />
            <path d="M10 14.5 L6.5 14.5" />
            <path d="M8 12.8 L6.2 14.5 L8 16.2" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <SvgIcon
      viewBox="0 0 24 24"
      sx={{
        width: size,
        height: size,
        color: resolvedColor,
        verticalAlign: 'middle',
      }}
      aria-hidden="true"
    >
      {renderIcon()}
    </SvgIcon>
  );
};
