import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';

import type { BuildIssue } from '../../../utils/detectBuildIssues';

interface BuildIssuesPanelProps {
  issues: BuildIssue[];
}

export const BuildIssuesPanel: React.FC<BuildIssuesPanelProps> = ({ issues }) => {
  if (!issues || issues.length === 0) {
    return (
      <Alert severity="success" icon={<CheckCircleIcon fontSize="small" />}>
        <Typography variant="body2">No build issues detected for this parse.</Typography>
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Alert severity="warning" icon={<WarningAmberIcon fontSize="small" />}>
        <Typography variant="body2">
          Detected {issues.length} build issue{issues.length > 1 ? 's' : ''}. Review the items
          below.
        </Typography>
      </Alert>
      <List dense>
        {issues.map((issue, index) => (
          <ListItem key={`${issue.message}-${index}`} alignItems="flex-start">
            <ListItemIcon sx={{ minWidth: 32 }}>
              <WarningAmberIcon color="warning" fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={issue.message} />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
};
