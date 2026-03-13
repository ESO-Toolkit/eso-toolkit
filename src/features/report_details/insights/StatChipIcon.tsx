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
      // ── HPS: staff + cross ────────────────────────────────────
      case 'hps':
        return (
          <g style={strokeSx}>
            <path d="M8 4 L8 17" />
            <path d="M8 4 L10.5 6.5 L8 9 L5.5 6.5 Z" />
            <circle cx="8" cy="6.5" r="0.8" style={fillSx} />
            <path d="M14 9 L14 14" />
            <path d="M11.5 11.5 L16.5 11.5" />
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
      // ── Crit Dmg: bold star ───────────────────────────────────
      case 'critDamage':
        return (
          <g style={strokeSx}>
            <path d="M12 3.5 L13.8 8 L18.5 8.4 L15 11 L16 15.5 L12 13 L8 15.5 L9 11 L5.5 8.4 L10.2 8 Z" />
            <circle cx="12" cy="10" r="1.2" style={fillSx} />
          </g>
        );
      // ── Total Dmg: sword / pillar ─────────────────────────────
      case 'totalDamage':
        return (
          <g style={strokeSx}>
            <path d="M12 3 L12 17" />
            <path d="M9 5.5 L15 5.5" />
            <path d="M9 7.5 L15 7.5 L14 10 L10 10 Z" />
            <path d="M10 17 L14 17" />
            <circle cx="12" cy="3" r="1" style={fillSx} />
          </g>
        );
      // ── Crit Total: sigma + star ──────────────────────────────
      case 'totalCritDamage':
        return (
          <g style={strokeSx}>
            <path d="M6 5 L11 5 L8.5 10 L11 15 L6 15" />
            <path d="M16.5 5 L17.2 7 L19 7.6 L17.6 8.8 L17.8 10.8 L16.5 9.6 L15.2 10.8 L15.4 8.8 L14 7.6 L15.8 7 Z" />
            <circle cx="16.5" cy="8" r="0.7" style={fillSx} />
          </g>
        );
      // ── Crit DPS: flame + cross ───────────────────────────────
      case 'critDps':
        return (
          <g style={strokeSx}>
            <path d="M14 15.5 C17 14.5 17.5 11 15.5 9 C15 8.4 14.5 7.2 14.8 6 C13 7 12 9 12.5 10.5 C11 10.2 10 11.3 10.2 12.8 C10.4 14.5 12 15.8 14 15.5 Z" />
            <circle cx="13.5" cy="12" r="1" style={fillSx} />
            <path d="M7 9 L7 15" />
            <path d="M5 12 L9 12" />
          </g>
        );
      // ── Mundus: stone / gem ───────────────────────────────────
      case 'mundus':
        return (
          <g style={strokeSx}>
            <path d="M12 3.5 L16.5 8 L15 16 L9 16 L7.5 8 Z" />
            <path d="M12 7.5 L13.2 9.5 L12 11.5 L10.8 9.5 Z" />
            <circle cx="12" cy="9.5" r="0.7" style={fillSx} />
            <circle cx="5.5" cy="6.5" r="1" style={fillSx} />
            <circle cx="18.5" cy="6.5" r="1" style={fillSx} />
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
            <path d="M12 3.5 C8.5 3.5 6 6 6 9.5 C6 13 8.5 15 12 15 C15.5 15 18 13 18 9.5 C18 6 15.5 3.5 12 3.5 Z" />
            <circle cx="9.5" cy="9.5" r="1.3" style={fillSx} />
            <circle cx="14.5" cy="9.5" r="1.3" style={fillSx} />
            <path d="M10 12.5 L14 12.5" />
          </g>
        );
      // ── Resurrects: ankh ──────────────────────────────────────
      case 'resurrects':
        return (
          <g style={strokeSx}>
            <circle cx="12" cy="5.5" r="2.5" />
            <circle cx="12" cy="5.5" r="0.8" style={fillSx} />
            <path d="M12 8 L12 17.5" />
            <path d="M8.5 11 L15.5 11" />
          </g>
        );
      // ── CPM: hourglass ────────────────────────────────────────
      case 'cpm':
        return (
          <g style={strokeSx}>
            <path d="M8 4.5 L16 4.5" />
            <path d="M9 4.5 L9 8.5 L12 11 L15 8.5 L15 4.5" />
            <path d="M9 15.5 L9 11.5 L12 9 L15 11.5 L15 15.5" />
            <path d="M8 15.5 L16 15.5" />
            <circle cx="12" cy="10" r="0.8" style={fillSx} />
          </g>
        );
      // ── Distance: footprints / path ───────────────────────────
      case 'distance':
        return (
          <g style={strokeSx}>
            <path d="M5.5 16.5 C8 15 10 13 12 11.5 C14 10 16 8.5 18.5 7" />
            <circle cx="7.8" cy="16" r="1.8" />
            <circle cx="7.8" cy="16" r="0.6" style={fillSx} />
            <circle cx="14.5" cy="11.5" r="1.8" />
            <circle cx="14.5" cy="11.5" r="0.6" style={fillSx} />
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
