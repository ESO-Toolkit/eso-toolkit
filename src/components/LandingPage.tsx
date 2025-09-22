import { Box, Button, Container, Typography, CircularProgress } from '@mui/material';
import { styled, Theme } from '@mui/material/styles';
import React, { useState } from 'react';

import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import { useAuth } from '../features/auth/AuthContext';

import { AuthenticatedLandingSection } from './AuthenticatedLandingSection';
import { Footer } from './Footer';
import { UnauthenticatedLandingSection } from './UnauthenticatedLandingSection';

// Styled components using your existing design
const LandingContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : 'transparent',
  position: 'relative',
  overflow: 'visible',
  width: '100%',
  maxWidth: '100vw',
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
  padding: '0rem 2rem 0rem',
  position: 'relative',
  paddingTop: '6rem',
  overflow: 'hidden',
  width: '100%',
  maxWidth: '100vw',
  [theme.breakpoints.down('md')]: {
    minHeight: '70vh',
    padding: '2rem 1rem 0rem',
    paddingTop: '3rem',
  },
  [theme.breakpoints.down('sm')]: {
    minHeight: '60vh',
    padding: '1rem 1rem 0rem',
    alignItems: 'flex-start',
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
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '600px',
      height: '300px',
      background:
        'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.08) 0%, rgba(0, 225, 255, 0.05) 30%, transparent 70%)',
      borderRadius: '50%',
      filter: 'blur(40px)',
      zIndex: 0,
      animation: 'pulse-bg 4s ease-in-out infinite alternate',
    },
  }),
  '@keyframes rotate': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  '@keyframes pulse-bg': {
    '0%': { opacity: 0.3, transform: 'translateX(-50%) scale(0.8)' },
    '100%': { opacity: 0.6, transform: 'translateX(-50%) scale(1.2)' },
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
    fontSize: 'clamp(2.5rem, 5vw, 3rem)',
    lineHeight: 1.5,
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: 'clamp(2.8rem, 6vw, 2.5rem)',
    lineHeight: 1.5,
    marginBottom: '1.5rem',
  },
  [theme.breakpoints.down(480)]: {
    fontSize: 'clamp(2.3rem, 7vw, 2rem)',
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
    fontSize: '1.1m',
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

const ToolsSection = styled(Container)(({ theme }) => ({
  padding: '0rem 0rem 0rem 0rem',
  paddingTop: 0,
  maxWidth: '1200px',
  [theme.breakpoints.down('sm')]: {
    padding: '0rem 1rem', // This adds 1rem padding on left and right for mobile
  },
}));

const SectionTitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'theme',
})<{ theme?: Theme }>(({ theme }) => ({
  textAlign: 'center',
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: '1.5rem',
  marginTop: '8rem',
  color: theme.palette.text.primary,
  [theme.breakpoints.down('md')]: {
    fontSize: '2.2rem',
    marginTop: '6rem',
    marginBottom: '1.25rem',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
    marginTop: '4rem',
    marginBottom: '1rem',
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

const ToolsGrid = styled(Box)(({ theme: _theme }) => ({
  display: 'grid',
  gap: '1.5rem',
  marginTop: '3rem',
  gridTemplateColumns: '1fr',
  maxWidth: '800px',
  margin: '3rem auto 0 auto',
}));

const ToolCard = styled(Box)(({ theme }) => ({
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
    transform: 'translateY(-8px)',
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
      transform: 'translateY(-4px)',
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
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      : '0 4px 20px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
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
    transform: 'scale(1.05) rotate(5deg)',
    '&::before': {
      opacity: 1,
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
  const { isLoggedIn } = useAuth();
  const { isReady, isLoggedIn: clientIsLoggedIn } = useEsoLogsClientContext();

  // Defer complex animations until after initial render
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimations(true);
    }, 100); // Small delay to ensure initial content is rendered first

    return () => clearTimeout(timer);
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

      <ToolsSection id="tools">
        <SectionTitle variant="h2">Our Tools</SectionTitle>
        <SectionSubtitle>Everything you need to excel in Tamriel</SectionSubtitle>

        <ToolsGrid>
          <ToolCard>
            <ToolIcon>📝</ToolIcon>
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
              Text Editor
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

          <ToolCard>
            <ToolIcon>🧮</ToolIcon>
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
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
            <ToolAction href="/calculator">Launch Calculator</ToolAction>
          </ToolCard>

          <ToolCard>
            <ToolIcon>📊</ToolIcon>
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
              ESO Log Analyzer
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

          <ToolCard>
            <ComingSoonBadge>Coming Soon</ComingSoonBadge>
            <ToolIcon>🤖</ToolIcon>
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 700 }}>
              Discord Roster Bot
            </Typography>
            <Typography
              sx={{ color: 'text.secondary', mb: 2, flex: 1, fontWeight: 200, lineHeight: 1.6 }}
            >
              Manage your guild roster effortlessly with our Discord bot. Track members, roles, and
              raid signups all in one place.
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
      </ToolsSection>

      <ToolsSection id="about">
        <SectionTitle variant="h2">Built By Players, For Players</SectionTitle>
        <SectionSubtitle>
          ESO Helper Tools is a community-driven project dedicated to enhancing your Elder Scrolls
          Online experience. Our tools are constantly updated to match the latest game patches and
          meta changes.
        </SectionSubtitle>
      </ToolsSection>

      <Footer />
    </LandingContainer>
  );
};
