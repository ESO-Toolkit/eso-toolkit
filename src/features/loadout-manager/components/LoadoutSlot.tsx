/**
 * Loadout Slot Component
 * Individual loadout slot item in the sidebar
 * Shows numbered badge, name, 2x6 skill grid, and status badges with subtle glow
 */

import {
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  FileCopy as FileCopyIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';

import type { LoadoutSetup } from '../types/loadout.types';
import { getSetupProgressSections, formatProgressSection } from '../utils/setupDisplay';

import { SkillBarGrid } from './SkillBarGrid';
import { StatusBadge } from './StatusBadge';

interface LoadoutSlotProps {
  setup: LoadoutSetup;
  index: number;
  selected: boolean;
  onSelect: (index: number) => void;
  onCopy: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
}

export const LoadoutSlot: React.FC<LoadoutSlotProps> = ({
  setup,
  index,
  selected,
  onSelect,
  onCopy,
  onDuplicate,
  onDelete,
}) => {
  const displayId = (index + 1).toString().padStart(2, '0');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);

  const progressSections = getSetupProgressSections(setup);
  const cpValue = progressSections.find((s) => s.type === 'cp');
  const cpLabel = cpValue ? `+${cpValue.count}` : '+0';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = (): void => {
    setMenuAnchor(null);
  };

  return (
    <>
      <Box
        onClick={() => onSelect(index)}
        sx={{
          p: 1,
          my: 0.5,
          mx: 0.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          cursor: 'pointer',
          borderRadius: 2,
          border: selected
            ? '1px solid #00d9ff'
            : '1px solid rgba(0, 217, 255, 0.15)',
          backgroundColor: selected
            ? 'rgba(0, 217, 255, 0.08)'
            : 'transparent',
          transition: 'all 0.2s ease-in-out',
          opacity: setup.disabled ? 0.5 : 1,
          // Subtle glow for selected state
          boxShadow: selected
            ? `
                0 0 10px rgba(0, 217, 255, 0.2),
                inset 0 0 10px rgba(0, 217, 255, 0.1)
              `
            : 'none',
          '&:hover': {
            borderColor: selected ? '#00d9ff' : 'rgba(0, 217, 255, 0.4)',
            backgroundColor: selected
              ? 'rgba(0, 217, 255, 0.12)'
              : 'rgba(0, 217, 255, 0.05)',
            boxShadow: selected
              ? `
                  0 0 15px rgba(0, 217, 255, 0.3),
                  inset 0 0 15px rgba(0, 217, 255, 0.15)
                `
              : `
                  0 0 5px rgba(0, 217, 255, 0.1),
                  inset 0 0 5px rgba(0, 217, 255, 0.05)
                `,
          },
        }}
      >
        {/* Top row: badge + name + menu */}
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          {/* Number badge with gem-like effect */}
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              flexShrink: 0,
              color: selected ? '#0a0f1e' : '#00d9ff',
              backgroundColor: selected ? '#00d9ff' : 'rgba(0, 217, 255, 0.15)',
              border: selected ? 'none' : '1px solid rgba(0, 217, 255, 0.3)',
              // Gem-like effect for selected state
              boxShadow: selected
                ? `
                    inset 0 0 10px rgba(255, 255, 255, 0.3),
                    0 0 10px rgba(0, 217, 255, 0.5)
                  `
                : 'none',
              position: 'relative',
              ...(selected && {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'inherit',
                  background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.4), transparent 50%)',
                  pointerEvents: 'none',
                },
              }),
            }}
          >
            {displayId}
          </Box>

          {/* Name */}
          <Typography
            sx={{
              flex: 1,
              fontWeight: 700,
              fontSize: '0.875rem',
              color: selected ? '#ffffff' : '#e5e7eb',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {setup.name}
          </Typography>

          {/* Menu button - more subtle */}
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{
              p: 0.25,
              opacity: 0.4,
              color: '#7a8599',
              '&:hover': {
                opacity: 1,
                color: '#00d9ff',
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
              },
            }}
          >
            <MoreVertIcon fontSize="small" sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Stack>

        {/* Condition label */}
        {setup.condition?.boss && (
          <Typography
            sx={{
              fontSize: '0.7rem',
              color: '#7a8599',
              pl: 0.25,
            }}
          >
            {setup.condition.boss}
          </Typography>
        )}

        {/* 2x6 Skill Grid - smaller icons */}
        <SkillBarGrid skills={setup.skills} iconSize={22} />

        {/* Status badges */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <StatusBadge value={cpLabel} />
          {progressSections
            .filter((s) => s.type !== 'cp')
            .map((section, idx) => (
              <StatusBadge
                key={`${section.type}-${idx}`}
                value={formatProgressSection(section)}
              />
            ))}
        </Stack>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'rgba(10, 18, 35, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: 2,
              minWidth: 140,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            onCopy(index);
            handleMenuClose();
          }}
          sx={{
            color: '#e5e7eb',
            fontSize: '0.85rem',
            '&:hover': {
              backgroundColor: 'rgba(0, 217, 255, 0.1)',
              color: '#ffffff',
            },
          }}
        >
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" sx={{ color: '#e5e7eb' }} />
          </ListItemIcon>
          <ListItemText>Copy</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onDuplicate(index);
            handleMenuClose();
          }}
          sx={{
            color: '#e5e7eb',
            fontSize: '0.85rem',
            '&:hover': {
              backgroundColor: 'rgba(0, 217, 255, 0.1)',
              color: '#ffffff',
            },
          }}
        >
          <ListItemIcon>
            <FileCopyIcon fontSize="small" sx={{ color: '#e5e7eb' }} />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onDelete(index);
            handleMenuClose();
          }}
          sx={{
            color: '#ef4444',
            fontSize: '0.85rem',
            '&:hover': {
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            },
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
