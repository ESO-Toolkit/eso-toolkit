import {
  Box,
  Button,
  Container,
  GlobalStyles,
  Link,
  Typography,
  CircularProgress,
} from '@mui/material';
import { styled, Theme } from '@mui/material/styles';
import React, { useState, JSX, useEffect, useRef } from 'react';

// ─── 2026 CSS: @property animated gradients + scroll-driven animations ──────
const showcaseGlobalStyles = (
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

    @keyframes dividerShimmer {
      0% { --divider-pos: 20%; --glow-opacity: 0.3; }
      50% { --divider-pos: 80%; --glow-opacity: 0.6; }
      100% { --divider-pos: 20%; --glow-opacity: 0.3; }
    }

    @keyframes sectionReveal {
      from {
        opacity: 0;
        transform: translateY(40px);
        filter: blur(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
      }
    }

    @keyframes panelParallax {
      from { transform: translateY(30px) rotateY(var(--panel-ry, -2deg)) rotateX(var(--panel-rx, 1deg)); }
      to { transform: translateY(-30px) rotateY(var(--panel-ry, -2deg)) rotateX(var(--panel-rx, 1deg)); }
    }

    @keyframes featureReveal {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Spring easing function — slight overshoot for bouncy feel */
    :root {
      --spring: linear(0, 0.01, 0.04 1.7%, 0.16 3.3%, 0.56 6.9%, 0.72, 0.87 11.4%, 0.97 13.5%, 1.04 16%, 1.07 18.5%, 1.08 21.2%, 1.05 27.5%, 1.02 33%, 1 45%, 0.99 55%, 1);
    }
  `}
  />
);

import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import { useAuth } from '../features/auth/AuthContext';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';

import { AuthenticatedLandingSection } from './AuthenticatedLandingSection';
import { Footer } from './Footer';
import { UnauthenticatedLandingSection } from './UnauthenticatedLandingSection';

// Kalpa desktop app icon
const KalpaIcon = ({ size }: { size: string }): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <rect x="2" y="3" width="20" height="18" rx="3" fill="currentColor" opacity=".2" />
    <rect
      x="2"
      y="3"
      width="20"
      height="18"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <path d="M2 7h20" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="5" cy="5" r=".75" fill="currentColor" />
    <circle cx="7.5" cy="5" r=".75" fill="currentColor" />
    <circle cx="10" cy="5" r=".75" fill="currentColor" />
    <path
      d="M7 12l3 3-3 3M12 18h5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// In-game addon icon (puzzle piece)
const AddonIcon = ({ size }: { size: string }): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M20.5 11H19V7a2 2 0 00-2-2h-4V3.5a2.5 2.5 0 00-5 0V5H4a2 2 0 00-2 2v3.8h1.5a2.5 2.5 0 010 5H2V19a2 2 0 002 2h3.8v-1.5a2.5 2.5 0 015 0V21H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 000-5z"
      fill="currentColor"
      opacity=".2"
    />
    <path
      d="M20.5 11H19V7a2 2 0 00-2-2h-4V3.5a2.5 2.5 0 00-5 0V5H4a2 2 0 00-2 2v3.8h1.5a2.5 2.5 0 010 5H2V19a2 2 0 002 2h3.8v-1.5a2.5 2.5 0 015 0V21H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 000-5z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

// Import icon components directly
const CalculatorIcon = ({ size }: { size: string }): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <g fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4 18.105V3.895C4 2.848 4.866 2 5.933 2h10.634c1.067 0 1.933.848 1.933 1.895v14.21c0 1.047-.866 1.895-1.933 1.895H5.933C4.866 20 4 19.152 4 18.105Z"
        clipRule="evenodd"
        opacity=".2"
      />
      <path
        fillRule="evenodd"
        d="M2.5 3v14A2.5 2.5 0 0 0 5 19.5h10a2.5 2.5 0 0 0 2.5-2.5V3A2.5 2.5 0 0 0 15 .5H5A2.5 2.5 0 0 0 2.5 3ZM5 18.5A1.5 1.5 0 0 1 3.5 17V3A1.5 1.5 0 0 1 5 1.5h10A1.5 1.5 0 0 1 16.5 3v14a1.5 1.5 0 0 1-1.5 1.5H5Z"
        clipRule="evenodd"
      />
      <path d="M5 7.5v-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5Zm7 8.2v-4.9a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 .8.8v4.9a.8.8 0 0 1-.8.8h-1.4a.8.8 0 0 1-.8-.8ZM5 12v-1.5a.5.5 0 0 1 .5-.5H7a.5.5 0 0 1 .5.5V12a.5.5 0 0 1-.5.5H5.5A.5.5 0 0 1 5 12Zm3.5 0v-1.5A.5.5 0 0 1 9 10h1.5a.5.5 0 0 1 .5.5V12a.5.5 0 0 1-.5.5H9a.5.5 0 0 1-.5-.5ZM5 16v-1.5a.5.5 0 0 1 .5-.5H7a.5.5 0 0 1 .5.5V16a.5.5 0 0 1-.5.5H5.5A.5.5 0 0 1 5 16Zm3.5 0v-1.5A.5.5 0 0 1 9 14h1.5a.5.5 0 0 1 .5.5V16a.5.5 0 0 1-.5.5H9a.5.5 0 0 1-.5-.5Z" />
    </g>
  </svg>
);

const CvIcon = ({ size }: { size: string }): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 20 20">
    <g fill="none">
      <path
        fill="currentColor"
        d="M6.5 2h6.685a1.5 1.5 0 0 1 1.106.486l4.314 4.702A1.5 1.5 0 0 1 19 8.202V18.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5v-15A1.5 1.5 0 0 1 6.5 2Z"
        opacity=".2"
      />
      <path
        fill="currentColor"
        d="M6.5 12.5a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7Zm0 2.5a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7Z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M11.185 1H4.5A1.5 1.5 0 0 0 3 2.5v15A1.5 1.5 0 0 0 4.5 19h11a1.5 1.5 0 0 0 1.5-1.5V7.202a1.5 1.5 0 0 0-.395-1.014l-4.314-4.702A1.5 1.5 0 0 0 11.185 1ZM4 2.5a.5.5 0 0 1 .5-.5h6.685a.5.5 0 0 1 .369.162l4.314 4.702a.5.5 0 0 1 .132.338V17.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-15Z"
        clipRule="evenodd"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.5 2.1v4.7h4.7"
      />
      <path
        fill="currentColor"
        d="M8.134 6.133a1.067 1.067 0 1 0 0-2.133a1.067 1.067 0 0 0 0 2.133Z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.266 8.444c0-1.134-.955-1.955-2.133-1.955S6 7.309 6 8.444v.534a.356.356 0 0 0 .356.355h3.555a.356.356 0 0 0 .355-.355v-.534Z"
        clipRule="evenodd"
      />
    </g>
  </svg>
);

const FileLoopIcon = ({ size }: { size: string }): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 20 20">
    <g fill="currentColor">
      <g opacity=".2">
        <path d="M12.143 4h-3.55a1 1 0 0 0-1 1v2l.448 8.056a1 1 0 0 0 .998.944h7.554a1 1 0 0 0 1-1V8.21a.5.5 0 0 0-.15-.357l-3.804-3.71a.5.5 0 0 0-.35-.143h-1.146Z" />
        <path
          fillRule="evenodd"
          d="M6.593 5a2 2 0 0 1 2-2h4.697a1.5 1.5 0 0 1 1.047.426l3.804 3.711c.289.282.452.67.452 1.074V15a2 2 0 0 1-2 2H9.04a2 2 0 0 1-1.997-1.89l-.449-8.082V5Zm2 0v1.972L9.04 15h7.554V8.421L13.086 5H8.593Z"
          clipRule="evenodd"
        />
        <path d="M11.66 13.693c-.82 1.43-2.851 1.806-4.537.84c-1.686-.967-2.389-2.91-1.57-4.34c.82-1.43 2.851-1.805 4.538-.839c1.686.967 2.389 2.91 1.569 4.34Z" />
        <path
          fillRule="evenodd"
          d="M9.593 10.222c-1.346-.772-2.7-.353-3.172.469c-.471.822-.148 2.202 1.199 2.974c1.347.772 2.701.353 3.172-.469c.472-.822.148-2.202-1.199-2.974Zm-4.907-.526c1.168-2.037 3.876-2.37 5.902-1.21c2.026 1.162 3.107 3.667 1.94 5.704c-.999 1.743-3.124 2.239-4.985 1.62l-1.622 2.831a1 1 0 0 1-1.735-.994l1.622-2.831c-1.475-1.293-2.12-3.377-1.122-5.12Z"
          clipRule="evenodd"
        />
      </g>
      <path
        fillRule="evenodd"
        d="M5.5 4a2 2 0 0 1 2-2h5.1a.5.5 0 0 1 .35.144l4.4 4.333a.5.5 0 0 1 .15.356V14a2 2 0 0 1-2 2h-9a.5.5 0 0 1 0-1h9a1 1 0 0 0 1-1V7.333h-2.9a1.5 1.5 0 0 1-1.5-1.5V3H7.5a1 1 0 0 0-1 1v2.5a.5.5 0 0 1-1 0V4Zm7.6-.306l2.68 2.64H13.6a.5.5 0 0 1-.5-.5v-2.14Z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M7.998 8.628a2.291 2.291 0 1 0-2.15 4.047a2.291 2.291 0 0 0 2.15-4.047Zm-3.981.48a3.291 3.291 0 1 1 1.82 4.652l-1.61 3.03a.5.5 0 1 1-.883-.47l1.61-3.03a3.292 3.292 0 0 1-.937-4.183Z"
        clipRule="evenodd"
      />
    </g>
  </svg>
);

const PeopleIcon = ({ size }: { size: string }): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 20 20">
    <g fill="currentColor">
      <g opacity=".2">
        <path d="M9.75 7.75a3 3 0 1 1-6 0a3 3 0 0 1 6 0Z" />
        <path
          fillRule="evenodd"
          d="M6.75 8.75a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm0 2a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M6.8 11.5A1.5 1.5 0 0 0 5.3 13v1.5a1 1 0 0 1-2 0V13a3.5 3.5 0 0 1 7 0v.5a1 1 0 1 1-2 0V13a1.5 1.5 0 0 0-1.5-1.5Z"
          clipRule="evenodd"
        />
        <path d="M12.75 7.75a3 3 0 1 0 6 0a3 3 0 0 0-6 0Z" />
        <path
          fillRule="evenodd"
          d="M15.75 8.75a1 1 0 1 1 0-2a1 1 0 0 1 0 2Zm0 2a3 3 0 1 1 0-6a3 3 0 0 1 0 6Z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M15.7 11.5a1.5 1.5 0 0 1 1.5 1.5v1.5a1 1 0 1 0 2 0V13a3.5 3.5 0 0 0-7 0v.5a1 1 0 1 0 2 0V13a1.5 1.5 0 0 1 1.5-1.5Z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M11.3 14.25a1.5 1.5 0 0 0-1.5 1.5v1.5a1 1 0 0 1-2 0v-1.5a3.5 3.5 0 0 1 7 0v1.5a1 1 0 1 1-2 0v-1.5a1.5 1.5 0 0 0-1.5-1.5Z"
          clipRule="evenodd"
        />
        <path d="M14.25 10.5a3 3 0 1 1-6 0a3 3 0 0 1 6 0Z" />
        <path
          fillRule="evenodd"
          d="M11.25 11.5a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm0 2a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z"
          clipRule="evenodd"
        />
        <path d="M4.25 11.5h5v4h-5v-4Zm9 0h5v4h-5v-4Z" />
        <path d="M9.25 13.5h4l.5 4.75h-5l.5-4.75Z" />
      </g>
      <path
        fillRule="evenodd"
        d="M5 9a2 2 0 1 0 0-4a2 2 0 0 0 0 4Zm0 1a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M3.854 8.896a.5.5 0 0 1 0 .708l-.338.337A3.47 3.47 0 0 0 2.5 12.394v1.856a.5.5 0 1 1-1 0v-1.856a4.47 4.47 0 0 1 1.309-3.16l.337-.338a.5.5 0 0 1 .708 0Zm11.792-.3a.5.5 0 0 0 0 .708l.338.337A3.469 3.469 0 0 1 17 12.094v2.156a.5.5 0 0 0 1 0v-2.156a4.47 4.47 0 0 0-1.309-3.16l-.337-.338a.5.5 0 0 0-.708 0Z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M14 9a2 2 0 1 1 0-4a2 2 0 0 1 0 4Zm0 1a3 3 0 1 1 0-6a3 3 0 0 1 0 6Zm-4.5 3.25a2.5 2.5 0 0 0-2.5 2.5v1.3a.5.5 0 0 1-1 0v-1.3a3.5 3.5 0 0 1 7 0v1.3a.5.5 0 1 1-1 0v-1.3a2.5 2.5 0 0 0-2.5-2.5Z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M9.5 11.75a2 2 0 1 0 0-4a2 2 0 0 0 0 4Zm0 1a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z"
        clipRule="evenodd"
      />
    </g>
  </svg>
);

// Styled components using your existing design
const LandingContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : 'transparent',
  position: 'relative',
  overflowX: 'hidden',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const HeroSection = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'showAnimations',
})<{ showAnimations?: boolean }>(({ theme, showAnimations = false }) => ({
  minHeight: '80vh',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '0rem 2rem 4rem',
  position: 'relative',
  paddingTop: '6rem',
  overflow: 'hidden',
  width: '100%',
  maxWidth: '100vw',
  [theme.breakpoints.down('md')]: {
    minHeight: '70vh',
    padding: '2rem 1rem 3rem',
    paddingTop: '3rem',
  },
  [theme.breakpoints.down('sm')]: {
    minHeight: '60vh',
    padding: '0.75rem 0.75rem 2rem',
    alignItems: 'flex-start',
    paddingTop: '4rem',
  },
  [theme.breakpoints.down(360)]: {
    padding: '0.5rem 0.5rem 1.5rem',
    paddingTop: '3rem',
  },
  ...(showAnimations && {
    '&::before': {
      content: '""',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background:
        'radial-gradient(ellipse 120% 80% at 50% 20%, rgba(56, 189, 248, 0.04) 0%, transparent 60%)',
      pointerEvents: 'none',
      zIndex: -1,
    },
  }),
  '@keyframes rotate': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
}));

const HeroContent = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  zIndex: 1,
  width: '100%',
  maxWidth: '100%',
  margin: '0 auto',
  paddingInline: '0',
  overflow: 'visible',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  [theme.breakpoints.down('md')]: {
    paddingInline: '0',
  },
  [theme.breakpoints.down('sm')]: {
    paddingInline: '0',
  },
}));

const HeroTitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'showAnimations',
})<{ showAnimations?: boolean }>(({ theme, showAnimations = false }) => ({
  fontWeight: 900,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #fff 0%, #38bdf8 50%, #00e1ff 100%)'
      : 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #334155 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  letterSpacing: '-0.02em',
  lineHeight: 1.5,
  // Reduce complex shadows and animations during initial load
  textShadow: showAnimations
    ? theme.palette.mode === 'dark'
      ? `
        0 0 20px rgba(56, 189, 248, 0.5),
        0 0 40px rgba(56, 189, 248, 0.3),
        0 0 60px rgba(0, 225, 255, 0.2),
        0 4px 8px rgba(0, 0, 0, 0.3),
        0 8px 16px rgba(0, 0, 0, 0.2),
        0 16px 32px rgba(0, 0, 0, 0.1)
      `
      : '0 1px 2px rgba(15, 23, 42, 0.1), 0 2px 4px rgba(15, 23, 42, 0.05)'
    : theme.palette.mode === 'dark'
      ? '0 2px 4px rgba(0, 0, 0, 0.3)'
      : '0 1px 2px rgba(15, 23, 42, 0.1)',
  animation: showAnimations ? 'shimmer 3s ease-in-out infinite' : 'none',
  '@media (max-width: 480px) and (prefers-reduced-motion: reduce)': {
    animation: 'none',
    textShadow:
      theme.palette.mode === 'dark'
        ? '0 2px 4px rgba(0, 0, 0, 0.3)'
        : '0 1px 2px rgba(15, 23, 42, 0.1)',
  },
  margin: '0 auto 2rem auto',
  textAlign: 'center',
  width: '100%',
  maxWidth: '100%',
  padding: '0',
  paddingBottom: '12px',
  fontSize: 'clamp(2rem, 6vw, 4.5rem)',
  overflow: 'visible',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'auto',
  minHeight: 'fit-content',
  [theme.breakpoints.up('xl')]: {
    fontSize: 'clamp(2.5rem, 5vw, 5.1rem)',
  },
  [theme.breakpoints.down('lg')]: {
    fontSize: 'clamp(2.2rem, 6vw, 4rem)',
  },
  [theme.breakpoints.down('md')]: {
    fontSize: 'clamp(2.8rem, 5vw, 3.5rem)',
    lineHeight: 1.5,
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: 'clamp(2.5rem, 6vw, 2.8rem)',
    lineHeight: 1.5,
    marginBottom: '1.5rem',
  },
  [theme.breakpoints.down(480)]: {
    fontSize: 'clamp(2.2rem, 7vw, 2.5rem)',
    lineHeight: 1.5,
  },
  '@keyframes shimmer': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.85 },
  },
  '& .light-text': {
    fontFamily: 'Inter, sans-serif !important',
    fontWeight: '100 !important',
    background:
      theme.palette.mode === 'dark'
        ? 'white !important'
        : 'linear-gradient(135deg, #475569 0%, #64748b 100%) !important',
    WebkitBackgroundClip: 'text !important',
    WebkitTextFillColor: 'transparent !important',
    backgroundClip: 'text !important',
    display: 'block',
    width: '100%',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'visible',
  },
  '& .gradient-text': {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'visible',
  },
  '& .highlight-text': {
    position: 'relative',
    display: 'inline-block',
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #fff 0%, #38bdf8 50%, #00e1ff 100%)'
        : 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #334155 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: '-2px',
      left: '37%',
      transform: 'translateX(-50%)',
      width: '80%',
      height: '4px',
      background: 'linear-gradient(90deg, transparent, #38bdf8, #00e1ff, transparent)',
      borderRadius: '2px',
      animation: 'glow 2s ease-in-out infinite alternate',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      bottom: '-6px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '80%',
      height: '8px',
      background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.3) 0%, transparent 70%)',
      borderRadius: '50%',
      animation: 'pulse-glow 2s ease-in-out infinite alternate',
    },
  },
  '@keyframes glow': {
    '0%': { opacity: 0.6, transform: 'translateX(-50%) scaleX(0.8)' },
    '100%': { opacity: 1, transform: 'translateX(-50%) scaleX(1)' },
  },
  '@keyframes pulse-glow': {
    '0%': { opacity: 0.3, transform: 'translateX(-50%) scaleX(0.9)' },
    '100%': { opacity: 0.6, transform: 'translateX(-50%) scaleX(1.1)' },
  },
}));

const HeroSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(1.1rem,2vw,1.4rem)',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(51, 65, 85, 0.8)',
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(6),
  fontWeight: 300,
  lineHeight: 1.7,
  maxWidth: '800px',
  margin: '24px auto 48px auto',
  [theme.breakpoints.down('md')]: {
    fontSize: '1.25rem',
    maxWidth: '700px',
    margin: '20px auto 40px auto',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: 'clamp(1.1rem,2vw,1.4rem)',
    minWidth: '100%',
    margin: '16px auto 32px auto',
    lineHeight: 1.6,
  },
  [theme.breakpoints.down(480)]: {
    fontSize: '1.1rem',
    margin: '12px auto 24px auto',
  },
}));

export const LogInputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'stretch',
  gap: 0,
  marginBottom: '0rem',
  padding: 0,
  background: 'transparent !important',
  backgroundImage: 'none !important',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.2)'
      : '1px solid rgba(30, 41, 59, 0.15)',
  borderRadius: '16px',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      : '0 10px 25px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'visible',
  position: 'relative',
  maxWidth: '600px',
  margin: '0 auto',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.6), transparent)'
        : 'linear-gradient(90deg, transparent, rgba(30, 41, 59, 0.3), transparent)',
  },
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        : '0 20px 40px rgba(15, 23, 42, 0.12), 0 0 20px rgba(30, 41, 59, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    borderColor:
      theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(30, 41, 59, 0.25)',
  },
  [theme.breakpoints.down('md')]: {
    borderRadius: '12px',
  },
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    margin: '1rem auto 2.5rem auto',
    alignItems: 'stretch',
    minWidth: '100%',
    maxWidth: '100%',
    width: '100%',
    borderRadius: '8px',
    '&:hover': {
      transform: 'none',
    },
  },
  [theme.breakpoints.down(480)]: {
    minWidth: '100%',
    maxWidth: '100%',
    width: '100%',
    margin: '1rem 0 1.5rem 0',
  },
}));

const CommunitySection = styled(Box)(({ theme }) => ({
  padding: '6rem 0 4rem',
  position: 'relative',
  overflow: 'hidden',
  // Dot grid pattern background
  backgroundImage:
    theme.palette.mode === 'dark'
      ? 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)'
      : 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
  // Animated gradient orbs
  '&::before': {
    content: '""',
    position: 'absolute',
    width: '800px',
    height: '800px',
    borderRadius: '50%',
    top: '-300px',
    right: '-300px',
    background:
      theme.palette.mode === 'dark'
        ? 'radial-gradient(circle, rgba(56, 189, 248, 0.07) 0%, transparent 60%)'
        : 'radial-gradient(circle, rgba(56, 189, 248, 0.05) 0%, transparent 60%)',
    animation: 'communityOrb1 16s ease-in-out infinite',
    pointerEvents: 'none',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    width: '700px',
    height: '700px',
    borderRadius: '50%',
    bottom: '-250px',
    left: '-250px',
    background:
      theme.palette.mode === 'dark'
        ? 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 60%)'
        : 'radial-gradient(circle, rgba(139, 92, 246, 0.04) 0%, transparent 60%)',
    animation: 'communityOrb2 20s ease-in-out infinite',
    pointerEvents: 'none',
  },
  '@keyframes communityOrb1': {
    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
    '33%': { transform: 'translate(-60px, 40px) scale(1.15)' },
    '66%': { transform: 'translate(20px, -20px) scale(0.95)' },
  },
  '@keyframes communityOrb2': {
    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
    '33%': { transform: 'translate(40px, -50px) scale(1.1)' },
    '66%': { transform: 'translate(-30px, 30px) scale(1.05)' },
  },
  '@keyframes borderRotate': {
    '0%': { '--border-angle': '0deg' },
    '100%': { '--border-angle': '360deg' },
  },
  '@keyframes pulseGlow': {
    '0%, 100%': { opacity: 0.4 },
    '50%': { opacity: 0.8 },
  },
  [theme.breakpoints.down('md')]: {
    padding: '4rem 0 3rem',
  },
  [theme.breakpoints.down('sm')]: {
    padding: '3rem 0 2rem',
  },
}));

const CommunityGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  // Asymmetric bento: hero card spans left 2/3, card 02 right 1/3, card 03 full bottom
  gridTemplateColumns: '1.6fr 1fr',
  gridTemplateRows: 'auto auto',
  gap: '1rem',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 2rem',
  // Card 01 - tall left
  '& > *:nth-of-type(1)': {
    gridRow: '1 / 2',
    gridColumn: '1 / 2',
  },
  // Card 02 - right
  '& > *:nth-of-type(2)': {
    gridRow: '1 / 2',
    gridColumn: '2 / 3',
  },
  // Card 03 - full bottom
  '& > *:nth-of-type(3)': {
    gridRow: '2 / 3',
    gridColumn: '1 / -1',
  },
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'auto',
    gap: '1rem',
    padding: '0 1rem',
    '& > *:nth-of-type(1), & > *:nth-of-type(2), & > *:nth-of-type(3)': {
      gridRow: 'auto',
      gridColumn: '1',
    },
  },
}));

const CommunityCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'accent',
})<{ accent?: 'blue' | 'purple' | 'emerald' }>(({ theme, accent = 'blue' }) => {
  const isDark = theme.palette.mode === 'dark';
  const accents = {
    blue: {
      primary: isDark ? '#38bdf8' : '#0ea5e9',
      secondary: isDark ? '#3b82f6' : '#2563eb',
      bg: isDark
        ? 'linear-gradient(145deg, rgba(56, 189, 248, 0.06) 0%, rgba(15, 23, 42, 0.4) 40%, rgba(59, 130, 246, 0.03) 100%)'
        : 'linear-gradient(145deg, rgba(56, 189, 248, 0.05) 0%, rgba(255, 255, 255, 0.5) 40%, rgba(59, 130, 246, 0.02) 100%)',
      border: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.08)',
      number: isDark ? 'rgba(56, 189, 248, 0.06)' : 'rgba(56, 189, 248, 0.04)',
    },
    purple: {
      primary: isDark ? '#a78bfa' : '#8b5cf6',
      secondary: isDark ? '#c084fc' : '#a855f7',
      bg: isDark
        ? 'linear-gradient(145deg, rgba(139, 92, 246, 0.06) 0%, rgba(15, 23, 42, 0.4) 40%, rgba(168, 85, 247, 0.03) 100%)'
        : 'linear-gradient(145deg, rgba(139, 92, 246, 0.05) 0%, rgba(255, 255, 255, 0.5) 40%, rgba(168, 85, 247, 0.02) 100%)',
      border: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',
      number: isDark ? 'rgba(139, 92, 246, 0.06)' : 'rgba(139, 92, 246, 0.04)',
    },
    emerald: {
      primary: isDark ? '#34d399' : '#10b981',
      secondary: isDark ? '#6ee7b7' : '#059669',
      bg: isDark
        ? 'linear-gradient(145deg, rgba(52, 211, 153, 0.06) 0%, rgba(15, 23, 42, 0.4) 40%, rgba(16, 185, 129, 0.03) 100%)'
        : 'linear-gradient(145deg, rgba(52, 211, 153, 0.05) 0%, rgba(255, 255, 255, 0.5) 40%, rgba(16, 185, 129, 0.02) 100%)',
      border: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(52, 211, 153, 0.08)',
      number: isDark ? 'rgba(52, 211, 153, 0.06)' : 'rgba(52, 211, 153, 0.04)',
    },
  };
  const a = accents[accent];
  return {
    background: a.bg,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${a.border}`,
    borderRadius: '20px',
    padding: '1.75rem',
    textAlign: 'left',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    // Large editorial number watermark
    '&::before': {
      content: 'attr(data-number)',
      position: 'absolute',
      top: '-0.5rem',
      right: '1rem',
      fontSize: '7.5rem',
      fontWeight: 900,
      lineHeight: 1,
      color: a.number,
      pointerEvents: 'none',
      userSelect: 'none',
      fontFamily: '"Inter", system-ui, sans-serif',
      letterSpacing: '-0.04em',
    },
    // Animated gradient sweep on left border
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '2px',
      height: '100%',
      background: `linear-gradient(180deg, transparent 0%, ${a.primary} 50%, transparent 100%)`,
      opacity: 0,
      transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    '&:hover': {
      transform: 'translateY(-5px)',
      border: `1px solid ${a.primary}22`,
      boxShadow: `0 24px 64px rgba(0, 0, 0, ${isDark ? '0.4' : '0.08'}), 0 0 40px ${a.primary}08`,
      '&::after': {
        opacity: 0.8,
      },
    },
    [theme.breakpoints.down('sm')]: {
      padding: '1.25rem',
      borderRadius: '16px',
      '&::before': {
        fontSize: '4.5rem',
        right: '0.5rem',
      },
    },
  };
});

