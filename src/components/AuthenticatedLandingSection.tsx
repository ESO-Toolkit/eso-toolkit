import {
  Link as LinkIcon,
  Assignment as AssignmentIcon,
  ChevronRight as ChevronRightIcon,
  CalendarMonth as CalendarMonthIcon,
} from '@mui/icons-material';
import { Box, Button, TextField, Typography, Skeleton, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import React, { useState } from 'react';

import { useLatestReport } from '../hooks/useLatestReport';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { clearAllEvents } from '../store/events_data/actions';
import { clearMasterData } from '../store/master_data/masterDataSlice';
import { clearReport } from '../store/report/reportSlice';
import { useAppDispatch } from '../store/useAppDispatch';

import { LogInputContainer } from './LandingPage';

export const AuthenticatedLandingSection: React.FC = () => {
  const [logUrl, setLogUrl] = useState('');
  const navigate = useViewTransitionNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { report: latestReport, loading: latestReportLoading } = useLatestReport();

  const handleLogUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setLogUrl(e.target.value);
  };

  const extractReportInfo = (url: string): { reportId: string; fightId: string | null } | null => {
    const reportMatch = url.match(/reports\/([A-Za-z0-9]+)/);
    if (!reportMatch) return null;

    const reportId = reportMatch[1];
    let fightId: string | null = null;

    const hashFightMatch = url.match(/#fight=(\d+)/);
    if (hashFightMatch) {
      fightId = hashFightMatch[1];
    }

    const queryFightMatch = url.match(/[?&]fight=(\d+)/);
    if (queryFightMatch) {
      fightId = queryFightMatch[1];
    }

    const pathFightMatch = url.match(/reports\/[A-Za-z0-9]+\/(\d+)/);
    if (pathFightMatch) {
      fightId = pathFightMatch[1];
    }

    return { reportId, fightId };
  };

  const handleLoadLog = (): void => {
    const result = extractReportInfo(logUrl);
    if (result) {
      dispatch(clearAllEvents());
      dispatch(clearMasterData());
      dispatch(clearReport());

      if (result.fightId) {
        navigate(`/report/${result.reportId}/fight/${result.fightId}/insights`, { vtType: 'up' });
      } else {
        navigate(`/report/${result.reportId}`, { vtType: 'up' });
      }
    } else {
      alert('Invalid ESOLogs report URL');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 1,
        maxWidth: '600px',
        width: '100%',
        mx: 'auto',
        [theme.breakpoints.down('sm')]: {
          maxWidth: '100%',
        },
      }}
    >
      <LogInputContainer sx={{ m: 0 }}>
        <TextField
          label="ESOLogs.com Log URL"
          variant="outlined"
          value={logUrl}
          onChange={handleLogUrlChange}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'transparent',
              borderRadius: { xs: '8px 8px 0 0', sm: '16px 0 0 16px' },
              height: { xs: '56px', sm: '64px' },
              padding: '0 1.5rem',
              border: 'none',
              // The container handles the hover lift; neutralize the global
              // MuiOutlinedInput hover styles so the input doesn't lift on its
              // own or paint an opaque background over the container's top
              // accent border.
              '&:hover': {
                backgroundColor: 'transparent !important',
                transform: 'none',
              },
              '&.Mui-focused': {
                backgroundColor: 'transparent',
              },
              '& fieldset': {
                border: 'none',
              },
              '&:hover fieldset': {
                border: 'none',
              },
              '&.Mui-focused fieldset': {
                border: 'none',
              },
            },
            '& .MuiInputLabel-root': {
              color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
              left: '3.5rem',
              top: { xs: '2px', sm: '4px' },
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              '&.Mui-focused': {
                color: '#38bdf8',
              },
              '&.MuiInputLabel-shrink': {
                transform: {
                  xs: 'translate(3.5rem, -12px) scale(0.75)',
                  sm: 'translate(3.5rem, -10px) scale(0.75)',
                },
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.9)'
                    : 'rgba(248, 250, 252, 0.95)',
                padding: '2px 8px',
                borderRadius: '4px',
              },
            },
            '& .MuiInputBase-input': {
              padding: { xs: '16px 0', sm: '18px 0' },
              color: theme.palette.mode === 'dark' ? '#e5e7eb' : '#1e293b',
              // Keep >=16px on mobile so iOS Safari doesn't auto-zoom on focus.
              fontSize: { xs: '16px', sm: '1rem' },
            },
          }}
          slotProps={{
            input: {
              startAdornment: <LinkIcon sx={{ mr: 1, color: '#38bdf8', ml: 0 }} />,
            },
          }}
        />
        <Button
          variant="contained"
          color="secondary"
          sx={{
            minWidth: 200,
            height: 64,
            background: 'linear-gradient(135deg, #38bdf8 0%, #00e1ff 50%, #0ea5e9 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            borderRadius: { xs: '0 0 8px 8px', sm: '0 16px 16px 0' },
            border: 'none',
            boxShadow: 'none',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            textShadow: `
              0 2px 4px rgba(0, 0, 0, 0),
              0 4px 8px rgba(0, 0, 0, 0.7),
              0 8px 16px rgba(0, 0, 0, 0.5),
              0 0 15px rgba(14, 165, 233, 0.6),
              0 0 30px rgba(56, 189, 248, 0.4),
              0 1px 0 rgba(255, 255, 255, 0.2)
            `,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%)',
              opacity: 0,
              transition: 'opacity 0.3s ease',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
              transition: 'left 0.6s ease',
            },
            '&:hover': {
              background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #00e1ff 100%)',
              transform: { xs: 'none', sm: 'scale(1.02)' },
              '&::before': {
                opacity: 1,
              },
              '&::after': {
                left: '100%',
              },
            },
            '&:active': {
              transform: { xs: 'none', sm: 'scale(1.01)' },
            },
          }}
          onClick={handleLoadLog}
        >
          Analyze Log
        </Button>
      </LogInputContainer>

      {/* Desktop Layout */}
      <Box
        sx={{
          maxWidth: 600,
          width: '100%',
          mx: 'auto',
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          justifyContent: 'space-between',
          mt: 0.5,
          gap: 2,
        }}
      >
        {/* Latest Report Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {latestReportLoading ? (
            <Skeleton variant="text" width={190} height={22} sx={{ borderRadius: 1 }} />
          ) : latestReport ? (
            <Box
              onClick={() => navigate(`/report/${latestReport.code}`, { vtType: 'up' })}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                p: 1,
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.05)',
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.9)'
                      : 'rgba(51, 65, 85, 0.9)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textDecoration: 'underline',
                  textDecorationColor: 'transparent',
                  '&:hover': {
                    textDecorationColor: 'currentColor',
                  },
                }}
              >
                <span style={{ fontWeight: 200 }}>{latestReport.title || 'Untitled'}</span> •{' '}
                <span style={{ fontWeight: 700 }}>
                  📅 {format(new Date(latestReport.startTime), 'MMM dd')}
                </span>
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{
                color:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.5)'
                    : 'rgba(51, 65, 85, 0.5)',
                fontSize: '0.875rem',
                fontStyle: 'italic',
              }}
            >
              📝 No reports yet
            </Typography>
          )}
        </Box>

        {/* Spacer Line */}
        <Box
          sx={{
            height: '1px',
            background:
              theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(14, 165, 233, 0.2)',
            flex: 1,
          }}
        />

        {/* View my reports button - moved to the right */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <Button
            variant="text"
            size="small"
            onClick={() => navigate('/my-reports', { vtType: 'up' })}
            startIcon={<AssignmentIcon sx={{ fontSize: 18 }} />}
            sx={{
              px: 0,
              minWidth: 'auto',
              textTransform: 'none',
              fontWeight: 400,
              letterSpacing: '0.2px',
              color:
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.7)'
                  : 'rgba(51, 65, 85, 0.7)',
              '&:hover': {
                textDecoration: 'underline',
                backgroundColor: 'transparent',
                color:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.9)'
                    : 'rgba(51, 65, 85, 0.9)',
              },
            }}
          >
            View my reports
          </Button>
        </Box>
      </Box>

      {/* Mobile Layout - Modern card-based */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 1.25,
          width: '100%',
          mt: 1.5,
        }}
      >
        {/* Latest Report */}
        {latestReportLoading ? (
          <Skeleton variant="rounded" width="100%" height={72} sx={{ borderRadius: '14px' }} />
        ) : latestReport ? (
          <Box
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/report/${latestReport.code}`, { vtType: 'up' })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/report/${latestReport.code}`, { vtType: 'up' });
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              width: '100%',
              p: 1.5,
              cursor: 'pointer',
              borderRadius: '14px',
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
                  : theme.palette.background.paper,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1px solid ${theme.palette.divider}`,
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 8px 30px rgba(0, 0, 0, 0.25)'
                  : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              '&:active': {
                transform: 'scale(0.98)',
                borderColor: alpha('#38bdf8', 0.5),
              },
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'border-color 0.2s ease',
                '&:active': { transform: 'none' },
              },
            }}
          >
            {/* Icon badge */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(0,225,255,0.12))',
                border: `1px solid ${alpha('#38bdf8', 0.25)}`,
                color: '#38bdf8',
              }}
            >
              <AssignmentIcon sx={{ fontSize: 22 }} />
            </Box>

            {/* Title + date */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                minWidth: 0,
                flex: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color:
                    theme.palette.mode === 'dark'
                      ? 'rgba(148, 163, 184, 0.9)'
                      : 'rgba(100, 116, 139, 0.9)',
                }}
              >
                Recent report
              </Typography>
              <Typography
                noWrap
                sx={{
                  maxWidth: '100%',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  lineHeight: 1.3,
                }}
              >
                {latestReport.title || 'Untitled'}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.5,
                  color: theme.palette.text.secondary,
                }}
              >
                <CalendarMonthIcon sx={{ fontSize: 14 }} />
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, lineHeight: 1 }}>
                  {format(new Date(latestReport.startTime), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Box>

            {/* Chevron */}
            <ChevronRightIcon
              sx={{ flexShrink: 0, color: theme.palette.text.secondary, fontSize: 24 }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              width: '100%',
              p: 2,
              borderRadius: '14px',
              border: `1px dashed ${theme.palette.divider}`,
              color: theme.palette.text.secondary,
            }}
          >
            <AssignmentIcon sx={{ fontSize: 18, opacity: 0.6 }} />
            <Typography sx={{ fontSize: '0.875rem', fontStyle: 'italic' }}>
              No reports yet
            </Typography>
          </Box>
        )}

        {/* View all reports */}
        <Button
          fullWidth
          variant="outlined"
          onClick={() => navigate('/my-reports', { vtType: 'up' })}
          startIcon={<AssignmentIcon sx={{ fontSize: 18 }} />}
          sx={{
            minHeight: 46,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: theme.palette.text.primary,
            borderColor: theme.palette.divider,
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.02)'
                : 'rgba(15, 23, 42, 0.01)',
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
            '&:hover': {
              borderColor: alpha('#38bdf8', 0.5),
              background: alpha('#38bdf8', 0.06),
            },
            '&:active': {
              background: alpha('#38bdf8', 0.1),
            },
          }}
        >
          View all reports
        </Button>
      </Box>
    </Box>
  );
};
