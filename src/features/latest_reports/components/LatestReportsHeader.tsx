import AssessmentIcon from '@mui/icons-material/Assessment';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import React from 'react';

interface LatestReportsHeaderProps {
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * Branded header tile for Latest Reports, matching the Roster Hub header
 * (icon tile + "COMMUNITY" eyebrow + gradient-text title + top accent line)
 * so the two community surfaces share one visual identity.
 */
export const LatestReportsHeader: React.FC<LatestReportsHeaderProps> = ({
  onRefresh,
  refreshing,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 2.5,
        px: 2.5,
        py: 2,
        borderRadius: 2,
        background: isDark
          ? 'linear-gradient(135deg, rgba(110,170,240,0.10) 0%, rgba(152,131,227,0.07) 50%, rgba(11,18,32,0.4) 100%)'
          : 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(124,58,237,0.04) 50%, rgba(255,255,255,0.6) 100%)',
        border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: isDark
            ? 'linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.6) 30%, rgba(167,139,250,0.8) 60%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(37,99,235,0.4) 30%, rgba(124,58,237,0.5) 60%, transparent 100%)',
          borderRadius: '4px 4px 0 0',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: isDark
              ? 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(167,139,250,0.12) 100%)'
              : 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.08) 100%)',
            border: isDark ? '1px solid rgba(96,165,250,0.25)' : '1px solid rgba(37,99,235,0.18)',
            boxShadow: isDark ? '0 0 12px rgba(96,165,250,0.15)' : '0 0 8px rgba(37,99,235,0.10)',
          }}
        >
          <AssessmentIcon sx={{ fontSize: '1.25rem', color: isDark ? '#60a5fa' : '#2563eb' }} />
        </Box>
        <Box>
          <Typography
            sx={{
              fontSize: '0.58rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isDark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.8)',
              lineHeight: 1.2,
            }}
          >
            Community
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.35rem', sm: '1.5rem' },
              letterSpacing: '-0.02em',
              background: isDark
                ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.3,
            }}
          >
            Latest Reports
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', mt: 0.25, display: { xs: 'none', sm: 'block' } }}
          >
            Discover the most recent combat logs from the community
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, alignItems: 'center' }}>
        <Tooltip title="Refresh reports" arrow>
          <IconButton
            size="small"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh reports"
            sx={{
              minWidth: 36,
              minHeight: 36,
              color: 'text.disabled',
              '&:hover': { color: isDark ? '#60a5fa' : '#2563eb' },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
