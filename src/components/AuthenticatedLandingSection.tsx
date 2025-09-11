import { Link as LinkIcon, Assignment as AssignmentIcon } from '@mui/icons-material';
import { Box, Button, TextField, Typography, CircularProgress, useTheme } from '@mui/material';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLatestReport } from '../hooks/useLatestReport';
import { clearAllEvents } from '../store/events_data/actions';
import { clearMasterData } from '../store/master_data/masterDataSlice';
import { clearReport } from '../store/report/reportSlice';
import { useAppDispatch } from '../store/useAppDispatch';

import { LogInputContainer } from './LandingPage';

export const AuthenticatedLandingSection: React.FC = () => {
  const [logUrl, setLogUrl] = useState('');
  const navigate = useNavigate();
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
        navigate(`/report/${result.reportId}/fight/${result.fightId}/insights`);
      } else {
        navigate(`/report/${result.reportId}`);
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
              fontSize: { xs: '0.9rem', sm: '1rem' },
            },
          }}
          InputProps={{
            startAdornment: <LinkIcon sx={{ mr: 1, color: '#38bdf8', ml: 0 }} />,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={14} />
              <Typography
                variant="body2"
                sx={{
                  color:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.7)'
                      : 'rgba(51, 65, 85, 0.7)',
                  fontSize: '0.875rem',
                }}
              >
                ⚡ Loading...
              </Typography>
            </Box>
          ) : latestReport ? (
            <Box
              onClick={() => navigate(`/report/${latestReport.code}`)}
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
            onClick={() => navigate('/my-reports')}
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

      {/* Mobile Layout - Simple Text Based */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          maxWidth: '100%',
          width: '100%',
          mx: 'auto',
          mt: 1,
        }}
      >
        {/* Latest Report */}
        {latestReportLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={14} />
            <Typography
              variant="body2"
              sx={{
                color:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.7)'
                    : 'rgba(51, 65, 85, 0.7)',
                fontSize: '0.875rem',
              }}
            >
              ⚡ Loading...
            </Typography>
          </Box>
        ) : latestReport ? (
          <Typography
            variant="body2"
            onClick={() => navigate(`/report/${latestReport.code}`)}
            sx={{
              color:
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.9)'
                  : 'rgba(51, 65, 85, 0.9)',
              fontSize: '0.875rem',
              textAlign: 'center',
              cursor: 'pointer',
              p: 1,
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              textDecoration: 'underline',
              textDecorationColor: 'currentColor',
              backgroundColor:
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              '&:hover': {
                textDecorationColor: 'currentColor',
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <span style={{ fontWeight: 200 }}>{latestReport.title || 'Untitled'}</span> •{' '}
            <span style={{ fontWeight: 700 }}>
              📅 {format(new Date(latestReport.startTime), 'MMM dd')}
            </span>
          </Typography>
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
              textAlign: 'center',
            }}
          >
            📝 No reports yet
          </Typography>
        )}

        {/* Simple divider */}
        <Box
          sx={{
            width: '40%',
            height: '1px',
            background:
              theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(14, 165, 233, 0.2)',
          }}
        />

        {/* View my reports - simple text link */}
        <Button
          variant="text"
          size="small"
          onClick={() => navigate('/my-reports')}
          startIcon={<AssignmentIcon sx={{ fontSize: 16 }} />}
          sx={{
            px: 1,
            textTransform: 'none',
            fontWeight: 400,
            fontSize: '0.875rem',
            color:
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(51, 65, 85, 0.7)',
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
          View all reports
        </Button>
      </Box>
    </Box>
  );
};
