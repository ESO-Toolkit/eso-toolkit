/**
 * KalpaPage — prerendered marketing landing page for Kalpa, the source-available
 * ESO addon manager. The SEO title/description and the sitemap entry all come
 * from the shared route-metadata map (src/constants/route-meta.json), which
 * scripts/generate-static-routes.cjs reads too, so the prerendered <title> and
 * the hydrated one cannot drift.
 */

import {
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  GlobalStyles,
  Link,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { ROUTE_META } from '@/constants/routeMeta';
import { usePageTitle } from '@/hooks/useDocumentTitle';

import { getBaseUrl } from '../utils/envUtils';

/** Re-exported for tests; the single definition lives in the shared route map. */
export const KALPA_PAGE_TITLE = ROUTE_META['/kalpa'].title;

const KALPA_REPO_URL = 'https://github.com/ESO-Toolkit/kalpa';
const KALPA_RELEASES_URL = 'https://github.com/ESO-Toolkit/kalpa/releases/latest';

// ─── Scroll-driven CSS (same pattern as LandingPage.tsx) ─────────────────────
// `animation-timeline: view()` is unsupported in some browsers — the fallback
// is a 0s document-timeline animation that fills to its end state instantly,
// so content is never left invisible. prefers-reduced-motion and the low perf
// tier are handled globally (ReduxThemeProvider / index.css freeze animations),
// which collapses these scroll-driven animations to their final, visible state.
const kalpaPageGlobalStyles = (
  <GlobalStyles
    styles={`
    @property --divider-pos {
      syntax: '<percentage>';
      inherits: false;
      initial-value: 50%;
    }
    @property --glow-opacity {
      syntax: '<number>';
      inherits: false;
      initial-value: 0.3;
    }

    @keyframes kalpaAurora {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    @keyframes dividerShimmer {
      0% { --divider-pos: 20%; --glow-opacity: 0.3; }
      50% { --divider-pos: 80%; --glow-opacity: 0.6; }
      100% { --divider-pos: 20%; --glow-opacity: 0.3; }
    }

    @keyframes panelParallax {
      from { transform: translateY(24px) rotateY(var(--panel-ry, -4deg)) rotateX(var(--panel-rx, 2deg)); }
      to { transform: translateY(-24px) rotateY(var(--panel-ry, -4deg)) rotateX(var(--panel-rx, 2deg)); }
    }

    @keyframes cardReveal {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* The hero and closing band break out of AppLayout's reading-width
       container with 100vw; clip any scrollbar-width sliver of overflow. */
    html, body {
      overflow-x: clip;
    }
  `}
  />
);

// Shared noise texture overlay (tiny inline SVG) — same asset as LandingPage.
const noiseOverlay =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")";

const auroraGradientText = {
  background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 40%, #6366f1 70%, #818cf8 100%)',
  backgroundSize: '200% 200%',
  animation: 'kalpaAurora 6s ease-in-out infinite',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as const;

// ─── Full-bleed bands ─────────────────────────────────────────────────────────
const FullBleed = styled(Box)({
  width: '100vw',
  marginLeft: 'calc(50% - 50vw)',
  position: 'relative',
});

const HeroSection = styled('section')(({ theme }) => ({
  // Pull up under AppLayout's top padding so the band meets the header.
  marginTop: 0,
  [theme.breakpoints.up('sm')]: {
    marginTop: '-4rem',
  },
  position: 'relative',
  overflow: 'hidden',
  backgroundImage:
    theme.palette.mode === 'dark'
      ? 'radial-gradient(circle, rgba(139, 92, 246, 0.07) 1px, transparent 1px)'
      : 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 1px, transparent 1px)',
  backgroundSize: '28px 28px',
  backgroundPosition: '14px 14px',
  borderBottom:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(139, 92, 246, 0.12)'
      : '1px solid rgba(139, 92, 246, 0.08)',
  // Aurora gradient wash + fine noise overlay (kalpaAurora technique).
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background:
      theme.palette.mode === 'dark'
        ? `linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, transparent 35%, rgba(99, 102, 241, 0.07) 55%, transparent 100%), ${noiseOverlay}`
        : `linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, transparent 35%, rgba(99, 102, 241, 0.04) 55%, transparent 100%), ${noiseOverlay}`,
    backgroundSize: '200% 200%, 256px 256px',
    animation: 'kalpaAurora 15s ease-in-out infinite',
    pointerEvents: 'none',
  },
  // Animated gradient divider along the bottom edge.
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '2px',
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(90deg, transparent, rgba(139, 92, 246, var(--glow-opacity)) var(--divider-pos), transparent)'
        : 'linear-gradient(90deg, transparent, rgba(139, 92, 246, calc(var(--glow-opacity) * 0.7)) var(--divider-pos), transparent)',
    animation: 'dividerShimmer 6s ease-in-out infinite',
  },
}));

