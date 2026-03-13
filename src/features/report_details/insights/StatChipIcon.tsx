import { SvgIcon } from '@mui/material';
import React from 'react';

import type { StatChipId } from './statChipConfig';

interface StatChipIconProps {
  chipId: StatChipId;
  size?: number;
  color?: string;
}

/** Stroke style for outline paths — thicker for legibility at small sizes. */
const strokeSx = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Filled accent — small solid dots / highlights to anchor the eye. */
const fillSx = { fill: 'currentColor', stroke: 'none' };

export const StatChipIcon: React.FC<StatChipIconProps> = ({ chipId, size = 16, color }) => {
  const renderIcon = (): React.ReactNode => {
    switch (chipId) {
      // ── DPS: crossed swords ───────────────────────────────────
      case 'dps':
        return (
          <g style={strokeSx}>
            <path d="M7 5 L17 15" />
            <path d="M7 5 L5 7 L7.5 9.5" />
            <path d="M17 15 L19 13 L16.5 10.5" />
            <path d="M17 5 L7 15" />
            <path d="M17 5 L19 7 L16.5 9.5" />
            <path d="M7 15 L5 13 L7.5 10.5" />
            <rect x="10.8" y="8.8" width="2.4" height="2.4" style={fillSx} rx="0.4" />
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
      // ── Crit Dmg: lightning bolt (burst damage) ───────────────
      case 'critDamage':
        return (
          <g style={strokeSx}>
            <path d="M14 3 L9 11 L12.5 11 L10 19 L18 9 L13.5 9 L16 3 Z" />
            <circle cx="12.5" cy="11" r="0.8" style={fillSx} />
          </g>
        );
      // ── Total Dmg: explosion / impact burst ───────────────────
      case 'totalDamage':
        return (
          <g style={strokeSx}>
            <circle cx="12" cy="10.5" r="3.5" />
            <circle cx="12" cy="10.5" r="1" style={fillSx} />
            <path d="M12 3 L12 5.5 M12 15.5 L12 18 M5 10.5 L7 10.5 M17 10.5 L19 10.5" />
            <path d="M7.5 6 L9 7.5 M15 13.5 L16.5 15 M16.5 6 L15 7.5 M9 13.5 L7.5 15" />
          </g>
        );
      // ── Crit Total: sigma + lightning ─────────────────────────
      case 'totalCritDamage':
        return (
          <g style={strokeSx}>
            <path d="M6 5 L11 5 L8.5 10 L11 15 L6 15" />
            <path d="M16.5 4.5 L14 9 L16 9 L13.5 14.5" />
            <circle cx="15.5" cy="9" r="0.7" style={fillSx} />
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
      // ── Mundus: constellation (star sign) ─────────────────────
      case 'mundus':
        return (
          <g style={strokeSx}>
            <circle cx="12" cy="5" r="1.5" style={fillSx} />
            <circle cx="7" cy="9" r="1.2" style={fillSx} />
            <circle cx="17" cy="9" r="1.2" style={fillSx} />
            <circle cx="9" cy="15" r="1.2" style={fillSx} />
            <circle cx="15" cy="15" r="1.2" style={fillSx} />
            <path d="M12 5 L7 9 M12 5 L17 9 M7 9 L9 15 M17 9 L15 15 M9 15 L15 15" />
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
      // ── Resurrects: person rising with upward arrow ────────
      case 'resurrects':
        return (
          <g style={strokeSx}>
            <circle cx="12" cy="5.5" r="2.2" />
            <circle cx="12" cy="5.5" r="0.7" style={fillSx} />
            <path d="M12 7.7 L12 14" />
            <path d="M9.5 11 L14.5 11" />
            <path d="M9 16.5 L12 14 L15 16.5" />
            <path d="M8 18 L16 18" />
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
      // ── Distance: ruler / measuring ────────────────────────
      case 'distance':
        return (
          <g style={strokeSx}>
            <path d="M5 17 L19 7" />
            <path d="M7.5 14 L9 12.5" />
            <path d="M10 12 L12 10" />
            <path d="M12.5 10 L14.5 8" />
            <circle cx="5" cy="17" r="1" style={fillSx} />
            <circle cx="19" cy="7" r="1" style={fillSx} />
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
        color: color ?? 'text.secondary',
        verticalAlign: 'middle',
      }}
      aria-hidden="true"
    >
      {renderIcon()}
    </SvgIcon>
  );
};
