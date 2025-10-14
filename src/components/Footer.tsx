import { Launch, ChevronRight } from '@mui/icons-material';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import Link from '@mui/material/Link';
import { alpha } from '@mui/material/styles';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import discordIcon from '../assets/discord-icon.svg';
import esoLogo from '../assets/ESOHelpers-logo-icon.svg';

type FooterLink = {
  label: string;

  href: string;

  external?: boolean;
};

export const Footer: React.FC = React.memo(() => {
  const theme = useTheme();

  const accentColor = theme.palette.mode === 'dark' ? '#38bdf8' : '#2563eb';

  const secondaryAccent = theme.palette.mode === 'dark' ? '#a855f7' : '#7c3aed';

  const _currentYear = React.useMemo(() => new Date().getFullYear(), []);

  const toolLinks = React.useMemo<FooterLink[]>(
    () => [
      { label: 'Build Calculator', href: '/calculator' },

      { label: 'Text Editor', href: '/text-editor' },

      { label: 'Log Analyzer', href: '/logs' },

      { label: 'Scribing Simulator', href: '/scribing-simulator' },

      { label: 'Scribing Analysis', href: '/scribing-analysis' },
    ],

    [],
  );

  const quickLinks = React.useMemo<FooterLink[]>(
    () => [
      { label: 'Home', href: '/' },

      { label: 'Latest Reports', href: '/latest-reports' },

      { label: 'My Reports', href: '/my-reports' },

      { label: 'Join Discord', href: 'https://discord.gg/mMjwcQYFdc', external: true },

      { label: 'GitHub', href: 'https://github.com/esohelper', external: true },
    ],

    [],
  );

  const footerSections = React.useMemo(
    () => [
      { title: 'Tools', links: toolLinks },

      { title: 'Quick Links', links: quickLinks },
    ],

    [quickLinks, toolLinks],
  );

  const _sectionMeta = React.useMemo(
    () => ({
      Tools: {
        blurb: 'Essential utilities built for raid prep and log mastery.',
      },
      'Quick Links': {
        blurb: 'Jump straight to the destinations you visit most often.',
      },
    }),
    [],
  );

  const overviewPanelSx = React.useMemo(
    () => ({
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: { xs: 2.25, md: 2.75 },
      padding: { xs: '1.75rem', sm: '2rem', md: '2.35rem' },
      borderRadius: { xs: 3, md: 3.5 },
      height: '100%',
      flexGrow: 1,
      isolation: 'isolate',
      background:
        theme.palette.mode === 'dark'
          ? 'linear-gradient(150deg, rgba(15, 23, 42, 0.96) 0%, rgba(21, 34, 56, 0.88) 48%, rgba(12, 21, 36, 0.92) 100%)'
          : 'linear-gradient(150deg, rgba(226, 232, 240, 0.92) 0%, rgba(241, 245, 249, 0.95) 48%, rgba(248, 250, 252, 0.98) 100%)',
      border: `1px solid ${alpha(accentColor, theme.palette.mode === 'dark' ? 0.3 : 0.22)}`,
      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 32px 64px rgba(2, 6, 23, 0.58)'
          : '0 28px 56px rgba(148, 163, 184, 0.3)',
      overflow: 'hidden',
      backdropFilter: 'blur(14px)',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background:
          theme.palette.mode === 'dark'
            ? `radial-gradient(circle at top left, ${alpha(accentColor, 0.35)} 0%, transparent 55%)`
            : `radial-gradient(circle at top left, ${alpha(accentColor, 0.2)} 0%, transparent 55%)`,
        pointerEvents: 'none',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: -80,
        right: -80,
        width: 220,
        height: 220,
        background:
          theme.palette.mode === 'dark'
            ? `radial-gradient(circle, ${alpha(secondaryAccent, 0.28)} 0%, transparent 65%)`
            : `radial-gradient(circle, ${alpha(secondaryAccent, 0.18)} 0%, transparent 65%)`,
        filter: 'blur(6px)',
        pointerEvents: 'none',
      },
      '& > *': { position: 'relative', zIndex: 1 },
    }),
    [accentColor, secondaryAccent, theme.palette.mode],
  );

  const linksPanelSx = React.useMemo(
    () => ({
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: { xs: 2.5, md: 3 },
      padding: { xs: '1.75rem', sm: '2rem', md: '2.35rem' },
      borderRadius: { xs: 3, md: 3.5 },
      height: '100%',
      flexGrow: 1,
      isolation: 'isolate',
      background:
        theme.palette.mode === 'dark'
          ? 'linear-gradient(150deg, rgba(10, 15, 28, 0.96) 0%, rgba(17, 24, 39, 0.9) 52%, rgba(10, 15, 28, 0.94) 100%)'
          : 'linear-gradient(150deg, rgba(226, 232, 240, 0.9) 0%, rgba(234, 239, 247, 0.95) 52%, rgba(248, 250, 252, 0.98) 100%)',
      border: `1px solid ${alpha(accentColor, theme.palette.mode === 'dark' ? 0.32 : 0.24)}`,
      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 34px 66px rgba(2, 6, 23, 0.6)'
          : '0 30px 60px rgba(148, 163, 184, 0.32)',
      overflow: 'hidden',
      backdropFilter: 'blur(14px)',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background:
          theme.palette.mode === 'dark'
            ? `radial-gradient(circle at top right, ${alpha(accentColor, 0.32)} 0%, transparent 55%)`
            : `radial-gradient(circle at top right, ${alpha(accentColor, 0.18)} 0%, transparent 55%)`,
        pointerEvents: 'none',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: -90,
        left: -60,
        width: 200,
        height: 200,
        background:
          theme.palette.mode === 'dark'
            ? `radial-gradient(circle, ${alpha(secondaryAccent, 0.25)} 0%, transparent 60%)`
            : `radial-gradient(circle, ${alpha(secondaryAccent, 0.16)} 0%, transparent 60%)`,
        filter: 'blur(8px)',
        pointerEvents: 'none',
      },
      '& > *': { position: 'relative', zIndex: 1 },
    }),
    [accentColor, secondaryAccent, theme.palette.mode],
  );

  const linkBaseSx = React.useMemo(
    () => ({
      display: 'flex',

      alignItems: 'center',

      justifyContent: 'space-between',

      width: '100%',

      gap: { xs: 0.65, md: 0.85 },

      whiteSpace: 'nowrap',

      color: theme.palette.text.secondary,

      textDecoration: 'none',

      fontSize: { xs: '0.95rem', md: '1rem' },

      fontWeight: 500,

      letterSpacing: '0.01em',

      position: 'relative',

      transition: 'color 0.2s ease, transform 0.2s ease',

      '&::after': {
        content: '""',

        position: 'absolute',

        bottom: -4,

        left: 0,

        width: '32%',

        height: '1px',

        borderRadius: 999,

        background: `linear-gradient(90deg, ${alpha(accentColor, 0)} 0%, ${alpha(accentColor, 0.7)} 100%)`,

        opacity: 0,

        transition: 'width 0.3s ease, opacity 0.2s ease',
      },

      '&:hover': {
        color: accentColor,

        transform: 'translateX(3px)',

        '&::after': {
          width: '100%',

          opacity: 1,
        },

        '& .footer-link-icon': {
          opacity: 1,

          transform: 'translateX(0)',
        },
      },

      '&:active': {
        transform: 'translateX(1px)',
      },
    }),

    [accentColor, theme.palette.text.secondary],
  );

  const linkIconSx = React.useMemo(
    () => ({
      fontSize: 16,

      opacity: 0,

      transform: 'translateX(-6px)',

      transition: 'all 0.2s ease',

      color: accentColor,
    }),

    [accentColor],
  );

  const primaryButtonSx = React.useMemo(
    () => ({
      px: { xs: 2.75, md: 3.5 },

      py: { xs: 1, md: 1.2 },

      width: { xs: '100%', sm: 220 },

      borderRadius: 2.5,

      textTransform: 'none',

      fontSize: '0.95rem',

      fontWeight: 600,

      letterSpacing: '0.02em',

      color: '#0f172a',

      backgroundImage:
        theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.95) 0%, rgba(59, 130, 246, 0.85) 100%)'
          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(56, 189, 248, 0.85) 100%)',

      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 24px 48px rgba(15, 23, 42, 0.55)'
          : '0 22px 44px rgba(148, 163, 184, 0.35)',

      border: 'none',

      transition: 'transform 0.2s ease, box-shadow 0.3s ease, filter 0.3s ease',

      '&:hover': {
        transform: 'translateY(-2px)',

        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 28px 56px rgba(15, 23, 42, 0.6)'
            : '0 26px 52px rgba(148, 163, 184, 0.38)',

        filter: 'brightness(1.05)',
      },

      '&:active': {
        transform: 'translateY(0)',
      },
    }),

    [theme.palette.mode],
  );

  const secondaryButtonSx = React.useMemo(
    () => ({
      px: { xs: 2.5, md: 3.2 },

      py: { xs: 1, md: 1.2 },

      width: { xs: '100%', sm: 220 },

      borderRadius: 2.5,

      textTransform: 'none',

      fontSize: '0.95rem',

      fontWeight: 600,

      letterSpacing: '0.02em',

      color: theme.palette.text.primary,

      backgroundColor:
        theme.palette.mode === 'dark' ? alpha('#0f172a', 0.65) : alpha('#f8fafc', 0.8),

      border: `1px solid ${alpha(accentColor, theme.palette.mode === 'dark' ? 0.5 : 0.35)}`,

      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 20px 40px rgba(15, 23, 42, 0.45)'
          : '0 18px 36px rgba(148, 163, 184, 0.28)',

      transition:
        'transform 0.2s ease, box-shadow 0.3s ease, border-color 0.3s ease, background-color 0.3s ease',

      '&:hover': {
        transform: 'translateY(-2px)',

        borderColor: alpha(accentColor, 0.75),

        backgroundColor:
          theme.palette.mode === 'dark' ? alpha('#0f172a', 0.8) : alpha('#e2e8f0', 0.9),

        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 24px 48px rgba(15, 23, 42, 0.58)'
            : '0 22px 44px rgba(148, 163, 184, 0.32)',
      },

      '&:active': {
        transform: 'translateY(0)',
      },
    }),

    [accentColor, theme.palette.mode, theme.palette.text.primary],
  );

  const brandBadgeSx = React.useMemo(
    () => ({
      display: 'flex',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 0.65,

      padding: { xs: '0.4rem 0.9rem', sm: '0.45rem 1rem' },

      borderRadius: 999,

      whiteSpace: 'nowrap',
      textAlign: 'center',
      flex: { xs: '1 1 140px', sm: '0 0 auto' },
      minHeight: 38,

      fontSize: { xs: '0.68rem', sm: '0.72rem' },

      fontWeight: 600,

      letterSpacing: '0.08em',

      textTransform: 'uppercase',

      lineHeight: 1.25,

      background: theme.palette.mode === 'dark' ? alpha('#0f172a', 0.78) : alpha('#e2e8f0', 0.85),

      border: `1px solid ${alpha(accentColor, theme.palette.mode === 'dark' ? 0.6 : 0.35)}`,

      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 10px 22px rgba(15, 23, 42, 0.45)'
          : '0 10px 22px rgba(148, 163, 184, 0.3)',

      color: theme.palette.mode === 'dark' ? alpha('#e2e8f0', 0.95) : alpha('#0f172a', 0.85),
    }),

    [accentColor, theme.palette.mode],
  );

  const badgeDotSx = React.useMemo(
    () => ({
      width: 5,

      height: 5,

      borderRadius: '50%',

      backgroundColor: accentColor,

      boxShadow: `0 0 0 4px ${alpha(accentColor, 0.2)}`,

      flexShrink: 0,
    }),

    [accentColor],
  );

  const ctaCardSx = React.useMemo(
    () => ({
      borderRadius: { xs: 3, md: 5 },

      padding: { xs: 2.5, sm: 3.5 },

      display: 'flex',

      flexDirection: { xs: 'column', md: 'row' },

      alignItems: { xs: 'flex-start', md: 'center' },

      justifyContent: 'space-between',

      gap: { xs: 2.5, md: 4 },

      position: 'relative',

      overflow: 'hidden',

      background:
        theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(30, 64, 175, 0.35) 0%, rgba(59, 130, 246, 0.18) 35%, rgba(13, 148, 136, 0.12) 100%)'
          : 'linear-gradient(135deg, rgba(191, 219, 254, 0.6) 0%, rgba(186, 230, 253, 0.42) 35%, rgba(125, 211, 252, 0.32) 100%)',

      border: `1px solid ${alpha(accentColor, theme.palette.mode === 'dark' ? 0.45 : 0.35)}`,

      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 36px 72px rgba(2, 6, 23, 0.65)'
          : '0 30px 60px rgba(148, 163, 184, 0.28)',

      '&::before': {
        content: '""',

        position: 'absolute',

        inset: 0,

        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha(accentColor, 0.25)} 0%, ${alpha(secondaryAccent, 0.2)} 60%, transparent 100%)`
            : `linear-gradient(135deg, ${alpha(accentColor, 0.18)} 0%, ${alpha(secondaryAccent, 0.12)} 60%, transparent 100%)`,

        opacity: 0.9,

        pointerEvents: 'none',
      },

      '&::after': {
        content: '""',

        position: 'absolute',

        top: -120,

        right: -120,

        width: 240,

        height: 240,

        background:
          theme.palette.mode === 'dark'
            ? `radial-gradient(circle at center, ${alpha(accentColor, 0.4)} 0%, transparent 70%)`
            : `radial-gradient(circle at center, ${alpha(accentColor, 0.25)} 0%, transparent 70%)`,

        filter: 'blur(80px)',

        opacity: 0.7,

        pointerEvents: 'none',
      },
    }),

    [accentColor, secondaryAccent, theme.palette.mode],
  );

  const brandHighlights = React.useMemo(
    () => [
      'Real-time analytics',
      'Player-built insights',
      'Free beta access',
      'Community-driven support',
    ],

    [],
  );

  return (
    <Box
      component="footer"
      sx={{
        marginTop: { xs: '4.5rem', md: '7rem' },

        position: 'relative',

        overflow: 'hidden',

        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(2, 6, 23, 0.98) 60%, rgba(2, 6, 23, 1) 100%)'
            : 'linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.98) 60%, rgba(226, 232, 240, 1) 100%)',

        borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
      }}
    >
      <Box
        component="span"
        sx={{
          position: 'absolute',

          top: 0,

          left: 0,

          right: 0,

          height: '1px',

          background: `linear-gradient(90deg, ${alpha(accentColor, 0)} 0%, ${alpha(accentColor, 0.6)} 50%, ${alpha(accentColor, 0)} 100%)`,

          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'absolute',

          inset: 0,

          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at top, rgba(56, 189, 248, 0.08), transparent 55%), radial-gradient(circle at bottom right, rgba(147, 51, 234, 0.08), transparent 60%)'
              : 'radial-gradient(circle at top, rgba(59, 130, 246, 0.06), transparent 55%), radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.06), transparent 60%)',

          opacity: 0.9,

          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'absolute',

          top: -200,

          left: '50%',

          transform: 'translateX(-50%)',

          width: 540,

          height: 540,

          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at center, rgba(56, 189, 248, 0.25) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(59, 130, 246, 0.18) 0%, transparent 70%)',

          filter: 'blur(140px)',

          opacity: theme.palette.mode === 'dark' ? 0.6 : 0.5,

          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'absolute',

          bottom: { xs: -220, md: -260 },

          right: { xs: '-160px', md: '-120px' },

          width: { xs: 320, md: 420 },

          height: { xs: 320, md: 420 },

          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at center, rgba(168, 85, 247, 0.18) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(126, 34, 206, 0.12) 0%, transparent 70%)',

          filter: 'blur(150px)',

          opacity: theme.palette.mode === 'dark' ? 0.45 : 0.4,

          pointerEvents: 'none',
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',

          zIndex: 1,

          px: { xs: 2.5, sm: 4, md: 6 },

          py: { xs: 5, md: 7 },
        }}
      >
        <Box sx={ctaCardSx}>
          <Box
            sx={{
              position: 'relative',

              zIndex: 1,

              maxWidth: { xs: '100%', md: '60%' },

              textAlign: { xs: 'left', md: 'initial' },
            }}
          >
            <Typography
              variant="overline"
              sx={{
                display: 'inline-block',

                letterSpacing: '0.2em',

                fontWeight: 600,

                fontSize: { xs: '0.65rem', sm: '0.7rem' },

                color: alpha(accentColor, 0.8),

                mb: 1,
              }}
            >
              Stay ahead of the meta
            </Typography>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,

                letterSpacing: '-0.02em',

                fontFamily: 'Space Grotesk,Inter,system-ui',

                lineHeight: 1.2,

                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },

                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(226, 232, 240, 0.95) 0%, rgba(148, 163, 184, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(30, 64, 175, 1) 0%, rgba(15, 23, 42, 0.9) 100%)',

                WebkitBackgroundClip: 'text',

                color: 'transparent',

                mb: 1.5,
              }}
            >
              Ready for the next wave of ESO combat analytics?
            </Typography>

            <Typography
              sx={{
                color: theme.palette.text.secondary,

                maxWidth: { xs: '100%', md: 520 },

                lineHeight: 1.6,

                fontWeight: 400,

                fontSize: { xs: '0.95rem', md: '1rem' },
              }}
            >
              Connect with our team for early feature access, share your feedback, and help shape
              the tools that power top-tier raid strategy.
            </Typography>
          </Box>

          <Box
            sx={{
              position: 'relative',

              zIndex: 1,

              display: 'flex',

              flexDirection: { xs: 'column', sm: 'row' },

              alignItems: { xs: 'center', sm: 'center' },

              justifyContent: 'center',

              flexWrap: { xs: 'nowrap', sm: 'wrap' },

              gap: { xs: 1.5, sm: 2 },

              width: { xs: '100%', md: 'auto' },
            }}
          >
            <Button
              component="a"
              href="https://discord.gg/mMjwcQYFdc"
              target="_blank"
              rel="noopener noreferrer"
              sx={primaryButtonSx}
              startIcon={
                <Box component="img" src={discordIcon} alt="" sx={{ width: 20, height: 20 }} />
              }
            >
              Join Discord
            </Button>

            <Button
              component="a"
              href="https://github.com/esohelper/ESO-Log-Aggregator"
              target="_blank"
              rel="noopener noreferrer"
              sx={secondaryButtonSx}
            >
              View on GitHub
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',

            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.85fr) minmax(0, 1fr)' },

            gap: { xs: 5, md: 8 },

            marginTop: { xs: 5.5, md: 8 },
          }}
        >
          <Box sx={overviewPanelSx}>
            <Box
              sx={{
                display: 'flex',

                flexDirection: { xs: 'column', sm: 'row' },

                alignItems: { xs: 'center', sm: 'flex-start' },

                gap: { xs: 1.75, sm: 2, md: 2.5 },

                mb: { xs: 2, md: 2.5 },

                textAlign: { xs: 'center', sm: 'left' },
              }}
            >
              <Box
                sx={{
                  borderRadius: '50%',

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'center',

                  flexShrink: 0,

                  p: { xs: 1.15, md: 1.35 },

                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(147, 51, 234, 0.12))'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(99, 102, 241, 0.1))',

                  border: `1px solid ${alpha(accentColor, theme.palette.mode === 'dark' ? 0.6 : 0.3)}`,

                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 18px 36px rgba(15, 23, 42, 0.55)'
                      : '0 16px 32px rgba(148, 163, 184, 0.3)',
                }}
              >
                <img src={esoLogo} alt="ESO Helpers" style={{ width: 28, height: 28 }} />
              </Box>

              <Box
                sx={{
                  textAlign: { xs: 'center', sm: 'left' },

                  maxWidth: { xs: '100%', sm: 420 },

                  width: '100%',
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,

                    fontSize: { xs: '1.35rem', md: '1.6rem' },

                    letterSpacing: '-0.02em',

                    fontFamily: 'Space Grotesk,Inter,system-ui',

                    background:
                      theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(226, 232, 240, 0.95), rgba(148, 163, 184, 0.75))'
                        : 'linear-gradient(135deg, rgba(15, 23, 42, 1), rgba(30, 41, 59, 0.85))',

                    WebkitBackgroundClip: 'text',

                    color: 'transparent',

                    marginBottom: 0.75,
                  }}
                >
                  ESO Helper Tools
                </Typography>

                <Typography sx={{ color: theme.palette.text.secondary, lineHeight: 1.6 }}>
                  Data-driven utilities crafted by raiders for raiders. Surface the insights you
                  need to plan faster pulls, tighter logs, and smoother clears.
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',

                flexWrap: 'wrap',

                gap: { xs: 1.1, sm: 1.25, md: 1.5 },

                justifyContent: { xs: 'center', sm: 'flex-start' },

                alignItems: 'center',

                maxWidth: { xs: '100%', md: 520, lg: 600 },

                width: '100%',

                mx: { xs: 'auto', md: 0 },

                mt: { xs: 2, md: 2.5 },
              }}
            >
              {brandHighlights.map((highlight) => (
                <Box key={highlight} sx={brandBadgeSx}>
                  <Box component="span" sx={badgeDotSx} />

                  {highlight}
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={linksPanelSx}>
            <Box
              sx={{
                display: 'flex',

                flexDirection: { xs: 'column', md: 'row' },

                alignItems: { xs: 'stretch', md: 'flex-start' },

                justifyContent: { xs: 'flex-start', md: 'space-between' },

                gap: { xs: 3, md: 5.25, lg: 6 },

                width: '100%',
              }}
            >
              {footerSections.map((section) => (
                <Box
                  key={section.title}
                  sx={{
                    display: 'flex',

                    flexDirection: 'column',

                    flex: 1,

                    minWidth: 0,

                    width: '100%',

                    gap: { xs: 1.6, md: 1.9 },
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 800,

                      letterSpacing: '-0.02em',

                      fontSize: { xs: '1.5rem', md: '1.2rem' },

                      textTransform: 'uppercase',

                      color: 'text.primary',

                      mb: { xs: 1.1, md: 1.3 },

                      fontFamily: 'Space Grotesk,Inter,system-ui',
                    }}
                  >
                    {section.title}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',

                      flexDirection: 'column',

                      gap: { xs: 1.2, md: 1.35 },

                      width: '100%',
                    }}
                  >
                    {section.links.map((link) => (
                      <Link
                        key={link.label}
                        component={link.external ? 'a' : RouterLink}
                        href={link.external ? link.href : undefined}
                        to={!link.external ? link.href : undefined}
                        target={link.external ? '_blank' : undefined}
                        rel={link.external ? 'noopener noreferrer' : undefined}
                        underline="none"
                        sx={linkBaseSx}
                      >
                        <Typography component="span" sx={{ flexGrow: 1 }}>
                          {link.label}
                        </Typography>

                        {link.external ? (
                          <Launch className="footer-link-icon" sx={linkIconSx} />
                        ) : (
                          <ChevronRight className="footer-link-icon" sx={linkIconSx} />
                        )}
                      </Link>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            position: 'relative',

            height: '1px',

            marginTop: { xs: 6, md: 8 },

            background: `linear-gradient(90deg, ${alpha(accentColor, 0)} 0%, ${alpha(accentColor, 0.45)} 50%, ${alpha(accentColor, 0)} 100%)`,

            '&::before': {
              content: '""',

              position: 'absolute',

              top: -6,

              left: '50%',

              transform: 'translateX(-50%)',

              width: 220,

              height: 8,

              background:
                theme.palette.mode === 'dark'
                  ? `radial-gradient(ellipse at center, ${alpha(accentColor, 0.45)} 0%, transparent 70%)`
                  : `radial-gradient(ellipse at center, ${alpha(accentColor, 0.3)} 0%, transparent 70%)`,

              filter: 'blur(4px)',
            },
          }}
        />

        <Box
          sx={{
            display: 'flex',

            flexDirection: 'column',

            alignItems: 'center',

            justifyContent: 'center',

            gap: 2,

            marginTop: { xs: 4, md: 6 },

            color: theme.palette.text.secondary,

            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.85rem',

              opacity: 0.75,

              maxWidth: 612,

              lineHeight: 1.6,
            }}
          >
            ESO Helper Tools is an independent project and is not affiliated with ZeniMax Online
            Studios, Bethesda, or esologs.com. All trademarks are the property of their respective
            owners.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
});

Footer.displayName = 'Footer';
