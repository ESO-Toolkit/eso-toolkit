/**
 * GearSlotCard
 * Equipment slot with slot icon, item name, and click-to-open behavior.
 * Shows a subtle rarity-colored border when an item is equipped.
 */

import { Close as CloseIcon } from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import type { EquipSlotDef } from '../../data/esoStaticData';

const SLOT_ICON_MAP: Record<string, string> = {
  head: '⛑',
  chest: '🧥',
  shoulders: '🪖',
  waist: '🎗',
  hand: '🧤',
  legs: '👖',
  feet: '👢',
  neck: '📿',
  ring: '💍',
  weapon: '⚔️',
  offhand: '🛡',
};

interface GearSlotCardProps {
  slotDef: EquipSlotDef;
  itemName?: string | null;
  onOpen: () => void;
  onClear: () => void;
}

export const GearSlotCard: React.FC<GearSlotCardProps> = ({
  slotDef,
  itemName,
  onOpen,
  onClear,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();
  const hasItem = Boolean(itemName);

  return (
    <motion.div
      whileHover={prefersReduced ? {} : { scale: 1.02, y: -2 }}
      whileTap={prefersReduced ? {} : { scale: 0.98 }}
      style={{ cursor: 'pointer' }}
    >
      <Box
        onClick={onOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          py: 1,
          px: 1.5,
          borderRadius: 2,
          border: `1px solid ${
            hasItem
              ? isDark
                ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)'
                : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.15)'
              : isDark
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.06)'
          }`,
          background: hasItem
            ? isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.05)'
              : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.03)'
            : isDark
              ? 'rgba(255, 255, 255, 0.02)'
              : 'rgba(0, 0, 0, 0.015)',
          transition: 'all 0.15s',
          '&:hover': {
            background: isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
              : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.05)',
            borderColor: isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)'
              : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.2)',
          },
        }}
      >
        {/* Slot icon */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.04),
            border: `1px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {SLOT_ICON_MAP[slotDef.slotType] ?? '📦'}
        </Box>

        {/* Name */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {itemName ? (
            <>
              <Typography
                variant="caption"
                fontWeight={600}
                noWrap
                display="block"
                sx={{ fontSize: 12 }}
              >
                {itemName}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                {slotDef.name}
              </Typography>
            </>
          ) : (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 12 }}>
              {slotDef.name}
            </Typography>
          )}
        </Box>

        {/* Clear */}
        {hasItem && (
          <Tooltip title="Remove item">
            <IconButton
              size="small"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onClear();
              }}
              sx={{
                color: 'text.disabled',
                '&:hover': { color: 'error.main' },
                p: 0.5,
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </motion.div>
  );
};
