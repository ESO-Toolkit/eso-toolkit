import LinkIcon from '@mui/icons-material/Link';
import { Box, Button, Container, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { clearAllEvents } from '../store/events_data/actions';
import { clearMasterData } from '../store/master_data/masterDataSlice';
import { clearReport } from '../store/report/reportSlice';
import { useAppDispatch } from '../store/useAppDispatch';

// Styled components using your existing design
const LandingContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: theme.palette.background.default,
  position: 'relative',
  overflow: 'visible',
}));


const HeroSection = styled(Box)(({ theme }) => ({
  minHeight: '80vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0rem 5vw 0rem',
  position: 'relative',
  paddingTop: '0px',
  overflow: 'visible',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.03) 0%, transparent 50%)',
    animation: 'rotate 30s linear infinite',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    height: '300px',
    background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.08) 0%, rgba(0, 225, 255, 0.05) 30%, transparent 70%)',
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

const HeroContent = styled(Box)({
  textAlign: 'center',
  zIndex: 1,
  maxWidth: 'none',
  width: '100%',
  paddingInline: '32px',
  overflow: 'visible',
});

const HeroTitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(4.5rem, 5vw, 3rem)',
  fontWeight: 900,
  background: 'linear-gradient(135deg, #fff 0%, #38bdf8 50%, #00e1ff 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  letterSpacing: '-0.02em',
  lineHeight: 1.4,
  textShadow: `
    0 0 20px rgba(56, 189, 248, 0.5),
    0 0 40px rgba(56, 189, 248, 0.3),
    0 0 60px rgba(0, 225, 255, 0.2),
    0 4px 8px rgba(0, 0, 0, 0.3),
    0 8px 16px rgba(0, 0, 0, 0.2),
    0 16px 32px rgba(0, 0, 0, 0.1)
  `,
  animation: 'shimmer 3s ease-in-out infinite',
  maxWidth: 'none',
  width: 'auto',
  display: 'inline-block',
  paddingInline: '1rem',
  margin: '0rem auto 2rem auto',
  transform: 'translateX(-50%)',
  left: '50%',
  position: 'relative',
  zIndex: 2,
  overflow: 'visible',
  wordBreak: 'normal',
  overflowWrap: 'normal',
  textAlign: 'center',
  '@keyframes shimmer': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.85 },
  },
  '& .light-text': {
    fontWeight: '300 !important',
    background: 'white !important',
    WebkitBackgroundClip: 'text !important',
    WebkitTextFillColor: 'transparent !important',
    backgroundClip: 'text !important',
  },
  '& .no-wrap': {
    whiteSpace: 'nowrap',
    wordBreak: 'keep-all',
    overflowWrap: 'normal',
    display: 'inline-block',
    textShadow: '0 0 15px rgb(56 189 248 / 0%), 0 0 30px rgb(56 189 248 / 0%), 0 0 45px rgba(0, 225, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.05)',
  },
  '& .highlight-text': {
    position: 'relative',
    display: 'inline-block',
    background: 'linear-gradient(135deg, #fff 0%, #38bdf8 50%, #00e1ff 100%)',
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
  fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
  color: theme.palette.text.secondary,
  marginBottom: '3rem',
  lineHeight: 1.6,
}));

const LogInputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'stretch',
  gap: 0,
  marginBottom: '0rem',
  padding: 0,
  background: 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(3,7,18,0.9) 100%)',
  border: '1px solid rgba(56, 189, 248, 0.2)',
  borderRadius: '16px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.6), transparent)',
  },
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

const ToolsSection = styled(Container)(({ theme }) => ({
  padding: '0rem 0rem 0rem 0rem',
  paddingTop: 0,
  maxWidth: '1200px',
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  textAlign: 'center',
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: '1rem',
  marginTop: '6rem',
  color: theme.palette.text.primary,
}));

const SectionSubtitle = styled(Typography)(({ theme }) => ({
  textAlign: 'center',
  color: theme.palette.text.secondary,
  marginBottom: '3rem',
  fontSize: '1.2rem',
}));

const ToolsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '2rem',
  marginTop: '3rem',
}));

const ToolCard = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)',
  border: '1px solid #1f2937',
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
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 60px rgba(56, 189, 248, 0.1)',
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
  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(56, 189, 248, 0.05))',
  color: '#e9fbff',
  border: '1px solid rgba(56, 189, 248, 0.3)',
  borderRadius: '8px',
  transition: 'all 0.3s ease',
  fontWeight: 600,
  '&:hover': {
    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(56, 189, 248, 0.15))',
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

const BadgeContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '2rem',
});