const HeroContent = styled(Box)(({ theme }) => ({
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '5rem 2rem 6rem',
  display: 'grid',
  gridTemplateColumns: '1fr',
  textAlign: 'center',
  gap: '3rem',
  alignItems: 'center',
  position: 'relative',
  zIndex: 1,
  perspective: '1200px',
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
    gap: '3rem',
    textAlign: 'center',
    perspective: 'none',
    padding: '3.5rem 1.5rem 4.5rem',
  },
  [theme.breakpoints.down('sm')]: {
    padding: '3rem 1rem 4rem',
  },
}));

const FeatureGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
  marginTop: '2rem',
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: '1fr',
  },
}));

const FeatureCard = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  padding: '1rem 1.1rem',
  position: 'relative',
  borderRadius: '12px',
  background:
    theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.03)' : 'rgba(139, 92, 246, 0.02)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(139, 92, 246, 0.08)'
      : '1px solid rgba(139, 92, 246, 0.06)',
  transition: 'all 0.4s var(--spring, cubic-bezier(0.4, 0, 0.2, 1))',
  // Staggered reveal — each card appears as it enters the viewport.
  animation: 'cardReveal linear both',
  animationTimeline: 'view()',
  animationRange: 'entry 0% cover 30%',
  // Animated left accent bar.
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '0%',
    borderRadius: '0 3px 3px 0',
    background: 'linear-gradient(180deg, #a78bfa, #8b5cf6, #6366f1)',
    transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 0 8px rgba(139, 92, 246, 0.3)',
  },
  '&:hover': {
    background:
      theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
    borderColor:
      theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.12)',
    transform: 'translateX(4px)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 4px 24px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(139, 92, 246, 0.08)'
        : '0 4px 24px rgba(139, 92, 246, 0.06), inset 0 1px 0 rgba(139, 92, 246, 0.04)',
    '&::before': {
      height: '60%',
    },
    '& .feature-index': {
      color: '#8b5cf6',
      opacity: 1,
      textShadow: '0 0 12px rgba(139, 92, 246, 0.4)',
    },
  },
  '& .feature-index': {
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
    fontSize: '0.68rem',
    fontWeight: 500,
    color: theme.palette.text.disabled,
    opacity: 0.6,
    letterSpacing: '0.02em',
    transition: 'all 0.35s var(--spring, ease)',
  },
  '& .feature-title': {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  '& .feature-desc': {
    fontSize: '0.82rem',
    fontWeight: 300,
    color: theme.palette.text.secondary,
    lineHeight: 1.6,
  },
  '& .feature-link': {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
    textDecoration: 'none',
    marginTop: '0.25rem',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}));

const FaqAccordion = styled(Accordion)(({ theme }) => ({
  background:
    theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.03)' : 'rgba(139, 92, 246, 0.02)',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(139, 92, 246, 0.08)'
      : '1px solid rgba(139, 92, 246, 0.06)',
  borderRadius: '12px !important',
  boxShadow: 'none',
  '&:before': {
    display: 'none',
  },
  '&:hover': {
    borderColor:
      theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.12)',
  },
  '& .MuiAccordionSummary-root': {
    minHeight: '56px',
  },
  '& .MuiAccordionSummary-expandIconWrapper': {
    color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
  },
}));

