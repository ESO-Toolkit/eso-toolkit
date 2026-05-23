import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BuildIcon from '@mui/icons-material/Build';
import CloseIcon from '@mui/icons-material/Close';
import DangerousIcon from '@mui/icons-material/Dangerous';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import { Box, Dialog, Typography } from '@mui/material';
import React from 'react';

import { WidgetType } from '../../store/dashboard/dashboardSlice';

import { KIND_CONFIG, WidgetKind } from './BaseWidget';

interface AddWidgetDialogProps {
  open: boolean;
  onClose: () => void;
  onAddWidget: (type: WidgetType) => void;
}

interface WidgetOption {
  type: WidgetType;
  kind: WidgetKind;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const WIDGET_OPTIONS: WidgetOption[] = [
  {
    type: 'death-causes',
    kind: 'deaths',
    title: 'Death Causes',
    desc: 'Who died and what killed them, by ability & source.',
    icon: <DangerousIcon />,
  },
  {
    type: 'missing-buffs',
    kind: 'buffs',
    title: 'Missing Buffs',
    desc: 'Major Brutality, Sorcery, Minor Berserk at fight midpoint.',
    icon: <AutoAwesomeIcon />,
  },
  {
    type: 'build-issues',
    kind: 'build',
    title: 'Build Issues',
    desc: 'Gear, mundus, CP, mythic and armor-weight problems.',
    icon: <BuildIcon />,
  },
  {
    type: 'low-buff-uptimes',
    kind: 'uptime',
    title: 'Low Buff Uptimes',
    desc: 'Major Brutality & Sorcery below 95% uptime threshold.',
    icon: <TimerIcon />,
  },
  {
    type: 'low-dps',
    kind: 'dps',
    title: 'Low DPS',
    desc: 'DPS players under the 50k expectation across the pull.',
    icon: <SpeedIcon />,
  },
  {
    type: 'missing-food',
    kind: 'food',
    title: 'Missing Food',
    desc: 'Detects food/drink buffs across every fight in the log.',
    icon: <FastfoodIcon />,
  },
];

export const AddWidgetDialog: React.FC<AddWidgetDialogProps> = ({ open, onClose, onAddWidget }) => {
  const handleSelect = (type: WidgetType): void => {
    onAddWidget(type);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(11,18,32,0.98) 100%)',
          border: '1px solid rgba(56,189,248,0.3)',
          borderRadius: '20px',
          boxShadow:
            '0 40px 100px rgba(0,0,0,0.6), 0 0 80px rgba(56,189,248,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: '20px 24px 16px',
          borderBottom: '1px solid rgba(148,163,184,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#38bdf8',
              mb: '4px',
            }}
          >
            Add Widget
          </Typography>
          <Typography
            sx={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: '#ffffff' }}
          >
            Choose a widget to add to your dashboard
          </Typography>
        </Box>
        <Box
          component="button"
          onClick={onClose}
          aria-label="Close"
          sx={{
            background: 'transparent',
            border: '1px solid rgba(148,163,184,0.18)',
            borderRadius: '8px',
            width: 30,
            height: 30,
            color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            flexShrink: 0,
            '&:hover': { color: '#ffffff', borderColor: 'rgba(56,189,248,0.3)' },
            '& svg': { width: 14, height: 14 },
          }}
        >
          <CloseIcon />
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ p: '20px 24px 24px', overflowY: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
          }}
        >
          {WIDGET_OPTIONS.map((opt) => {
            const cfg = KIND_CONFIG[opt.kind];
            return (
              <Box
                key={opt.type}
                component="button"
                onClick={() => handleSelect(opt.type)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  p: '14px',
                  background: 'rgba(11,18,32,0.5)',
                  border: '1px solid rgba(148,163,184,0.18)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                  color: 'inherit',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: cfg.accent,
                    opacity: 0.6,
                  },
                  '&:hover': {
                    borderColor: cfg.accent,
                    background: 'rgba(56,189,248,0.04)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '9px',
                    background: cfg.iconBg,
                    border: `1px solid ${cfg.iconBorder}`,
                    color: cfg.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    '& svg': { width: 18, height: 18 },
                  }}
                >
                  {opt.icon}
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      letterSpacing: '-0.005em',
                      color: '#ffffff',
                      mb: '3px',
                    }}
                  >
                    {opt.title}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}
                  >
                    {opt.desc}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
        <Typography
          sx={{
            mt: '16px',
            mx: '2px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'monospace',
            letterSpacing: '0.06em',
          }}
        >
          TIP · Multiple instances of the same widget are allowed. Each gets its own scope.
        </Typography>
      </Box>
    </Dialog>
  );
};
