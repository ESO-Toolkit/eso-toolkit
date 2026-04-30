import { Close as CloseIcon } from '@mui/icons-material';
import { Box, IconButton, Typography, useMediaQuery } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { useState } from 'react';

const KALPA_URL = 'https://github.com/ESO-Toolkit/kalpa';

const Banner = styled(Box)(({ theme }) => ({
  width: '100%',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.12) 50%, rgba(14, 165, 233, 0.1) 100%)'
      : 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.06) 50%, rgba(14, 165, 233, 0.05) 100%)',
  backdropFilter: 'blur(20px)',
  borderBottom:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(139, 92, 246, 0.2)'
      : '1px solid rgba(139, 92, 246, 0.12)',
  padding: '0.65rem 1.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
  position: 'relative',
  overflow: 'hidden',
  zIndex: 10,
  animation: 'bannerSlideDown 0.4s ease-out',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background:
      'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), rgba(59, 130, 246, 0.5), transparent)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '200%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.04), transparent)',
    animation: 'bannerShimmer 4s ease-in-out infinite',
  },
  '@keyframes bannerSlideDown': {
    from: { opacity: 0, transform: 'translateY(-100%)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  '@keyframes bannerShimmer': {
    '0%': { transform: 'translateX(-50%)' },
    '100%': { transform: 'translateX(50%)' },
  },
  [theme.breakpoints.down('sm')]: {
    padding: '0.45rem 0.75rem',
    paddingRight: '2.25rem',
    gap: '0.5rem',
  },
}));

const NewBadge = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  color: '#fff',
  padding: '0.15rem 0.6rem',
  borderRadius: '20px',
  fontSize: '0.65rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  flexShrink: 0,
  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
  [theme.breakpoints.down('sm')]: {
    padding: '0.1rem 0.5rem',
    fontSize: '0.6rem',
  },
}));

const BannerLink = styled('a')(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
  fontWeight: 600,
  fontSize: '0.85rem',
  textDecoration: 'none',
  transition: 'all 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  '&:hover': {
    color: theme.palette.mode === 'dark' ? '#ddd6fe' : '#6d28d9',
    textDecoration: 'underline',
  },
}));

const MobilePromoLink = styled('a')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  textDecoration: 'none',
  color: 'inherit',
  flex: 1,
  minWidth: 0,
  transition: 'opacity 0.2s ease',
  '&:active': { opacity: 0.7 },
  '& .kalpa-arrow': {
    color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
    fontWeight: 700,
    fontSize: '0.95rem',
    flexShrink: 0,
    lineHeight: 1,
    transition: 'transform 0.2s ease',
  },
  '&:active .kalpa-arrow': {
    transform: 'translateX(2px)',
  },
}));

export const KalpaBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!showBanner) return null;

  const accentColor = theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed';

  return (
    <Banner>
      {isMobile ? (
        <MobilePromoLink href={KALPA_URL} target="_blank" rel="noopener noreferrer">
          <NewBadge>New</NewBadge>
          <Typography
            component="span"
            sx={{
              fontSize: '0.78rem',
              color: 'text.secondary',
              fontWeight: 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
              flex: 1,
              lineHeight: 1.3,
            }}
          >
            <Box component="strong" sx={{ color: accentColor, fontWeight: 700 }}>
              Kalpa
            </Box>
            {' — ESO addon manager '}
            <Box component="span" sx={{ opacity: 0.65, fontStyle: 'italic' }}>
              (alpha)
            </Box>
          </Typography>
          <span className="kalpa-arrow" aria-hidden="true">
            →
          </span>
        </MobilePromoLink>
      ) : (
        <>
          <NewBadge>New</NewBadge>
          <Typography
            sx={{
              fontSize: '0.85rem',
              color: 'text.secondary',
              fontWeight: 400,
            }}
          >
            Introducing <strong>Kalpa</strong> — a fast, open-source addon manager for ESO.{' '}
            <Box component="span" sx={{ opacity: 0.7, fontStyle: 'italic' }}>
              Currently in alpha.
            </Box>
          </Typography>
          <BannerLink href={KALPA_URL} target="_blank" rel="noopener noreferrer">
            Learn more →
          </BannerLink>
        </>
      )}
      <IconButton
        size="small"
        aria-label="Dismiss banner"
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setShowBanner(false);
        }}
        sx={{
          position: 'absolute',
          top: '50%',
          right: { xs: 4, sm: 8 },
          transform: 'translateY(-50%)',
          color: 'text.secondary',
          opacity: 0.6,
          padding: { xs: '4px', sm: '5px' },
          '&:hover': { opacity: 1 },
          zIndex: 1,
        }}
      >
        <CloseIcon sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }} />
      </IconButton>
    </Banner>
  );
};
