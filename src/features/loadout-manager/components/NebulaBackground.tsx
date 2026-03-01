/**
 * Enhanced Nebula Background Component
 * Cosmic/nebula background with multi-layered blend mode composition,
 * floating particles with glow halos, star fields, and animated nebula clouds
 * Creates a fantasy RPG space atmosphere for the loadout manager
 */

import { Box } from '@mui/material';
import React, { useMemo } from 'react';

/**
 * Enhanced nebula background with:
 * - Multi-layered blend mode composition
 * - SVG turbulence for organic movement
 * - Improved particle system with glow halos
 */
export const NebulaBackground: React.FC = () => {
  // Generate particles with enhanced properties
  const particles = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 8 + Math.random() * 15,
      delay: Math.random() * 8,
      opacity: 0.15 + Math.random() * 0.6,
      hasGlow: Math.random() > 0.7, // 30% of particles have glow
    }));
  }, []);

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
          @keyframes starTwinkle {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.9; transform: scale(1.3); }
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

      {/* Layer 2: Animated nebula clouds with blur */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {/* Purple nebula cloud */}
        <Box
          sx={{
            position: 'absolute',
            width: '70%',
            height: '70%',
            top: '15%',
            left: '5%',
            background: 'radial-gradient(ellipse, rgba(120, 60, 230, 0.2), transparent 70%)',
            filter: 'blur(80px)',
            animation: 'nebulaDriftSlow 40s ease-in-out infinite',
          }}
        />

        {/* Cyan nebula cloud */}
        <Box
          sx={{
            position: 'absolute',
            width: '55%',
            height: '55%',
            bottom: '15%',
            right: '5%',
            background: 'radial-gradient(ellipse, rgba(0, 217, 255, 0.15), transparent 70%)',
            filter: 'blur(70px)',
            animation: 'nebulaDriftMedium 30s ease-in-out infinite reverse',
          }}
        />

        {/* Magenta accent nebula */}
        <Box
          sx={{
            position: 'absolute',
            width: '45%',
            height: '45%',
            top: '35%',
            right: '25%',
            background: 'radial-gradient(ellipse, rgba(180, 60, 200, 0.12), transparent 70%)',
            filter: 'blur(60px)',
            animation: 'nebulaDriftSlow 50s ease-in-out infinite',
          }}
        />
      </Box>

      {/* Layer 3: Star particles */}
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

      {/* Layer 4: Subtle grid overlay */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 3,
          backgroundImage: `
            linear-gradient(rgba(0, 217, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};
