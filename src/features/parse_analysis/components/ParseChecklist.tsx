import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';

import type { ParseChecklistItem, ParseChecklistStatus } from '../types/parseChecklist';

interface ParseChecklistProps {
  items: ParseChecklistItem[];
}

const STATUS_LABELS: Record<ParseChecklistStatus, string> = {
  pass: 'Pass',
  warn: 'Review',
  fail: 'Missing',
  info: 'Manual',
};

const STATUS_COLORS: Record<ParseChecklistStatus, 'success' | 'warning' | 'error' | 'info'> = {
  pass: 'success',
  warn: 'warning',
  fail: 'error',
  info: 'info',
};

function getStatusIcon(status: ParseChecklistStatus): React.ReactElement {
  switch (status) {
    case 'pass':
      return <CheckCircleIcon color="success" />;
    case 'warn':
      return <WarningAmberIcon color="warning" />;
    case 'fail':
      return <ErrorIcon color="error" />;
    default:
      return <InfoIcon color="info" />;
  }
}

export const ParseChecklist: React.FC<ParseChecklistProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <InfoIcon color="info" />
          <Typography variant="h6">Parse Checklist</Typography>
        </Stack>
        <List dense disablePadding>
          {items.map((item) => (
            <ListItem key={item.id} alignItems="flex-start" sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>{getStatusIcon(item.status)}</ListItemIcon>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight="bold">
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color={`${STATUS_COLORS[item.status]}.main`}>
                      {STATUS_LABELS[item.status]}
                    </Typography>
                  </Stack>
                }
                secondary={item.detail}
                secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};
