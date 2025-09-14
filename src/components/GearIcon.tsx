import { Box, Tooltip } from '@mui/material';
import React from 'react';

import { PlayerGear } from '../types/playerDetails';

export interface GearIconProps {
  /** The gear item ID used to construct the icon URL */
  gear: PlayerGear;
  /** Alt text for the icon */
  alt?: string;
  /** Size of the icon in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
  /** Whether to show a tooltip with gear information */
  showTooltip?: boolean;
  /** Custom tooltip content */
  tooltipContent?: React.ReactNode;
  /** Tooltip placement */
  tooltipPlacement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end';
  /** Quality/rarity of the gear item for styling */
  quality?: 'normal' | 'fine' | 'superior' | 'epic' | 'legendary' | 'mythic';
  /** Whether the icon should be rounded */
  rounded?: boolean;
  /** Whether to use desaturated colors (for gear details table) */
  useDesaturatedColors?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

const qualityColors = {
  normal: '#ffffff',
  fine: '#62a603',
  superior: '#417dc1',
  epic: '#c040c0',
  legendary: '#ffbf00',
  mythic: '#ff6b35',
} as const;

// Desaturated quality colors specifically for gear details table
const desaturatedQualityColors = {
  normal: '#e5e5e5', // off-white
  fine: '#7cb342', // muted green
  superior: '#5c9ce6', // desaturated blue
  epic: '#9978d4', // muted purple
  legendary: '#dec369', // muted gold
  mythic: '#c47a5a', // desaturated orange
} as const;

/**
 * GearIcon component displays gear/equipment icons from ESO with optional quality borders and tooltips
 */
export const GearIcon: React.FC<GearIconProps> = ({
  gear,
  alt = `Gear ${gear.id}`,
  size = 32,
  className,
  style,
  showTooltip = false,
  tooltipContent,
  tooltipPlacement = 'top',
  quality = 'normal',
  rounded = true,
  useDesaturatedColors = false,
  onClick,
}) => {
  // Construct the gear icon URL - using the same pattern as ESO Logs
  const iconUrl = `https://assets.rpglogs.com/img/eso/abilities/${gear.icon}.png`;

  // Choose color set based on whether we want desaturated colors
  const colors = useDesaturatedColors ? desaturatedQualityColors : qualityColors;

  const iconElement = (
    <Box
      component="img"
      src={iconUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      sx={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
        border: quality !== 'normal' ? `2px solid ${colors[quality]}` : 'none',
        borderRadius: rounded ? 1 : 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick
          ? {
              transform: 'scale(1.05)',
              boxShadow: `0 0 8px ${colors[quality]}50`,
            }
          : {},
        ...style,
      }}
      onError={(e) => {
        // Fallback to a placeholder or hide on error
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );

  if (showTooltip && tooltipContent) {
    return (
      <Tooltip
        title={tooltipContent}
        placement={tooltipPlacement}
        enterTouchDelay={0}
        leaveTouchDelay={3000}
        arrow
      >
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
          {iconElement}
        </Box>
      </Tooltip>
    );
  }

  return iconElement;
};