export const LandingPage: React.FC = () => {
  const [logUrl, setLogUrl] = useState('');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <LandingContainer>

      <HeroSection id="home">
        <HeroContent className="u-fade-in-up">
          <HeroTitle variant="h1">
            <span className="light-text">Essential Tools</span>
            <br />
            <span className="no-wrap">For <span className="highlight-text">Your ESO Journey</span></span>
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
                  borderRadius: '16px 0 0 16px',
                  height: '64px',
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
                  color: '#94a3b8',
                  left: '1.5rem',
                  top: '2px',
                  '&.Mui-focused': {
                    color: '#38bdf8',
                  },
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(1.5rem, -6px) scale(0.75)',
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: '0 8px',
                    borderRadius: '4px',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '18px 0',
                  color: '#e5e7eb',
                  fontSize: '1rem',
                },
              }}
              InputProps={{ 
                startAdornment: <LinkIcon sx={{ mr: 1, color: '#38bdf8', ml: 0 }} /> 
              }}
            />
            <Button
              variant="contained"
              color="secondary"
              sx={{ 
                minWidth: 200,
                height: 64,
                background: 'linear-gradient(135deg, #38bdf8 0%, #00e1ff 50%, #0ea5e9 100%)',
                color: '#0b1220',
                fontWeight: 700,
                fontSize: '1.1rem',
                borderRadius: '0 16px 16px 0',
                border: 'none',
                boxShadow: 'none',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'none',
                letterSpacing: '0.5px',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%)',
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
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                  transition: 'left 0.6s ease',
                },
                '&:hover': {
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #00e1ff 100%)',
                  transform: 'scale(1.02)',
                  '&::before': {
                    opacity: 1,
                  },
                  '&::after': {
                    left: '100%',
                  },
                },
                '&:active': {
                  transform: 'scale(1.01)',
                },
              }}
              onClick={handleLoadLog}
            >
              Load Log
            </Button>
          </LogInputContainer>

        </HeroContent>
      </HeroSection>

      <ToolsSection id="tools">
        <BadgeContainer>
          <MarketingBadge>
            ⚔️ Battle-Tested by ESO Veterans
          </MarketingBadge>
        </BadgeContainer>
        <SectionTitle>Our Tools</SectionTitle>
        <SectionSubtitle>Everything you need to excel in Tamriel</SectionSubtitle>
        
        <ToolsGrid>
          <ToolCard>
            <ToolIcon>📝</ToolIcon>
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary' }}>
              Text Editor
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 2, flex: 1 }}>
              Create eye-catching MOTD and group finder posts with our visual editor. 
              Design messages that stand out with custom styles and formatting.
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
              Optimize your character's stats with our comprehensive calculator. 
              Track penetration, critical damage, and armor to hit those crucial caps.
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
              Deep dive into your ESO combat logs with advanced analytics. 
              Analyze player performance, damage patterns, and raid insights with detailed breakdowns.
            </Typography>
            <ToolFeatures>
              <li>Combat performance analysis</li>
              <li>Player damage breakdowns</li>
              <li>Skill usage tracking</li>
              <li>Real-time fight insights</li>
            </ToolFeatures>
            <ToolAction 
              onClick={() => window.open('https://github.com/bkrupa/eso-log-aggregator', '_blank', 'noopener,noreferrer')}
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
              Manage your guild roster effortlessly with our Discord bot. 
              Track members, roles, and raid signups all in one place.
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
        <SectionTitle>Built By Players, For Players</SectionTitle>
        <SectionSubtitle>
          ESO Helper Tools is a community-driven project dedicated to enhancing your 
          Elder Scrolls Online experience. Our tools are constantly updated to match 
          the latest game patches and meta changes.
        </SectionSubtitle>
      </ToolsSection>

      <Box
        component="footer"
        sx={{
          padding: '3rem 2rem',
          background: 'linear-gradient(180deg, transparent, rgba(3,7,18,0.8))',
          borderTop: '1px solid #1f2937',
          marginTop: '4rem',
          textAlign: 'center',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2, flexWrap: 'wrap' }}>
          <a href="https://esohelper.tools/text-editor" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none' }}>Text Editor</a>
          <a href="https://esohelper.tools/calculator" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none' }}>Calculator</a>
          <a href="https://discord.gg/mMjwcQYFdc" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none' }}>Discord</a>
          <a href="https://github.com/esohelper" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none' }}>GitHub</a>
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          © 2024 ESO Helper Tools. Not affiliated with ZeniMax Online Studios or Bethesda.
        </Typography>
      </Box>
    </LandingContainer>
  );
};
