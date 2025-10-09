import { Box, Button, Container, Typography, CircularProgress } from '@mui/material';
import { styled, Theme } from '@mui/material/styles';
import React, { useState, JSX, useEffect, useRef } from 'react';

import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import { useAuth } from '../features/auth/AuthContext';

import { AuthenticatedLandingSection } from './AuthenticatedLandingSection';
import { Footer } from './Footer';
import { UnauthenticatedLandingSection } from './UnauthenticatedLandingSection';
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
    margin: '1rem 0 2.5rem 0',
    alignItems: 'stretch',
    minWidth: '94%',
    maxWidth: '94%',
    width: '94%',
    borderRadius: '8px',
    '&:hover': {
      transform: 'none',
    },
  },
  [theme.breakpoints.down(480)]: {
    minWidth: '94%',
    maxWidth: '94%',
    width: '94%',
    margin: '1rem 0 1.5rem 0',
  },
}));

const CommunitySection = styled(Box)(({ theme }) => ({
  padding: '2rem 0',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.3) 50%, transparent 100%)'
      : 'linear-gradient(180deg, transparent 0%, rgba(241, 245, 249, 0.5) 50%, transparent 100%)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.3), transparent)',
  },
  [theme.breakpoints.down('md')]: {
    padding: '3rem 0',
  },
  [theme.breakpoints.down('sm')]: {
    padding: '2rem 0',
  },
}));

const CommunityGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 2rem',
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
    gap: '1.5rem',
    padding: '0 1rem',
  },
}));

const CommunityCard = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(10px)',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.1)'
      : '1px solid rgba(30, 41, 59, 0.1)',
  borderRadius: '16px',
  padding: '2rem',
  textAlign: 'center',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.4), transparent)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  '&:hover': {
    transform: 'translateY(-4px)',
    borderColor: 'rgba(56, 189, 248, 0.2)',
    '&::before': {
      opacity: 1,
    },
  },
  [theme.breakpoints.down('sm')]: {
    padding: '1.5rem',
  },
}));

const CommunityIcon = styled(Box)(({ theme }) => ({
  width: '80px',
  height: '80px',
  margin: '0 auto 1.5rem',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(0, 225, 255, 0.1))'
      : 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(0, 225, 255, 0.05))',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.2)'
      : '1px solid rgba(56, 189, 248, 0.15)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2.5rem',
  color: theme.palette.mode === 'dark' ? '#38bdf8' : '#0ea5e9',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.1) rotate(5deg)',
  },
}));

const CommunityStats = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '2rem',
  maxWidth: '1200px',
  margin: '3rem auto',

  // Medium screens (tablets) - switch to 2x2 grid
  [theme.breakpoints.down('lg')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '2rem',
    margin: '2.5rem 1rem',
  },

  // Small screens (mobile) - maintain 2x2 grid with adjusted spacing
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
    margin: '2rem 1rem',
  },

  // Extra small screens - still maintain 2x2 but with tighter spacing
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    margin: '2rem 1rem',
  },
}));

const StatItem = styled(Box)(({ theme: _theme }) => ({
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '0',
}));

const StatNumber = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 800,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #38bdf8 0%, #00e1ff 100%)'
      : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  marginBottom: '0.5rem',
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
  },
}));

const StatLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  color: theme.palette.text.secondary,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}));

