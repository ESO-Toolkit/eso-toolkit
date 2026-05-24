import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box, Stack, Tooltip, Typography, useTheme, type Theme } from '@mui/material';
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

// Removed hardcoded colors - using theme palette instead

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

const getStatusColor = (
  status: ParseChecklistStatus,
  theme: Theme,
): { main: string; light: string; text: string } => {
  switch (status) {
    case 'pass':
      return {
        main: theme.palette.success.main,
        light: theme.palette.success.light,
        text:
          theme.palette.mode === 'dark' ? theme.palette.success.light : theme.palette.success.main,
      };
    case 'warn':
      return {
        main: theme.palette.warning.main,
        light: theme.palette.warning.light,
        text:
          theme.palette.mode === 'dark' ? theme.palette.warning.light : theme.palette.warning.main,
      };
    case 'fail':
      return {
        main: theme.palette.error.main,
        light: theme.palette.error.light,
        text: theme.palette.mode === 'dark' ? theme.palette.error.light : theme.palette.error.main,
      };
    case 'info':
      return {
        main: theme.palette.info.main,
        light: theme.palette.info.light,
        text: theme.palette.mode === 'dark' ? theme.palette.info.light : theme.palette.info.main,
      };
  }
};

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
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Checklist
        </Typography>
        <Stack direction="row" spacing={1}>
          {passCount > 0 && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: isDark ? theme.palette.success.light : theme.palette.success.main,
              }}
            >
              {passCount} pass
            </Typography>
          )}
          {warnCount > 0 && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: isDark ? theme.palette.warning.light : theme.palette.warning.main,
              }}
            >
              {warnCount} review
            </Typography>
          )}
          {failCount > 0 && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: isDark ? theme.palette.error.light : theme.palette.error.main,
              }}
            >
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
        {items.map((item) => {
          const statusColor = getStatusColor(item.status, theme);
          const bgAlpha = isDark ? 0.08 : 0.06;
          const bgColor = `rgba(${
            item.status === 'pass'
              ? isDark
                ? '76, 175, 80'
                : '76, 175, 80'
              : item.status === 'warn'
                ? isDark
                  ? '255, 152, 0'
                  : '255, 152, 0'
                : item.status === 'fail'
                  ? isDark
                    ? '244, 67, 54'
                    : '244, 67, 54'
                  : isDark
                    ? '33, 150, 243'
                    : '33, 150, 243'
          }, ${bgAlpha})`;

          return (
            <Tooltip key={item.id} title={item.detail || ''} placement="top" arrow>
              <Box
                sx={{
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 1.25,
                  px: 1.5,
                  borderRadius: 1.5,
                  borderTop: '2px solid',
                  borderTopColor: statusColor.main,
                  backgroundColor: bgColor,
                  transition: 'all 0.15s ease-out',
                  '&:hover': {
                    backgroundColor: `rgba(${
                      item.status === 'pass'
                        ? isDark
                          ? '76, 175, 80'
                          : '76, 175, 80'
                        : item.status === 'warn'
                          ? isDark
                            ? '255, 152, 0'
                            : '255, 152, 0'
                          : item.status === 'fail'
                            ? isDark
                              ? '244, 67, 54'
                              : '244, 67, 54'
                            : isDark
                              ? '33, 150, 243'
                              : '33, 150, 243'
                    }, ${bgAlpha + 0.04})`,
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {getStatusIcon(item.status)}
                <Typography variant="caption" sx={{ flex: 1 }}>
                  {item.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: statusColor.text,
                    opacity: 0.9,
                  }}
                >
                  {STATUS_LABELS[item.status]}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};