const CommunityIcon = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'accent',
})<{ accent?: 'blue' | 'purple' | 'emerald' }>(({ theme, accent = 'blue' }) => {
  const colors = {
    blue: {
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.2)',
      shadow: 'rgba(56, 189, 248, 0.25)',
    },
    purple: {
      bg: 'rgba(139, 92, 246, 0.12)',
      border: 'rgba(139, 92, 246, 0.2)',
      shadow: 'rgba(139, 92, 246, 0.25)',
    },
    emerald: {
      bg: 'rgba(52, 211, 153, 0.12)',
      border: 'rgba(52, 211, 153, 0.2)',
      shadow: 'rgba(52, 211, 153, 0.25)',
    },
  };
  const c = colors[accent];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '42px',
    height: '42px',
    marginBottom: '0.75rem',
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: '12px',
    fontSize: '1.2rem',
    boxShadow: `0 0 20px ${c.shadow}`,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    flexShrink: 0,
    [theme.breakpoints.down('sm')]: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      fontSize: '1rem',
    },
  };
});

// Infinite scrolling marquee for tool names
const MarqueeWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100vw',
  marginLeft: 'calc(-50vw + 50%)',
  overflow: 'hidden',
  margin: '2rem calc(-50vw + 50%) 2rem',
  // Fade edges
  maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
  // Top and bottom borders
  borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
  borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
  padding: '1rem 0',
  background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)',
  [theme.breakpoints.down('sm')]: {
    margin: '1.5rem calc(-50vw + 50%) 1.5rem',
    padding: '0.75rem 0',
  },
}));

