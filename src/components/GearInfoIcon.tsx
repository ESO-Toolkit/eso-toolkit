import InfoIcon from '@mui/icons-material/Info';
import { IconButton, Tooltip } from '@mui/material';
import React from 'react';

export interface GearInfoIconProps {
  /** Tooltip content for the info icon */
  tooltipContent: React.ReactNode;
  /** Called when user clicks the info icon */
  onClick: () => void;
  /** Size of the icon */
  size?: 'small' | 'medium';
  /** Additional styles */
  sx?: React.CSSProperties;
}

/**
 * Simple info icon component that shows a tooltip and opens modal on click
 * Works consistently on both desktop and mobile
 */
export const GearInfoIcon: React.FC<GearInfoIconProps> = ({
  tooltipContent,
  onClick,
  size = 'small',
  sx = {},
}) => {
  const iconSize = size === 'small' ? 16 : 20;

  return (
    <Tooltip
      title={tooltipContent}
      placement="top"
      enterDelay={300}
      arrow
      disableInteractive={false}
    >
      <IconButton
        onClick={onClick}
        size="small"
        sx={{
          ml: 0.5,
          p: 0.25,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          ...sx,
        }}
      >
        <InfoIcon sx={{ fontSize: iconSize }} />
      </IconButton>
    </Tooltip>
  );
};
