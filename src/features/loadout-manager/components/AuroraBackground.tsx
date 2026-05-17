/**
 * Aurora Background Component (Light Mode)
 *
 * Light-mode counterpart to NebulaBackground. Renders an ethereal,
 * luminous atmosphere with soft pastel gradient clouds, floating light motes,
 * and gentle movement.
 *
 * Performance-aware: respects usePerfTier and prefers-reduced-motion.
 * Particle count and blur filters are tuned to avoid iOS Safari GPU crashes.
 */

import { Box } from '@mui/material';
import React, { useMemo } from 'react';

import { usePerfTier } from '../../../hooks/usePerfTier';

const MOTE_COLORS = [
  'rgba(147, 130, 220, 0.45)',
  'rgba(56, 189, 248, 0.40)',
  'rgba(94, 234, 212, 0.35)',
  'rgba(236, 172, 190, 0.35)',
  'rgba(165, 180, 252, 0.40)',
] as const;

const PARTICLE_COUNTS: Record<string, number> = {
  low: 0,
  medium: 15,
  high: 20,
};

export const AuroraBackground: React.FC = () => {
  const perfTier = usePerfTier();
  const particleCount = PARTICLE_COUNTS[perfTier] ?? 15;

  const motes = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      size: Math.random() * 3.5 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 10 + Math.random() * 18,
      delay: Math.random() * 10,
      opacity: 0.25 + Math.random() * 0.5,
      color: MOTE_COLORS[i % MOTE_COLORS.length],
      hasGlow: Math.random() > 0.75,
    }));
  }, [particleCount]);

  const animate = perfTier !== 'low';

  return (
    <>
      <style>
        {`
          @keyframes aurMoteFloat {
            0%, 100% {
              transform: translateY(0) translateX(0) scale(1);
              opacity: 0.25;
            }
            25% {
              transform: translateY(-12px) translateX(6px) scale(1.04);
              opacity: 0.55;
            }
            50% {
              transform: translateY(-20px) translateX(-4px) scale(0.96);
              opacity: 0.4;
            }
            75% {
              transform: translateY(-10px) translateX(10px) scale(1.02);
              opacity: 0.6;
            }
          }

          @keyframes aurCloudDriftA {
            0%, 100% { transform: scale(1) translate(0, 0) rotate(0deg); }
            50%      { transform: scale(1.12) translate(-25px, 12px) rotate(1.5deg); }
          }

          @keyframes aurCloudDriftB {
            0%, 100% { transform: scale(1) translate(0, 0) rotate(0deg); }
            50%      { transform: scale(1.18) translate(20px, -8px) rotate(-1.5deg); }
          }

          @keyframes aurCloudDriftC {
            0%, 100% { transform: scale(1) translate(0, 0) rotate(0deg); }
            50%      { transform: scale(1.1) translate(-15px, -10px) rotate(1deg); }
          }

          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
            }
          }
        `}
      </style>

      {/* Layer 1: Base gradient wash */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background: `
            radial-gradient(ellipse at 25% 20%, rgba(165, 180, 252, 0.10) 0%, transparent 55%),
            radial-gradient(ellipse at 75% 75%, rgba(56, 189, 248, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 50%, rgba(236, 172, 190, 0.05) 0%, transparent 60%),
            linear-gradient(160deg, #f0f4ff 0%, #f8fafc 35%, #fdf2f8 65%, #f0fdfa 100%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Layer 2: Pastel clouds — pre-diffused gradients, no filter:blur */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: '85%',
            height: '85%',
            top: '0%',
            left: '-5%',
            background: 'radial-gradient(ellipse, rgba(165, 180, 252, 0.08) 0%, transparent 50%)',
            animation: animate ? 'aurCloudDriftA 42s ease-in-out infinite' : 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: '75%',
            height: '75%',
            bottom: '0%',
            right: '-5%',
            background: 'radial-gradient(ellipse, rgba(56, 189, 248, 0.06) 0%, transparent 50%)',
            animation: animate ? 'aurCloudDriftB 34s ease-in-out infinite reverse' : 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: '65%',
            height: '65%',
            top: '20%',
            right: '10%',
            background: 'radial-gradient(ellipse, rgba(236, 172, 190, 0.06) 0%, transparent 50%)',
            animation: animate ? 'aurCloudDriftC 48s ease-in-out infinite' : 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: '60%',
            height: '60%',
            bottom: '10%',
            left: '5%',
            background: 'radial-gradient(ellipse, rgba(94, 234, 212, 0.05) 0%, transparent 50%)',
            animation: animate ? 'aurCloudDriftA 52s ease-in-out infinite reverse' : 'none',
          }}
        />
      </Box>

      {/* Layer 3: Light-mote particles */}
      {particleCount > 0 && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {motes.map((m) => (
            <Box
              key={m.id}
              sx={{
                position: 'absolute',
                width: m.size,
                height: m.size,
                background: m.color,
                borderRadius: '50%',
                left: `${m.left}%`,
                top: `${m.top}%`,
                animation: `aurMoteFloat ${m.duration}s ease-in-out infinite`,
                animationDelay: `${m.delay}s`,
                boxShadow: m.hasGlow ? `0 0 ${m.size * 4}px ${m.color}` : 'none',
              }}
            />
          ))}
        </Box>
      )}

      {/* Layer 4: Subtle grid overlay */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 3,
          backgroundImage: `
            linear-gradient(transparent 24px, rgba(165, 180, 252, 0.03) 24px, rgba(165, 180, 252, 0.03) 25px, transparent 25px),
            linear-gradient(90deg, transparent 24px, rgba(165, 180, 252, 0.03) 24px, rgba(165, 180, 252, 0.03) 25px, transparent 25px)
          `,
          backgroundSize: '50px 50px',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};