// ─── Closing CTA band ─────────────────────────────────────────────────────────
const ClosingBand = styled('section')(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  // Meet the footer by cancelling AppLayout's bottom padding.
  marginBottom: 0,
  [theme.breakpoints.up('sm')]: {
    marginBottom: '-2rem',
  },
  borderTop:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(139, 92, 246, 0.12)'
      : '1px solid rgba(139, 92, 246, 0.08)',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background:
      theme.palette.mode === 'dark'
        ? `linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, transparent 40%, rgba(139, 92, 246, 0.09) 70%, transparent 100%), ${noiseOverlay}`
        : `linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, transparent 40%, rgba(139, 92, 246, 0.06) 70%, transparent 100%), ${noiseOverlay}`,
    backgroundSize: '200% 200%, 256px 256px',
    animation: 'kalpaAurora 15s ease-in-out infinite',
    pointerEvents: 'none',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(90deg, transparent, rgba(139, 92, 246, var(--glow-opacity)) var(--divider-pos), transparent)'
        : 'linear-gradient(90deg, transparent, rgba(139, 92, 246, calc(var(--glow-opacity) * 0.7)) var(--divider-pos), transparent)',
    animation: 'dividerShimmer 6s ease-in-out infinite',
  },
}));

// ─── Shared button styles ─────────────────────────────────────────────────────
const primaryCtaSx = {
  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  color: '#fff',
  fontWeight: 600,
  textTransform: 'none',
  borderRadius: '10px',
  padding: '0.7rem 1.8rem',
  fontSize: '0.9rem',
  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.25)',
  '&:hover': {
    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    boxShadow: '0 8px 30px rgba(139, 92, 246, 0.35)',
    transform: 'translateY(-2px)',
  },
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

const secondaryCtaSx = (theme: Theme) =>
  ({
    borderColor: 'rgba(139, 92, 246, 0.25)',
    color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: '10px',
    padding: '0.7rem 1.8rem',
    fontSize: '0.9rem',
    '&:hover': {
      borderColor: 'rgba(139, 92, 246, 0.5)',
      background: 'rgba(139, 92, 246, 0.04)',
      transform: 'translateY(-2px)',
    },
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  }) as const;

const sectionHeadingSx = {
  fontWeight: 800,
  fontSize: { xs: '1.7rem', sm: '2rem', md: '2.2rem' },
  lineHeight: 1.15,
  color: 'text.primary',
  letterSpacing: '-0.02em',
  mb: 1,
} as const;

// ─── Content data ─────────────────────────────────────────────────────────────
const FEATURES: { title: string; description: string; linkTo?: string; linkLabel?: string }[] = [
  {
    title: 'Discover and update addons',
    description:
      'Search ESOUI, browse popular addons and categories, or install by URL or ID. Update your library in bulk.',
  },
  {
    title: 'Dependency resolution',
    description:
      'Review required and optional libraries, with transitive dependency and version checks before installation.',
  },
  {
    title: 'ESO Logs uploads',
    description:
      'Sign in to ESO Logs, choose report visibility, and upload combat logs directly from Kalpa. Keep track of upload history.',
  },
  {
    title: 'Live logging and fight selection',
    description:
      'Upload while you play, split logs into sessions, and select individual fights with difficulty and kill indicators.',
  },
  {
    title: 'Pack Hub',
    description:
      'Discover, publish, and vote on addon, build, and roster packs. Share six-character codes or export .esopack files.',
    linkTo: '/pack-hub',
    linkLabel: 'Browse Pack Hub',
  },
  {
    title: 'Settings editor',
    description:
      'Search labeled SavedVariables settings, copy character or account configurations, and clean up orphaned settings with backups before edits.',
  },
  {
    title: 'Backups and restores',
    description:
      'Create full or per-character backups. Kalpa takes a safety snapshot before restoring your settings.',
  },
  {
    title: 'Addon profiles',
    description:
      'Save enabled-addon setups for different characters or roles. Preview changes before switching, with library protection.',
  },
  {
    title: 'Themes and accessibility',
    description:
      'Choose from 54 themes, including eight Elder Scrolls skins, or create your own. Use light and high-contrast options, UI scaling, and keyboard shortcuts.',
  },
  {
    title: 'Protected edits',
    description:
      'Browse and edit addon files with backups. Review per-file conflict diffs for local changes and check warnings in the Safety Center.',
  },
  {
    title: 'Minion migration and multiple installs',
    description:
      'Preview your Minion import, detect native and Steam installations across NA, EU, and PTS, and copy addons between installs.',
  },
  {
    title: 'Everyday library tools',
    description:
      'Organize with tags and favorites, check compatibility, import or export addon lists as JSON, and receive signed Kalpa updates.',
  },
];

