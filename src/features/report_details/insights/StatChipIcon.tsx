import { SvgIcon } from '@mui/material';
import React from 'react';

import type { StatChipId } from './statChipConfig';

interface StatChipIconProps {
  chipId: StatChipId;
  size?: number;
  color?: string;
}

const strokeSx = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const StatChipIcon: React.FC<StatChipIconProps> = ({ chipId, size = 14, color }) => {
  const renderIcon = (): React.ReactNode => {
    switch (chipId) {
      case 'dps':
        return (
          <g style={strokeSx}>
            <path d="M6.5 5.2 L17.8 16.5" />
            <path d="M8 3.8 L5.2 6.6 L7.6 9" />
            <path d="M16.2 15 L19 12.2 L16.6 9.8" />
            <path d="M17.5 5.2 L6.2 16.5" />
            <path d="M16 3.8 L18.8 6.6 L16.4 9" />
            <path d="M7.8 15 L5 12.2 L7.4 9.8" />
            <path d="M10.8 10.2 L13.2 10.2 L13.2 12.6 L10.8 12.6 Z" />
          </g>
        );
      case 'hps':
        return (
          <g style={strokeSx}>
            <path d="M7.8 4 L7.8 17" />
            <path d="M7.8 4 L10.2 6.2 L7.8 8.4 L5.4 6.2 Z" />
            <path d="M11.4 8.3 C14.4 7.6 16.4 8.7 16.4 10.6 C16.4 12.5 14.4 13.6 11.4 12.9" />
            <path d="M13.8 9.3 L13.8 11.9" />
            <path d="M12.5 10.6 L15.1 10.6" />
          </g>
        );
      case 'critChance':
        return (
          <g style={strokeSx}>
            <circle cx="12" cy="10.5" r="5.3" />
            <circle cx="12" cy="10.5" r="1.7" />
            <path d="M12 3.2 L12 5 M12 16 L12 17.8 M4.7 10.5 L6.5 10.5 M17.5 10.5 L19.3 10.5" />
            <path d="M6.8 5.3 L8 6.5 M16 14.5 L17.2 15.7 M17.2 5.3 L16 6.5 M8 14.5 L6.8 15.7" />
          </g>
        );
      case 'critDamage':
        return (
          <g style={strokeSx}>
            <path d="M12 3.2 L13.7 7.2 L18.2 7.6 L14.8 10.4 L15.9 14.8 L12 12.4 L8.1 14.8 L9.2 10.4 L5.8 7.6 L10.3 7.2 Z" />
            <path d="M12 1.8 L12 3 M4.8 10.5 L6 10.5 M18 10.5 L19.2 10.5" />
          </g>
        );
      case 'totalDamage':
        return (
          <g style={strokeSx}>
            <path d="M12 3.4 L12 16.2" />
            <path d="M8.5 7.2 L15.5 7.2 L14.2 9.6 L9.8 9.6 Z" />
            <path d="M10.5 4.8 L13.5 4.8" />
            <path d="M10.2 16.2 L13.8 16.2 L12 19.2 Z" />
          </g>
        );
      case 'totalCritDamage':
        return (
          <g style={strokeSx}>
            <path d="M8 4.2 L8 15.8" />
            <path d="M6 6.5 L10 6.5" />
            <path d="M14 5.1 L12.4 8.9 L15.2 8.9 L13.4 13.8" />
            <path d="M15.8 4.2 L16.6 5.4 L18 5.6 L17 6.6 L17.3 8 L15.8 7.2 L14.5 8 L14.7 6.6 L13.7 5.6 L15.1 5.4 Z" />
          </g>
        );
      case 'critDps':
        return (
          <g style={strokeSx}>
            <path d="M8 15.2 L8 9" />
            <path d="M6.4 10 L9.6 10" />
            <path d="M14 14.8 C16.7 13.9 17.3 10.8 15.5 8.9 C14.8 8.2 14.4 7.2 14.6 6.2 C12.9 7 12 8.8 12.4 10.3 C11 10.1 10 11.1 10.1 12.5 C10.3 14.1 11.9 15.3 14 14.8 Z" />
          </g>
        );
      case 'mundus':
        return (
          <g style={strokeSx}>
            <path d="M12 3.2 L16.4 8.2 L14.8 16.4 L9.2 16.4 L7.6 8.2 Z" />
            <path d="M12 7.2 L13.1 9.2 L12 11.2 L10.9 9.2 Z" />
            <path d="M5.4 6.7 C7.4 4.7 9.5 3.8 12 3.8 C14.5 3.8 16.6 4.7 18.6 6.7" />
            <circle cx="5.2" cy="6.7" r="0.6" />
            <circle cx="18.8" cy="6.7" r="0.6" />
          </g>
        );
      case 'food':
        return (
          <g style={strokeSx}>
            <path d="M5 12 C5.9 14.5 8.3 16.2 12 16.2 C15.7 16.2 18.1 14.5 19 12 Z" />
            <path d="M4.2 10 L19.8 10" />
            <path d="M16.2 6.2 L16.2 9.4" />
            <path d="M15.1 7.1 L17.3 7.1" />
            <path d="M8.5 7 C8.5 5.9 9.2 5.1 10.2 4.6" />
          </g>
        );
      case 'potion':
        return (
          <g style={strokeSx}>
            <path d="M10 3.6 L14 3.6" />
            <path d="M10.8 3.6 L10.8 6.3 L7.4 10.6 C6.7 11.5 7.3 13.8 9.7 15.1 C11.4 16 12.6 16 14.3 15.1 C16.7 13.8 17.3 11.5 16.6 10.6 L13.2 6.3 L13.2 3.6" />
            <path d="M9.2 11.7 L14.8 11.7" />
            <circle cx="12.3" cy="9.1" r="0.6" />
          </g>
        );
      case 'deaths':
        return (
          <g style={strokeSx}>
            <path d="M12 3.7 C8.7 3.7 6.1 6.1 6.1 9.2 C6.1 12.8 8.8 14.8 12 14.8 C15.2 14.8 17.9 12.8 17.9 9.2 C17.9 6.1 15.3 3.7 12 3.7 Z" />
            <circle cx="9.8" cy="9.5" r="0.75" />
            <circle cx="14.2" cy="9.5" r="0.75" />
            <path d="M10.3 12.2 L13.7 12.2" />
            <path d="M12.9 5.6 L11.8 7.4 L12.8 8.4" />
          </g>
        );
      case 'resurrects':
        return (
          <g style={strokeSx}>
            <path d="M12 3.5 L15.6 7.1 L12 10.7 L8.4 7.1 Z" />
            <path d="M12 10.7 L12 17.5" />
            <path d="M9.2 14.7 L14.8 14.7" />
            <path d="M12 5 L12 2.8 M10.8 4 L12 2.8 L13.2 4" />
          </g>
        );
      case 'cpm':
        return (
          <g style={strokeSx}>
            <path d="M8.2 4.5 L15.8 4.5" />
            <path d="M9.4 4.5 L9.4 8.6 L12 10.7 L14.6 8.6 L14.6 4.5" />
            <path d="M9.4 15.5 L9.4 11.4 L12 9.3 L14.6 11.4 L14.6 15.5" />
            <path d="M8.2 15.5 L15.8 15.5" />
            <path d="M10.4 18.5 L13.6 18.5" />
          </g>
        );
      case 'distance':
        return (
          <g style={strokeSx}>
            <path d="M5.2 16.6 C7.4 15.2 9.5 13.8 12 12 C14.5 10.2 16.6 8.8 18.8 7.4" />
            <path d="M6.8 15.2 C7.5 14.2 8.6 14.1 9.4 14.9 C10.2 15.7 10 16.8 9 17.5 C8 18.2 6.8 18.1 6.3 17.3 C5.9 16.7 6.1 15.8 6.8 15.2 Z" />
            <path d="M13.2 10.6 C13.9 9.6 15 9.5 15.8 10.3 C16.6 11.1 16.4 12.2 15.4 12.9 C14.4 13.6 13.2 13.5 12.7 12.7 C12.3 12.1 12.5 11.2 13.2 10.6 Z" />
          </g>
        );
      case 'barPattern':
        return (
          <g style={strokeSx}>
            <rect x="4.5" y="6.2" width="8.8" height="2.6" rx="0.6" />
            <rect x="10.7" y="13.2" width="8.8" height="2.6" rx="0.6" />
            <path d="M13.8 7.5 L17.2 7.5" />
            <path d="M15.9 5.8 L17.6 7.5 L15.9 9.2" />
            <path d="M10.2 14.5 L6.8 14.5" />
            <path d="M8.1 12.8 L6.4 14.5 L8.1 16.2" />
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
