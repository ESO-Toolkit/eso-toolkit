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
import type { SystemStyleObject } from '@mui/system';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { ROUTE_META } from '@/constants/routeMeta';
import { usePageTitle } from '@/hooks/useDocumentTitle';

import { KalpaProductShot } from '../components/KalpaProductShot';
import { KALPA_RELEASES_URL, KALPA_REPO_URL } from '../constants/kalpa';
import { getBaseUrl } from '../utils/envUtils';

/** Re-exported for tests; the single definition lives in the shared route map. */
export const KALPA_PAGE_TITLE = ROUTE_META['/kalpa'].title;

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
  maxWidth: '1240px',
  margin: '0 auto',
  padding: '2.5rem 1rem 3.5rem',
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: theme.spacing(4),
  alignItems: 'start',
  position: 'relative',
  zIndex: 1,
  [theme.breakpoints.up('md')]: {
    padding: '4.5rem 2rem 5.5rem',
    gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)',
    gap: theme.spacing(6),
  },
  [theme.breakpoints.up('lg')]: { gap: theme.spacing(8) },
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
const storyHeadingSx = {
  ...sectionHeadingSx,
  fontSize: { xs: '1.75rem', md: '2.25rem', lg: '2.5rem' },
  lineHeight: 1.1,
  maxWidth: '18ch',
  mb: 2,
} as const;

const storyBodySx = {
  color: 'text.secondary',
  fontSize: '1.0625rem',
  fontWeight: 400,
  lineHeight: 1.7,
} as const;

const storyGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 7fr)' },
  gap: { xs: 4, md: 6 },
  alignItems: 'center',
} as const;

const storyPanelSx = (theme: Theme): SystemStyleObject<Theme> => ({
  p: { xs: 3, md: 5 },
  borderRadius: '16px',
  border: '1px solid',
  borderColor: theme.palette.mode === 'dark' ? 'rgba(139,92,246,.14)' : 'rgba(139,92,246,.10)',
  background: theme.palette.mode === 'dark' ? 'rgba(139,92,246,.05)' : 'rgba(139,92,246,.035)',
});

const StoryEyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    sx={(theme) => ({
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '.72rem',
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      mb: 2,
      color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
    })}
  >
    {children}
  </Typography>
);

const StoryPoint: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
    <Typography component="h3" sx={{ fontSize: '.95rem', fontWeight: 700, mb: 1 }}>
      {title}
    </Typography>
    <Typography
      sx={{ color: 'text.secondary', fontSize: '.875rem', fontWeight: 400, lineHeight: 1.65 }}
    >
      {children}
    </Typography>
  </Box>
);

const pointGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 3,
  mt: 4,
} as const;

