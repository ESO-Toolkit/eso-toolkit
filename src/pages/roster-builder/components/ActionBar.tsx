/**
 * Action Bar Component
 * Contains all action buttons for roster management
 */

import { Box, Stack, Button, Tooltip, ButtonGroup } from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import React from 'react';
import { useAuth } from '../../../features/auth/AuthContext';

interface ActionBarProps {
  onQuickFill: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportJSON: () => void;
  onPreview: () => void;
  onCopyDiscordFormat: () => void;
  onCopyLink: () => void;
  onImportFromUrl: () => void;
  isImportLoading?: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onQuickFill,
  onImportJSON,
  onExportJSON,
  onPreview,
  onCopyDiscordFormat,
  onCopyLink,
  onImportFromUrl,
  isImportLoading = false,
}) => {
  const { isLoggedIn } = useAuth();

  return (
    <Box sx={{ mb: 3 }}>
      {/* Import/Export Group */}
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
        Import & Export
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<PersonAddIcon />}
          onClick={onQuickFill}
        >
          Quick Fill
        </Button>
        <Button variant="outlined" startIcon={<UploadIcon />} component="label">
          Import Roster
          <input
            type="file"
            hidden
            accept=".json"
            onChange={onImportJSON}
            aria-label="Upload roster JSON file"
          />
        </Button>
        {isLoggedIn && (
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={onImportFromUrl}
          >
            Import from Log
          </Button>
        )}
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onExportJSON}>
          Export JSON
        </Button>
      </Stack>

      {/* Discord Group */}
      <Typography variant="subtitle2" gutterBottom>
        Discord Export
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          startIcon={<VisibilityIcon />}
          onClick={onPreview}
        >
          Preview Discord
        </Button>
        <Button variant="contained" startIcon={<CopyIcon />} onClick={onCopyDiscordFormat}>
          Copy for Discord
        </Button>
      </Stack>

      {/* Share Group */}
      <Typography variant="subtitle2" gutterBottom>
        Share
      </Typography>
      <Button
        variant="contained"
        color="secondary"
        startIcon={<LinkIcon />}
        onClick={onCopyLink}
      >
        Copy Share Link
      </Button>
    </Box>
  );
};