const MarqueeTrack = styled(Box)(() => ({
  display: 'flex',
  gap: '3rem',
  width: 'max-content',
  animation: 'marqueeScroll 25s linear infinite',
  '&:hover': {
    animationPlayState: 'paused',
  },
  '@keyframes marqueeScroll': {
    '0%': { transform: 'translateX(0)' },
    '100%': { transform: 'translateX(-50%)' },
  },
}));

const MarqueeItem = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  whiteSpace: 'nowrap',
  cursor: 'default',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
  fontSize: '0.82rem',
  fontWeight: 500,
  letterSpacing: '0.02em',
  transition: 'color 0.3s ease',
  '& svg': {
    width: '1rem',
    height: '1rem',
    opacity: 0.5,
    transition: 'opacity 0.3s ease',
  },
  '&:hover': {
    color: theme.palette.mode === 'dark' ? '#38bdf8' : '#0ea5e9',
    '& svg': {
      opacity: 1,
    },
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.75rem',
    gap: '0.4rem',
    '& svg': {
      width: '0.85rem',
      height: '0.85rem',
    },
  },
}));

const _SectionTitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'theme',
})<{ theme?: Theme }>(({ theme: _theme }) => ({
  textAlign: 'center',
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: '1.5rem',
  marginTop: '8rem',
  color: _theme?.palette.text.primary,
  [_theme?.breakpoints.down('md')]: {
    fontSize: '2.2rem',
    marginTop: '6rem',
    marginBottom: '1.25rem',
  },
  [_theme?.breakpoints.down('sm')]: {
    fontSize: '2rem',
    marginTop: '4rem',
    marginBottom: '1rem',
  },
}));

const CommunityTitle = styled(Box)(({ theme }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    textAlign: 'center',
    maxWidth: '720px',
    margin: '0 auto',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.6rem',

    // Headline — single line on desktop, wraps on mobile
    '& .community-headline': {
      lineHeight: 1.15,
      textAlign: 'center',
      whiteSpace: 'nowrap',
      [theme.breakpoints.down('sm')]: {
        whiteSpace: 'normal',
      },
    },

    // Thin weight: "Built by players,"
    '& .community-title-light': {
      fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
      fontWeight: 300,
      letterSpacing: '-0.01em',
      color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
      [theme.breakpoints.down('sm')]: {
        display: 'block',
        fontSize: 'clamp(1.3rem, 5.5vw, 1.8rem)',
      },
    },

    // Bold gradient: "for players."
    '& .community-title-bold': {
      fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      background: isDark
        ? 'linear-gradient(135deg, #38bdf8 0%, #818cf8 40%, #c084fc 70%, #f0abfc 100%)'
        : 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 40%, #a855f7 70%, #d946ef 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      backgroundSize: '200% 200%',
      animation: 'gradientShift 6s ease-in-out infinite',
      filter: isDark ? 'drop-shadow(0 0 30px rgba(129, 140, 248, 0.15))' : 'none',
      [theme.breakpoints.down('sm')]: {
        fontSize: 'clamp(1.3rem, 5.5vw, 1.8rem)',
      },
    },

    // Caption line with side rules
    '& .community-caption': {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontSize: '0.78rem',
      fontWeight: 400,
      letterSpacing: '0.02em',
      color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
      // Side rules
      '&::before, &::after': {
        content: '""',
        width: '2rem',
        height: '1px',
        background: isDark
          ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15))'
          : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1))',
        flexShrink: 0,
      },
      '&::after': {
        background: isDark
          ? 'linear-gradient(90deg, rgba(255,255,255,0.15), transparent)'
          : 'linear-gradient(90deg, rgba(0,0,0,0.1), transparent)',
      },
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.7rem',
        gap: '0.5rem',
        '&::before, &::after': {
          width: '1.25rem',
        },
      },
    },

    '@keyframes gradientShift': {
      '0%, 100%': { backgroundPosition: '0% 50%' },
      '50%': { backgroundPosition: '100% 50%' },
    },
  };
});

const _SectionSubtitle = styled(Typography)(({ theme }) => ({
  textAlign: 'center',
  color: theme.palette.text.secondary,
  marginBottom: '4rem',
  fontSize: '1.2rem',
  lineHeight: 1.6,
  maxWidth: '600px',
  margin: '0 auto 4rem auto',
  [theme.breakpoints.down('md')]: {
    fontSize: '1.1rem',
    marginBottom: '3rem',
    maxWidth: '500px',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '1rem',
    marginBottom: '2.5rem',
    maxWidth: '400px',
    paddingInline: '1rem',
  },
}));

const ToolsSection = styled(Container)(({ theme }) => ({
  padding: '0 2rem 4rem',
  maxWidth: '1200px',
  margin: '0 auto',
  [theme.breakpoints.down('md')]: {
    padding: '0 1rem 3rem',
  },
  [theme.breakpoints.down('sm')]: {
    padding: '0 1rem 2rem',
  },
}));

