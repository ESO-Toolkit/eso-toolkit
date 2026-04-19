import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import { Box, Menu, MenuItem, Typography } from '@mui/material';
import React from 'react';

import { WidgetScope } from '../../store/dashboard/dashboardSlice';
import { ClassIcon } from '../ClassIcon';

export type WidgetKind = 'deaths' | 'buffs' | 'build' | 'uptime' | 'dps' | 'food';

interface KindConfig {
  accent: string;
  iconBg: string;
  iconBorder: string;
}

export const KIND_CONFIG: Record<WidgetKind, KindConfig> = {
  deaths: { accent: '#ff6666', iconBg: 'rgba(255,102,102,.1)', iconBorder: 'rgba(255,102,102,.3)' },
  buffs: { accent: '#ffd54f', iconBg: 'rgba(255,213,79,.1)', iconBorder: 'rgba(255,213,79,.3)' },
  build: { accent: '#ff9a4a', iconBg: 'rgba(255,154,74,.1)', iconBorder: 'rgba(255,154,74,.3)' },
  uptime: { accent: '#c57fff', iconBg: 'rgba(197,127,255,.1)', iconBorder: 'rgba(197,127,255,.3)' },
  dps: { accent: '#4da3ff', iconBg: 'rgba(77,163,255,.1)', iconBorder: 'rgba(77,163,255,.3)' },
  food: { accent: '#66ffaa', iconBg: 'rgba(102,255,170,.1)', iconBorder: 'rgba(102,255,170,.3)' },
};

const CLASS_BORDER: Record<string, string> = {
  dragonknight: 'rgba(255,122,74,0.35)',
  sorcerer: 'rgba(197,139,255,0.35)',
  nightblade: 'rgba(255,90,90,0.35)',
  templar: 'rgba(255,212,128,0.35)',
  warden: 'rgba(77,163,255,0.35)',
  necromancer: 'rgba(107,47,179,0.45)',
  arcanist: 'rgba(109,226,160,0.35)',
};

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  dps: {
    label: 'DPS',
    bg: 'rgba(255,102,102,0.12)',
    color: '#ff9a9a',
    border: 'rgba(255,102,102,0.25)',
  },
  healer: {
    label: 'Healer',
    bg: 'rgba(92,229,114,0.12)',
    color: '#8df39a',
    border: 'rgba(92,229,114,0.25)',
  },
  tank: {
    label: 'Tank',
    bg: 'rgba(56,189,248,0.12)',
    color: '#7dd3fc',
    border: 'rgba(56,189,248,0.25)',
  },
};

const SCOPE_LABELS: Record<WidgetScope, string> = {
  'most-recent': 'Most Recent',
  'last-3': 'Last 3',
  'last-5': 'Last 5',
  'all-fights': 'All Fights',
};

export interface WidgetPlayerAvatarProps {
  className: string;
  size?: number;
}

export const WidgetPlayerAvatar: React.FC<WidgetPlayerAvatarProps> = ({
  className,
  size = 30,
}) => {
  const cls = className.trim().toLowerCase();
  const borderColor = CLASS_BORDER[cls] ?? 'rgba(255,255,255,0.08)';
  const iconSize = Math.round(size * 0.73);

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `inset 0 0 0 1px ${borderColor}`,
        flexShrink: 0,
      }}
    >
      <ClassIcon className={cls} size={iconSize} style={{ opacity: 1 }} />
    </Box>
  );
};

export interface WidgetRolePillProps {
  role: string;
}

export const WidgetRolePill: React.FC<WidgetRolePillProps> = ({ role }) => {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.dps;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: '7px',
        py: '2px',
        borderRadius: '9999px',
        fontSize: 9,
        fontWeight: 700,
        fontFamily: 'monospace',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        lineHeight: 1,
      }}
    >
      {cfg.label}
    </Box>
  );
};

export interface BaseWidgetProps {
  id: string;
  title: string;
  subtitle: string;
  kind: WidgetKind;
  icon: React.ReactNode;
  scope: WidgetScope;
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
  children: React.ReactNode;
  isEmpty?: boolean;
}

export const BaseWidget: React.FC<BaseWidgetProps> = ({
  id: _id,
  title,
  subtitle,
  kind,
  icon,
  scope,
  onRemove,
  onScopeChange,
  children,
  isEmpty = false,
}) => {
  const [scopeMenuAnchor, setScopeMenuAnchor] = React.useState<null | HTMLElement>(null);
  const cfg = KIND_CONFIG[kind];

  return (
    <Box
      data-testid={`widget-${_id}`}
      sx={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)',
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        position: 'relative',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { borderColor: 'rgba(56,189,248,0.22)' },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: cfg.accent,
          opacity: 0.7,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: '14px 16px 12px',
          borderBottom: '1px solid rgba(148,163,184,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '8px',
            background: cfg.iconBg,
            border: `1px solid ${cfg.iconBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: cfg.accent,
            flexShrink: 0,
            '& svg': { width: 16, height: 16 },
          }}
        >
          {icon}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '-0.005em',
              lineHeight: 1.2,
              mb: '2px',
              color: '#ffffff',
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 500,
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)',
              lineHeight: 1,
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        <Box
          component="button"
          onClick={(e: React.MouseEvent<HTMLElement>) => setScopeMenuAnchor(e.currentTarget)}
          sx={{
            background: 'rgba(11,18,32,0.66)',
            border: '1px solid rgba(148,163,184,0.18)',
            borderRadius: '6px',
            color: 'rgba(255,255,255,0.72)',
            px: '8px',
            py: '4px',
            fontSize: 11,
            fontFamily: 'monospace',
            letterSpacing: '0.04em',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'border-color 0.15s',
            whiteSpace: 'nowrap',
            '&:hover': { borderColor: 'rgba(56,189,248,0.3)' },
          }}
        >
          <SettingsIcon sx={{ width: 11, height: 11, opacity: 0.6 }} />
          {SCOPE_LABELS[scope]}
        </Box>

        <Box
          component="button"
          onClick={onRemove}
          aria-label="Remove widget"
          sx={{
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: '6px',
            p: '5px',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            flexShrink: 0,
            '&:hover': {
              color: '#ffffff',
              background: 'rgba(255,102,102,0.1)',
              borderColor: 'rgba(255,102,102,0.3)',
            },
            '& svg': { width: 13, height: 13 },
          }}
        >
          <CloseIcon />
        </Box>
      </Box>

      {/* Body */}
      <Box
        sx={{
          maxHeight: 500,
          overflowY: 'auto',
          py: '4px',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(148,163,184,0.2)',
            borderRadius: '3px',
          },
        }}
      >
        {isEmpty ? (
          <Box sx={{ p: '36px 20px', textAlign: 'center' }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(92,229,114,0.1)',
                border: '1px solid rgba(92,229,114,0.3)',
                color: '#5ce572',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: '10px',
                fontSize: 16,
              }}
            >
              ✓
            </Box>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', display: 'block' }}>
              No issues detected
            </Typography>
          </Box>
        ) : (
          children
        )}
      </Box>

      <Menu
        anchorEl={scopeMenuAnchor}
        open={Boolean(scopeMenuAnchor)}
        onClose={() => setScopeMenuAnchor(null)}
      >
        {(Object.keys(SCOPE_LABELS) as WidgetScope[]).map((s) => (
          <MenuItem
            key={s}
            selected={s === scope}
            onClick={() => {
              onScopeChange(s);
              setScopeMenuAnchor(null);
            }}
          >
            {SCOPE_LABELS[s]}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
