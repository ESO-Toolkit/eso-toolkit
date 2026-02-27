/**
 * Import from URL Dialog Component
 * Allows importing roster data from ESO Logs
 */

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (url: string) => Promise<void>;
  importUrl: string;
  onUrlChange: (url: string) => void;
  importLoading: boolean;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  onImport,
  importUrl,
  onUrlChange,
  importLoading,
}) => {
  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        onUrlChange('');
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Import Roster from ESO Logs</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter an ESO Logs report URL for a specific fight. The roster will be automatically
          derived from player data in the report.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>Example URL formats:</strong>
          <br />
          • With fight ID (hash): https://www.esologs.com/reports/ABC123#fight=5
          <br />
          • With fight ID (query): https://www.esologs.com/reports/ABC123?fight=5
          <br />• Without fight ID: https://www.esologs.com/reports/ABC123
        </Typography>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          label="ESO Logs URL"
          placeholder="https://www.esologs.com/reports/ABC123#fight=5"
          value={importUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          sx={{ mt: 2 }}
          disabled={importLoading}
          helperText="The report must be public or you must be logged in to access it"
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onClose();
            onUrlChange('');
          }}
          disabled={importLoading}
        >
          Cancel
        </Button>
        <Button onClick={() => onImport(importUrl)} variant="contained" disabled={importLoading}>
          {importLoading ? 'Importing...' : 'Import Roster'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
