import { ContentCopy, EditOutlined, OpenInNew } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  Skeleton,
  Slide,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { useSnackbar } from 'notistack';
import React from 'react';

import type { HubBuild } from '../types/build-hub.types';
import { ROLE_ACCENT } from '../types/build-hub.types';

const IFRAME_TIMEOUT_MS = 12000;

const SlideUpTransition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface BuildPreviewDialogProps {
  build: HubBuild | null;
  isOwner?: boolean;
  onClose: () => void;
  onEdit?: (build: HubBuild) => void;
}

const CLASS_LABELS: Record<string, string> = {
  dragonknight: 'Dragonknight',
  sorcerer: 'Sorcerer',
  nightblade: 'Nightblade',
  templar: 'Templar',
  warden: 'Warden',
  necromancer: 'Necromancer',
  arcanist: 'Arcanist',
};

export const BuildPreviewDialog: React.FC<BuildPreviewDialogProps> = ({
  build,
  isOwner,
  onClose,
  onEdit,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [iframeError, setIframeError] = React.useState(false);

  React.useEffect(() => {
    if (build) {
      setIframeLoaded(false);
      setIframeError(false);
    }
  }, [build]);

  // Listen for postMessage from iframe
  React.useEffect(() => {
    if (!build || iframeLoaded || iframeError) return;

    const handleMessage = (event: MessageEvent): void => {
      if (event.origin === window.location.origin && event.data?.type === 'build-preview-ready') {
        setIframeLoaded(true);
      }
    };

    window.addEventListener('message', handleMessage);
    const timer = setTimeout(() => {
      if (!iframeLoaded) {
        // Fallback: assume loaded after timeout
        setIframeLoaded(true);
      }
    }, IFRAME_TIMEOUT_MS);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, [build, iframeLoaded, iframeError]);

  const embedUrl = build
    ? `${window.location.origin}${import.meta.env.BASE_URL}bv?b=${encodeURIComponent(build.build_data)}&embed=1`
    : '';

  const shareUrl = build
    ? `${window.location.origin}${import.meta.env.BASE_URL}bv?b=${encodeURIComponent(build.build_data)}`
    : '';

  const handleOpenFullPage = (): void => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (): void => {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      enqueueSnackbar('Link copied to clipboard!', { variant: 'success' });
    });
  };

  const handleLoadIntoEditor = (): void => {
    if (build) {
      window.open(
        `${import.meta.env.BASE_URL}build-editor?b=${encodeURIComponent(build.build_data)}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  const accentColor = ROLE_ACCENT[build?.role ?? ''] ?? '#3b82f6';
  const classLabel = CLASS_LABELS[build?.eso_class ?? ''] ?? build?.eso_class ?? '';
  const isAnonymous = build?.is_anonymous ?? false;
  const authorName = isAnonymous ? 'Anonymous' : (build?.author_name ?? '');
  const authorHue = authorName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const avatarColor = isAnonymous ? 'hsl(0, 0%, 55%)' : `hsl(${authorHue}, 55%, 55%)`;

  return (
    <Dialog
      open={build !== null}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      disableEnforceFocus
      TransitionComponent={SlideUpTransition}
      slotProps={{
        paper: {
          sx: {
            height: isMobile ? '100%' : '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: isDark
              ? `linear-gradient(160deg, ${accentColor}12 0%, rgba(152,131,227,0.07) 35%, rgba(10,15,28,0.97) 100%)`
              : `linear-gradient(160deg, ${accentColor}08 0%, rgba(152,131,227,0.04) 35%, rgba(248,250,252,0.98) 100%)`,
            border: isDark ? `1px solid ${accentColor}25` : `1px solid ${accentColor}18`,
          },
        },
      }}
    >
      {/* Accent bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}60 15%, ${accentColor} 50%, ${accentColor}60 85%, transparent 100%)`,
          boxShadow: `0 0 12px ${accentColor}80, 0 0 30px ${accentColor}40`,
          zIndex: 10,
        }}
        aria-hidden="true"
      />

      {/* Title bar */}
      <DialogTitle
        sx={{
          pb: 1.5,
          pt: 2.25,
          px: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          minHeight: 64,
          background: isDark
            ? `linear-gradient(180deg, ${accentColor}10 0%, transparent 100%)`
            : `linear-gradient(180deg, ${accentColor}07 0%, transparent 100%)`,
          borderBottom: `1px solid ${isDark ? accentColor + '18' : accentColor + '12'}`,
        }}
      >
        {/* Class badge */}
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            px: 1,
            py: 0.45,
            borderRadius: '6px',
            background: isDark ? `${accentColor}30` : `${accentColor}22`,
            border: `1px solid ${accentColor}55`,
            boxShadow: `0 0 10px ${accentColor}35`,
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: accentColor,
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {classLabel}
          </Typography>
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          component="span"
          sx={{
            fontWeight: 700,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexGrow: 1,
            fontSize: '1.05rem',
          }}
        >
          {build?.title ?? ''}
        </Typography>

        {/* Author */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${avatarColor}40, ${avatarColor}18)`,
              border: `1.5px solid ${avatarColor}60`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, color: avatarColor }}>
              {isAnonymous ? '?' : (authorName || '?')[0].toUpperCase()}
            </Typography>
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: '0.62rem',
                fontWeight: 600,
                lineHeight: 1.1,
                color: isDark ? 'rgba(255,255,255,0.75)' : 'text.primary',
              }}
              noWrap
            >
              {authorName}
            </Typography>
            <Typography sx={{ fontSize: '0.55rem', color: 'text.disabled', lineHeight: 1.2 }}>
              Author
            </Typography>
          </Box>
        </Box>

        <Tooltip title="Open full page">
          <Button size="small" onClick={handleOpenFullPage} sx={{ minWidth: 0, p: 0.5 }}>
            <OpenInNew fontSize="small" />
          </Button>
        </Tooltip>
      </DialogTitle>

      {/* Description */}
      {build?.description && (
        <Box
          sx={{
            px: 2.5,
            py: 1,
            flexShrink: 0,
            borderLeft: `3px solid ${accentColor}60`,
            background: isDark ? `${accentColor}08` : `${accentColor}05`,
            borderBottom: `1px solid ${isDark ? accentColor + '14' : accentColor + '0e'}`,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.6,
              fontSize: '0.82rem',
              color: isDark ? 'rgba(255,255,255,0.6)' : 'text.secondary',
              fontStyle: 'italic',
            }}
          >
            {build.description}
          </Typography>
        </Box>
      )}

      {/* Iframe preview */}
      <Box
        sx={{
          flex: '1 1 0',
          position: 'relative',
          overflow: 'hidden',
          minHeight: isMobile ? 200 : 250,
          background: isDark
            ? 'linear-gradient(180deg, rgb(30,36,52) 0%, rgb(24,30,46) 100%)'
            : 'linear-gradient(180deg, rgb(218,222,234) 0%, rgb(210,216,228) 100%)',
          p: isMobile ? '6px' : '10px',
        }}
      >
        {!iframeLoaded && !iframeError && (
          <Box sx={{ position: 'absolute', inset: 10, zIndex: 1, p: 3 }}>
            <Skeleton variant="text" width="40%" height={48} sx={{ mb: 3, borderRadius: 2 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                mb: 3,
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
              ))}
            </Box>
          </Box>
        )}
        {build && !iframeError && (
          <iframe
            src={embedUrl}
            title={`Preview: ${build.title}`}
            style={{
              position: 'absolute',
              top: isMobile ? 6 : 8,
              left: isMobile ? 6 : 10,
              width: isMobile ? 'calc(100% - 12px)' : 'calc(100% - 20px)',
              height: isMobile ? 'calc(100% - 12px)' : 'calc(100% - 18px)',
              border: 'none',
              borderRadius: '8px',
              opacity: iframeLoaded ? 1 : 0,
              transition: 'opacity 0.4s ease',
              display: 'block',
            }}
          />
        )}
      </Box>

      {/* Actions */}
      <DialogActions sx={{ px: 2, py: 1.25, gap: 1, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit" size="small">
          Close
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Copy share link">
          <Button
            size="small"
            startIcon={<ContentCopy />}
            onClick={handleCopyLink}
            variant="outlined"
            sx={{
              color: accentColor,
              borderColor: `${accentColor}70`,
              background: `${accentColor}0a`,
              fontWeight: 600,
              '&:hover': { borderColor: accentColor, background: `${accentColor}18` },
            }}
          >
            Copy link
          </Button>
        </Tooltip>
        {isOwner && onEdit && build && (
          <Button
            size="small"
            startIcon={<EditOutlined />}
            onClick={() => onEdit(build)}
            variant="outlined"
            sx={{
              fontWeight: 600,
              borderColor: `${accentColor}50`,
              color: accentColor,
              '&:hover': { borderColor: accentColor, background: `${accentColor}18` },
            }}
          >
            Edit Details
          </Button>
        )}
        <Button
          size="small"
          startIcon={<OpenInNew />}
          onClick={handleLoadIntoEditor}
          variant="contained"
          sx={{
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
            color: '#fff',
            fontWeight: 700,
            boxShadow: `0 0 18px ${accentColor}70, 0 4px 14px rgba(0,0,0,0.45)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${accentColor}ee 0%, ${accentColor} 100%)`,
              boxShadow: `0 0 26px ${accentColor}99`,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Load into Editor
        </Button>
      </DialogActions>
    </Dialog>
  );
};
