import LinkIcon from '@mui/icons-material/Link';
import { Box, Button, Container, TextField, Typography, useTheme } from '@mui/material';
import { styled, Theme } from '@mui/material/styles';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { clearAllEvents } from '../store/events_data/actions';
import { clearMasterData } from '../store/master_data/masterDataSlice';
import { clearReport } from '../store/report/reportSlice';
import { useAppDispatch } from '../store/useAppDispatch';

// Styled components using your existing design
const LandingContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : 'transparent',
  position: 'relative',
  overflowX: 'hidden',
  overflowY: 'visible',
  width: '100%',
  maxWidth: '100vw',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const HeroSection = styled(Box)(({ theme }) => ({
  minHeight: '80vh',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '0rem 2rem 0rem',
  position: 'relative',
  paddingTop: '2.5rem',
  overflow: 'visible',
  width: '100%',
  maxWidth: '100vw',
  [theme.breakpoints.down('md')]: {
    minHeight: '70vh',
    padding: '2rem 1rem 0rem',
  },
  [theme.breakpoints.down('sm')]: {
    minHeight: '60vh',
    padding: '1rem 1rem 0rem',
    alignItems: 'flex-start',
    paddingTop: '3rem',
  },
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

const HeroTitle = styled(Typography)(({ theme }) => ({
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
  textShadow:
    theme.palette.mode === 'dark'
      ? `
      0 0 20px rgba(56, 189, 248, 0.5),
      0 0 40px rgba(56, 189, 248, 0.3),
      0 0 60px rgba(0, 225, 255, 0.2),
      0 4px 8px rgba(0, 0, 0, 0.3),
      0 8px 16px rgba(0, 0, 0, 0.2),
      0 16px 32px rgba(0, 0, 0, 0.1)
    `
      : '0 1px 2px rgba(15, 23, 42, 0.1), 0 2px 4px rgba(15, 23, 42, 0.05)',
  animation: 'shimmer 3s ease-in-out infinite',
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
    fontSize: 'clamp(2.2rem, 7vw, 2rem)',
    lineHeight: 1.5,
  },
  '@keyframes shimmer': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.85 },
  },
  '& .light-text': {
    fontWeight: '300 !important',
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
  fontSize: '1.5rem',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(51, 65, 85, 0.8)',
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(6),
  fontWeight: 400,
  lineHeight: 1.5,
  maxWidth: '600px',
  margin: '24px auto 48px auto',
  [theme.breakpoints.down('md')]: {
    fontSize: '1.25rem',
    maxWidth: '500px',
    margin: '20px auto 40px auto',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.2em',
    minWidth: '100%',
    margin: '16px auto 32px auto',
    lineHeight: 1.6,
  },
  [theme.breakpoints.down(480)]: {
    fontSize: '1.1m',
    margin: '12px auto 24px auto',
  },
}));

const LogInputContainer = styled(Box)(({ theme }) => ({
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
    maxWidth: '500px',
    borderRadius: '12px',
  },
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    margin: '1rem 0 2.5rem 0',
    alignItems: 'stretch',
    minWidth: '100%',
    borderRadius: '8px',
    '&:hover': {
      transform: 'none',
    },
  },
  [theme.breakpoints.down(480)]: {
    minWidth: '100%',
    margin: '1rem 0 1.5rem 0',
  },
}));

const ToolsSection = styled(Container)(({ theme }) => ({
  padding: '0rem 0rem 0rem 0rem',
  paddingTop: 0,
  maxWidth: '1200px',
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

const ToolsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '2rem',
  marginTop: '3rem',
}));

const ToolCard = styled(Box)(({ theme }) => ({
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.9) 100%)',
  border:
    theme.palette.mode === 'dark' ? '1px solid #1f2937' : '1px solid rgba(203, 213, 225, 0.5)',
  borderRadius: '14px',
  padding: '2rem',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
    transform: 'translateX(-100%)',
    transition: 'transform 0.6s ease',
  },
  '&:hover::before': {
    transform: 'translateX(100%)',
  },
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 60px rgba(56, 189, 248, 0.1)'
        : '0 10px 30px rgba(15, 23, 42, 0.1), 0 0 30px rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
}));

