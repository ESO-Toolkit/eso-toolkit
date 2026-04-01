import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, keyframes, styled } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Keyframes                                                         */
/* ------------------------------------------------------------------ */

const float = keyframes`
  0%, 100% { transform: translateY(0) }
  50%      { transform: translateY(-6px) }
`;

const pulseRing = keyframes`
  0%   { transform: scale(0.8); opacity: 0.6 }
  50%  { transform: scale(1.15); opacity: 0 }
  100% { transform: scale(0.8); opacity: 0 }
`;

const checkDraw = keyframes`
  0%   { stroke-dashoffset: 48 }
  100% { stroke-dashoffset: 0 }
`;

const fadeInUp = keyframes`
  0%   { opacity: 0; transform: translateY(18px) }
  100% { opacity: 1; transform: translateY(0) }
`;

const orbDrift = keyframes`
  0%   { transform: translate(0, 0) scale(1) }
  33%  { transform: translate(30px, -20px) scale(1.1) }
  66%  { transform: translate(-15px, 15px) scale(0.95) }
  100% { transform: translate(0, 0) scale(1) }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center }
  100% { background-position: 200% center }
`;

/* ------------------------------------------------------------------ */
/*  Styled pieces                                                      */
/* ------------------------------------------------------------------ */

const Backdrop = styled(Box)(({ theme }) => ({
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  background:
    theme.palette.mode === 'dark'
      ? 'radial-gradient(ellipse 80% 60% at 50% 40%, #0d1f3c 0%, #0b1220 70%, #060a12 100%)'
      : 'radial-gradient(ellipse 80% 60% at 50% 40%, #e0efff 0%, #f8fafc 70%, #eef4fb 100%)',
}));

const Orb = styled(Box)<{ size: number; x: string; y: string; delay: number; color: string }>(
  ({ size, x, y, delay, color }) => ({
    position: 'absolute',
    width: size,
    height: size,
    left: x,
    top: y,
    borderRadius: '50%',
    background: color,
    filter: 'blur(60px)',
    opacity: 0.35,
    animation: `${orbDrift} ${8 + delay}s ease-in-out infinite`,
    animationDelay: `${delay}s`,
    pointerEvents: 'none',
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  }),
);

const GlassCard = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 24,
  padding: '48px 56px',
  maxWidth: 440,
  width: '90vw',
  borderRadius: 24,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(3,7,18,0.55) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(248,250,252,0.78) 100%)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${alpha(
    theme.palette.mode === 'dark' ? '#38bdf8' : '#0f172a',
    theme.palette.mode === 'dark' ? 0.15 : 0.08,
  )}`,
  boxShadow:
    theme.palette.mode === 'dark'
      ? `0 24px 80px rgba(0,0,0,0.45), 0 0 120px ${alpha('#38bdf8', 0.06)}`
      : '0 12px 40px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04)',
  animation: `${fadeInUp} 0.7s cubic-bezier(0.22, 1, 0.36, 1) both`,
  animationDelay: '0.2s',
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    opacity: 1,
  },
}));

const CheckCircle = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: 80,
  height: 80,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: `${float} 3s ease-in-out infinite`,
  animationDelay: '0.8s',
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
  // Pulse ring behind
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: -12,
    borderRadius: '50%',
    border: `2px solid ${theme.palette.mode === 'dark' ? '#22c55e' : '#059669'}`,
    animation: `${pulseRing} 2.4s ease-out infinite`,
    animationDelay: '1s',
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      opacity: 0,
    },
  },
}));

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const KalpaAuthSuccess = () => {
  const [showCountdown, setShowCountdown] = useState(false);
  const [seconds, setSeconds] = useState(10);
  const [closeFailed, setCloseFailed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    // Show countdown after initial animation settles
    const timer = setTimeout(() => setShowCountdown(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showCountdown) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          window.close();
          // window.close() is silently ignored unless the tab was script-opened
          setCloseFailed(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [showCountdown]);

  return (
    <Backdrop>
      {/* Ambient orbs */}
      <Orb size={260} x="10%" y="20%" delay={0} color="rgba(56,189,248,0.4)" />
      <Orb size={200} x="70%" y="60%" delay={2} color="rgba(34,197,94,0.35)" />
      <Orb size={180} x="50%" y="10%" delay={4} color="rgba(139,92,246,0.3)" />
      <Orb size={140} x="80%" y="15%" delay={1} color="rgba(0,225,255,0.25)" />
      <Orb size={160} x="20%" y="75%" delay={3} color="rgba(56,189,248,0.25)" />

      <GlassCard>
        {/* Animated check icon */}
        <CheckCircle>
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="url(#successGradient)"
              fillOpacity="0.12"
              stroke="url(#successGradient)"
              strokeWidth="2.5"
            />
            {/* Checkmark */}
            <path
              d="M26 40 L35 50 L54 30"
              stroke="url(#successGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray: 48,
                strokeDashoffset: 0,
                animation: `${checkDraw} 0.6s cubic-bezier(0.65, 0, 0.35, 1) both`,
                animationDelay: '0.6s',
              }}
            />
            <defs>
              <linearGradient id="successGradient" x1="0" y1="0" x2="80" y2="80">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>
        </CheckCircle>

        {/* Title */}
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontWeight: 700,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #22c55e 0%, #38bdf8 50%, #00e1ff 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% auto',
            animation: `${shimmer} 4s linear infinite`,
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              backgroundPosition: 'center',
            },
          }}
        >
          Signed in!
        </Typography>

        {/* Subtitle */}
        <Typography
          sx={(theme) => ({
            color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
            fontSize: '1.05rem',
            textAlign: 'center',
            lineHeight: 1.6,
            animation: `${fadeInUp} 0.6s cubic-bezier(0.22, 1, 0.36, 1) both`,
            animationDelay: '0.5s',
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              opacity: 1,
            },
          })}
        >
          You can close this tab and return to{' '}
          <Box
            component="span"
            sx={{
              fontWeight: 600,
              background: 'linear-gradient(135deg, #38bdf8, #00e1ff)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Kalpa
          </Box>
          .
        </Typography>

        {/* Auto-close countdown */}
        {showCountdown && (
          <Typography
            sx={(theme) => ({
              color: alpha(theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', 0.6),
              fontSize: '0.8rem',
              textAlign: 'center',
              animation: `${fadeInUp} 0.4s ease both`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
                opacity: 1,
              },
            })}
          >
            {closeFailed
              ? 'You can safely close this tab now.'
              : `This tab will try to close in ${seconds}s`}
          </Typography>
        )}
      </GlassCard>
    </Backdrop>
  );
};
