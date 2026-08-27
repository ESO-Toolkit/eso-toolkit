/**
 * KalpaPage — prerendered marketing landing page for Kalpa, the open-source
 * ESO addon manager. The SEO title/description and the sitemap entry all come
 * from the shared route-metadata map (src/constants/route-meta.json), which
 * scripts/generate-static-routes.cjs reads too, so the prerendered <title> and
 * the hydrated one cannot drift.
 */

import {
  Check as CheckIcon,
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
  gridTemplateColumns: '1.1fr 0.9fr',
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

// Mock desktop app window — KalpaAppWindow concept with a deeper rest tilt.
const AppWindow = styled(Box)(({ theme }) => {
  const styles: Record<string, unknown> = {
    '--panel-ry': '-4deg',
    '--panel-rx': '2deg',
    background:
      theme.palette.mode === 'dark' ? 'rgba(15, 15, 25, 0.95)' : 'rgba(250, 250, 252, 0.98)',
    borderRadius: '14px',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
    transform: 'rotateY(var(--panel-ry)) rotateX(var(--panel-rx))',
    transformStyle: 'preserve-3d',
    // Scroll-linked parallax — drifts vertically as the hero scrolls past.
    animation: 'panelParallax linear both',
    animationTimeline: 'view()',
    animationRange: 'cover 0% cover 100%',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.12), 0 0 60px rgba(139, 92, 246, 0.08)'
        : '0 25px 80px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(139, 92, 246, 0.1), 0 0 60px rgba(139, 92, 246, 0.04)',
    transition: 'box-shadow 0.5s ease',
    // Floating glow orb behind the window.
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '10%',
      left: '-25%',
      width: '80%',
      height: '80%',
      borderRadius: '50%',
      background:
        theme.palette.mode === 'dark'
          ? 'radial-gradient(circle, rgba(139, 92, 246, 0.22) 0%, rgba(99, 102, 241, 0.09) 40%, transparent 65%)'
          : 'radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, rgba(99, 102, 241, 0.05) 40%, transparent 65%)',
      filter: 'blur(50px)',
      zIndex: -1,
      pointerEvents: 'none',
    },
    '&:hover': {
      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 40px 100px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.22), 0 0 100px rgba(139, 92, 246, 0.14)'
          : '0 40px 100px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(139, 92, 246, 0.16), 0 0 100px rgba(139, 92, 246, 0.07)',
    },
    [theme.breakpoints.down('md')]: {
      maxWidth: '440px',
      margin: '0 auto',
      animation: 'none',
      transform: 'none',
    },
  };
  return styles;
});

const WindowTitleBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1rem',
  background: theme.palette.mode === 'dark' ? 'rgba(30, 30, 45, 0.9)' : 'rgba(240, 240, 244, 0.95)',
  borderBottom:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.06)'
      : '1px solid rgba(0, 0, 0, 0.06)',
}));

const WindowAddonRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
  padding: '0.7rem 1rem',
  borderBottom:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.04)'
      : '1px solid rgba(0, 0, 0, 0.04)',
  transition: 'background 0.15s ease',
  '&:hover': {
    background:
      theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.06)' : 'rgba(139, 92, 246, 0.03)',
  },
  '&:last-child': {
    borderBottom: 'none',
  },
}));

// ─── Feature grid ─────────────────────────────────────────────────────────────
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

// ─── Comparison table ─────────────────────────────────────────────────────────
const ComparisonCard = styled(Box)(({ theme }) => ({
  marginTop: '2rem',
  borderRadius: '14px',
  overflow: 'hidden',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(148, 163, 184, 0.16)'
      : '1px solid rgba(148, 163, 184, 0.25)',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(3, 7, 18, 0.6) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 250, 252, 0.85) 100%)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(0, 0, 0, 0.3)'
      : '0 8px 24px rgba(15, 23, 42, 0.08)',
}));

