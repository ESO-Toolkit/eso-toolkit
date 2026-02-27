/**
 * Preview Dialog Component
 * Shows Discord-formatted roster preview
 */

import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Paper } from '@mui/material';
import React from 'react';
import { generateDiscordFormat } from '../../utils/discordFormatter';
import { RaidRoster } from '../../../../types/roster';

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onCopy: () => void;
  roster: RaidRoster;
}

export const PreviewDialog: React.FC<PreviewDialogProps> = ({ open, onClose, onCopy, roster }) => {
  const handleCopy = () => {
    onCopy();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Discord Message Preview</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This is how your roster will appear when posted to Discord:
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: 'grey.900',
            color: 'grey.100',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowX: 'auto',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {generateDiscordFormat(roster)}
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={handleCopy} variant="contained">
          Copy to Clipboard
        </Button>
      </DialogActions>
    </Dialog>
  );
};
