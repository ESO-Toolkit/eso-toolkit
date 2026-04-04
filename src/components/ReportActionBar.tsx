import DashboardIcon from '@mui/icons-material/Dashboard';
import LaunchIcon from '@mui/icons-material/Launch';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { Box, ButtonBase, Link, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import React from 'react';

import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';

export type ReportPage = 'fights' | 'dashboard' | 'summary';

interface ReportActionBarProps {
  reportId: string;
  title: string;
  activePage: ReportPage;
  /** Optional extra controls rendered to the right of the nav tabs (e.g. dashboard toggle) */
  actions?: React.ReactNode;
}

const NAV_ITEMS: { key: ReportPage; label: string; icon: React.ReactNode; path: (id: string) => string }[] = [
  { key: 'fights', label: 'Fights', icon: <ListAltIcon sx={{ fontSize: '1.1rem' }} />, path: (id) => `/report/${id}` },
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon sx={{ fontSize: '1.1rem' }} />, path: (id) => `/report/${id}/dashboard` },
  { key: 'summary', label: 'Summary', icon: <SummarizeIcon sx={{ fontSize: '1.1rem' }} />, path: (id) => `/report/${id}/summary` },
];

export const ReportActionBar: React.FC<ReportActionBarProps> = ({
  reportId,
  title,
  activePage,
  actions,
}) => {
  const navigate = useViewTransitionNavigate();
  const esoLogsUrl = `https://www.esologs.com/reports/${encodeURIComponent(reportId)}`;

  return (
    <Box
      sx={{
        mb: { xs: 2, sm: 3 },
        borderRadius: 2.5,
        border: (t: Theme) =>
          `1px solid ${t.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(59, 130, 246, 0.12)'}`,
        background: (t: Theme) =>
          t.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.85) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: (t: Theme) =>
          t.palette.mode === 'dark'
            ? '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(56, 189, 248, 0.08)'
            : '0 4px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        overflow: 'hidden',
      }}
    >
      {/* Title row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pt: { xs: 2, sm: 2.5 },
          pb: 1.5,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.65rem' },
            fontWeight: 700,
            textAlign: 'center',
            wordBreak: 'break-word',
            lineHeight: 1.3,
            color: (t: Theme) =>
              t.palette.mode === 'dark' ? '#f1f5f9' : '#0f172a',
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Navigation row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 0.5, sm: 1 },
          px: { xs: 1.5, sm: 3 },
          pb: { xs: 1.5, sm: 2 },
          flexWrap: 'wrap',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activePage;
          return (
            <ButtonBase
              key={item.key}
              onClick={() => navigate(item.path(reportId))}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: { xs: 1.5, sm: 2 },
                py: 1,
                borderRadius: 2,
                fontSize: { xs: '0.8rem', sm: '0.85rem' },
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                color: (t: Theme) =>
                  isActive
                    ? t.palette.mode === 'dark'
                      ? '#38bdf8'
                      : '#2563eb'
                    : t.palette.mode === 'dark'
                      ? 'rgba(203, 213, 225, 0.8)'
                      : 'rgba(51, 65, 85, 0.8)',
                background: (t: Theme) =>
                  isActive
                    ? t.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.12)'
                      : 'rgba(59, 130, 246, 0.08)'
                    : 'transparent',
                border: (t: Theme) =>
                  isActive
                    ? `1px solid ${t.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(59, 130, 246, 0.18)'}`
                    : '1px solid transparent',
                '&:hover': {
                  background: (t: Theme) =>
                    isActive
                      ? t.palette.mode === 'dark'
                        ? 'rgba(56, 189, 248, 0.16)'
                        : 'rgba(59, 130, 246, 0.12)'
                      : t.palette.mode === 'dark'
                        ? 'rgba(56, 189, 248, 0.06)'
                        : 'rgba(59, 130, 246, 0.04)',
                  color: (t: Theme) =>
                    t.palette.mode === 'dark' ? '#38bdf8' : '#2563eb',
                },
              }}
            >
              {item.icon}
              {item.label}
            </ButtonBase>
          );
        })}

        {/* Separator dot */}
        <Box
          sx={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: (t: Theme) =>
              t.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.25)',
            mx: 0.5,
          }}
        />

        {/* ESO Logs external link */}
        <Link
          href={esoLogsUrl}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: { xs: 1.5, sm: 2 },
            py: 1,
            borderRadius: 2,
            fontSize: { xs: '0.8rem', sm: '0.85rem' },
            fontWeight: 500,
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            color: (t: Theme) =>
              t.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)',
            border: '1px solid transparent',
            '&:hover': {
              color: (t: Theme) =>
                t.palette.mode === 'dark' ? '#38bdf8' : '#2563eb',
              background: (t: Theme) =>
                t.palette.mode === 'dark'
                  ? 'rgba(56, 189, 248, 0.06)'
                  : 'rgba(59, 130, 246, 0.04)',
            },
          }}
        >
          ESO Logs
          <LaunchIcon sx={{ fontSize: '0.8rem' }} />
        </Link>

        {/* Extra actions (e.g. dashboard controls) */}
        {actions && (
          <Box
            sx={{
              ml: { xs: 0, sm: 'auto' },
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
};
