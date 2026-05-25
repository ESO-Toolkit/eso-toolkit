/**
 * Enhanced Nebula Background Component
 * Cosmic/nebula background with multi-layered blend mode composition,
 * floating particles with glow halos, and animated nebula clouds.
 *
 * Performance-aware: respects usePerfTier and prefers-reduced-motion.
 * Particle count and blur filters are tuned to avoid iOS Safari GPU crashes.
 */

import { Box } from '@mui/material';
import React, { useMemo } from 'react';

import { usePerfTier } from '../../../hooks/usePerfTier';

const PARTICLE_COUNTS: Record<string, number> = {
  low: 0,
  medium: 20,
  high: 25,
};

export const NebulaBackground: React.FC = () => {
  const perfTier = usePerfTier();
  const particleCount = PARTICLE_COUNTS[perfTier] ?? 20;

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 8 + Math.random() * 15,
      delay: Math.random() * 8,
      opacity: 0.15 + Math.random() * 0.6,
      hasGlow: Math.random() > 0.7,
    }));
  }, [particleCount]);

  const animate = perfTier !== 'low';

  return (
    <>
      <style>
        {`
          @keyframes nebulaFloat {
            0%, 100% {
              transform: translateY(0) translateX(0) scale(1);
              opacity: 0.3;
            }
            25% {
              transform: translateY(-15px) translateX(8px) scale(1.05);
              opacity: 0.7;
            }
            50% {
              transform: translateY(-25px) translateX(-5px) scale(0.95);
              opacity: 0.5;
            }
            75% {
              transform: translateY(-12px) translateX(12px) scale(1.02);
              opacity: 0.8;
            }
          }
          @keyframes nebulaDriftSlow {
            0%, 100% { transform: scale(1) translate(0, 0) rotate(0deg); }
            50% { transform: scale(1.15) translate(-30px, 15px) rotate(2deg); }
          }
          @keyframes nebulaDriftMedium {
            0%, 100% { transform: scale(1) translate(0, 0) rotate(0deg); }
            50% { transform: scale(1.2) translate(25px, -10px) rotate(-2deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
            }
          }
        `}
      </style>

      {/* Layer 1: Base nebula background */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(100, 50, 255, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(0, 217, 255, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(50, 0, 100, 0.1) 0%, transparent 60%),
            linear-gradient(135deg, #050810 0%, #0a0f1e 50%, #050810 100%)
          `,
        }}
      />

      {/* Layer 2: Nebula clouds — pre-diffused gradients, no filter:blur */}
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
            width: '90%',
            height: '90%',
            top: '5%',
            left: '-5%',
            background: 'radial-gradient(ellipse, rgba(120, 60, 230, 0.12) 0%, transparent 55%)',
            animation: animate ? 'nebulaDriftSlow 40s ease-in-out infinite' : 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: '75%',
            height: '75%',
            bottom: '5%',
            right: '-5%',
            background: 'radial-gradient(ellipse, rgba(0, 217, 255, 0.09) 0%, transparent 55%)',
            animation: animate ? 'nebulaDriftMedium 30s ease-in-out infinite reverse' : 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: '65%',
            height: '65%',
            top: '25%',
            right: '15%',
            background: 'radial-gradient(ellipse, rgba(180, 60, 200, 0.07) 0%, transparent 55%)',
            animation: animate ? 'nebulaDriftSlow 50s ease-in-out infinite' : 'none',
          }}
        />
      </Box>

      {/* Layer 3: Star particles */}
      {particleCount > 0 && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {particles.map((p) => (
            <Box
              key={p.id}
              sx={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                background: `rgba(255, 255, 255, ${p.opacity})`,
                borderRadius: '50%',
                left: `${p.left}%`,
                top: `${p.top}%`,
                animation: `nebulaFloat ${p.duration}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
                boxShadow: p.hasGlow
                  ? `0 0 ${p.size * 3}px rgba(255, 255, 255, ${p.opacity * 0.6})`
                  : 'none',
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
            linear-gradient(transparent 24px, rgba(0, 217, 255, 0.025) 24px, rgba(0, 217, 255, 0.025) 25px, transparent 25px),
            linear-gradient(90deg, transparent 24px, rgba(0, 217, 255, 0.025) 24px, rgba(0, 217, 255, 0.025) 25px, transparent 25px)
          `,
          backgroundSize: '50px 50px',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};