const FAQS: { question: string; answer: string; linkTo?: string; linkLabel?: string }[] = [
  {
    question: 'Is Kalpa free?',
    answer:
      'Yes. Kalpa is free to download and use. The full source code is public and auditable on GitHub under the source-available BSL 1.1 licence, and there are no ads, subscriptions, or feature paywalls.',
  },
  {
    question: 'Is Kalpa safe?',
    answer:
      'Kalpa provides backups, a Safety Center, signed updates, and conflict review for local addon edits. Its source is available for inspection on GitHub. It is beta software, so review warnings and keep backups of important settings.',
  },
  {
    question: 'Can I import my addons from Minion?',
    answer:
      'Yes. Kalpa includes one-click Minion migration with a dry-run preview and integrity checks, and it takes a backup snapshot before changing anything. Your original Minion data is never deleted.',
  },
  {
    question: 'Does Kalpa work with the Steam version of ESO?',
    answer:
      'Yes. Kalpa automatically detects native and Steam installations of The Elder Scrolls Online across NA, EU, and PTS, and can copy your addons from one install to another.',
  },
  {
    question: 'What are addon profiles?',
    answer:
      'An addon profile is a saved snapshot of which addons are enabled. You can keep different loadouts per character or role, such as a healing setup and a DPS setup, and Kalpa previews exactly which addons will be enabled or disabled before you switch.',
  },
  {
    question: 'What is Pack Hub?',
    answer:
      "Pack Hub is Kalpa's community hub for addon, build, and roster packs. Publish and discover shared setups, vote on packs, and share six-character codes or .esopack files. Addon packs distinguish required and optional addons; exported settings scrub account identifiers.",
    linkTo: '/pack-hub',
    linkLabel: 'Open Pack Hub',
  },
  {
    question: 'Can I upload combat logs to ESO Logs?',
    answer:
      'Yes. Sign in with your ESO Logs account to upload saved logs or use live logging during a session. Choose report visibility, split sessions, and select fights to upload. Kalpa also supports handing off to the official uploader.',
  },
  {
    question: 'Does Kalpa run on Mac or Linux?',
    answer:
      'Kalpa is in public beta. Windows is the best-tested platform. macOS and Linux builds are available on the GitHub releases page, but are newer and less tested. Check the release notes for current platform requirements and known issues.',
  },
];

// ─── Structured data ──────────────────────────────────────────────────────────
const softwareApplicationLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Kalpa',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Windows, macOS, Linux',
  offers: {
    '@type': 'Offer',
    price: 0,
    priceCurrency: 'USD',
  },
  downloadUrl: KALPA_RELEASES_URL,
  softwareHelp: KALPA_REPO_URL,
  codeRepository: KALPA_REPO_URL,
  publisher: {
    '@type': 'Organization',
    name: 'ESO Toolkit',
    url: 'https://esotk.com',
  },
};

const faqPageLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export const KalpaPage: React.FC = () => {
  usePageTitle('/kalpa');

  return (
    <Box>
      {kalpaPageGlobalStyles}

      {/* ─── Hero ─── */}
      <FullBleed>
        <HeroSection aria-labelledby="kalpa-hero-heading">
          <HeroContent>
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Chip
                label="Free / Public beta / Source available"
                size="small"
                sx={(theme: Theme) => ({
                  mb: 2,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
                  background:
                    theme.palette.mode === 'dark'
                      ? 'rgba(139, 92, 246, 0.1)'
                      : 'rgba(139, 92, 246, 0.06)',
                  border:
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(139, 92, 246, 0.2)'
                      : '1px solid rgba(139, 92, 246, 0.14)',
                })}
              />
              <Typography
                variant="h1"
                id="kalpa-hero-heading"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2.6rem', sm: '3.4rem', md: '3.8rem' },
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  mb: 1,
                }}
              >
                <Box component="span" sx={auroraGradientText}>
                  Kalpa
                </Box>
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1.05rem', sm: '1.2rem' },
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                }}
              >
                Your addons, combat logs, and shared setups. Together.
              </Typography>
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.95rem', sm: '1rem' },
                  lineHeight: 1.7,
                  fontWeight: 300,
                  mb: 3,
                  maxWidth: '680px',
                  mx: 'auto',
                }}
              >
                Manage your Elder Scrolls Online addons, upload fights to ESO Logs, share packs, and
                protect your settings in one free desktop app. Personalize your workspace and get
                ready for your next session.
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Button
                  variant="contained"
                  href={KALPA_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<DownloadIcon />}
                  sx={primaryCtaSx}
                >
                  Download for Windows
                </Button>
                <Button
                  variant="outlined"
                  href={KALPA_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<GitHubIcon />}
                  sx={secondaryCtaSx}
                >
                  View on GitHub
                </Button>
              </Box>

              <Box
                component="ul"
                aria-label="Kalpa highlights"
                sx={{
                  display: 'flex',
                  gap: 1,
                  flexWrap: 'wrap',
                  p: 0,
                  mt: 3,
                  listStyle: 'none',
                  justifyContent: 'center',
                }}
              >
                {['ESOUI addons', 'ESO Logs', 'Pack Hub', 'Minion import'].map((chip) => (
                  <Chip
                    key={chip}
                    component="li"
                    label={chip}
                    size="small"
                    variant="outlined"
                    sx={(theme: Theme) => ({
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      borderColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(139, 92, 246, 0.22)'
                          : 'rgba(139, 92, 246, 0.16)',
                      background:
                        theme.palette.mode === 'dark'
                          ? 'rgba(139, 92, 246, 0.05)'
                          : 'rgba(139, 92, 246, 0.03)',
                    })}
                  />
                ))}
              </Box>
            </Box>

            <Box component="figure" sx={{ m: 0, minWidth: 0 }}>
              <Link
                href={`${getBaseUrl()}images/kalpa/main-desktop.webp`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Kalpa addon manager screenshot full size"
              >
                <Box
                  component="img"
                  src={`${getBaseUrl()}images/kalpa/main-desktop.webp`}
                  alt="Kalpa desktop showing installed addons, dependency details, and update controls"
                  width={1600}
                  height={900}
                  sx={{
                    display: 'block',
                    width: '100%',
                    height: 'auto',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
                  }}
                />
              </Link>
              <Typography
                component="figcaption"
                sx={{ mt: 2, color: 'text.secondary', fontSize: '0.8rem' }}
              >
                Inside Kalpa. Select the screenshot to view it full size.
              </Typography>
            </Box>
          </HeroContent>
        </HeroSection>
      </FullBleed>

      {/* ─── Feature grid ─── */}
      <Box
        component="section"
        aria-labelledby="kalpa-features-heading"
        sx={{ py: { xs: 6, md: 8 }, px: { xs: 2, sm: 0 } }}
      >
        <Typography component="h2" id="kalpa-features-heading" sx={sectionHeadingSx}>
          Everything around your next session
        </Typography>
        <Typography
          sx={{ color: 'text.secondary', fontWeight: 300, maxWidth: '560px', lineHeight: 1.7 }}
        >
          From installing your first addon to sharing your group setup and reviewing a raid, Kalpa
          keeps the preparation together.
        </Typography>
        <FeatureGrid>
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title}>
              <span className="feature-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="feature-title">{feature.title}</span>
              <span className="feature-desc">{feature.description}</span>
              {feature.linkTo && feature.linkLabel && (
                <Link
                  component={RouterLink}
                  to={feature.linkTo}
                  className="feature-link"
                  underline="none"
                >
                  {feature.linkLabel} →
                </Link>
              )}
            </FeatureCard>
          ))}
        </FeatureGrid>
      </Box>

      {/* ─── Comparison ─── */}
      <Box
        component="section"
        aria-labelledby="kalpa-comparison-heading"
        sx={{ pb: { xs: 6, md: 8 }, px: { xs: 2, sm: 0 } }}
      >
        <Typography component="h2" id="kalpa-comparison-heading" sx={sectionHeadingSx}>
          Switching from Minion?
        </Typography>
        <Typography
          sx={{ color: 'text.secondary', fontWeight: 300, maxWidth: '560px', lineHeight: 1.7 }}
        >
          Bring your existing addon library with you. Preview the Minion import and review integrity
          checks before applying it; Kalpa creates a backup snapshot and keeps your original Minion
          data.
        </Typography>
      </Box>

      <Box
        component="section"
        aria-labelledby="kalpa-gallery-heading"
        sx={{ pb: { xs: 6, md: 8 }, px: { xs: 2, sm: 0 } }}
      >
        <Typography component="h2" id="kalpa-gallery-heading" sx={sectionHeadingSx}>
          A closer look at Kalpa
        </Typography>
        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 3 }}
        >
          {[
            {
              file: 'discover',
              title: 'Find your next addon',
              alt: 'Kalpa Discover browsing popular ESOUI addons and LoreBooks details',
              text: 'Browse popular addons, explore categories, and review details before installing.',
            },
            {
              file: 'themes',
              title: 'Make it your workspace',
              alt: 'Kalpa appearance settings showing Elder Scrolls theme choices',
              text: 'Pick an Elder Scrolls skin or customize colors, contrast, and scale to suit you.',
            },
          ].map((shot) => (
            <Box component="figure" key={shot.file} sx={{ m: 0, minWidth: 0 }}>
              <Link
                href={`${getBaseUrl()}images/kalpa/${shot.file}.webp`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${shot.title} screenshot full size`}
              >
                <Box
                  component="img"
                  src={`${getBaseUrl()}images/kalpa/${shot.file}.webp`}
                  alt={shot.alt}
                  width={1600}
                  height={900}
                  loading="lazy"
                  sx={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              </Link>
              <Box component="figcaption" sx={{ mt: 2 }}>
                <Typography component="h3" sx={{ fontWeight: 700 }}>
                  {shot.title}
                </Typography>
                <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{shot.text}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ─── FAQ ─── */}
      <Box
        component="section"
        aria-labelledby="kalpa-faq-heading"
        sx={{ pb: { xs: 6, md: 8 }, px: { xs: 2, sm: 0 } }}
      >
        <Typography component="h2" id="kalpa-faq-heading" sx={sectionHeadingSx}>
          Frequently asked questions
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {FAQS.map((faq) => (
            <FaqAccordion key={faq.question} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  sx={{ color: 'text.secondary', fontSize: '0.88rem', lineHeight: 1.7, mb: 1 }}
                >
                  {faq.answer}
                </Typography>
                {faq.linkTo && faq.linkLabel && (
                  <Link
                    component={RouterLink}
                    to={faq.linkTo}
                    underline="hover"
                    sx={(theme: Theme) => ({
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
                    })}
                  >
                    {faq.linkLabel} →
                  </Link>
                )}
              </AccordionDetails>
            </FaqAccordion>
          ))}
        </Box>
      </Box>

      {/* ─── Closing CTA band ─── */}
      <FullBleed>
        <ClosingBand aria-labelledby="kalpa-cta-heading">
          <Box
            sx={{
              maxWidth: '720px',
              mx: 'auto',
              textAlign: 'center',
              px: { xs: 2, sm: 3 },
              py: { xs: 7, md: 9 },
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Typography component="h2" id="kalpa-cta-heading" sx={sectionHeadingSx}>
              Ready for your next session?
            </Typography>
            <Typography
              sx={{
                color: 'text.secondary',
                fontWeight: 300,
                lineHeight: 1.7,
                mb: 3.5,
              }}
            >
              Try the public beta for free. Windows is the best-tested platform; macOS and Linux
              builds are also available on GitHub.
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                flexWrap: 'wrap',
                justifyContent: 'center',
                mb: 3,
              }}
            >
              <Button
                variant="contained"
                href={KALPA_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<DownloadIcon />}
                sx={primaryCtaSx}
              >
                Download for Windows
              </Button>
              <Button
                variant="outlined"
                href={KALPA_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<GitHubIcon />}
                sx={secondaryCtaSx}
              >
                View on GitHub
              </Button>
            </Box>
            <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary' }}>
              Found a bug or want to contribute?{' '}
              <Link
                href={KALPA_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={(theme: Theme) => ({
                  fontWeight: 600,
                  color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
                })}
              >
                Open an issue on GitHub
              </Link>
            </Typography>
          </Box>
        </ClosingBand>
      </FullBleed>

      {/* ─── Structured data (data blocks, not executed scripts) ─── */}
      <script type="application/ld+json">{JSON.stringify(softwareApplicationLd)}</script>
      <script type="application/ld+json">{JSON.stringify(faqPageLd)}</script>
    </Box>
  );
};