const SectionTitle = styled(Typography, {
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

const CommunityTitle = styled(Typography)(({ theme }) => ({
  textAlign: 'center',
  fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
  fontWeight: 700,
  marginBottom: '1.5rem',
  marginTop: '8rem',
  color: theme.palette.text.primary,
  lineHeight: 1.1,
  maxWidth: '800px',
  margin: '8rem auto 1.5rem auto',
  [theme.breakpoints.down('md')]: {
    marginTop: '6rem',
    marginBottom: '1.25rem',
    lineHeight: 1.2,
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
    marginTop: '4rem',
    marginBottom: '1rem',
    lineHeight: 1.3,
  },
  [theme.breakpoints.down(480)]: {
    fontSize: 'clamp(1.4rem, 6vw, 1.8rem)',
    marginTop: '3rem',
    marginBottom: '0.8rem',
    lineHeight: 1.4,
  },
  [theme.breakpoints.down(360)]: {
    fontSize: 'clamp(1.2rem, 7vw, 1.6rem)',
    marginTop: '2rem',
    marginBottom: '0.6rem',
    lineHeight: 1.4,
  },
}));

const SectionSubtitle = styled(Typography)(({ theme }) => ({
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

const ToolsGrid = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gap: '1.5rem',
        marginTop: '3rem',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr',
          md: '1fr 1fr',
          lg: '1fr 1fr',
        },
        maxWidth: '800px',
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
          sx={(theme) => ({
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

const ComingSoonBadge = styled(Box)({
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
  color: '#fff',
  padding: '0.3rem 0.8rem',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  animation: 'pulse 2s ease-in-out infinite',
  '@keyframes pulse': {
    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
    '50%': { opacity: 0.9, transform: 'scale(1.05)' },
  },
});

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
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Initializing...
              </Typography>
            </Box>
          ) : (
            <UnauthenticatedLandingSection />
          )}
        </HeroContent>
      </HeroSection>

      <ToolsSection id="tools" ref={toolsSectionRef}>
        <Box
          sx={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s ease-out',
          }}
        >
          <SectionTitle variant="h2">Our Tools</SectionTitle>
          <SectionSubtitle>Everything you need to excel in Tamriel</SectionSubtitle>
        </Box>

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
              <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
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
              <ToolAction href="/text-editor">Launch Editor</ToolAction>
            </ToolCard>

            <ToolCard index={1}>
              <ToolIcon>
                <CalculatorIcon size="2rem" />
              </ToolIcon>
              <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
                Build Caclulator
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
              <ToolAction href="/calculator">Launch Calculator</ToolAction>
            </ToolCard>

            <ToolCard index={2}>
              <ToolIcon>
                <FileLoopIcon size="2rem" />
              </ToolIcon>
              <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
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
              <ToolAction
                onClick={() =>
                  window.open(
                    'https://github.com/bkrupa/eso-log-aggregator',
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
              >
                View on GitHub
              </ToolAction>
            </ToolCard>

            <ToolCard index={3}>
              <ComingSoonBadge>Coming Soon</ComingSoonBadge>
              <ToolIcon>
                <PeopleIcon size="2rem" />
              </ToolIcon>
              <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
                Roster-Bot
              </Typography>
              <Typography
                sx={{ color: 'text.secondary', mb: 2, flex: 1, fontWeight: 200, lineHeight: 1.6 }}
              >
                Manage your guild roster effortlessly with our Discord bot. Track members, roles,
                and raid signups all in one place.
              </Typography>
              <ToolFeatures>
                <li>Automated roster management</li>
                <li>Raid signup tracking</li>
                <li>Role assignment system</li>
                <li>Activity monitoring</li>
              </ToolFeatures>
              <ToolAction disabled>Coming Soon</ToolAction>
            </ToolCard>
          </ToolsGrid>
        </Box>
      </ToolsSection>

      <CommunitySection id="about">
        <Box
          sx={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 2rem',
            '@media (max-width: 899.95px)': {
              padding: '0 1rem',
            },
            '@media (max-width: 599.95px)': {
              padding: '0 1rem',
            },
          }}
        >
          <CommunityTitle variant="h2">Built By Players, For Players</CommunityTitle>
          <SectionSubtitle sx={{ maxWidth: '800px' }}>
            ESO Helper Tools is a community-driven project dedicated to enhancing your Elder Scrolls
            Online experience. Our tools are constantly updated to match the latest game patches and
            meta changes.
          </SectionSubtitle>

          <CommunityStats>
            <StatItem>
              <StatNumber>
                <CalculatorIcon size="2.5rem" />
              </StatNumber>
              <StatLabel>Build Caclulator</StatLabel>
            </StatItem>
            <StatItem>
              <StatNumber>
                <CvIcon size="2.5rem" />
              </StatNumber>
              <StatLabel>Text-Editor</StatLabel>
            </StatItem>
            <StatItem>
              <StatNumber>
                <FileLoopIcon size="2.5rem" />
              </StatNumber>
              <StatLabel>Log Analyzer</StatLabel>
            </StatItem>
            <StatItem>
              <StatNumber>
                <PeopleIcon size="2.5rem" />
              </StatNumber>
              <StatLabel>Roster-Bot</StatLabel>
            </StatItem>
          </CommunityStats>

          <CommunityGrid>
            <CommunityCard>
              <CommunityIcon>🎮</CommunityIcon>
              <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
                Passionate Gamers
              </Typography>
              <Typography sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                We&apos;re dedicated ESO players who understand the game&apos;s mechanics and
                community needs. Our tools are built from real gameplay experience.
              </Typography>
            </CommunityCard>

            <CommunityCard>
              <CommunityIcon>🔄</CommunityIcon>
              <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
                Up to Date
              </Typography>
              <Typography sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                Stay current with the latest patches, balance changes, and meta shifts. Our tools
                are updated regularly to ensure you have the best resources at your fingertips.
              </Typography>
            </CommunityCard>

            <CommunityCard>
              <CommunityIcon>💬</CommunityIcon>
              <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
                Community Driven
              </Typography>
              <Typography sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                Your feedback shapes our development. Join our Discord community to suggest
                features, report bugs, and connect with fellow players.
              </Typography>
            </CommunityCard>
          </CommunityGrid>
        </Box>
      </CommunitySection>

      <Footer />
    </LandingContainer>
  );
};
