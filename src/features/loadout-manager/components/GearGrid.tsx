/**
 * Gear Grid Component
 * Displays gear in sections (APPAREL, ACCESSORIES, WEAPONS)
 * 3x3 grid for apparel, 1x3 for accessories, 2x2 for weapons
 * With equipped item highlights and pulse animations
 */

import { Box, Grid, Stack, Tooltip, Typography } from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';

import { getItemInfo } from '../data/itemIdMap';
import type { GearConfig, GearPiece } from '../types/loadout.types';
import { fetchItemIconUrl } from '../utils/itemIconResolver';
import { getItemIdFromLink } from '../utils/itemLinkParser';

import { equippedHighlightEnhanced } from './styles/textureStyles';

// ESO gear slot indices
const APPAREL_SLOTS = [0, 2, 3, 6, 8, 9, 16]; // Head, Chest, Shoulders, Belt, Legs, Feet, Hands
const ACCESSORY_SLOTS = [1, 11, 12]; // Neck, Ring 1, Ring 2
const WEAPON_SLOTS = [4, 5, 20, 21]; // Main Hand, Off Hand, Back Bar Main, Back Bar Off

interface GearSection {
  title: string;
  slots: number[];
  gridCols: number;
}

const SECTIONS: GearSection[] = [
  { title: 'APPAREL', slots: APPAREL_SLOTS, gridCols: 3 },
  { title: 'ACCESSORIES', slots: ACCESSORY_SLOTS, gridCols: 3 },
  { title: 'WEAPONS', slots: WEAPON_SLOTS, gridCols: 4 },
];

const SLOT_NAMES: Record<number, string> = {
  0: 'Head',
  1: 'Neck',
  2: 'Chest',
  3: 'Shoulders',
  4: 'Main Hand',
  5: 'Off Hand',
  6: 'Belt',
  8: 'Legs',
  9: 'Feet',
  11: 'Ring 1',
  12: 'Ring 2',
  16: 'Hands',
  20: 'Back Bar Main',
  21: 'Back Bar Off',
};

interface GearGridProps {
  gear: GearConfig;
  onSlotClick?: (slotIndex: number) => void;
  selectedSlot?: number | null;
}

export const GearGrid: React.FC<GearGridProps> = ({ gear, onSlotClick, selectedSlot }) => {
  return (
    <Stack spacing={2}>
      {SECTIONS.map((section) => (
        <Stack key={section.title} spacing={1}>
          {/* Section header */}
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: 1.2,
              color: '#00d9ff',
              textTransform: 'uppercase',
              pl: 0.5,
            }}
          >
            {section.title}
          </Typography>

          {/* Grid */}
          <Grid container spacing={1}>
            {section.slots.map((slotIndex) => {
              const gearPiece = gear?.[slotIndex];
              const slotName = SLOT_NAMES[slotIndex] ?? `Slot ${slotIndex}`;

              return (
                <Grid size={section.gridCols === 3 ? 4 : 3} key={slotIndex}>
                  <GearGridItem
                    slotName={slotName}
                    gearPiece={gearPiece}
                    slotIndex={slotIndex}
                    selected={selectedSlot === slotIndex}
                    onClick={() => onSlotClick?.(slotIndex)}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      ))}
    </Stack>
  );
};

interface GearGridItemProps {
  slotName: string;
  gearPiece?: GearPiece;
  slotIndex: number;
  selected?: boolean;
  onClick?: () => void;
}

const GearGridItem: React.FC<GearGridItemProps> = ({
  slotName,
  gearPiece,
  slotIndex,
  selected = false,
  onClick,
}) => {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [itemName, setItemName] = useState<string | null>(null);

  useEffect(() => {
    const loadItemInfo = async (): Promise<void> => {
      if (!gearPiece) {
        setIconUrl(null);
        setItemName(null);
        setLoadFailed(false);
        return;
      }

      try {
        // Extract itemId from gear piece link or id
        let itemId: number | null = null;
        if (gearPiece.link) {
          itemId = getItemIdFromLink(gearPiece.link);
        } else if (typeof gearPiece.id === 'number') {
          itemId = gearPiece.id;
        } else if (typeof gearPiece.id === 'string') {
          const parsed = parseInt(gearPiece.id, 10);
          if (!isNaN(parsed)) {
            itemId = parsed;
          }
        }

        if (itemId && itemId > 0) {
          const itemInfo = getItemInfo(itemId);
          if (itemInfo?.name) {
            setItemName(itemInfo.name);
          }

          // Try to fetch icon URL
          const url = await fetchItemIconUrl(itemId);
          if (url) {
            setIconUrl(url);
          } else {
            setLoadFailed(true);
          }
        } else {
          setLoadFailed(true);
        }
      } catch {
        setLoadFailed(true);
      }
    };

    loadItemInfo();
  }, [gearPiece, slotIndex]);

  const hasItem = !!gearPiece && !loadFailed;

  return (
    <Tooltip
      title={itemName ?? slotName}
      arrow
      slotProps={{
        tooltip: {
          sx: {
            backgroundColor: 'rgba(10, 18, 35, 0.95)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: 2,
            fontSize: '0.8rem',
          },
        },
        arrow: {
          sx: {
            color: 'rgba(0, 217, 255, 0.3)',
          },
        },
      }}
    >
      <Box
        onClick={onClick}
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          border: selected
            ? '2px solid #00d9ff'
            : hasItem
              ? '1px solid rgba(0, 217, 255, 0.4)'
              : '1px dashed rgba(0, 217, 255, 0.25)',
          background: hasItem
            ? `
                radial-gradient(circle at 50% 50%,
                  ${selected ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 217, 255, 0.08)'} 0%,
                  rgba(10, 18, 35, 0.9) 100%
                )
              `
            : 'rgba(0, 217, 255, 0.05)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          // Enhanced glow for selected
          ...(selected && equippedHighlightEnhanced),
          opacity: hasItem ? 1 : 0.4,
          boxShadow: selected
            ? undefined // Handled by equippedHighlightEnhanced
            : hasItem
              ? '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(0, 217, 255, 0.05)'
              : 'none',
          '&:hover': {
            borderColor: selected ? '#00d9ff' : 'rgba(0, 217, 255, 0.6)',
            background: hasItem
              ? `
                  radial-gradient(circle at 50% 50%,
                    rgba(0, 217, 255, 0.25) 0%,
                    rgba(10, 18, 35, 0.9) 100%
                  )
                `
              : 'rgba(0, 217, 255, 0.1)',
            transform: onClick ? 'scale(1.08)' : 'none',
          },
        }}
      >
        {iconUrl && !loadFailed ? (
          <Box
            component="img"
            src={iconUrl}
            alt={itemName ?? slotName}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.25,
            }}
          >
            <Typography
              sx={{
                fontSize: '1.25rem',
                color: 'rgba(0, 217, 255, 0.25)',
                lineHeight: 1,
              }}
            >
              ·
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};