const SAFETY_POINTS = [
  [
    'Settings editor',
    'Search labeled SavedVariables, copy character or account settings, and clean up orphaned entries.',
  ],
  [
    'Backups and restores',
    'Full or per-character backups, with a safety snapshot taken before any restore.',
  ],
  [
    'Addon profiles',
    'Save enabled-addon setups for different characters or roles and preview the switch, with libraries protected.',
  ],
  [
    'Protected edits',
    'Edit addon files with backups, per-file conflict diffs, and Safety Center warnings.',
  ],
  [
    'Multiple installs',
    'Detects native and Steam installs across NA, EU, and PTS, and copies addons between them.',
  ],
  ['Signed updates', 'Kalpa updates itself with signed releases.'],
] as const;

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
            <Box sx={{ minWidth: 0 }}>
              <Chip
                label="Public beta · Free · Source available"
                size="small"
                sx={(theme) => ({
                  mb: 2,
                  fontSize: '.72rem',
                  fontWeight: 600,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
                  background:
                    theme.palette.mode === 'dark' ? 'rgba(139,92,246,.1)' : 'rgba(139,92,246,.06)',
                  border: '1px solid',
                  borderColor:
                    theme.palette.mode === 'dark' ? 'rgba(139,92,246,.2)' : 'rgba(139,92,246,.14)',
                })}
              />
              <Typography
                component="h1"
                id="kalpa-hero-heading"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2.1rem', sm: '2.6rem', md: '2.75rem', lg: '3.25rem' },
                  lineHeight: 1.05,
                  letterSpacing: '-.03em',
                  color: 'text.primary',
                  mb: 2,
                }}
              >
                <Box
                  component="span"
                  sx={{ ...auroraGradientText, display: 'block', fontSize: '1.5rem', mb: 1 }}
                >
                  Kalpa
                </Box>
                <Box component="span" sx={{ display: 'block', textWrap: 'balance' }}>
                  The ESO addon manager that also uploads your logs.
                </Box>
              </Typography>
              <Typography
                sx={{
                  ...storyBodySx,
                  fontSize: { xs: '1rem', sm: '1.0625rem' },
                  maxWidth: '480px',
                  mb: 3,
                }}
              >
                Install and update ESOUI addons with their libraries, send fights to ESO Logs while
                you play, and share your setup through Pack Hub. One free desktop app.
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1.5,
                  flexWrap: 'wrap',
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
              <Typography
                sx={{ mt: 2, fontSize: '.8rem', color: 'text.secondary', lineHeight: 1.6 }}
              >
                Windows (best tested) · macOS and Linux builds on GitHub · Source available under
                BSL 1.1
              </Typography>
            </Box>
            <KalpaProductShot
              src={`${getBaseUrl()}images/kalpa/main-desktop.webp`}
              alt="Kalpa desktop showing installed addons, dependency details, and update controls"
              caption="The addon library: pending updates, addon details, and required dependencies."
              priority
            />
          </HeroContent>
        </HeroSection>
      </FullBleed>

      <FullBleed>
        <Box
          sx={{
            maxWidth: '1200px',
            mx: 'auto',
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 7, md: 12 },
            display: 'grid',
            gap: { xs: 7, md: 12 },
          }}
        >
          <Box component="section" aria-labelledby="kalpa-addons-heading" sx={storyGridSx}>
            <Box>
              <StoryEyebrow>01 · Addons</StoryEyebrow>
              <Typography component="h2" id="kalpa-addons-heading" sx={storyHeadingSx}>
                Find it, install it, keep it current.
              </Typography>
              <Typography sx={storyBodySx}>
                Search ESOUI, browse popular addons and categories, or install straight from a URL
                or ID. When updates land, update your whole library in one pass.
              </Typography>
              <Box sx={pointGridSx}>
                <StoryPoint title="Dependencies checked first">
                  Kalpa lists required and optional libraries and checks transitive dependencies and
                  versions before it installs anything.
                </StoryPoint>
                <StoryPoint title="Organized your way">
                  Tags, favorites, compatibility checks, and JSON import or export for your addon
                  list.
                </StoryPoint>
              </Box>
            </Box>
            <KalpaProductShot
              src={`${getBaseUrl()}images/kalpa/discover.webp`}
              alt="Kalpa Discover browsing popular ESOUI addons and LoreBooks details"
              caption="Discover: popular ESOUI addons with downloads, screenshots, and one-click install."
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box component="section" aria-labelledby="kalpa-logs-heading" sx={storyPanelSx}>
              <StoryEyebrow>02 · ESO Logs</StoryEyebrow>
              <Typography
                component="h2"
                id="kalpa-logs-heading"
                sx={{ ...storyHeadingSx, fontSize: { xs: '1.75rem', md: '1.9rem' } }}
              >
                Fights to ESO Logs, straight from the app.
              </Typography>
              <Typography sx={storyBodySx}>
                Sign in with your ESO Logs account, choose who can see the report, and upload a
                saved log or keep live logging running while you play.
              </Typography>
              <Box sx={pointGridSx}>
                <StoryPoint title="Sessions and fights">
                  Split a log into sessions and pick individual fights, with difficulty and kill
                  markers.
                </StoryPoint>
                <StoryPoint title="Upload history">
                  See what you&apos;ve already sent, or hand off to the official uploader when you
                  prefer.
                </StoryPoint>
              </Box>
            </Box>
            <Box component="section" aria-labelledby="kalpa-packs-heading" sx={storyPanelSx}>
              <StoryEyebrow>03 · Pack Hub</StoryEyebrow>
              <Typography
                component="h2"
                id="kalpa-packs-heading"
                sx={{ ...storyHeadingSx, fontSize: { xs: '1.75rem', md: '1.9rem' } }}
              >
                Share a whole setup in six characters.
              </Typography>
              <Typography sx={storyBodySx}>
                Publish addon, build, and roster packs, vote on the ones that work, and pass them on
                as a six-character code or an .esopack file.
              </Typography>
              <Box sx={pointGridSx}>
                <StoryPoint title="Required or optional">
                  Addon packs mark which addons are required and which are optional.
                </StoryPoint>
                <StoryPoint title="Scrubbed exports">
                  Exported settings have account identifiers removed.
                </StoryPoint>
              </Box>
              <Link
                component={RouterLink}
                to="/pack-hub"
                sx={{ display: 'inline-block', mt: 3, fontWeight: 600 }}
              >
                Browse Pack Hub →
              </Link>
            </Box>
          </Box>
          <Box
            component="section"
            aria-labelledby="kalpa-appearance-heading"
            sx={{
              ...storyGridSx,
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 7fr) minmax(0, 5fr)' },
            }}
          >
            <Box>
              <StoryEyebrow>04 · Make it yours</StoryEyebrow>
              <Typography component="h2" id="kalpa-appearance-heading" sx={storyHeadingSx}>
                54 themes. Eight Elder Scrolls skins. Or your own.
              </Typography>
              <Typography sx={storyBodySx}>
                Dress Kalpa in Dwemer Brass or Clockwork City, or build a theme from scratch.
              </Typography>
              <Box sx={{ mt: 4 }}>
                <StoryPoint title="Comfortable to use">
                  Light and high-contrast options, UI scaling, and keyboard shortcuts.
                </StoryPoint>
              </Box>
            </Box>
            <Box sx={{ minWidth: 0, order: { md: -1 } }}>
              <KalpaProductShot
                src={`${getBaseUrl()}images/kalpa/themes.webp`}
                alt="Kalpa appearance settings showing Elder Scrolls theme choices"
                caption="Appearance settings with Elder Scrolls–inspired themes."
              />
            </Box>
          </Box>
          <Box component="section" aria-labelledby="kalpa-safety-heading">
            <StoryEyebrow>05 · Your settings, protected</StoryEyebrow>
            <Typography component="h2" id="kalpa-safety-heading" sx={storyHeadingSx}>
              Careful with the files you can&apos;t replace.
            </Typography>
            <Typography sx={{ ...storyBodySx, maxWidth: '700px' }}>
              Backups before edits, a snapshot before every restore, and a preview before you switch
              profiles or import from Minion.
            </Typography>
            <Box
              sx={{
                ...pointGridSx,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                gap: { xs: 3, md: 4 },
              }}
            >
              {SAFETY_POINTS.map(([title, description]) => (
                <StoryPoint key={title} title={title}>
                  {description}
                </StoryPoint>
              ))}
            </Box>
            <Box
              sx={(theme) => ({
                ...storyPanelSx(theme),
                mt: 4,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: '0 auto 0 0',
                  width: '3px',
                  background: 'linear-gradient(#a78bfa, #6366f1)',
                },
              })}
            >
              <Typography component="h3" sx={{ fontWeight: 700, mb: 1 }}>
                Switching from Minion?
              </Typography>
              <Typography sx={storyBodySx}>
                Preview the Minion import and review integrity checks before applying it; Kalpa
                creates a backup snapshot and keeps your original Minion data.
              </Typography>
            </Box>
          </Box>
        </Box>
      </FullBleed>

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
                fontWeight: 400,
                lineHeight: 1.7,
                mb: 3.5,
              }}
            >
              Kalpa is free and in public beta. Windows is the best-tested platform; macOS and Linux
              builds are newer and available on GitHub.
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
