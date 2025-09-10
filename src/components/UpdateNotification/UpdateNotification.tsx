/**
 * UpdateNotification Component
 * Shows notifications when a new version is available
 */

import { Refresh as RefreshIcon, Close as CloseIcon } from '@mui/icons-material';
import { Snackbar, Alert, Button, Box, Typography, IconButton } from '@mui/material';
import React from 'react';

import { useCacheInvalidation, useVersionInfo } from '../../hooks/useCacheInvalidation';

interface UpdateNotificationProps {
  /**
   * Whether to show version info in the notification
   */
  showVersionInfo?: boolean;
  /**
   * Custom action buttons
   */
  customActions?: React.ReactNode;
  /**
   * Position of the snackbar
   */
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  showVersionInfo = true,
  customActions,
  position = { vertical: 'bottom', horizontal: 'right' },
}) => {
  const [state, actions] = useCacheInvalidation();

  const handleUpdate = (): void => {
    actions.forceReload();
  };

  const handleDismiss = (): void => {
    actions.dismissUpdate();
  };

  const formatVersion = (version?: string): string => {
    if (!version) return '';
    // Extract short commit from build ID (format: version-commit-timestamp)
    const parts = version.split('-');
    if (parts.length >= 2) {
      return `${parts[0]} (${parts[1]})`;
    }
    return version;
  };

  // Only show notification if we have versions loaded and there's actually an update
  if (!state.hasUpdate || !state.versionLoaded || !state.currentVersion) {
    return null;
  }

  return (
    <Snackbar
      open={state.hasUpdate}
      anchorOrigin={position}
      sx={{
        maxWidth: 400,
        '& .MuiAlert-root': {
          width: '100%',
        },
      }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {customActions}
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleUpdate}
              sx={{
                minWidth: 'auto',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Update
            </Button>
            <IconButton size="small" aria-label="dismiss" color="inherit" onClick={handleDismiss}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        <Box>
          <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
            New version available!
          </Typography>
          {showVersionInfo && state.versionLoaded && state.currentVersion && (
            <Typography variant="caption" component="div" sx={{ opacity: 0.9, mt: 0.5 }}>
              Current: {formatVersion(state.currentVersion)}
              <br />
              Latest: {formatVersion(state.serverVersion)}
            </Typography>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};

/**
 * VersionInfo Component
 * Shows current version information (useful for footer/about sections)
 */
interface VersionInfoProps {
  /**
   * Display format
   */
  format?: 'short' | 'full' | 'badge';
  /**
   * Whether to show build time
   */
  showBuildTime?: boolean;
  /**
   * Custom styling
   */
  sx?: React.CSSProperties | Record<string, unknown>;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({
  format = 'short',
  showBuildTime = false,
  sx,
}) => {
  const versionInfo = useVersionInfo();

  const formatBuildTime = (buildTime: string): string => {
    return new Date(buildTime).toLocaleString();
  };

  const getVersionDisplay = (): string => {
    if (!versionInfo) return 'Version info not available';

    switch (format) {
      case 'full':
        return `v${versionInfo.version} (${versionInfo.shortCommit}) - Built ${formatBuildTime(versionInfo.buildTime)}`;
      case 'badge':
        return versionInfo.shortCommit;
      case 'short':
      default:
        return `v${versionInfo.version} (${versionInfo.shortCommit})`;
    }
  };

  if (!versionInfo) {
    return null;
  }

  if (format === 'badge') {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          bgcolor: 'grey.200',
          color: 'grey.700',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          ...sx,
        }}
      >
        {getVersionDisplay()}
      </Box>
    );
  }

  return (
    <Typography
      variant="caption"
      component="span"
      sx={{
        fontFamily: format === 'full' ? 'monospace' : 'inherit',
        opacity: 0.7,
        ...sx,
      }}
    >
      {getVersionDisplay()}
      {showBuildTime && format !== 'full' && versionInfo && (
        <>
          <br />
          Built: {formatBuildTime(versionInfo.buildTime)}
        </>
      )}
    </Typography>
  );
};
