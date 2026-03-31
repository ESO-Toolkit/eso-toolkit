import { Extension } from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';
import { useSnackbar } from 'notistack';
import React from 'react';

import { getAddonManagerDeepLink } from '../api/packs-api';

interface GetAddonsButtonProps {
  /** The pack ID to link to (e.g. "trial-essentials"). */
  packId: string;
  /** Optional label override. */
  label?: string;
  /** Compact icon-only mode for card layouts. */
  iconOnly?: boolean;
}

/**
 * Button that opens the Kalpa via deep link to install
 * a specific addon pack. Falls back to copying the deep link URL
 * if the app isn't installed.
 */
export const GetAddonsButton: React.FC<GetAddonsButtonProps> = ({
  packId,
  label = 'Get Addons',
  iconOnly = false,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const deepLink = getAddonManagerDeepLink(packId);

  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();

    // Try to open the deep link — this will launch the addon manager if installed.
    // If not installed, the browser silently fails. We copy the link as a fallback.
    window.location.href = deepLink;

    // After a short delay, copy link as fallback (if app didn't intercept)
    setTimeout(() => {
      void navigator.clipboard.writeText(deepLink).then(
        () => {
          enqueueSnackbar('Deep link copied — install Kalpa to use it', {
            variant: 'info',
            autoHideDuration: 4000,
          });
        },
        () => {
          /* clipboard denied — silently ignore */
        },
      );
    }, 1500);
  };

  if (iconOnly) {
    return (
      <Tooltip title={`Open "${packId}" in Kalpa`}>
        <Button
          size="small"
          onClick={handleClick}
          sx={{
            minWidth: 'unset',
            px: 1,
            color: 'text.secondary',
            '&:hover': { color: '#c4a44a' },
          }}
          aria-label={label}
        >
          <Extension fontSize="small" />
        </Button>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Opens Kalpa to install recommended addons">
      <Button
        size="small"
        variant="outlined"
        startIcon={<Extension />}
        onClick={handleClick}
        sx={{
          borderColor: '#c4a44a55',
          color: '#c4a44a',
          '&:hover': {
            borderColor: '#c4a44a',
            bgcolor: '#c4a44a18',
          },
        }}
      >
        {label}
      </Button>
    </Tooltip>
  );
};
