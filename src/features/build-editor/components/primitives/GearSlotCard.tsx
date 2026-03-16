/**
 * GearSlotCard — Square icon tile for a single equipment slot.
 *
 * Matches the loadout-manager GearTile pattern: a square tile with an
 * item icon (UESP CDN), a 2-line label, validation dot, and a
 * hover-reveal remove button.  Re-themed with the build-editor
 * glass-morphism design language.
 */

import { Close as CloseIcon } from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';

import { fetchItemIconUrl, getItemIconUrl } from '../../../loadout-manager/utils/itemIconResolver';
import type { EquipSlotDef } from '../../data/esoStaticData';

// ── SVG slot silhouettes ────────────────────────────────────────────────────

const SLOT_SVG_PATHS: Record<string, string> = {
  head: 'M12 2C9 2 6.5 4 6 7c-.3 1.5 0 3 .5 4 .3.7.5 1.2.5 2v1h10v-1c0-.8.2-1.3.5-2 .5-1 .8-2.5.5-4C17.5 4 15 2 12 2z',
  chest: 'M6 6l-3 3v9h6v-5h6v5h6V9l-3-3h-4l-2 2-2-2H6z',
  shoulders: 'M4 8c0-2 2-4 4-4h1v4H5v6h4v2H4V8zm16 0c0-2-2-4-4-4h-1v4h4v6h-4v2h5V8z',
  hand: 'M7 3v7l-2 1v5l3 4h8l3-4v-5l-2-1V3h-3v6h-1V2h-3v7h-1V3H7z',
  waist: 'M3 10h18v4H3v-4zm8 0v4h2v-4h-2z',
  legs: 'M7 4h4v7l-2 9H6l1-9V4zm6 0h4v7l1 9h-3l-2-9V4z',
  feet: 'M6 8l-2 6v4h7v-3l1-3 1 3v3h7v-4l-2-6h-4l-1 2h-2L10 8H6z',
  neck: 'M12 4a4 4 0 0 0-4 4c0 1.7 1.3 3.2 3 3.8V14h2v-2.2c1.7-.6 3-2.1 3-3.8a4 4 0 0 0-4-4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-1 5h2v4h-2v-4z',
  ring: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10z',
  weapon: 'M6 20l2-2 8-8 2 2 2-2-4-4-2 2-2-2 2-2-2-2-2 2-8 8z',
  offhand:
    'M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4zm0 2.2L18 9v3c0 3.5-2.6 6.8-6 7.8V5.2z',
};

const SlotSvgIcon: React.FC<{ slotType: string; size?: number; color?: string }> = ({
  slotType,
  size = 24,
  color = 'currentColor',
}) => {
  const path = SLOT_SVG_PATHS[slotType];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d={path} />
    </svg>
  );
};

// ── Props ───────────────────────────────────────────────────────────────────

const TILE_SIZE = 78;

