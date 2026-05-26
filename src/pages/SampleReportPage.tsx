import { Box, Typography, useTheme } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { ReportFightsSkeleton } from '../components/ReportFightsSkeleton';
import { SAMPLE_REPORT_LIST } from '../utils/sampleReports';

export const SampleReportPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    document.title = 'Sample Report | ESO Toolkit';
  }, []);

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

  return <ReportFightsSkeleton />;
};
