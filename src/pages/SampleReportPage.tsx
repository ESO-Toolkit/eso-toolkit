import { Box, Paper, Skeleton, Typography, useTheme } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Curated sample reports sourced from data-downloads/.
 * These are publicly accessible ESO Logs reports that do not require
 * authentication to navigate to, avoiding the need for an OAuth token
 * on the /sample-report landing page.
 */
const SAMPLE_REPORTS: ReadonlyArray<{ code: string; fightId: number }> = [
  { code: 'F4f2bMwWtgVKxjB9', fightId: 39 }, // Tideborn Taleria
  { code: 'nZdTqa6M9bWmtXBw', fightId: 6 }, // Yandir the Butcher / Sea Adder
  { code: 'YArFDbq7BdhwL691', fightId: 72 }, // Ansuul the Tormentor
  { code: 'YArFDbq7BdhwL691', fightId: 54 }, // Exarchanic Yaseyla
  { code: 'F4f2bMwWtgVKxjB9', fightId: 2 }, // Lylanar and Turlassil
];

const pickRandom = <T,>(items: ReadonlyArray<T>): T | undefined => {
  if (!items.length) {
    return undefined;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index];
};

export const SampleReportPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const sample = pickRandom(SAMPLE_REPORTS);
    if (!sample) {
      setErrorMessage('No sample reports are configured.');
      return;
    }

    navigate(`/report/${sample.code}/fight/${sample.fightId}`, { replace: true });
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
