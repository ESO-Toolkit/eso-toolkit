import { Box, Chip, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import React, { useState, useRef, useEffect } from 'react';

export interface MobileFriendlyGearChipProps {
  /** Chip label text */
  label: string;
  /** Chip title for fallback tooltip */
  title?: string | null;
  /** Tooltip content */
  tooltipContent: React.ReactNode;
  /** Chip styling */
  sx?: SxProps<Theme>;
  /** Called when user wants to open detailed view */
  onOpenDetails: () => void;
  /** Unique key for the chip */
  key?: React.Key;
}

/**
 * Mobile-friendly gear chip that provides both tooltip and modal access
 *
 * Desktop behavior:
 * - Hover: Shows tooltip
 * - Click: Opens modal
 *
 * Mobile behavior:
 * - Short tap: Shows tooltip with "View Details" button
 * - Long press: Opens modal with haptic feedback
 */
export const MobileFriendlyGearChip: React.FC<MobileFriendlyGearChipProps> = ({
  label,
  title,
  tooltipContent,
  sx,
  onOpenDetails,
  key,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  // Handle long press for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>): void => {
    if (!isMobile) return;

    e.preventDefault();
    setLongPressTimer(
      setTimeout(() => {
        // Vibrate if supported
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        onOpenDetails();
      }, 500),
    ); // 500ms long press
  };

  const handleTouchEnd = (): void => {
    if (!isMobile) return;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchMove = (): void => {
    if (!isMobile) return;

    // Cancel long press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Handle click (desktop)
  const handleClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (isMobile) {
      // On mobile, show tooltip instead of opening modal directly
      setTooltipOpen(true);
      e.preventDefault();
    } else {
      // On desktop, open modal
      onOpenDetails();
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // Enhanced tooltip content for mobile
  const enhancedTooltipContent = isMobile ? (
    <Box sx={{ position: 'relative' }}>
      {tooltipContent}
      <Box
        sx={{
          mt: 1.5,
          pt: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Chip
          label="View Details"
          size="small"
          clickable
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
            setTooltipOpen(false);
          }}
          sx={{
            width: '100%',
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          }}
        />
      </Box>
    </Box>
  ) : (
    tooltipContent
  );

  return (
    <Tooltip
      title={enhancedTooltipContent}
      placement="top"
      open={tooltipOpen}
      onOpen={() => setTooltipOpen(true)}
      onClose={() => setTooltipOpen(false)}
      enterTouchDelay={0}
      leaveTouchDelay={isMobile ? 5000 : 1500}
      arrow
      PopperProps={{
        disablePortal: false,
        modifiers: [
          {
            name: 'preventOverflow',
            options: {
              altAxis: true,
              altBoundary: true,
              tether: false,
              rootBoundary: 'document',
              padding: 16,
            },
          },
          {
            name: 'flip',
            enabled: true,
            options: {
              altBoundary: true,
              rootBoundary: 'document',
              padding: 16,
              fallbackPlacements: ['bottom'],
            },
          },
        ],
      }}
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: isMobile ? 280 : 320,
            p: 0,
            // Prevent tooltip from closing when clicking inside
            pointerEvents: 'auto',
          },
        },
      }}
    >
      <Box
        ref={chipRef}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        sx={{
          cursor: 'pointer',
          display: 'inline-flex',
          // Prevent text selection on mobile
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        <Chip label={label} size="small" title={title || undefined} sx={sx} />
      </Box>
    </Tooltip>
  );
};