// ─── Hero → Tools transition bridge ────────────────────────────────────────────
const ToolsBridge = styled(Box)(({ theme }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    position: 'relative',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '4rem 2rem 3rem',
    zIndex: 1,

    [theme.breakpoints.down('md')]: {
      padding: '3rem 1.5rem 2rem',
    },
    [theme.breakpoints.down('sm')]: {
      padding: '2rem 1rem 1.5rem',
    },

    // ── Full-width ruled line with gradient glow ──
    '& .bridge-rule': {
      position: 'relative',
      width: '100%',
      height: '1px',
      background: isDark
        ? 'linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.3) 20%, rgba(129, 140, 248, 0.4) 50%, rgba(192, 132, 252, 0.3) 80%, transparent 100%)'
        : 'linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.2) 20%, rgba(99, 102, 241, 0.3) 50%, rgba(168, 85, 247, 0.2) 80%, transparent 100%)',
      marginBottom: '3rem',

      // Glow bloom behind the line
      '&::before': {
        content: '""',
        position: 'absolute',
        top: '-8px',
        left: '10%',
        right: '10%',
        height: '16px',
        background: isDark
          ? 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.08) 30%, rgba(129, 140, 248, 0.12) 50%, rgba(192, 132, 252, 0.08) 70%, transparent)'
          : 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.05) 30%, rgba(99, 102, 241, 0.08) 50%, transparent)',
        filter: 'blur(6px)',
      },

      // Scanning light dot
      '&::after': {
        content: '""',
        position: 'absolute',
        top: '-3px',
        left: 0,
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: isDark ? '#38bdf8' : '#0ea5e9',
        boxShadow: isDark
          ? '0 0 12px 3px rgba(56, 189, 248, 0.4)'
          : '0 0 10px 2px rgba(14, 165, 233, 0.3)',
        animation: 'scanDot 4s ease-in-out infinite',
      },

      [theme.breakpoints.down('sm')]: {
        marginBottom: '2rem',
      },
    },

    // ── Heading row: number + text + counter ──
    '& .bridge-heading': {
      display: 'flex',
      alignItems: 'baseline',
      gap: '1.25rem',
      justifyContent: 'center',
      flexWrap: 'wrap',

      [theme.breakpoints.down('sm')]: {
        gap: '0.75rem',
      },
    },

    // Main title text
    '& .bridge-title': {
      fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
      background: isDark
        ? 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)'
        : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },

    // Gradient-accented word
    '& .bridge-accent': {
      fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
      background: isDark
        ? 'linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)'
        : 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      backgroundSize: '200% 200%',
      animation: 'gradientShift 6s ease-in-out infinite',
    },

    // Caption below heading
    '& .bridge-caption': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      marginTop: '1rem',
      fontSize: '0.78rem',
      fontWeight: 500,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)',

      '&::before, &::after': {
        content: '""',
        width: '2.5rem',
        height: '1px',
        background: isDark
          ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12))'
          : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.08))',
        flexShrink: 0,
      },
      '&::after': {
        background: isDark
          ? 'linear-gradient(90deg, rgba(255,255,255,0.12), transparent)'
          : 'linear-gradient(90deg, rgba(0,0,0,0.08), transparent)',
      },
    },

    '@keyframes scanDot': {
      '0%, 100%': { left: '0%', opacity: 0 },
      '5%': { opacity: 1 },
      '50%': { left: '100%', opacity: 1 },
      '55%': { opacity: 0 },
      '56%': { left: '0%' },
    },
  };
});

const ToolsGrid = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <Box
      sx={(theme: Theme) => ({
        display: 'grid',
        gap: '1.5rem',
        marginTop: '3rem',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr',
          md: 'repeat(2, 1fr)',
        },
        maxWidth: '900px',
        margin: '0 auto',
        perspective: '1000px',
        [theme.breakpoints.down('sm')]: {
          perspective: 'none',
        },
      })}
    >
      {React.Children.map(children, (child, index) => (
        <Box
          key={index}
          sx={(theme: Theme) => ({
            transformStyle: 'preserve-3d',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform:
              hoveredIndex === null
                ? 'translateZ(0)'
                : hoveredIndex === index
                  ? 'translateZ(40px) translateY(-10px)'
                  : `translateZ(${-20 * Math.abs(index - hoveredIndex)}px) translateY(${-5 * Math.abs(index - hoveredIndex)}px)`,
            opacity: hoveredIndex === null ? 1 : hoveredIndex === index ? 1 : 0.7,
            [theme.breakpoints.down('sm')]: {
              transformStyle: 'flat',
              transform: 'none',
              overflow: 'hidden',
            },
          })}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {child}
        </Box>
      ))}
    </Box>
  );
};

const ToolCard = styled(Box)<{ index?: number }>(({ theme, index = 0 }) => ({
  background: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(12px)',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.1)'
      : '1px solid rgba(30, 41, 59, 0.1)',
  borderRadius: '16px',
  padding: '2rem',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: '320px',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      : '0 8px 32px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
  opacity: 0,
  transform: 'translateY(20px)',
  animation: `cardEntrance 0.5s ease-out ${index * 0.1}s forwards`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.6), transparent)',
    opacity: 0,
    transition: 'opacity 0.4s ease',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      theme.palette.mode === 'dark'
        ? 'radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(56, 189, 248, 0.06), transparent 40%)'
        : 'radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(56, 189, 248, 0.04), transparent 40%)',
    opacity: 0,
    transition: 'opacity 0.4s ease',
    pointerEvents: 'none',
  },
  '&:hover': {
    transform: 'translateY(-12px) scale(1.02)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 60px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        : '0 20px 60px rgba(15, 23, 42, 0.12), 0 0 40px rgba(56, 189, 248, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    '&::before': {
      opacity: 1,
    },
    '&::after': {
      opacity: 1,
    },
  },
  [theme.breakpoints.down('sm')]: {
    padding: '1.5rem',
    minHeight: '280px',
    '&:hover': {
      transform: 'none',
    },
  },
  '@keyframes cardEntrance': {
    '0%': {
      opacity: 0,
      transform: 'translateY(20px) scale(0.98)',
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0) scale(1)',
    },
  },
}));

const ToolIcon = styled(Box)(({ theme }) => ({
  width: '64px',
  height: '64px',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(0, 225, 255, 0.1))'
      : 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(0, 225, 255, 0.05))',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.2)'
      : '1px solid rgba(56, 189, 248, 0.15)',
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2rem',
  marginBottom: '1.5rem',
  color: theme.palette.mode === 'dark' ? '#38bdf8' : '#0ea5e9',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      : '0 4px 20px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  transform: 'translateY(10px)',
  animation: 'iconEntrance 0.6s ease-out 0.2s forwards',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), transparent)'
        : 'linear-gradient(135deg, rgba(56, 189, 248, 0.05), transparent)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  '&:hover': {
    transform: 'scale(1.1) rotate(8deg)',
    '&::before': {
      opacity: 1,
    },
  },
  '@keyframes iconEntrance': {
    '0%': {
      opacity: 0,
      transform: 'translateY(10px) scale(0.8)',
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0) scale(1)',
    },
  },
}));

const ToolFeatures = styled('ul')(({ theme }) => ({
  listStyle: 'none',
  marginBottom: '1.5rem',
  marginTop: 'auto',
  padding: 0,
  '& li': {
    color: theme.palette.text.secondary,
    padding: '0.5rem 0',
    paddingLeft: '1.5rem',
    position: 'relative',
    fontWeight: 500,
    '&::before': {
      content: '"✓"',
      position: 'absolute',
      left: 0,
      color: '#38bdf8',
      fontWeight: 'bold',
    },
  },
}));

const ToolAction = styled(Button)(({ theme }) => ({
  width: '100%',
  padding: '0.875rem 1.5rem',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)'
      : 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '12px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  fontWeight: 600,
  fontSize: '0.95rem',
  textTransform: 'none',
  letterSpacing: '0.5px',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      : '0 4px 20px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
    transition: 'left 0.5s ease',
  },
  '&:hover': {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    transform: 'translateY(-2px)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 8px 30px rgba(0, 0, 0, 0.3), 0 0 30px rgba(56, 189, 248, 0.2)'
        : '0 8px 30px rgba(15, 23, 42, 0.15), 0 0 20px rgba(56, 189, 248, 0.15)',
    '&::before': {
      left: '100%',
    },
  },
  '&:active': {
    transform: 'translateY(0px)',
  },
  '&:disabled': {
    background: theme.palette.mode === 'dark' ? '#374151' : '#9ca3af',
    color: theme.palette.mode === 'dark' ? '#6b7280' : '#ffffff',
    cursor: 'not-allowed',
    opacity: 0.6,
    '&:hover': {
      transform: 'none',
      boxShadow: 'none',
    },
  },
}));

// Shared noise texture overlay (tiny inline SVG)
const noiseOverlay =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")";