const ComparisonTable = styled('table')(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  '& caption': {
    textAlign: 'left',
    padding: '1rem 1.25rem 0',
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  '& th, & td': {
    padding: '0.85rem 1.25rem',
    textAlign: 'left',
    fontSize: '0.85rem',
    borderBottom:
      theme.palette.mode === 'dark'
        ? '1px solid rgba(148, 163, 184, 0.1)'
        : '1px solid rgba(148, 163, 184, 0.18)',
  },
  '& thead th': {
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.palette.text.secondary,
    borderBottom:
      theme.palette.mode === 'dark'
        ? '1px solid rgba(148, 163, 184, 0.2)'
        : '1px solid rgba(148, 163, 184, 0.3)',
  },
  '& th[scope="row"]': {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  '& tbody tr:last-child th, & tbody tr:last-child td': {
    borderBottom: 'none',
  },
  '& .col-kalpa': {
    background:
      theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.07)' : 'rgba(139, 92, 246, 0.05)',
  },
  '& thead .col-kalpa': {
    color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
  },
  '& .cell-value': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  '& .cell-yes': {
    color: theme.palette.mode === 'dark' ? '#4ade80' : '#15803d',
  },
  '& .cell-no': {
    color: theme.palette.text.secondary,
  },
  '& .migration-row td': {
    fontWeight: 600,
    color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
    background:
      theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.03)',
  },
  [theme.breakpoints.down('sm')]: {
    '& th, & td': {
      padding: '0.7rem 0.75rem',
      fontSize: '0.78rem',
    },
  },
}));

// ─── FAQ ──────────────────────────────────────────────────────────────────────
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
    title: 'One-click installs',
    description: 'Install and update addons instantly, straight from ESOUI.',
  },
  {
    title: 'Dependency resolution',
    description: 'Required libraries, including transitive ones, are resolved automatically.',
  },
  {
    title: 'Addon profiles',
    description: 'Save addon loadouts and switch them per character or role.',
  },
  {
    title: 'Pack Hub',
    description: 'Share and discover addon collections that install in one click.',
    linkTo: '/pack-hub',
    linkLabel: 'Browse Pack Hub',
  },
  {
    title: 'SavedVariables backup',
    description: 'Full and per-character backups, with a safety snapshot before every restore.',
  },
  {
    title: 'Minion migration',
    description: 'One-click import brings your existing Minion library over.',
  },
  {
    title: 'Protected edits',
    description:
      'Local file changes survive updates. Conflicts get a per-file diff, and you choose.',
  },
  {
    title: 'Multi-instance support',
    description: 'Detects native and Steam installs across NA, EU, and PTS.',
  },
];

const COMPARISON_ROWS: { feature: string; kalpa: React.ReactNode; minion: React.ReactNode }[] = [
  { feature: 'Install size', kalpa: '15 MB', minion: '~200 MB+ with Java' },
  { feature: 'Runtime', kalpa: 'Native (Rust + Tauri)', minion: 'Java' },
  {
    feature: 'Dependency resolution',
    kalpa: 'yes',
    minion: 'no',
  },
  { feature: 'Addon profiles', kalpa: 'yes', minion: 'no' },
  { feature: 'Pack sharing', kalpa: 'yes', minion: 'no' },
  { feature: 'SavedVariables backup', kalpa: 'yes', minion: 'no' },
];

const FAQS: { question: string; answer: string; linkTo?: string; linkLabel?: string }[] = [
  {
    question: 'Is Kalpa free?',
    answer:
      'Yes. Kalpa is free and open source. The full source code is public on GitHub, and there are no ads, subscriptions, or feature paywalls.',
  },
  {
    question: 'Is Kalpa safe?',
    answer:
      "Kalpa's source code is public and auditable on GitHub, releases are signed and delivered through GitHub, and addon downloads are restricted to ESOUI's official hosts. There is no bundled adware or tracking.",
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
      "Pack Hub is Kalpa's built-in community hub where players publish and discover addon collections called packs. A pack installs a whole curated addon list in one click, and you can browse community packs here on this site.",
    linkTo: '/pack-hub',
    linkLabel: 'Open Pack Hub',
  },
  {
    question: 'Does Kalpa run on Mac or Linux?',
    answer:
      'Kalpa is stable and fully supported on Windows 10 and 11. Beta builds for macOS (10.15+, Intel and Apple Silicon) and Linux (AppImage, .deb, and .rpm) are available from the same GitHub releases page, though they are newer and less tested than the Windows version.',
  },
];

