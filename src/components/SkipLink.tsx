import { Box } from '@mui/material';
import type { FC, MouseEvent } from 'react';

export interface SkipLinkProps {
  targetId?: string;
}

/**
 * Provides a keyboard-first route to the page's primary content landmark.
 *
 * The clipped in-viewport treatment keeps the link in WebKit's sequential
 * focus order without distracting pointer users.
 */
export const SkipLink: FC<SkipLinkProps> = ({ targetId = 'main-content' }) => {
  const handleClick = (_event: MouseEvent<HTMLAnchorElement>): void => {
    document.getElementById(targetId)?.focus({ preventScroll: true });
  };

  return (
    <Box
      component="a"
      href={`#${targetId}`}
      onClick={handleClick}
      sx={{
        position: 'fixed',
        top: 8,
        left: 8,
        width: '1px',
        height: '1px',
        p: 0,
        m: -1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        clipPath: 'inset(50%)',
        border: 0,
        zIndex: 9999,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: 1,
        fontSize: '0.875rem',
        fontWeight: 600,
        textDecoration: 'none',
        boxShadow: 4,
        whiteSpace: 'nowrap',
        '&:focus, &:focus-visible': {
          width: 'auto',
          height: 'auto',
          px: 2,
          py: 1,
          m: 0,
          overflow: 'visible',
          clip: 'auto',
          clipPath: 'none',
        },
      }}
    >
      Skip to main content
    </Box>
  );
};