const ToolIcon = styled(Box)({
  width: '60px',
  height: '60px',
  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(0, 225, 255, 0.2))',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.8rem',
  marginBottom: '1.5rem',
});

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
  padding: '0.8rem 1.5rem',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(56, 189, 248, 0.05))'
      : 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(56, 189, 248, 0.03))',
  color: theme.palette.mode === 'dark' ? '#e9fbff' : '#0c4a6e',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.3)'
      : '1px solid rgba(56, 189, 248, 0.25)',
  borderRadius: '8px',
  transition: 'all 0.3s ease',
  fontWeight: 600,
  '&:hover': {
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(56, 189, 248, 0.15))'
        : 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(56, 189, 248, 0.08))',
    boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)',
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

const MarketingBadge = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(0, 225, 255, 0.05))',
  border: '1px solid rgba(56, 189, 248, 0.2)',
  borderRadius: '50px',
  padding: '0.5rem 1.2rem',
  marginBottom: '1rem',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#38bdf8',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 20px rgba(56, 189, 248, 0.1)',
  animation: 'float 3s ease-in-out infinite',
  '@keyframes float': {
    '0%, 100%': { transform: 'translateY(0px)' },
    '50%': { transform: 'translateY(-4px)' },
  },
});

const BadgeContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '3rem',
  marginTop: '2rem',
  [theme.breakpoints.down('sm')]: {
    marginBottom: '2rem',
    marginTop: '1rem',
  },
}));

const FloatingElements = styled(Box)({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  pointerEvents: 'none',
  zIndex: 0,
  overflow: 'visible',
});

const FloatingElementsDesktop = styled(FloatingElements)(({ theme }) => ({
  display: 'block',
  [theme.breakpoints.down('sm')]: { display: 'none' },
}));

const FloatingIcon = styled(Box)<{ delay?: number; duration?: number; x?: string; y?: string }>(
  ({ delay = 0, duration = 8, x = '20%', y = '20%' }) => ({
    position: 'absolute',
    left: x,
    top: y,
    fontSize: '2rem',
    opacity: 0.15,
    color: '#38bdf8',
    animation: `floatingIcon ${duration}s ease-in-out ${delay}s infinite alternate`,
    '@keyframes floatingIcon': {
      '0%': {
        transform: 'translateY(0px) rotate(0deg)',
        opacity: 0.1,
      },
      '50%': {
        opacity: 0.2,
      },
      '100%': {
        transform: 'translateY(-20px) rotate(5deg)',
        opacity: 0.15,
      },
    },
  })
);

const GeometricShape = styled(Box)<{ delay?: number; size?: string; x?: string; y?: string }>(
  ({ delay = 0, size = '40px', x = '10%', y = '30%' }) => ({
    position: 'absolute',
    left: x,
    top: y,
    width: size,
    height: size,
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '50%',
    animation: `geometricPulse ${6 + delay}s ease-in-out infinite`,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '60%',
      height: '60%',
      background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)',
      borderRadius: '50%',
    },
    '@keyframes geometricPulse': {
      '0%, 100%': {
        transform: 'scale(1) rotate(0deg)',
        opacity: 0.3,
      },
      '50%': {
        transform: 'scale(1.1) rotate(180deg)',
        opacity: 0.6,
      },
    },
  })
);