const MOCK_ADDONS = [
  { name: 'Dressing Room Reborn', version: 'v3.8.1', status: 'Updated' },
  { name: 'Combat Metrics', version: 'v2.5.0', status: 'Update' },
  { name: 'Azurah - Interface Enhanced', version: 'v4.1.2', status: 'Updated' },
  { name: 'Inventory Insight', version: 'v1.9.4', status: 'Updated' },
  { name: 'RaidNotifier', version: 'v3.2.1', status: 'Update' },
  { name: 'Srendarr - Aura Tracker', version: 'v2.7.3', status: 'Updated' },
  { name: 'Beam Me Up', version: 'v1.4.0', status: 'Updated' },
  { name: 'Harvest Map', version: 'v5.1.6', status: 'Update' },
] as const;

// ─── Structured data ──────────────────────────────────────────────────────────
const softwareApplicationLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Kalpa',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Windows',
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
                label="Open Source · Free Forever"
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
                The modern addon manager for The Elder Scrolls Online
              </Typography>
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.95rem', sm: '1rem' },
                  lineHeight: 1.7,
                  fontWeight: 300,
                  mb: 3,
                  maxWidth: '480px',
                  mx: { xs: 'auto', md: 0 },
                }}
              >
                Kalpa is a fast, open-source ESO addon manager with one-click installs and automatic
                dependency resolution. A lightweight alternative to Minion built with Rust and
                Tauri. Just 15 MB, with no Java runtime required.
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', md: 'flex-start' },
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
                  justifyContent: { xs: 'center', md: 'flex-start' },
                }}
              >
                {['15 MB', 'No Java', 'Open source', 'Minion import'].map((chip) => (
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

            {/* Mock desktop app window */}
            <AppWindow aria-hidden="true">
              <WindowTitleBar>
                <Box sx={{ display: 'flex', gap: '6px', mr: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                </Box>
                <Typography
                  sx={(theme: Theme) => ({
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    color:
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                    letterSpacing: '0.02em',
                    flex: 1,
                    textAlign: 'center',
                    mr: '36px',
                  })}
                >
                  Kalpa Addon Manager
                </Typography>
              </WindowTitleBar>

              {/* Search field */}
              <Box
                sx={(theme: Theme) => ({
                  mx: '0.75rem',
                  mt: '0.6rem',
                  mb: '0.4rem',
                  px: 1,
                  py: 0.5,
                  borderRadius: '6px',
                  background:
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border:
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(255,255,255,0.06)'
                      : '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                })}
              >
                <Box
                  sx={(theme: Theme) => ({
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    border: `1.5px solid ${
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
                    }`,
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      right: -4,
                      bottom: -3,
                      width: 4,
                      height: 1.5,
                      borderRadius: 1,
                      background:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.25)'
                          : 'rgba(0,0,0,0.25)',
                      transform: 'rotate(45deg)',
                    },
                  })}
                />
                <Typography
                  sx={(theme: Theme) => ({
                    fontSize: '0.72rem',
                    color:
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                    fontWeight: 400,
                  })}
                >
                  Search addons...
                </Typography>
              </Box>

              {/* Mock addon list */}
              <Box sx={{ py: 0.25 }}>
                {MOCK_ADDONS.map((addon) => (
                  <WindowAddonRow key={addon.name}>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '5px',
                          background:
                            'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.1))',
                          border: '1px solid rgba(139, 92, 246, 0.15)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '2px',
                            border: '1.5px solid rgba(167, 139, 250, 0.7)',
                            position: 'relative',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              top: -4,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 5,
                              height: 3,
                              borderRadius: '2px 2px 0 0',
                              border: '1.5px solid rgba(167, 139, 250, 0.7)',
                              borderBottom: 'none',
                            },
                          }}
                        />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'text.primary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {addon.name}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.62rem',
                            color: 'text.secondary',
                            opacity: 0.6,
                          }}
                        >
                          {addon.version}
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        px: 0.8,
                        py: 0.25,
                        borderRadius: '4px',
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        flexShrink: 0,
                        ...(addon.status === 'Update'
                          ? {
                              background:
                                'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.1))',
                              color: '#a78bfa',
                              border: '1px solid rgba(139, 92, 246, 0.2)',
                            }
                          : {
                              background: 'rgba(34, 197, 94, 0.08)',
                              color: 'rgba(34, 197, 94, 0.7)',
                              border: '1px solid rgba(34, 197, 94, 0.12)',
                            }),
                      }}
                    >
                      {addon.status}
                    </Box>
                  </WindowAddonRow>
                ))}
              </Box>

              {/* Status bar */}
              <Box
                sx={(theme: Theme) => ({
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: '1rem',
                  py: '0.45rem',
                  borderTop:
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(255,255,255,0.04)'
                      : '1px solid rgba(0,0,0,0.04)',
                })}
              >
                <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', opacity: 0.5 }}>
                  8 addons installed
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#22c55e',
                      boxShadow: '0 0 4px rgba(34, 197, 94, 0.4)',
                    }}
                  />
                  <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', opacity: 0.5 }}>
                    All synced
                  </Typography>
                </Box>
              </Box>
            </AppWindow>
          </HeroContent>
        </HeroSection>
      </FullBleed>

      {/* ─── Feature grid ─── */}
      <Box
        component="section"
        aria-labelledby="kalpa-features-heading"
        sx={{ py: { xs: 6, md: 8 } }}
      >
        <Typography component="h2" id="kalpa-features-heading" sx={sectionHeadingSx}>
          Everything your addons need
        </Typography>
        <Typography
          sx={{ color: 'text.secondary', fontWeight: 300, maxWidth: '560px', lineHeight: 1.7 }}
        >
          Install, update, back up, and share your addons, all in one native app.
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
        sx={{ pb: { xs: 6, md: 8 } }}
      >
        <Typography component="h2" id="kalpa-comparison-heading" sx={sectionHeadingSx}>
          Switching from Minion?
        </Typography>
        <Typography
          sx={{ color: 'text.secondary', fontWeight: 300, maxWidth: '560px', lineHeight: 1.7 }}
        >
          Kalpa is a drop-in replacement. Here is how the two compare.
        </Typography>
        <ComparisonCard>
          <ComparisonTable>
            <caption>Feature comparison between Kalpa and Minion addon managers</caption>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col" className="col-kalpa">
                  Kalpa
                </th>
                <th scope="col">Minion</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  <td className="col-kalpa">
                    {row.kalpa === 'yes' ? (
                      <span className="cell-value cell-yes">
                        <CheckIcon fontSize="small" aria-hidden="true" />
                        Yes
                      </span>
                    ) : (
                      <span className="cell-value">{row.kalpa}</span>
                    )}
                  </td>
                  <td>
                    {row.minion === 'no' ? (
                      <span className="cell-value cell-no">
                        <span aria-hidden="true">·</span>
                        No
                      </span>
                    ) : (
                      <span className="cell-value cell-no">{row.minion}</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="migration-row">
                <th scope="row">Migration</th>
                <td colSpan={2}>Import your Minion library in one click</td>
              </tr>
            </tbody>
          </ComparisonTable>
        </ComparisonCard>
      </Box>

      {/* ─── FAQ ─── */}
      <Box component="section" aria-labelledby="kalpa-faq-heading" sx={{ pb: { xs: 6, md: 8 } }}>
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
              Ready to leave Minion behind?
            </Typography>
            <Typography
              sx={{
                color: 'text.secondary',
                fontWeight: 300,
                lineHeight: 1.7,
                mb: 3.5,
              }}
            >
              Download Kalpa, import your existing library in one click, and never wait on a Java
              updater again.
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