// ─── Kalpa Showcase Section ──────────────────────────────────────────────────
const kalpaAurora = {
  '@keyframes kalpaAurora': {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
};

const KalpaSection = styled(Box)(
  ({ theme }) =>
    ({
      padding: '8rem 2rem',
      position: 'relative',
      overflow: 'hidden',
      ...kalpaAurora,
      // Scroll-driven reveal
      animation: 'sectionReveal linear both',
      animationTimeline: 'view()',
      animationRange: 'entry 0% cover 20%',
      // Dot grid pattern layer
      backgroundImage:
        theme.palette.mode === 'dark'
          ? 'radial-gradient(circle, rgba(139, 92, 246, 0.07) 1px, transparent 1px)'
          : 'radial-gradient(circle, rgba(139, 92, 246, 0.04) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
      backgroundPosition: '14px 14px',
      // Aurora gradient overlay + noise
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, transparent 35%, rgba(59, 130, 246, 0.04) 55%, transparent 100%), ${noiseOverlay}`
            : `linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, transparent 35%, rgba(59, 130, 246, 0.02) 55%, transparent 100%), ${noiseOverlay}`,
        backgroundSize: '200% 200%, 256px 256px',
        animation: 'kalpaAurora 15s ease-in-out infinite',
        pointerEvents: 'none',
      },
      // Animated gradient divider — shimmers via @property
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
      [theme.breakpoints.down('md')]: {
        padding: '5rem 1.5rem',
      },
      [theme.breakpoints.down('sm')]: {
        padding: '3.5rem 1rem',
      },
    }) as Record<string, unknown>,
);

const KalpaContent = styled(Box)(({ theme }) => ({
  maxWidth: '1100px',
  margin: '0 auto',
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
  },
}));

const KalpaFeatureList = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginTop: '2rem',
});

const KalpaFeatureRow = styled(Box)<{ delay?: number }>(
  ({ theme, delay: _delay = 0 }) =>
    ({
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem 1rem',
      position: 'relative',
      borderRadius: '10px',
      cursor: 'default',
      background:
        theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.03)' : 'rgba(139, 92, 246, 0.015)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border:
        theme.palette.mode === 'dark'
          ? '1px solid rgba(139, 92, 246, 0.06)'
          : '1px solid rgba(139, 92, 246, 0.04)',
      transition: 'all 0.4s var(--spring, cubic-bezier(0.4, 0, 0.2, 1))',
      // Animated left accent bar
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
          theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.04)',
        borderColor:
          theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
        transform: 'translateX(4px)',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 4px 24px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(139, 92, 246, 0.06)'
            : '0 4px 24px rgba(139, 92, 246, 0.04), inset 0 1px 0 rgba(139, 92, 246, 0.03)',
        '&::before': {
          height: '60%',
        },
        '& .feature-index': {
          color: '#8b5cf6',
          opacity: 1,
          textShadow: '0 0 12px rgba(139, 92, 246, 0.4)',
        },
        '& .feature-title': {
          color: theme.palette.text.primary,
        },
      },
      // Scroll-driven reveal — each row appears as it enters the viewport
      animation: 'featureReveal linear both',
      animationTimeline: 'view()',
      animationRange: 'entry 0% cover 30%',
      '& .feature-index': {
        fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
        fontSize: '0.68rem',
        fontWeight: 500,
        color: theme.palette.text.disabled,
        opacity: 0.5,
        letterSpacing: '0.02em',
        flexShrink: 0,
        width: '1.5rem',
        transition: 'all 0.35s var(--spring, ease)',
      },
      '& .feature-title': {
        fontSize: '0.88rem',
        fontWeight: 600,
        color: theme.palette.text.secondary,
        transition: 'color 0.35s var(--spring, ease)',
        flexShrink: 0,
      },
      '& .feature-desc': {
        fontSize: '0.78rem',
        fontWeight: 300,
        color: theme.palette.text.disabled,
        marginLeft: 'auto',
        textAlign: 'right',
        opacity: 0.7,
        [theme.breakpoints.down('sm')]: {
          display: 'none',
        },
      },
    }) as Record<string, unknown>,
);

// Mock desktop app window with 3D depth + scroll-driven parallax
const KalpaAppWindow = styled(Box)(
  ({ theme }) =>
    ({
      '--panel-ry': '-2deg',
      '--panel-rx': '1deg',
      background:
        theme.palette.mode === 'dark' ? 'rgba(15, 15, 25, 0.95)' : 'rgba(250, 250, 252, 0.98)',
      borderRadius: '14px',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 1,
      transform: 'rotateY(-2deg) rotateX(1deg)',
      transformStyle: 'preserve-3d',
      // Scroll-driven parallax — drifts vertically as section scrolls
      animation: 'panelParallax linear both',
      animationTimeline: 'view()',
      animationRange: 'cover 0% cover 100%',
      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.1), 0 0 60px rgba(139, 92, 246, 0.06)'
          : '0 25px 80px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(139, 92, 246, 0.08), 0 0 60px rgba(139, 92, 246, 0.03)',
      // Spring easing on hover
      transition: 'box-shadow 0.5s ease',
      // Floating glow orb behind — large and visible
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
            ? 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.08) 40%, transparent 65%)'
            : 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 65%)',
        filter: 'blur(50px)',
        zIndex: -1,
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease',
      },
      '&:hover': {
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 40px 100px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.2), 0 0 100px rgba(139, 92, 246, 0.12)'
            : '0 40px 100px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(139, 92, 246, 0.15), 0 0 100px rgba(139, 92, 246, 0.06)',
      },
      [theme.breakpoints.down('md')]: {
        maxWidth: '420px',
        margin: '0 auto',
        animation: 'none',
        transform: 'none',
      },
    }) as Record<string, unknown>,
);

const KalpaWindowTitleBar = styled(Box)(({ theme }) => ({
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

const KalpaAddonRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
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

// ─── ESOTK Addon Showcase Section ────────────────────────────────────────────
const esotkScanline = {
  '@keyframes esotkScanline': {
    '0%': { top: '-4px' },
    '100%': { top: '100%' },
  },
};

const EsotkSection = styled(Box)(
  ({ theme }) =>
    ({
      padding: '8rem 2rem',
      position: 'relative',
      overflow: 'hidden',
      // Scroll-driven reveal
      animation: 'sectionReveal linear both',
      animationTimeline: 'view()',
      animationRange: 'entry 0% cover 20%',
      // Dot grid pattern
      backgroundImage:
        theme.palette.mode === 'dark'
          ? 'radial-gradient(circle, rgba(245, 158, 11, 0.06) 1px, transparent 1px)'
          : 'radial-gradient(circle, rgba(180, 120, 20, 0.035) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
      backgroundPosition: '14px 14px',
      // Animated gradient divider
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, transparent, rgba(245, 158, 11, var(--glow-opacity)) var(--divider-pos), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(180, 120, 20, calc(var(--glow-opacity) * 0.7)) var(--divider-pos), transparent)',
        animation: 'dividerShimmer 6s ease-in-out infinite',
        animationDelay: '-3s',
      },
      // Gradient blobs + noise
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background:
          theme.palette.mode === 'dark'
            ? `radial-gradient(ellipse at 30% 40%, rgba(245, 158, 11, 0.05) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(217, 119, 6, 0.04) 0%, transparent 50%), ${noiseOverlay}`
            : `radial-gradient(ellipse at 30% 40%, rgba(245, 158, 11, 0.025) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(217, 119, 6, 0.02) 0%, transparent 50%), ${noiseOverlay}`,
        backgroundSize: '100% 100%, 100% 100%, 256px 256px',
        pointerEvents: 'none',
        zIndex: 0,
      },
      [theme.breakpoints.down('md')]: {
        padding: '5rem 1.5rem',
      },
      [theme.breakpoints.down('sm')]: {
        padding: '3.5rem 1rem',
      },
    }) as Record<string, unknown>,
);

const EsotkContent = styled(Box)(({ theme }) => ({
  maxWidth: '1100px',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: '0.9fr 1.1fr',
  gap: '3rem',
  alignItems: 'center',
  position: 'relative',
  zIndex: 1,
  perspective: '1200px',
  direction: 'rtl',
  '& > *': { direction: 'ltr' },
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
    gap: '3rem',
    textAlign: 'center',
    direction: 'ltr',
    perspective: 'none',
  },
}));

const EsotkFeatureList = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginTop: '2rem',
});

const EsotkFeatureRow = styled(Box)<{ delay?: number }>(
  ({ theme, delay: _delay = 0 }) =>
    ({
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem 1rem',
      position: 'relative',
      borderRadius: '10px',
      cursor: 'default',
      background:
        theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.02)' : 'rgba(180, 120, 20, 0.01)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border:
        theme.palette.mode === 'dark'
          ? '1px solid rgba(245, 158, 11, 0.05)'
          : '1px solid rgba(180, 120, 20, 0.04)',
      transition: 'all 0.4s var(--spring, cubic-bezier(0.4, 0, 0.2, 1))',
      // Animated left accent bar
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '3px',
        height: '0%',
        borderRadius: '0 3px 3px 0',
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, #fbbf24, #f59e0b, #d97706)'
            : 'linear-gradient(180deg, #b47814, #92610e, #7a510c)',
        transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 0 8px rgba(245, 158, 11, 0.3)'
            : '0 0 8px rgba(180, 120, 20, 0.15)',
      },
      '&:hover': {
        background:
          theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.06)' : 'rgba(180, 120, 20, 0.03)',
        borderColor:
          theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(180, 120, 20, 0.08)',
        transform: 'translateX(4px)',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 4px 24px rgba(245, 158, 11, 0.06), inset 0 1px 0 rgba(245, 158, 11, 0.04)'
            : '0 4px 24px rgba(180, 120, 20, 0.03), inset 0 1px 0 rgba(180, 120, 20, 0.02)',
        '&::before': {
          height: '60%',
        },
        '& .feature-index': {
          color: theme.palette.mode === 'dark' ? '#fbbf24' : '#92610e',
          opacity: 1,
          textShadow:
            theme.palette.mode === 'dark'
              ? '0 0 12px rgba(245, 158, 11, 0.4)'
              : '0 0 12px rgba(180, 120, 20, 0.2)',
        },
        '& .feature-title': {
          color: theme.palette.text.primary,
        },
      },
      // Scroll-driven reveal
      animation: 'featureReveal linear both',
      animationTimeline: 'view()',
      animationRange: 'entry 0% cover 30%',
      '& .feature-index': {
        fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
        fontSize: '0.68rem',
        fontWeight: 500,
        color: theme.palette.text.disabled,
        opacity: 0.5,
        letterSpacing: '0.02em',
        flexShrink: 0,
        width: '1.5rem',
        transition: 'all 0.35s var(--spring, ease)',
      },
      '& .feature-title': {
        fontSize: '0.88rem',
        fontWeight: 600,
        color: theme.palette.text.secondary,
        transition: 'color 0.35s var(--spring, ease)',
        flexShrink: 0,
      },
      '& .feature-desc': {
        fontSize: '0.78rem',
        fontWeight: 300,
        color: theme.palette.text.disabled,
        marginLeft: 'auto',
        textAlign: 'right',
        opacity: 0.7,
        [theme.breakpoints.down('sm')]: {
          display: 'none',
        },
      },
    }) as Record<string, unknown>,
);

// Game-UI styled panel with ornate borders, 3D depth + scroll parallax
const EsotkGamePanel = styled(Box)(
  ({ theme }) =>
    ({
      '--panel-ry': '2deg',
      '--panel-rx': '1deg',
      position: 'relative',
      padding: '4px',
      borderRadius: '4px',
      zIndex: 1,
      transform: 'rotateY(2deg) rotateX(1deg)',
      transformStyle: 'preserve-3d',
      // Scroll-driven parallax
      animation: 'panelParallax linear both',
      animationTimeline: 'view()',
      animationRange: 'cover 0% cover 100%',
      background:
        theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(217, 119, 6, 0.2) 25%, rgba(245, 158, 11, 0.35) 50%, rgba(217, 119, 6, 0.2) 75%, rgba(245, 158, 11, 0.4) 100%)'
          : 'linear-gradient(135deg, rgba(180, 120, 20, 0.35) 0%, rgba(160, 100, 20, 0.15) 25%, rgba(180, 120, 20, 0.3) 50%, rgba(160, 100, 20, 0.15) 75%, rgba(180, 120, 20, 0.35) 100%)',
      transition: 'box-shadow 0.5s ease',
      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 25px 80px rgba(0, 0, 0, 0.4), 0 0 60px rgba(245, 158, 11, 0.04)'
          : '0 25px 80px rgba(15, 23, 42, 0.1), 0 0 60px rgba(180, 120, 20, 0.02)',
      ...esotkScanline,
      // Scanline effect
      '&::before': {
        content: '""',
        position: 'absolute',
        left: '8px',
        right: '8px',
        height: '4px',
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.15), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(180, 120, 20, 0.08), transparent)',
        animation: 'esotkScanline 4s linear infinite',
        pointerEvents: 'none',
        zIndex: 2,
        borderRadius: '2px',
      },
      // Floating glow orb behind — large and visible
      '&::after': {
        content: '""',
        position: 'absolute',
        top: '10%',
        right: '-25%',
        width: '80%',
        height: '80%',
        borderRadius: '50%',
        background:
          theme.palette.mode === 'dark'
            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.07) 40%, transparent 65%)'
            : 'radial-gradient(circle, rgba(180, 120, 20, 0.1) 0%, rgba(160, 100, 20, 0.03) 40%, transparent 65%)',
        filter: 'blur(50px)',
        zIndex: -1,
        pointerEvents: 'none',
      },
      '&:hover': {
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 40px 100px rgba(0, 0, 0, 0.5), 0 0 100px rgba(245, 158, 11, 0.08)'
            : '0 40px 100px rgba(15, 23, 42, 0.14), 0 0 100px rgba(180, 120, 20, 0.04)',
      },
      [theme.breakpoints.down('md')]: {
        maxWidth: '420px',
        margin: '0 auto',
        animation: 'none',
        transform: 'none',
      },
    }) as Record<string, unknown>,
);

const EsotkGamePanelInner = styled(Box)(({ theme }) => ({
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15, 12, 8, 0.97) 0%, rgba(20, 16, 10, 0.95) 100%)'
      : 'linear-gradient(180deg, rgba(255, 252, 245, 0.98) 0%, rgba(250, 245, 235, 0.96) 100%)',
  borderRadius: '2px',
  overflow: 'hidden',
  position: 'relative',
}));

const EsotkPanelTitleBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.6rem 1rem',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)'
      : 'linear-gradient(180deg, rgba(180, 120, 20, 0.08) 0%, rgba(180, 120, 20, 0.02) 100%)',
  borderBottom:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(245, 158, 11, 0.15)'
      : '1px solid rgba(180, 120, 20, 0.1)',
  position: 'relative',
  '&::before, &::after': {
    content: '"◆"',
    position: 'absolute',
    color: theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(180, 120, 20, 0.2)',
    fontSize: '0.55rem',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  '&::before': { left: '0.75rem' },
  '&::after': { right: '0.75rem' },
}));

const EsotkAddonRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.65rem 1rem',
  borderBottom:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(245, 158, 11, 0.06)'
      : '1px solid rgba(180, 120, 20, 0.04)',
  transition: 'background 0.15s ease',
  '&:hover': {
    background:
      theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(180, 120, 20, 0.03)',
  },
  '&:last-child': {
    borderBottom: 'none',
  },
}));

const ParticleContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  zIndex: 1,
  overflow: 'hidden',
  [theme.breakpoints.down('sm')]: {
    display: 'none',
  },
  '@media (max-width: 480px) and (prefers-reduced-motion: reduce)': {
    display: 'none',
  },
}));

const FloatingParticle = styled(Box)<{
  delay?: number;
  duration?: number;
  x?: string;
  y?: string;
  size?: string;
  color?: string;
}>(
  ({ delay = 0, duration = 12, x = '50%', y = '50%', size = '4px', color = '#3b82f6', theme }) => ({
    position: 'absolute',
    left: x,
    top: y,
    width: size,
    height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${color}60, ${color}30, transparent)`,
    boxShadow: `0 0 ${parseInt(size) * 3}px ${color}40`,
    animation: `floatParticle-${delay % 3} ${duration}s ease-in-out ${delay}s infinite`,
    opacity: theme.palette.mode === 'dark' ? 0.7 : 0.5,
    '@keyframes floatParticle-0': {
      '0%': {
        transform: 'translate(0, 0) scale(0.5)',
        opacity: 0,
      },
      '10%': {
        opacity: theme.palette.mode === 'dark' ? 0.7 : 0.5,
      },
      '90%': {
        opacity: theme.palette.mode === 'dark' ? 0.7 : 0.5,
      },
      '100%': {
        transform: 'translate(40px, -120px) scale(1.5)',
        opacity: 0,
      },
    },
    '@keyframes floatParticle-1': {
      '0%': {
        transform: 'translate(0, 0) scale(0.8)',
        opacity: 0,
      },
      '15%': {
        opacity: theme.palette.mode === 'dark' ? 0.8 : 0.6,
      },
      '85%': {
        opacity: theme.palette.mode === 'dark' ? 0.8 : 0.6,
      },
      '100%': {
        transform: 'translate(-30px, -100px) scale(1.2)',
        opacity: 0,
      },
    },
    '@keyframes floatParticle-2': {
      '0%': {
        transform: 'translate(0, 0) scale(0.6)',
        opacity: 0,
      },
      '12%': {
        opacity: theme.palette.mode === 'dark' ? 0.6 : 0.4,
      },
      '88%': {
        opacity: theme.palette.mode === 'dark' ? 0.6 : 0.4,
      },
      '100%': {
        transform: 'translate(25px, -110px) scale(1)',
        opacity: 0,
      },
    },
  }),
);