export const LandingPage: React.FC = () => {
  const [logUrl, setLogUrl] = useState('');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const handleLogUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setLogUrl(e.target.value);
  };

  const extractReportInfo = (url: string): { reportId: string; fightId: string | null } | null => {
    const reportMatch = url.match(/reports\/([A-Za-z0-9]+)/);
    if (!reportMatch) return null;

    const reportId = reportMatch[1];
    let fightId: string | null = null;

    const hashFightMatch = url.match(/#fight=(\d+)/);
    if (hashFightMatch) {
      fightId = hashFightMatch[1];
    }

    const queryFightMatch = url.match(/[?&]fight=(\d+)/);
    if (queryFightMatch) {
      fightId = queryFightMatch[1];
    }

    const pathFightMatch = url.match(/reports\/[A-Za-z0-9]+\/(\d+)/);
    if (pathFightMatch) {
      fightId = pathFightMatch[1];
    }

    return { reportId, fightId };
  };

  const handleLoadLog = (): void => {
    const result = extractReportInfo(logUrl);
    if (result) {
      dispatch(clearAllEvents());
      dispatch(clearMasterData());
      dispatch(clearReport());

      if (result.fightId) {
        navigate(`/report/${result.reportId}/fight/${result.fightId}`);
      } else {
        navigate(`/report/${result.reportId}`);
      }
    } else {
      alert('Invalid ESOLogs report URL');
    }
  };

  return (
    <LandingContainer>
      <HeroSection id="home">
        <FloatingElementsDesktop>
          {/* ESO-themed floating runes in rainbow arch formation */}
          <FloatingIcon delay={0} duration={10} x="12%" y="40%">
            ⚡
          </FloatingIcon>
          <FloatingIcon delay={2} duration={12} x="26%" y="22%">
            🔥
          </FloatingIcon>
          <FloatingIcon delay={2} duration={12} x="16%" y="29%">
            🏹
          </FloatingIcon>
          <FloatingIcon delay={4} duration={9} x="45%" y="17%">
            ❄️
          </FloatingIcon>
          <FloatingIcon delay={1} duration={11} x="74%" y="24%">
            🌟
          </FloatingIcon>
          <FloatingIcon delay={3} duration={8} x="85%" y="40%">
            ⚔️
          </FloatingIcon>
          <FloatingIcon delay={5} duration={13} x="60%" y="19%">
            🛡️
          </FloatingIcon>

          {/* Geometric shapes complementing the arch */}
          <GeometricShape delay={0} size="25px" x="20%" y="22%" />
          <GeometricShape delay={2} size="30px" x="33%" y="19%" />
          <GeometricShape delay={4} size="28px" x="60%" y="19%" />
          <GeometricShape delay={1} size="25px" x="80%" y="35%" />
          <GeometricShape delay={3} size="22px" x="45%" y="19%" />
        </FloatingElementsDesktop>

        <HeroContent className="u-fade-in-up">
          <HeroTitle variant="h1">
            <span className="light-text">Essential Tools</span>
            <span className="gradient-text">
              For <span className="highlight-text">Your ESO Journey</span>
            </span>
          </HeroTitle>
          <HeroSubtitle>
            Optimize your builds, create stunning messages, and manage your guild with powerful,
            easy-to-use tools designed for Elder Scrolls Online players.
          </HeroSubtitle>

          <LogInputContainer>
            <TextField
              label="ESOLogs.com Log URL"
              variant="outlined"
              value={logUrl}
              onChange={handleLogUrlChange}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'transparent',
                  borderRadius: { xs: '8px 8px 0 0', sm: '16px 0 0 16px' },
                  height: { xs: '56px', sm: '64px' },
                  padding: '0 1.5rem',
                  border: 'none',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover fieldset': {
                    border: 'none',
                  },
                  '&.Mui-focused fieldset': {
                    border: 'none',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                  left: '3.5rem',
                  top: { xs: '2px', sm: '4px' },
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  '&.Mui-focused': {
                    color: '#38bdf8',
                  },
                  '&.MuiInputLabel-shrink': {
                    transform: {
                      xs: 'translate(3.5rem, -12px) scale(0.75)',
                      sm: 'translate(3.5rem, -10px) scale(0.75)',
                    },
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.9)'
                        : 'rgba(248, 250, 252, 0.95)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: { xs: '16px 0', sm: '18px 0' },
                  color: theme.palette.mode === 'dark' ? '#e5e7eb' : '#1e293b',
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                },
              }}
              InputProps={{
                startAdornment: <LinkIcon sx={{ mr: 1, color: '#38bdf8', ml: 0 }} />,
              }}
            />
            <Button
              variant="contained"
              color="secondary"
              sx={{
                minWidth: 200,
                height: 64,
                background: 'linear-gradient(135deg, #38bdf8 0%, #00e1ff 50%, #0ea5e9 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                borderRadius: { xs: '0 0 8px 8px', sm: '0 16px 16px 0' },
                border: 'none',
                boxShadow: 'none',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textShadow: `
                  0 2px 4px rgba(0, 0, 0, 0),
                  0 4px 8px rgba(0, 0, 0, 0.7),
                  0 8px 16px rgba(0, 0, 0, 0.5),
                  0 0 15px rgba(14, 165, 233, 0.6),
                  0 0 30px rgba(56, 189, 248, 0.4),
                  0 1px 0 rgba(255, 255, 255, 0.2)
                `,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%)',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                  transition: 'left 0.6s ease',
                },
                '&:hover': {
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #00e1ff 100%)',
                  transform: { xs: 'none', sm: 'scale(1.02)' },
                  '&::before': {
                    opacity: 1,
                  },
                  '&::after': {
                    left: '100%',
                  },
                },
                '&:active': {
                  transform: { xs: 'none', sm: 'scale(1.01)' },
                },
              }}
              onClick={handleLoadLog}
            >
              Analyze Log
            </Button>
          </LogInputContainer>
        </HeroContent>
      </HeroSection>

      <ToolsSection id="tools">
        <BadgeContainer>
          <MarketingBadge>⚔️ Battle-Tested by ESO Veterans</MarketingBadge>
        </BadgeContainer>
        <SectionTitle variant="h2">Our Tools</SectionTitle>
        <SectionSubtitle>Everything you need to excel in Tamriel</SectionSubtitle>

        <ToolsGrid>
          <ToolCard>
            <ToolIcon>📝</ToolIcon>
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary' }}>
              Text Editor
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 2, flex: 1 }}>
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
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary' }}>
              Build Calculator
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 2, flex: 1 }}>
              Optimize your character's stats with our comprehensive calculator. Track penetration,
              critical damage, and armor to hit those crucial caps.
            </Typography>
            <ToolFeatures>
              <li>Penetration optimizer (18,200 cap)</li>
              <li>Critical damage calculator (125% cap)</li>
              <li>Armor resistance planner</li>
              <li>Real-time cap status indicators</li>
            </ToolFeatures>
            <ToolAction href="/calculator">Launch Calculator</ToolAction>
          </ToolCard>

          <ToolCard>
            <ToolIcon>📊</ToolIcon>
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary' }}>
              ESO Log Analyzer
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 2, flex: 1 }}>
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
                  'noopener,noreferrer'
                )
              }
            >
              View on GitHub
            </ToolAction>
          </ToolCard>

          <ToolCard>
            <ComingSoonBadge>Coming Soon</ComingSoonBadge>
            <ToolIcon>🤖</ToolIcon>
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary' }}>
              Discord Roster Bot
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 2, flex: 1 }}>
              Manage your guild roster effortlessly with our Discord bot. Track members, roles, and
              raid signups all in one place.
            </Typography>
            <ToolFeatures>
              <li>Automated roster management</li>
              <li>Raid signup tracking</li>
              <li>Role assignment system</li>
              <li>Activity monitoring</li>
            </ToolFeatures>
            <ToolAction disabled sx={{ cursor: 'not-allowed', opacity: 0.6 }}>
              Coming Soon
            </ToolAction>
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

      <Box
        component="footer"
        sx={{
          padding: '3rem 2rem',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, transparent, rgba(3,7,18,0.8))'
              : 'linear-gradient(180deg, transparent, rgba(248, 250, 252, 0.8))',
          borderTop:
            theme.palette.mode === 'dark'
              ? '1px solid #1f2937'
              : '1px solid rgba(203, 213, 225, 0.5)',
          marginTop: '4rem',
          textAlign: 'center',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2, flexWrap: 'wrap' }}>
          <a
            href="https://esohelper.tools/text-editor"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
              textDecoration: 'none',
            }}
          >
            Text Editor
          </a>
          <a
            href="https://esohelper.tools/calculator"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
              textDecoration: 'none',
            }}
          >
            Calculator
          </a>
          <a
            href="https://discord.gg/mMjwcQYFdc"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
              textDecoration: 'none',
            }}
          >
            Discord
          </a>
          <a
            href="https://github.com/esohelper"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
              textDecoration: 'none',
            }}
          >
            GitHub
          </a>
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          2024 ESO Helper Tools. Not affiliated with ZeniMax Online Studios or Bethesda.
        </Typography>
      </Box>
    </LandingContainer>
  );
};
