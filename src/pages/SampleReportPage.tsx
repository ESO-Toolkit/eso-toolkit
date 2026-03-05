import { Box, Paper, Skeleton, Typography, useTheme } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { SAMPLE_REPORT_LIST } from '../utils/sampleReports';

export const SampleReportPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (SAMPLE_REPORT_LIST.length === 0) {
      setErrorMessage('No sample reports are configured.');
      return;
    }

    const code = SAMPLE_REPORT_LIST[Math.floor(Math.random() * SAMPLE_REPORT_LIST.length)];
    // Navigate to the fight-list overview — it works without auth because the
    // report metadata is bundled as static JSON in public/sample-reports/.
    navigate(`/report/${code}`, { replace: true });
  }, [navigate]);

  if (errorMessage) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 3,
          px: 2,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: theme.palette.error.main,
            textAlign: 'center',
          }}
        >
          {errorMessage}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
          onClick={() => navigate('/')}
        >
          Return to home
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Report page skeleton ─ mirrors the ReportFights destination layout */}
      <Paper
        elevation={0}
        square
        sx={{
          p: 0,
          m: 0,
          width: '100%',
          background: 'transparent',
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            backgroundColor: 'background.paper',
            borderRadius: { xs: 0, sm: 1 },
            boxShadow: 2,
          }}
        >
          {/* Report title */}
          <Skeleton
            variant="text"
            width={300}
            height={32}
            sx={{
              mb: { xs: '1.5rem', sm: '2rem' },
              mt: { xs: 0, sm: '-2.7rem' },
            }}
          />

          {/* Trial section header */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr auto', sm: '1fr auto' },
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              mb: 3,
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor:
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
              backgroundColor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Skeleton variant="text" width={180} height={24} />
              <Skeleton variant="rounded" width={80} height={20} />
            </Box>
            <Skeleton variant="circular" width={20} height={20} />
          </Box>

          {/* Encounter rows */}
          {([140, 160, 120, 155] as const).map((titleWidth, encounterIndex) => (
            <Box
              key={encounterIndex}
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                opacity: 1 - encounterIndex * 0.12,
              }}
            >
              {/* Encounter header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="text" width={titleWidth} height={20} />
                </Box>
              </Box>

              {/* Fight card grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 1,
                }}
              >
                {Array.from({
                  length: [4, 3, 5, 3][encounterIndex] ?? 4,
                }).map((_, cardIndex) => (
                  <Box
                    key={cardIndex}
                    sx={{
                      width: '100%',
                      height: 64,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Skeleton
                      variant="rectangular"
                      width="100%"
                      height="100%"
                      sx={{ transform: 'none', borderRadius: 1 }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};
