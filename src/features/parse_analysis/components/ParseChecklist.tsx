import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import React from 'react';

import type { ParseChecklistItem, ParseChecklistStatus } from '../types/parseChecklist';

interface ParseChecklistProps {
  items: ParseChecklistItem[];
}

const STATUS_LABELS: Record<ParseChecklistStatus, string> = {
  pass: 'Pass',
  warn: 'Review',
  fail: 'Missing',
  info: 'Manual',
};

const STATUS_BORDER_COLORS: Record<ParseChecklistStatus, string> = {
  pass: '#4caf50',
  warn: '#ff9800',
  fail: '#f44336',
  info: '#2196f3',
};

function getStatusIcon(status: ParseChecklistStatus): React.ReactElement {
  const sx = { fontSize: 16 };
  switch (status) {
    case 'pass':
      return <CheckCircleIcon color="success" sx={sx} />;
    case 'warn':
      return <WarningAmberIcon color="warning" sx={sx} />;
    case 'fail':
      return <ErrorIcon color="error" sx={sx} />;
    default:
      return <InfoIcon color="info" sx={sx} />;
  }
}

export const ParseChecklist: React.FC<ParseChecklistProps> = ({ items }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (items.length === 0) return null;

  const passCount = items.filter((i) => i.status === 'pass').length;
  const failCount = items.filter((i) => i.status === 'fail').length;
  const warnCount = items.filter((i) => i.status === 'warn').length;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Summary bar */}
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ mb: 1.5 }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          Checklist
        </Typography>
        <Stack direction="row" spacing={1}>
          {passCount > 0 && (
            <Typography variant="caption" color="success.main" fontWeight={600}>
              {passCount} pass
            </Typography>
          )}
          {warnCount > 0 && (
            <Typography variant="caption" color="warning.main" fontWeight={600}>
              {warnCount} review
            </Typography>
          )}
          {failCount > 0 && (
            <Typography variant="caption" color="error.main" fontWeight={600}>
              {failCount} missing
            </Typography>
          )}
        </Stack>
      </Stack>

      {/* Checklist grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 1,
        }}
      >
        {items.map((item) => (
          <Tooltip key={item.id} title={item.detail || ''} placement="top" arrow>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 1,
                px: 1.5,
                borderRadius: 1.5,
                borderLeft: '3px solid',
                borderLeftColor: STATUS_BORDER_COLORS[item.status],
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                transition: 'background-color 0.15s',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
              }}
            >
              {getStatusIcon(item.status)}
              <Typography variant="caption" fontWeight={500} sx={{ flex: 1 }}>
                {item.title}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: STATUS_BORDER_COLORS[item.status],
                  opacity: 0.85,
                }}
              >
                {STATUS_LABELS[item.status]}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
};