interface GearSlotCardProps {
  slotDef: EquipSlotDef;
  itemId?: number | null;
  itemName?: string | null;
  setName?: string | null;
  isDisabled?: boolean;
  disabledReason?: string;
  onOpen: () => void;
  onClear: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export const GearSlotCard: React.FC<GearSlotCardProps> = ({
  slotDef,
  itemId,
  itemName,
  setName,
  isDisabled = false,
  disabledReason,
  onOpen,
  onClear,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const hasItem = Boolean(itemId && (itemName || setName));

  // Icon resolution: sync first, async UESP fallback for unknowns
  const [iconUrl, setIconUrl] = useState<string | null>(() =>
    itemId ? getItemIconUrl(itemId) : null,
  );
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => {
    if (!itemId) {
      setIconUrl(null);
      setIconFailed(false);
      return;
    }
    setIconFailed(false);
    const sync = getItemIconUrl(itemId);
    if (sync) {
      setIconUrl(sync);
      return;
    }
    fetchItemIconUrl(itemId)
      .then((url) => setIconUrl(url))
      .catch(() => {});
  }, [itemId]);

  const primaryLabel = setName ?? itemName ?? null;

  // Tooltip
  const tooltipLines: string[] = [slotDef.name];
  if (isDisabled) {
    tooltipLines.push(disabledReason ?? 'Locked');
  } else if (hasItem) {
    if (primaryLabel) tooltipLines.push(primaryLabel);
  } else {
    tooltipLines.push('Click to equip');
  }

  const handleClick = (): void => {
    if (!isDisabled) onOpen();
  };

  return (
    <Tooltip
      title={tooltipLines.join('\n')}
      placement="top"
      arrow
      slotProps={{ tooltip: { sx: { whiteSpace: 'pre-line', textAlign: 'center' } } }}
    >
      <Box
        onClick={handleClick}
        sx={{
          position: 'relative',
          width: TILE_SIZE,
          height: TILE_SIZE,
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.3 : 1,
          overflow: 'hidden',
          border: `1.5px solid ${
            hasItem
              ? isDark
                ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.40)'
                : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.25)'
              : isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.07)'
          }`,
          background: hasItem
            ? isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
              : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.04)'
            : isDark
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(0, 0, 0, 0.02)',
          boxShadow: hasItem
            ? isDark
              ? '0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.10), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)'
            : isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
              : 'inset 0 1px 0 rgba(255,255,255,0.5)',
          transition: 'all 180ms ease',
          ...(!isDisabled && {
            '&:hover': {
              transform: 'scale(1.06)',
              borderColor: hasItem
                ? isDark
                  ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.60)'
                  : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.38)'
                : isDark
                  ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)'
                  : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.18)',
              background: hasItem
                ? isDark
                  ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.14)'
                  : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.07)'
                : isDark
                  ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)'
                  : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.03)',
              boxShadow: isDark
                ? '0 4px 20px rgba(0,0,0,0.3), 0 0 16px rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)'
                : '0 4px 16px rgba(0,0,0,0.08)',
            },
            '&:hover .gear-tile-remove': { opacity: 1 },
          }),
        }}
      >
        {/* Icon — UESP photo or SVG silhouette */}
        {hasItem && iconUrl && !iconFailed ? (
          <img
            src={iconUrl}
            alt={primaryLabel ?? slotDef.name}
            onError={() => setIconFailed(true)}
            style={{
              width: TILE_SIZE * 0.52,
              height: TILE_SIZE * 0.52,
              objectFit: 'contain',
              borderRadius: 4,
            }}
          />
        ) : (
          <SlotSvgIcon
            slotType={slotDef.slotType}
            size={TILE_SIZE * 0.36}
            color={
              hasItem
                ? isDark
                  ? 'rgba(var(--be-accent-rgb, 56,189,248), 0.80)'
                  : 'rgba(var(--be-accent-rgb, 15,23,42), 0.55)'
                : isDark
                  ? 'rgba(255,255,255,0.20)'
                  : 'rgba(0,0,0,0.18)'
            }
          />
        )}

        {/* Label — set name (equipped) or slot name (empty) */}
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.58rem',
            lineHeight: 1.15,
            mt: 0.25,
            px: 0.25,
            width: TILE_SIZE - 10,
            textAlign: 'center',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontWeight: hasItem ? 600 : 400,
            color: hasItem
              ? 'text.primary'
              : isDark
                ? 'rgba(255,255,255,0.35)'
                : 'rgba(0,0,0,0.35)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          {hasItem ? (primaryLabel ?? slotDef.name) : slotDef.name}
        </Typography>

        {/* Remove button — hover-reveal, top-right */}
        {hasItem && !isDisabled && (
          <IconButton
            className="gear-tile-remove"
            size="small"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onClear();
            }}
            sx={{
              position: 'absolute',
              top: -4,
              right: -4,
              p: 0,
              width: 24,
              height: 24,
              bgcolor: isDark ? 'rgba(239,68,68,0.85)' : 'rgba(239,68,68,0.90)',
              color: 'white',
              opacity: 0,
              transition: 'opacity 150ms',
              '&:hover': { bgcolor: 'error.dark', opacity: 1 },
            }}
          >
            <CloseIcon sx={{ fontSize: 11 }} />
          </IconButton>
        )}
      </Box>
    </Tooltip>
  );
};
