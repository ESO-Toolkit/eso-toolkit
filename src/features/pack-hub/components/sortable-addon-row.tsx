import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragIndicator, RemoveCircleOutlined } from '@mui/icons-material';
import { alpha, Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import React from 'react';

import type { PackAddonEntry } from '../types/pack-hub.types';

interface SortableAddonProps {
  addon: PackAddonEntry;
  isDark: boolean;
  onToggleRequired: (id: number) => void;
  onRemove: (id: number) => void;
}

export const SortableAddonRow: React.FC<SortableAddonProps> = ({
  addon,
  isDark,
  onToggleRequired,
  onRemove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: addon.esouiId,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative' as const,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 30, height: 0, marginBottom: 0, overflow: 'hidden' }}
      transition={{ duration: 0.2 }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          py: 0.85,
          px: 1.5,
          borderRadius: '10px',
          mb: 0.5,
          bgcolor: isDragging
            ? isDark
              ? alpha('#c4a44a', 0.12)
              : alpha('#c4a44a', 0.08)
            : isDark
              ? alpha('#fff', 0.02)
              : alpha('#000', 0.02),
          border: `1px solid ${isDragging ? alpha('#c4a44a', 0.3) : 'transparent'}`,
          boxShadow: isDragging
            ? `0 8px 24px ${alpha('#000', 0.3)}, 0 0 0 1px ${alpha('#c4a44a', 0.2)}`
            : 'none',
          transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.2s',
          '&:hover': {
            bgcolor: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.04),
          },
        }}
      >
        {/* Drag handle */}
        <Box
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          sx={{
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            color: 'text.disabled',
            opacity: 0.5,
            transition: 'opacity 0.15s',
            '&:hover': { opacity: 1, color: '#c4a44a' },
            flexShrink: 0,
          }}
        >
          <DragIndicator sx={{ fontSize: 16 }} />
        </Box>

        {/* Status dot */}
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: addon.required ? '#c4a44a' : alpha('#94a3b8', 0.4),
            boxShadow: addon.required ? `0 0 6px ${alpha('#c4a44a', 0.5)}` : 'none',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        />

        {/* Name + note */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.3 }}>
            {addon.name}
          </Typography>
          {addon.note && (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ opacity: 0.7, lineHeight: 1.2 }}
            >
              {addon.note}
            </Typography>
          )}
        </Box>

        {/* ESOUI ID */}
        <Typography
          variant="caption"
          sx={{
            flexShrink: 0,
            fontSize: '0.62rem',
            fontFamily: 'monospace',
            color: isDark ? alpha('#38bdf8', 0.5) : alpha('#0f172a', 0.4),
          }}
        >
          #{addon.esouiId}
        </Typography>

        {/* Required/Optional toggle */}
        <Tooltip title={addon.required ? 'Mark as optional' : 'Mark as required'}>
          <Chip
            label={addon.required ? 'Required' : 'Optional'}
            size="small"
            onClick={() => onToggleRequired(addon.esouiId)}
            sx={{
              height: 22,
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
              bgcolor: addon.required ? alpha('#c4a44a', 0.15) : 'transparent',
              color: addon.required ? '#c4a44a' : 'text.disabled',
              border: `1px solid ${addon.required ? alpha('#c4a44a', 0.35) : isDark ? alpha('#fff', 0.08) : alpha('#000', 0.1)}`,
              '&:hover': {
                bgcolor: addon.required ? alpha('#c4a44a', 0.25) : alpha('#fff', 0.06),
              },
            }}
          />
        </Tooltip>

        {/* Remove */}
        <Tooltip title="Remove">
          <IconButton
            size="small"
            onClick={() => onRemove(addon.esouiId)}
            sx={{
              p: 0.4,
              color: 'text.disabled',
              transition: 'all 0.15s',
              '&:hover': { color: '#ef4444', bgcolor: alpha('#ef4444', 0.08) },
            }}
          >
            <RemoveCircleOutlined sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </motion.div>
  );
};