const ESORune = styled(Box)<{ delay?: number; x?: string; y?: string }>(
  ({ delay = 0, x = '20%', y = '20%', theme }) => ({
    position: 'absolute',
    left: x,
    top: y,
    width: '32px',
    height: '32px',
    opacity: theme.palette.mode === 'dark' ? 0.2 : 0.12,
    animation: `runeGlow ${10 + delay}s ease-in-out ${delay}s infinite alternate`,
    '&::before': {
      content: '"⟐"',
      position: 'absolute',
      fontSize: '32px',
      color: theme.palette.mode === 'dark' ? '#60a5fa' : '#3b82f6',
      textShadow:
        theme.palette.mode === 'dark'
          ? '0 0 12px #60a5fa50, 0 0 24px #3b82f630'
          : '0 0 6px #3b82f640',
      transform: 'rotate(0deg)',
    },
    '@keyframes runeGlow': {
      '0%': {
        transform: 'rotate(0deg) scale(1)',
        opacity: theme.palette.mode === 'dark' ? 0.15 : 0.08,
      },
      '50%': {
        transform: 'rotate(180deg) scale(1.05)',
        opacity: theme.palette.mode === 'dark' ? 0.3 : 0.18,
      },
      '100%': {
        transform: 'rotate(360deg) scale(1)',
        opacity: theme.palette.mode === 'dark' ? 0.2 : 0.12,
      },
    },
    [theme.breakpoints.down('md')]: {
      width: '24px',
      height: '24px',
      '&::before': {
        fontSize: '24px',
      },
    },
  }),
);

