import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import React from 'react';

import type { BuildIssue } from '../../../utils/detectBuildIssues';

interface BuildIssuesPanelProps {
  issues: BuildIssue[];
}

export const BuildIssuesPanel: React.FC<BuildIssuesPanelProps> = ({ issues }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!issues || issues.length === 0) {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <CheckCircleIcon color="success" fontSize="small" />
        <Typography variant="body2" fontWeight={500}>
          No build issues detected for this parse.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      {issues.map((issue, index) => (
        <Box
          key={`${issue.message}-${index}`}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            py: 1,
            px: 1.5,
            borderRadius: 1.5,
            borderLeft: '3px solid',
            borderLeftColor: 'warning.main',
            backgroundColor: isDark ? 'rgba(255, 152, 0, 0.06)' : 'rgba(255, 152, 0, 0.04)',
          }}
        >
          <WarningAmberIcon color="warning" sx={{ fontSize: 16, mt: 0.25, flexShrink: 0 }} />
          <Typography variant="caption" fontWeight={500}>
            {issue.message}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
};
