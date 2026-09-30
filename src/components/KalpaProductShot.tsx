import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { Box, Button, ButtonBase, Dialog, IconButton, Link, Typography } from '@mui/material';
import React, { useId, useState } from 'react';

interface KalpaProductShotProps {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  fade?: boolean;
}

/** Real product captures, with consistent framing and access to the full-size image. */
export const KalpaProductShot: React.FC<KalpaProductShotProps> = ({
  src,
  alt,
  caption,
  priority = false,
  fade = false,
}) => {
  const [open, setOpen] = useState(false);
  const [actualSize, setActualSize] = useState(false);
  const titleId = useId();

  return (
    <Box component="figure" sx={{ m: 0, minWidth: 0, position: 'relative', isolation: 'isolate' }}>
      <Box
        sx={(theme) => ({
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '-8%',
            background: `radial-gradient(60% 60% at 50% 40%, rgba(139,92,246,${theme.palette.mode === 'dark' ? '.28' : '.14'}), transparent 70%)`,
            filter: 'blur(40px)',
            zIndex: -1,
            pointerEvents: 'none',
          },
        })}
      >
        <ButtonBase
          onClick={() => {
            setActualSize(false);
            setOpen(true);
          }}
          aria-label={`Enlarge screenshot: ${alt}`}
          aria-haspopup="dialog"
          sx={(theme) => ({
            display: 'block',
            width: '100%',
            cursor: 'zoom-in',
            overflow: 'hidden',
            borderRadius: { xs: '10px', md: '12px' },
            border: '1px solid',
            borderColor:
              theme.palette.mode === 'dark' ? 'rgba(139,92,246,.2)' : 'rgba(15,23,42,.1)',
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 30px 80px -20px rgba(0,0,0,.65)'
                : '0 30px 60px -24px rgba(15,23,42,.25)',
            ...(fade && {
              aspectRatio: { xs: '16 / 9', md: '16 / 8.5' },
              maskImage: { xs: 'none', md: 'linear-gradient(to bottom, #000 72%, transparent)' },
              WebkitMaskImage: {
                xs: 'none',
                md: 'linear-gradient(to bottom, #000 72%, transparent)',
              },
            }),
            '&:focus-visible': {
              outline: '3px solid',
              outlineColor: 'primary.main',
              outlineOffset: 4,
            },
          })}
        >
          <Box
            component="img"
            src={src}
            alt={alt}
            width={1600}
            height={900}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
            sx={{
              display: 'block',
              width: '100%',
              height: 'auto',
              objectFit: 'cover',
              objectPosition: 'top',
            }}
          />
          <Box
            component="span"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              px: 1,
              py: 0.5,
              borderRadius: '8px',
              bgcolor: 'rgba(15,23,42,.85)',
              color: '#fff',
              fontSize: '0.75rem',
            }}
            aria-hidden="true"
          >
            <ZoomInIcon fontSize="small" /> Enlarge
          </Box>
        </ButtonBase>
      </Box>
      {caption && (
        <Typography
          component="figcaption"
          sx={{ mt: 1.5, fontSize: '0.8rem', color: 'text.secondary', textAlign: 'left' }}
        >
          {caption}
        </Typography>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby={titleId}
        maxWidth={false}
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0,0,0,.8)' } },
          paper: {
            sx: {
              m: { xs: 1, sm: 3 },
              width: '1600px',
              maxWidth: 'calc(100% - 16px)',
              maxHeight: 'calc(100dvh - 32px)',
              borderRadius: '14px',
            },
          },
        }}
      >
        <Box sx={{ p: { xs: 1.5, sm: 2 }, flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              id={titleId}
              component="h2"
              sx={{ flex: 1, fontWeight: 600, fontSize: '0.95rem' }}
            >
              {caption ?? alt}
            </Typography>
            <IconButton
              autoFocus
              aria-label="Close screenshot"
              onClick={() => setOpen(false)}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              aria-pressed={actualSize}
              onClick={() => setActualSize((value) => !value)}
              startIcon={<ZoomInIcon />}
              sx={{ minHeight: 44 }}
            >
              {actualSize ? 'Fit to screen' : 'Actual size'}
            </Button>
            <Link
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ py: 1.5, fontSize: '0.875rem' }}
            >
              Open original
            </Link>
          </Box>
        </Box>
        <Box
          role="region"
          aria-label="Screenshot viewer"
          tabIndex={0}
          sx={{
            overflow: 'auto',
            minHeight: 0,
            overscrollBehavior: 'contain',
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: -2,
            },
          }}
        >
          <Box
            component="img"
            src={src}
            alt={alt}
            width={1600}
            height={900}
            sx={{
              display: 'block',
              width: actualSize ? '1600px' : '100%',
              height: 'auto',
              maxWidth: 'none',
              ...(actualSize ? {} : { maxHeight: 'calc(100dvh - 250px)', objectFit: 'contain' }),
            }}
          />
        </Box>
      </Dialog>
    </Box>
  );
};