export const LandingPage: React.FC = () => {
  const [showAnimations, setShowAnimations] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { isLoggedIn } = useAuth();
  const { isReady, isLoggedIn: clientIsLoggedIn } = useEsoLogsClientContext();
  const toolsSectionRef = useRef<HTMLDivElement>(null);
  const navigate = useViewTransitionNavigate();

  // Defer complex animations until after initial render
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimations(true);
    }, 100); // Small delay to ensure initial content is rendered first

    return () => clearTimeout(timer);
  }, []);

  // Intersection Observer for smooth scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '-50px' },
    );

    const currentRef = toolsSectionRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <LandingContainer>
      {showcaseGlobalStyles}
      <HeroSection id="home" showAnimations={showAnimations}>
        <ParticleContainer>
          {/* Floating particles with magical glow */}
          <FloatingParticle delay={0} duration={8} x="15%" y="80%" size="6px" color="#60a5fa" />
          <FloatingParticle delay={2} duration={12} x="25%" y="75%" size="4px" color="#a78bfa" />
          <FloatingParticle delay={4} duration={10} x="35%" y="85%" size="5px" color="#34d399" />
          <FloatingParticle delay={1} duration={9} x="50%" y="90%" size="3px" color="#fbbf24" />
          <FloatingParticle delay={3} duration={11} x="65%" y="80%" size="6px" color="#f472b6" />
          <FloatingParticle delay={5} duration={13} x="75%" y="75%" size="4px" color="#06b6d4" />
          <FloatingParticle delay={6} duration={14} x="85%" y="85%" size="5px" color="#8b5cf6" />

          {/* Second layer of particles */}
          <FloatingParticle delay={7} duration={15} x="20%" y="70%" size="3px" color="#3b82f6" />
          <FloatingParticle delay={8} duration={10} x="40%" y="78%" size="4px" color="#10b981" />
          <FloatingParticle delay={9} duration={12} x="60%" y="88%" size="5px" color="#f59e0b" />
          <FloatingParticle delay={10} duration={11} x="80%" y="70%" size="3px" color="#ec4899" />

          {/* ESO runes for magical atmosphere */}
          <ESORune delay={0} x="18%" y="25%" />
          <ESORune delay={3} x="82%" y="30%" />
          <ESORune delay={6} x="50%" y="15%" />
          <ESORune delay={9} x="25%" y="50%" />
          <ESORune delay={12} x="75%" y="55%" />
        </ParticleContainer>

        <HeroContent className="u-fade-in-up">
          <HeroTitle variant="h1" showAnimations={showAnimations}>
            <span className="light-text">Essential Tools</span>
            <span className="gradient-text">
              For <span className="highlight-text">Your ESO Journey</span>
            </span>
          </HeroTitle>
          <HeroSubtitle>
            Optimize your builds, create stunning messages, and manage your guild with powerful,
            easy-to-use tools designed for Elder Scrolls Online players.
          </HeroSubtitle>

          {isLoggedIn && isReady && clientIsLoggedIn ? (
            <AuthenticatedLandingSection />
          ) : isLoggedIn && (!isReady || !clientIsLoggedIn) ? (
            <Box sx={{ justifyContent: 'center', alignItems: 'center', display: 'flex', py: 4 }}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Initializing...
              </Typography>
            </Box>
          ) : (
            <UnauthenticatedLandingSection />
          )}
        </HeroContent>
      </HeroSection>

      {/* ── Hero → Tools transition bridge ── */}
      <ToolsBridge
        sx={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
          filter: isVisible ? 'blur(0)' : 'blur(4px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="bridge-rule" />
        <div className="bridge-heading">
          <span className="bridge-title">The&nbsp;</span>
          <span className="bridge-accent">Arsenal</span>
        </div>
        <div className="bridge-caption">Craft &middot; Optimize &middot; Dominate</div>
      </ToolsBridge>

      <ToolsSection id="tools" ref={toolsSectionRef}>
        <Box
          sx={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s ease-out 0.2s',
          }}
        >
          <ToolsGrid>
            <ToolCard index={0}>
              <ToolIcon>
                <CvIcon size="2rem" />
              </ToolIcon>
              <Typography variant="h5" component="h2" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
                Text-Editor
              </Typography>
              <Typography
                sx={{ color: 'text.secondary', mb: 2, flex: 1, fontWeight: 200, lineHeight: 1.6 }}
              >
                Create eye-catching MOTD and group finder posts with our visual editor. Design
                messages that stand out with custom styles and formatting.
              </Typography>
              <ToolFeatures>
                <li>Visual interface for easy formatting</li>
                <li>Custom styles and colors</li>
                <li>Preview before posting</li>
                <li>Save templates for reuse</li>
              </ToolFeatures>
              <ToolAction onClick={() => navigate('/text-editor', { vtType: 'up' })}>
                Launch Editor
              </ToolAction>
            </ToolCard>

            <ToolCard index={1}>
              <ToolIcon>
                <CalculatorIcon size="2rem" />
              </ToolIcon>
              <Typography variant="h5" component="h2" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
                Build Calculator
              </Typography>
              <Typography
                sx={{ color: 'text.secondary', mb: 2, flex: 1, fontWeight: 200, lineHeight: 1.6 }}
              >
                Optimize your character&apos;s stats with our comprehensive calculator. Track
                penetration, critical damage, and armor to hit those crucial caps.
              </Typography>
              <ToolFeatures>
                <li>
                  Penetration optimizer <span style={{ fontWeight: 300 }}>(18,200 cap)</span>
                </li>
                <li>
                  Critical damage calculator <span style={{ fontWeight: 300 }}>(125% cap)</span>
                </li>
                <li>Armor resistance planner</li>
                <li>Real-time cap status indicators</li>
              </ToolFeatures>
              <ToolAction onClick={() => navigate('/calculator', { vtType: 'up' })}>
                Launch Calculator
              </ToolAction>
            </ToolCard>

            <ToolCard index={2}>
              <ToolIcon>
                <FileLoopIcon size="2rem" />
              </ToolIcon>
              <Typography variant="h5" component="h2" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
                Log Analyzer
              </Typography>
              <Typography
                sx={{ color: 'text.secondary', mb: 2, flex: 1, fontWeight: 200, lineHeight: 1.6 }}
              >
                Deep dive into your ESO combat logs with advanced analytics. Analyze player
                performance, damage patterns, and raid insights with detailed breakdowns.
              </Typography>
              <ToolFeatures>
                <li>Combat performance analysis</li>
                <li>Player damage breakdowns</li>
                <li>Skill usage tracking</li>
                <li>Real-time fight insights</li>
              </ToolFeatures>
              <ToolAction onClick={() => navigate('/my-reports', { vtType: 'up' })}>
                Open Log Analyzer
              </ToolAction>
            </ToolCard>

            <ToolCard index={3}>
              <ToolIcon>
                <PeopleIcon size="2rem" />
              </ToolIcon>
              <Typography variant="h5" component="h2" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
                Roster Builder
              </Typography>
              <Typography
                sx={{ color: 'text.secondary', mb: 2, flex: 1, fontWeight: 200, lineHeight: 1.6 }}
              >
                Build and manage your guild rosters with our web tools and Discord bot. Organize
                members, assign roles, and track raid signups across platforms.
              </Typography>
              <ToolFeatures>
                <li>Visual roster builder</li>
                <li>Discord bot integration</li>
                <li>Raid signup tracking</li>
                <li>Role assignment system</li>
              </ToolFeatures>
              <ToolAction onClick={() => navigate('/roster-builder', { vtType: 'up' })}>
                Open Roster Builder
              </ToolAction>
            </ToolCard>
          </ToolsGrid>
        </Box>
      </ToolsSection>

      <KalpaSection id="kalpa">
        {/* Large watermark number for depth */}
        <Typography
          sx={(theme: Theme) => ({
            position: 'absolute',
            top: { xs: '-1rem', md: '-2rem' },
            right: { xs: '1rem', md: '5%' },
            fontSize: { xs: '12rem', sm: '16rem', md: '22rem' },
            fontWeight: 900,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke:
              theme.palette.mode === 'dark'
                ? '1px rgba(139, 92, 246, 0.06)'
                : '1px rgba(139, 92, 246, 0.04)',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 0,
            fontFamily: '"Inter", "Helvetica Neue", sans-serif',
            letterSpacing: '-0.05em',
          })}
        >
          01
        </Typography>
        <KalpaContent>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                mb: 2,
                px: 1.2,
                py: 0.4,
                borderRadius: '6px',
                background: (theme: Theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(139, 92, 246, 0.08)'
                    : 'rgba(139, 92, 246, 0.04)',
                border: (theme: Theme) =>
                  theme.palette.mode === 'dark'
                    ? '1px solid rgba(139, 92, 246, 0.15)'
                    : '1px solid rgba(139, 92, 246, 0.1)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#8b5cf6',
                }}
              >
                Desktop App
              </Typography>
              <Box
                sx={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)',
                }}
              />
            </Box>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2.2rem', sm: '2.6rem', md: '3rem' },
                lineHeight: 1.1,
                color: 'text.primary',
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              Meet{' '}
              <Box
                component="span"
                sx={{
                  background:
                    'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 40%, #6366f1 70%, #818cf8 100%)',
                  backgroundSize: '200% 200%',
                  animation: 'kalpaAurora 6s ease-in-out infinite',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Kalpa
              </Box>
            </Typography>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '1rem', sm: '1.05rem' },
                lineHeight: 1.7,
                fontWeight: 300,
                mb: 3,
                maxWidth: '460px',
              }}
            >
              A fast, open-source addon manager for ESO. Built with Rust and Tauri for native
              performance — just 15 MB, no Java runtime required.
            </Typography>

            <KalpaFeatureList>
              <KalpaFeatureRow delay={1}>
                <span className="feature-index">01</span>
                <span className="feature-title">One-click installs</span>
                <span className="feature-desc">Install and update addons instantly</span>
              </KalpaFeatureRow>
              <KalpaFeatureRow delay={2}>
                <span className="feature-index">02</span>
                <span className="feature-title">Dependency resolution</span>
                <span className="feature-desc">Automatically handles required libraries</span>
              </KalpaFeatureRow>
              <KalpaFeatureRow delay={3}>
                <span className="feature-index">03</span>
                <span className="feature-title">Addon profiles</span>
                <span className="feature-desc">Switch loadouts per character or role</span>
              </KalpaFeatureRow>
              <KalpaFeatureRow delay={4}>
                <span className="feature-index">04</span>
                <span className="feature-title">Pack Hub</span>
                <span className="feature-desc">Share and discover addon collections</span>
              </KalpaFeatureRow>
              <KalpaFeatureRow delay={5}>
                <span className="feature-index">05</span>
                <span className="feature-title">SavedVariables backup</span>
                <span className="feature-desc">Never lose your addon settings again</span>
              </KalpaFeatureRow>
              <KalpaFeatureRow delay={6}>
                <span className="feature-index">06</span>
                <span className="feature-title">Minion migration</span>
                <span className="feature-desc">One-click import from your old manager</span>
              </KalpaFeatureRow>
            </KalpaFeatureList>

            <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                href="https://github.com/ESO-Toolkit/kalpa"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
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
                }}
              >
                Get Kalpa
              </Button>
              <Button
                variant="outlined"
                href="https://github.com/ESO-Toolkit/kalpa"
                target="_blank"
                rel="noopener noreferrer"
                sx={(theme: Theme) => ({
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
                })}
              >
                View on GitHub
              </Button>
            </Box>
          </Box>

          {/* Mock desktop app window */}
          <KalpaAppWindow>
            <KalpaWindowTitleBar>
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
                Kalpa — Addon Manager
              </Typography>
            </KalpaWindowTitleBar>

            {/* Search bar */}
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
                gap: 0.5,
              })}
            >
              <Typography sx={{ fontSize: '0.7rem', opacity: 0.3 }}>🔍</Typography>
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
              {[
                { name: 'Dressing Room Reborn', version: 'v3.8.1', status: 'Updated' },
                { name: 'Combat Metrics', version: 'v2.5.0', status: 'Update' },
                { name: 'Azurah - Interface Enhanced', version: 'v4.1.2', status: 'Updated' },
                { name: 'Inventory Insight', version: 'v1.9.4', status: 'Updated' },
                { name: 'RaidNotifier', version: 'v3.2.1', status: 'Update' },
                { name: 'Srendarr - Aura Tracker', version: 'v2.7.3', status: 'Updated' },
                { name: 'Beam Me Up', version: 'v1.4.0', status: 'Updated' },
                { name: 'Harvest Map', version: 'v5.1.6', status: 'Update' },
              ].map((addon) => (
                <KalpaAddonRow key={addon.name}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
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
                      <Typography sx={{ fontSize: '0.6rem', opacity: 0.6 }}>📦</Typography>
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
                </KalpaAddonRow>
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
          </KalpaAppWindow>
        </KalpaContent>
      </KalpaSection>

      <EsotkSection id="esotk-addon">
        {/* Large watermark number for depth */}
        <Typography
          sx={(theme: Theme) => ({
            position: 'absolute',
            top: { xs: '-1rem', md: '-2rem' },
            left: { xs: '1rem', md: '5%' },
            fontSize: { xs: '12rem', sm: '16rem', md: '22rem' },
            fontWeight: 900,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke:
              theme.palette.mode === 'dark'
                ? '1px rgba(245, 158, 11, 0.06)'
                : '1px rgba(180, 120, 20, 0.04)',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 0,
            fontFamily: '"Inter", "Helvetica Neue", sans-serif',
            letterSpacing: '-0.05em',
          })}
        >
          02
        </Typography>
        <EsotkContent>
          {/* Text content (visually on right due to RTL direction) */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                mb: 2,
                px: 1.2,
                py: 0.4,
                borderRadius: '6px',
                background: (theme: Theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(180, 120, 20, 0.04)',
                border: (theme: Theme) =>
                  theme.palette.mode === 'dark'
                    ? '1px solid rgba(245, 158, 11, 0.15)'
                    : '1px solid rgba(180, 120, 20, 0.1)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: (theme: Theme) => (theme.palette.mode === 'dark' ? '#f59e0b' : '#b47814'),
                }}
              >
                In-Game Addon
              </Typography>
              <Box
                sx={{
                  px: 0.8,
                  py: 0.2,
                  borderRadius: '4px',
                  background: (theme: Theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(245, 158, 11, 0.18)'
                      : 'rgba(180, 120, 20, 0.12)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: (theme: Theme) => (theme.palette.mode === 'dark' ? '#fbbf24' : '#92610e'),
                  letterSpacing: '0.08em',
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                  },
                }}
              >
                COMING SOON
              </Box>
            </Box>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2.2rem', sm: '2.6rem', md: '3rem' },
                lineHeight: 1.1,
                color: 'text.primary',
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              The{' '}
              <Box
                component="span"
                sx={{
                  background: (theme: Theme) =>
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #d97706 70%, #f59e0b 100%)'
                      : 'linear-gradient(135deg, #b47814 0%, #92610e 40%, #7a510c 70%, #b47814 100%)',
                  backgroundSize: '200% 200%',
                  animation: 'kalpaAurora 6s ease-in-out infinite',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                ESOTK Addon
              </Box>
            </Typography>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '1rem', sm: '1.05rem' },
                lineHeight: 1.7,
                fontWeight: 300,
                mb: 3,
                maxWidth: '460px',
              }}
            >
              We&apos;re building a companion addon that bridges the gap between web and game.
              Roster validation, group management, and gear inspection — all directly inside your
              ESO client. Currently in development.
            </Typography>

            <EsotkFeatureList>
              <EsotkFeatureRow delay={1}>
                <span className="feature-index">01</span>
                <span className="feature-title">Roster import</span>
                <span className="feature-desc">Validate and sync rosters from the web</span>
              </EsotkFeatureRow>
              <EsotkFeatureRow delay={2}>
                <span className="feature-index">02</span>
                <span className="feature-title">Group management</span>
                <span className="feature-desc">View and organize your trial group in-game</span>
              </EsotkFeatureRow>
              <EsotkFeatureRow delay={3}>
                <span className="feature-index">03</span>
                <span className="feature-title">Gear inspection</span>
                <span className="feature-desc">Check builds and equipment at a glance</span>
              </EsotkFeatureRow>
              <EsotkFeatureRow delay={4}>
                <span className="feature-index">04</span>
                <span className="feature-title">Slash commands</span>
                <span className="feature-desc">Quick access via /esotk in chat</span>
              </EsotkFeatureRow>
              <EsotkFeatureRow delay={5}>
                <span className="feature-index">05</span>
                <span className="feature-title">Web toolkit sync</span>
                <span className="feature-desc">Live connection to your ESOTK dashboard</span>
              </EsotkFeatureRow>
              <EsotkFeatureRow delay={6}>
                <span className="feature-index">06</span>
                <span className="feature-title">Real-time stats</span>
                <span className="feature-desc">Group performance data as it happens</span>
              </EsotkFeatureRow>
            </EsotkFeatureList>

            <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="outlined"
                href="https://github.com/ESO-Toolkit/esotk-addon"
                target="_blank"
                rel="noopener noreferrer"
                sx={(theme: Theme) => ({
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(245, 158, 11, 0.25)'
                      : 'rgba(180, 120, 20, 0.2)',
                  color: theme.palette.mode === 'dark' ? '#fbbf24' : '#92610e',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '10px',
                  padding: '0.7rem 1.8rem',
                  fontSize: '0.9rem',
                  '&:hover': {
                    borderColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(245, 158, 11, 0.5)'
                        : 'rgba(180, 120, 20, 0.4)',
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(245, 158, 11, 0.04)'
                        : 'rgba(180, 120, 20, 0.03)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                })}
              >
                Follow on GitHub
              </Button>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  color: 'text.disabled',
                  fontWeight: 400,
                  fontStyle: 'italic',
                }}
              >
                Not yet available for download
              </Typography>
            </Box>
          </Box>

          {/* Game-UI panel (visually on left due to RTL direction) */}
          <EsotkGamePanel>
            <EsotkGamePanelInner>
              <EsotkPanelTitleBar>
                <Typography
                  sx={(theme: Theme) => ({
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color:
                      theme.palette.mode === 'dark'
                        ? 'rgba(245, 158, 11, 0.7)'
                        : 'rgba(180, 120, 20, 0.6)',
                  })}
                >
                  ESOTK — Group Panel
                </Typography>
              </EsotkPanelTitleBar>

              {/* Mock in-game roster list */}
              <Box sx={{ py: 0.25 }}>
                {[
                  { name: 'Aethon Dragonguard', role: 'Tank', cls: 'Dragonknight', hp: '42,800' },
                  { name: 'Selene Moonweaver', role: 'Healer', cls: 'Templar', hp: '28,200' },
                  { name: 'Razum-dar Jr', role: 'DPS', cls: 'Nightblade', hp: '25,600' },
                  { name: 'Valkyn Stormborn', role: 'DPS', cls: 'Sorcerer', hp: '26,100' },
                  { name: 'Khajiit Has-Wares', role: 'DPS', cls: 'Necromancer', hp: '24,900' },
                  { name: 'Tharn the Unbroken', role: 'Tank', cls: 'Warden', hp: '44,200' },
                  { name: 'Mirri Elendis', role: 'Healer', cls: 'Arcanist', hp: '27,800' },
                  { name: 'Fennorian Ravenwatch', role: 'DPS', cls: 'Dragonknight', hp: '25,300' },
                ].map((player) => (
                  <EsotkAddonRow key={player.name}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '2px',
                        flexShrink: 0,
                        background:
                          player.role === 'Tank'
                            ? 'linear-gradient(135deg, #60a5fa, #3b82f6)'
                            : player.role === 'Healer'
                              ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                              : 'linear-gradient(135deg, #f87171, #ef4444)',
                        boxShadow:
                          player.role === 'Tank'
                            ? '0 0 4px rgba(59, 130, 246, 0.4)'
                            : player.role === 'Healer'
                              ? '0 0 4px rgba(34, 197, 94, 0.4)'
                              : '0 0 4px rgba(239, 68, 68, 0.4)',
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={(theme: Theme) => ({
                          fontSize: '0.73rem',
                          fontWeight: 600,
                          color:
                            theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.85)'
                              : 'rgba(0,0,0,0.8)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        })}
                      >
                        {player.name}
                      </Typography>
                      <Typography
                        sx={(theme: Theme) => ({
                          fontSize: '0.6rem',
                          color:
                            theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.35)'
                              : 'rgba(0,0,0,0.35)',
                        })}
                      >
                        {player.cls} · {player.role}
                      </Typography>
                    </Box>
                    <Typography
                      sx={(theme: Theme) => ({
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        color:
                          theme.palette.mode === 'dark'
                            ? 'rgba(245, 158, 11, 0.6)'
                            : 'rgba(180, 120, 20, 0.5)',
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                      })}
                    >
                      {player.hp}
                    </Typography>
                  </EsotkAddonRow>
                ))}
              </Box>

              {/* Panel footer */}
              <Box
                sx={(theme: Theme) => ({
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: '1rem',
                  py: '0.5rem',
                  borderTop:
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(245, 158, 11, 0.08)'
                      : '1px solid rgba(180, 120, 20, 0.05)',
                })}
              >
                <Typography
                  sx={(theme: Theme) => ({
                    fontSize: '0.58rem',
                    color:
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  })}
                >
                  8/12 members
                </Typography>
                <Typography
                  sx={(theme: Theme) => ({
                    fontSize: '0.58rem',
                    color:
                      theme.palette.mode === 'dark'
                        ? 'rgba(245, 158, 11, 0.4)'
                        : 'rgba(180, 120, 20, 0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  })}
                >
                  /esotk roster
                </Typography>
              </Box>
            </EsotkGamePanelInner>
          </EsotkGamePanel>
        </EsotkContent>
      </EsotkSection>

      <CommunitySection id="about">
        <Box
          sx={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 2rem',
            position: 'relative',
            zIndex: 1,
            '@media (max-width: 899.95px)': {
              padding: '0 1rem',
            },
          }}
        >
          <CommunityTitle>
            <div className="community-headline">
              <span className="community-title-light">Built by players,</span>
              <span className="community-title-bold"> for players.</span>
            </div>
            <span className="community-caption">
              Always updated · Always free · Elder Scrolls Online
            </span>
          </CommunityTitle>

          {/* Infinite scrolling marquee */}
          <MarqueeWrapper>
            <MarqueeTrack>
              {/* Doubled for seamless loop */}
              {[0, 1].map((dupeIdx) => (
                <Box key={dupeIdx} sx={{ display: 'flex', gap: '3rem' }}>
                  <MarqueeItem>
                    <CalculatorIcon size="1rem" /> Build Calculator
                  </MarqueeItem>
                  <MarqueeItem>
                    <CvIcon size="1rem" /> Text-Editor
                  </MarqueeItem>
                  <MarqueeItem>
                    <FileLoopIcon size="1rem" /> Log Analyzer
                  </MarqueeItem>
                  <MarqueeItem>
                    <KalpaIcon size="1rem" /> Kalpa
                  </MarqueeItem>
                  <MarqueeItem>
                    <AddonIcon size="1rem" /> ESOTK Addon
                  </MarqueeItem>
                  <MarqueeItem>
                    <PeopleIcon size="1rem" /> Roster-Bot
                  </MarqueeItem>
                </Box>
              ))}
            </MarqueeTrack>
          </MarqueeWrapper>

          <CommunityGrid>
            {/* Card 01 — Hero left */}
            <CommunityCard accent="blue" data-number="01">
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <CommunityIcon accent="blue">🎮</CommunityIcon>
                <Typography
                  variant="h5"
                  component="h3"
                  sx={(t: Theme) => ({
                    mb: 0.5,
                    color: 'text.primary',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    letterSpacing: '-0.02em',
                    [t.breakpoints.down('sm')]: { fontSize: '1.05rem' },
                  })}
                >
                  Built from Real Gameplay
                </Typography>
                <Typography
                  sx={(t: Theme) => ({
                    color: 'text.secondary',
                    lineHeight: 1.65,
                    fontSize: '0.88rem',
                    maxWidth: '380px',
                    [t.breakpoints.down('sm')]: { fontSize: '0.82rem' },
                  })}
                >
                  Every tool is shaped by hundreds of hours of actual gameplay across all content
                  types — not guesswork.
                </Typography>
                {/* Content-type chips */}
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 'auto', pt: 1.5 }}>
                  {['Trials', 'PvP', 'Dungeons', 'Overland'].map((tag) => (
                    <Box
                      key={tag}
                      sx={(t: Theme) => ({
                        px: 1.25,
                        py: 0.3,
                        borderRadius: '6px',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color:
                          t.palette.mode === 'dark'
                            ? 'rgba(56, 189, 248, 0.6)'
                            : 'rgba(14, 165, 233, 0.7)',
                        background:
                          t.palette.mode === 'dark'
                            ? 'rgba(56, 189, 248, 0.05)'
                            : 'rgba(14, 165, 233, 0.04)',
                        border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(14, 165, 233, 0.06)'}`,
                      })}
                    >
                      {tag}
                    </Box>
                  ))}
                </Box>
              </Box>
            </CommunityCard>

            {/* Card 02 — Right side */}
            <CommunityCard accent="purple" data-number="02">
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <CommunityIcon accent="purple">🔄</CommunityIcon>
                <Typography
                  variant="h5"
                  component="h3"
                  sx={(t: Theme) => ({
                    mb: 0.5,
                    color: 'text.primary',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    letterSpacing: '-0.01em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    [t.breakpoints.down('sm')]: { fontSize: '1rem' },
                  })}
                >
                  Always Current
                  <Box
                    sx={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#34d399',
                      boxShadow: '0 0 6px rgba(52, 211, 153, 0.5)',
                      animation: 'livePulse 2s ease-in-out infinite',
                      '@keyframes livePulse': {
                        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                        '50%': { opacity: 0.4, transform: 'scale(0.75)' },
                      },
                    }}
                  />
                </Typography>
                <Typography
                  sx={(t: Theme) => ({
                    color: 'text.secondary',
                    lineHeight: 1.65,
                    fontSize: '0.85rem',
                    [t.breakpoints.down('sm')]: { fontSize: '0.8rem' },
                  })}
                >
                  Updated with every patch, balance change, and meta shift so you&apos;re never
                  behind.
                </Typography>
                <Typography
                  sx={(t: Theme) => ({
                    mt: 'auto',
                    pt: 1.5,
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    color:
                      t.palette.mode === 'dark'
                        ? 'rgba(167, 139, 250, 0.4)'
                        : 'rgba(139, 92, 246, 0.4)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  })}
                >
                  Tracking latest patches
                </Typography>
              </Box>
            </CommunityCard>

            {/* Card 03 — Full-width bottom, horizontal layout */}
            <CommunityCard accent="emerald" data-number="03">
              <Box
                sx={(t: Theme) => ({
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  [t.breakpoints.down('sm')]: {
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 1,
                  },
                })}
              >
                <CommunityIcon accent="emerald" sx={{ mb: 0, flexShrink: 0 }}>
                  💬
                </CommunityIcon>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="h5"
                    component="h3"
                    sx={(t: Theme) => ({
                      mb: 0.25,
                      color: 'text.primary',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      letterSpacing: '-0.01em',
                      [t.breakpoints.down('sm')]: { fontSize: '1rem' },
                    })}
                  >
                    Community Driven
                  </Typography>
                  <Typography
                    sx={(t: Theme) => ({
                      color: 'text.secondary',
                      lineHeight: 1.6,
                      fontSize: '0.85rem',
                      maxWidth: '520px',
                      [t.breakpoints.down('sm')]: { fontSize: '0.8rem' },
                    })}
                  >
                    Your feedback shapes development. Join Discord to suggest features and connect
                    with players.
                  </Typography>
                </Box>
                <Link
                  href="https://discord.gg/esotk"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="none"
                  sx={(t: Theme) => ({
                    display: 'inline-block',
                    px: 2,
                    py: 0.75,
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: t.palette.mode === 'dark' ? '#34d399' : '#059669',
                    background:
                      t.palette.mode === 'dark'
                        ? 'rgba(52, 211, 153, 0.06)'
                        : 'rgba(16, 185, 129, 0.05)',
                    border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(16, 185, 129, 0.1)'}`,
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    '&:hover': {
                      background:
                        t.palette.mode === 'dark'
                          ? 'rgba(52, 211, 153, 0.1)'
                          : 'rgba(16, 185, 129, 0.08)',
                      transform: 'translateY(-1px)',
                    },
                    [t.breakpoints.down('sm')]: {
                      alignSelf: 'flex-start',
                    },
                  })}
                >
                  Join Discord &rarr;
                </Link>
              </Box>
            </CommunityCard>
          </CommunityGrid>
        </Box>
      </CommunitySection>

      <Footer />
    </LandingContainer>
  );
};
