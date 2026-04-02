import DashboardIcon from '@mui/icons-material/Dashboard';
import ListIcon from '@mui/icons-material/List';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { Box, Button, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

type ReportPage = 'fights' | 'summary' | 'dashboard';

interface ReportActionBarProps {
  reportId: string;
  title: string;
  activePage: ReportPage;
  actions?: React.ReactNode;
}

const pages: Array<{
  key: ReportPage;
  label: string;
  mobileLabel?: string;
  icon: React.ReactElement;
  path: (id: string) => string;
}> = [
  {
    key: 'fights',
    label: 'Fights',
    icon: <ListIcon />,
    path: (id) => `/report/${id}`,
  },
  {
    key: 'summary',
    label: 'Report Summary',
    mobileLabel: 'Summary',
    icon: <SummarizeIcon />,
    path: (id) => `/report/${id}/summary`,
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: (id) => `/report/${id}/dashboard`,
  },
];

export const ReportActionBar: React.FC<ReportActionBarProps> = ({
  reportId,
  title,
  activePage,
  actions,
}) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1,
        mb: { xs: '1.5rem', sm: '2rem' },
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontSize: { xs: '1.5rem', sm: '2rem' },
          lineHeight: 1.334,
          textAlign: { xs: 'center', sm: 'left' },
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          overflow: 'visible',
          flex: 1,
          minWidth: 0,
          px: { xs: 1, sm: 0 },
          hyphens: 'auto',
        }}
      >
        {title}
      </Typography>

      {actions}

      {pages
        .filter((p) => p.key !== activePage)
        .map((p) => (
          <React.Fragment key={p.key}>
            <Button
              variant="outlined"
              startIcon={p.icon}
              onClick={() => navigate(p.path(reportId))}
              sx={{
                ml: 1,
                flexShrink: 0,
                display: { xs: 'none', sm: 'flex' },
              }}
            >
              {p.label}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(p.path(reportId))}
              sx={{
                ml: 1,
                flexShrink: 0,
                minWidth: 'auto',
                px: 2,
                display: { xs: 'flex', sm: 'none' },
              }}
            >
              {p.icon}
            </Button>
          </React.Fragment>
        ))}
    </Box>
  );
};
