import { Box, Link, Typography } from '@mui/material';
import React from 'react';

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
}) => (
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
      <Link
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open full-size screenshot: ${alt}`}
        sx={(theme) => ({
          display: 'block',
          overflow: 'hidden',
          borderRadius: { xs: '10px', md: '12px' },
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(139,92,246,.2)' : 'rgba(15,23,42,.1)',
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
      </Link>
    </Box>
    {caption && (
      <Typography
        component="figcaption"
        sx={{ mt: 1.5, fontSize: '0.8rem', color: 'text.secondary', textAlign: 'left' }}
      >
        {caption}
      </Typography>
    )}
  </Box>
);
