/**
 * PlayerSetSlot Component
 *
 * A visual slot component for displaying and selecting gear sets for a player.
 * Shows the current set as a colored chip with a clear button, and opens a picker dialog when clicked.
 */

import { Close as CloseIcon, Star as GearIcon } from '@mui/icons-material';
import { Box, Chip, Tooltip, SxProps, Theme, useTheme } from '@mui/material';
import React, { useCallback } from 'react';

import { KnownSetIDs } from '../types/abilities';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';
import { getSetDisplayName } from '../utils/setNameUtils';

export type SetSlotType = 'set1' | 'set2' | 'monster';
export type SetSlotRole = 'tank' | 'healer';

interface PlayerSetSlotProps {
  /** Label for the slot (e.g., "Set 1", "Set 2", "Monster") */
  label: string;
  /** Currently assigned set ID */
  currentSet?: KnownSetIDs;
  /** Type of slot (determines which sets are valid) */
  slotType: SetSlotType;
  /** Role of the player (determines color scheme) */
  role: SetSlotRole;
  /** Callback when a set is selected */
  onSet: (setId: KnownSetIDs | undefined) => void;
  /** Callback when the clear button is clicked */
  onClear: () => void;
  /** Whether the slot is disabled */
  disabled?: boolean;
  /** Optional custom styles */
  sx?: SxProps<Theme>;
  /** Optional click handler (if not provided, opens picker via parent) */
  onClick?: () => void;
}

/**
 * Get the appropriate icon for a set type
 */
const getSetTypeIcon = (slotType: SetSlotType): React.ReactElement => {
  switch (slotType) {
    case 'set1':
    case 'set2':
      return <GearIcon sx={{ fontSize: 14 }} />;
    case 'monster':
      return <GearIcon sx={{ fontSize: 14 }} />;
  }
};

/**
 * Get the placeholder text for an empty slot
 */
const getPlaceholderText = (slotType: SetSlotType): string => {
  switch (slotType) {
    case 'set1':
      return 'Body Set';
    case 'set2':
      return 'Jewelry Set';
    case 'monster':
      return 'Monster/Mythic';
  }
};

/**
 * PlayerSetSlot Component
 */
export const PlayerSetSlot: React.FC<PlayerSetSlotProps> = ({
  label,
  currentSet,
  slotType,
  role,
  onSet: _onSet,
  onClear,
  disabled = false,
  sx = {},
  onClick,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Get role-specific colors
  const roleColors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;
  const roleColor = role === 'tank' ? roleColors.tank : roleColors.healer;

  // Get display name for current set
  const setDisplayName = currentSet ? getSetDisplayName(currentSet) : '';
  const hasSet = Boolean(currentSet && setDisplayName);

  // Handle click on the slot
  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  // Handle clear button click (stop propagation to avoid opening picker)
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled) {
        onClear();
      }
    },
    [disabled, onClear],
  );

  // Styles for the slot
  const slotStyles: SxProps<Theme> = {
    ...(hasSet
      ? {
          // Filled slot styles
          bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          borderLeft: `3px solid ${roleColor}`,
          border: '1px solid',
          borderColor: isDarkMode ? 'divider' : 'rgba(0, 0, 0, 0.12)',
          pl: 0.5,
        }
      : {
          // Empty slot styles
          bgcolor: 'transparent',
          border: `1px dashed ${theme.palette.divider}`,
          borderLeft: `3px dashed ${roleColor}`,
          pl: 0.5,
        }),
    transition: 'all 0.2s ease-in-out',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    '&:hover': !disabled
      ? {
          transform: 'scale(1.02)',
          boxShadow: hasSet ? `0 2px 8px ${roleColor}40` : `0 1px 4px ${theme.palette.divider}`,
          borderColor: roleColor,
        }
      : {},
    ...sx,
  };

  // Chip content
  const chipContent = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        minWidth: 120,
        justifyContent: 'flex-start',
      }}
    >
      {hasSet ? (
        <>
          {/* Set type icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: '50%',
              bgcolor: roleColor,
              color: 'white',
              fontSize: 10,
            }}
          >
            {getSetTypeIcon(slotType)}
          </Box>
          {/* Set name */}
          <Box
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.875rem',
            }}
          >
            {setDisplayName}
          </Box>
        </>
      ) : (
        <>
          {/* Empty placeholder */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.75rem',
              color: 'text.secondary',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: `1px dashed ${theme.palette.divider}`,
                fontSize: 12,
              }}
            >
              +
            </Box>
            {getPlaceholderText(slotType)}
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Tooltip
      title={
        hasSet
          ? `${label}: ${setDisplayName}`
          : `Click to select ${getPlaceholderText(slotType).toLowerCase()}`
      }
      arrow
    >
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <Chip
          label={chipContent}
          onClick={handleClick}
          sx={slotStyles}
          disabled={disabled}
          deleteIcon={
            hasSet ? (
              <Tooltip title="Clear set">
                <CloseIcon
                  sx={{
                    fontSize: 16,
                    '&:hover': {
                      color: 'error.main',
                    },
                  }}
                />
              </Tooltip>
            ) : undefined
          }
          onDelete={hasSet ? handleClear : undefined}
        />
      </Box>
    </Tooltip>
  );
};

// Named export only - prefer named exports for consistency
