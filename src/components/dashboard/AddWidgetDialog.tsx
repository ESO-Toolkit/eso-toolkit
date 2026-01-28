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
  const handleSelect = (type: WidgetType): void => {
    onAddWidget(type);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Widget</DialogTitle>
      <DialogContent>
        <List>
          {WIDGET_OPTIONS.map((option) => (
            <ListItemButton key={option.type} onClick={() => handleSelect(option.type)}>
              <ListItemIcon>{option.icon}</ListItemIcon>
              <ListItemText primary={option.label} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
