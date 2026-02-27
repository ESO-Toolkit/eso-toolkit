/**
 * Quick Fill Dialog Component
 * Allows bulk player name entry
 */

import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography } from '@mui/material';
import React from 'react';

interface QuickFillDialogProps {
  open: boolean;
  onClose: () => void;
  onFill: (text: string) => void;
  quickFillText: string;
  onTextChange: (text: string) => void;
}

export const QuickFillDialog: React.FC<QuickFillDialogProps> = ({
  open,
  onClose,
  onFill,
  quickFillText,
  onTextChange,
}) => {
  const handleFill = () => {
    onFill(quickFillText);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Quick Fill Player Names</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter player names, one per line. The first 2 will fill tanks, next 2 will fill healers,
          and remaining will fill DPS slots (up to 8 total DPS).
        </Typography>
        <TextField
          autoFocus
          multiline
          rows={12}
          fullWidth
          variant="outlined"
          placeholder={'Player1\nPlayer2\nPlayer3\n...'}
          value={quickFillText}
          onChange={(e) => onTextChange(e.target.value)}
          helperText={`${quickFillText.split('\n').filter((line) => line.trim()).length} players entered`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleFill} variant="contained">
          Fill Roster
        </Button>
      </DialogActions>
    </Dialog>
  );
};
