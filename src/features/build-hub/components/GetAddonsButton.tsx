import { Extension } from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';
import { useSnackbar } from 'notistack';
import React from 'react';

import { KALPA_DOWNLOAD_URL, getAddonManagerDeepLink, tryLaunchDeepLink } from '../api/packs-api';

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
  const cancelRef = React.useRef<(() => void) | undefined>(undefined);

  React.useEffect(() => () => cancelRef.current?.(), []);

  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    cancelRef.current?.();
    cancelRef.current = tryLaunchDeepLink(deepLink, () => {
      void navigator.clipboard.writeText(deepLink).catch(() => {});
      enqueueSnackbar("Kalpa didn't open — launch it manually or download it", {
        variant: 'info',
        autoHideDuration: 8000,
        action: () => (
          <>
            <Button
              size="small"
              component="a"
              href={deepLink}
              sx={{ color: '#fff', fontWeight: 700, textTransform: 'none' }}
            >
              Launch
            </Button>
            <Button
              size="small"
              href={KALPA_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#fff', fontWeight: 700, textTransform: 'none' }}
            >
              Download
            </Button>
          </>
        ),
      });
    });
  };

  if (iconOnly) {
    return (
      <Tooltip title={`Open "${packId}" in ESO Addon Manager — existing settings preserved`}>
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
    <Tooltip title="Opens ESO Addon Manager to install recommended addons — your existing addon settings are preserved">
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
