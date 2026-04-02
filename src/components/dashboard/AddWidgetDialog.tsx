import BuildIcon from '@mui/icons-material/Build';
import SkullIcon from '@mui/icons-material/Dangerous';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  useTheme,
} from '@mui/material';
import React from 'react';

import { WidgetType } from '../../store/dashboard/dashboardSlice';

interface AddWidgetDialogProps {
  open: boolean;
  onClose: () => void;
  onAddWidget: (type: WidgetType) => void;
}

const WIDGET_OPTIONS: Array<{ type: WidgetType; label: string; icon: React.ReactNode }> = [
  { type: 'death-causes', label: 'Death Causes', icon: <SkullIcon /> },
  { type: 'missing-buffs', label: 'Missing Buffs', icon: <WarningIcon /> },
  { type: 'build-issues', label: 'Build Issues', icon: <BuildIcon /> },
  { type: 'low-buff-uptimes', label: 'Low Buff Uptimes', icon: <TrendingDownIcon /> },
  { type: 'low-dps', label: 'Low DPS Performers', icon: <TrendingDownIcon /> },
  { type: 'missing-food', label: 'Missing Food/Drink', icon: <FastfoodIcon /> },
];

export const AddWidgetDialog: React.FC<AddWidgetDialogProps> = ({ open, onClose, onAddWidget }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleSelect = (type: WidgetType): void => {
    onAddWidget(type);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Widget</DialogTitle>
      <DialogContent sx={{ px: 2 }}>
        <List disablePadding>
          {WIDGET_OPTIONS.map((option) => (
            <ListItemButton
              key={option.type}
              onClick={() => handleSelect(option.type)}
              sx={{
                borderRadius: 2.5,
                mb: 0.5,
                py: 1.5,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.04)',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isDark ? '#38bdf8' : '#0f172a',
                }}
              >
                {option.icon}
              </ListItemIcon>
              <ListItemText
                primary={option.label}
                primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="text">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
