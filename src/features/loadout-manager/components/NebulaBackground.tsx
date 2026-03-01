/**
 * Enhanced Nebula Background Component
 * Cosmic/nebula background with multi-layered blend mode composition,
 * floating particles with glow halos, star fields, and animated nebula clouds
 * Creates a fantasy RPG space atmosphere for the loadout manager
 * Supports both dark and light mode themes
 */

import { Box } from '@mui/material';
import React, { useMemo } from 'react';

interface NebulaBackgroundProps {
  darkMode?: boolean;
}

/**
 * Enhanced nebula background with:
 * - Multi-layered blend mode composition
 * - SVG turbulence for organic movement
 * - Improved particle system with glow halos
 * - Theme-aware color palettes
 */
export const NebulaBackground: React.FC<NebulaBackgroundProps> = ({ darkMode = true }) => {
  // Color palettes based on theme mode
  const colors = useMemo(() => {
    if (darkMode) {
      return {
        // Dark mode: deep space blues and cosmic purples
        baseGradient: 'linear-gradient(135deg, #050810 0%, #0a0f1e 50%, #050810 100%)',
        baseRadial1: 'rgba(100, 50, 255, 0.15)',
        baseRadial2: 'rgba(0, 217, 255, 0.12)',
        baseRadial3: 'rgba(50, 0, 100, 0.1)',
        purpleCloud: 'rgba(120, 60, 230, 0.2)',
        cyanCloud: 'rgba(0, 217, 255, 0.15)',
        magentaCloud: 'rgba(180, 60, 200, 0.12)',
        particle: 'rgba(255, 255, 255,',
        particleGlow: 'rgba(255, 255, 255,',
        grid: 'rgba(0, 217, 255, 0.025)',
      };
    } else {
      return {
        // Light mode: soft pastels on light gray
        baseGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
        baseRadial1: 'rgba(139, 92, 246, 0.06)',
        baseRadial2: 'rgba(14, 165, 233, 0.05)',
        baseRadial3: 'rgba(168, 85, 247, 0.04)',
        purpleCloud: 'rgba(139, 92, 246, 0.08)',
        cyanCloud: 'rgba(14, 165, 233, 0.06)',
        magentaCloud: 'rgba(219, 39, 119, 0.05)',
        particle: 'rgba(30, 41, 59,',
        particleGlow: 'rgba(139, 92, 246,',
        grid: 'rgba(14, 165, 233, 0.04)',
      };
    }
  }, [darkMode]);

  // Generate particles with enhanced properties
  const particles = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 8 + Math.random() * 15,
      delay: Math.random() * 8,
      opacity: darkMode ? 0.15 + Math.random() * 0.6 : 0.1 + Math.random() * 0.3,
      hasGlow: Math.random() > 0.7, // 30% of particles have glow
    }));
  }, [darkMode]);

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
            radial-gradient(ellipse at 20% 30%, ${colors.baseRadial1} 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, ${colors.baseRadial2} 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, ${colors.baseRadial3} 0%, transparent 60%),
            ${colors.baseGradient}
          `,
          transition: 'background 0.3s ease-in-out',
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
            background: `radial-gradient(ellipse, ${colors.purpleCloud}, transparent 70%)`,
            filter: 'blur(80px)',
            animation: 'nebulaDriftSlow 40s ease-in-out infinite',
            transition: 'background 0.3s ease-in-out',
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
            background: `radial-gradient(ellipse, ${colors.cyanCloud}, transparent 70%)`,
            filter: 'blur(70px)',
            animation: 'nebulaDriftMedium 30s ease-in-out infinite reverse',
            transition: 'background 0.3s ease-in-out',
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
            background: `radial-gradient(ellipse, ${colors.magentaCloud}, transparent 70%)`,
            filter: 'blur(60px)',
            animation: 'nebulaDriftSlow 50s ease-in-out infinite',
            transition: 'background 0.3s ease-in-out',
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
              background: `${colors.particle} ${p.opacity})`,
              borderRadius: '50%',
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `nebulaFloat ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
              boxShadow: p.hasGlow
                ? `0 0 ${p.size * 3}px ${colors.particleGlow} ${p.opacity * 0.6})`
                : 'none',
              transition: 'background 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
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
            linear-gradient(transparent 24px, ${colors.grid} 24px, ${colors.grid} 25px, transparent 25px),
            linear-gradient(90deg, transparent 24px, ${colors.grid} 24px, ${colors.grid} 25px, transparent 25px)
          `,
          backgroundSize: '50px 50px',
          opacity: darkMode ? 0.4 : 0.3,
          pointerEvents: 'none',
          transition: 'opacity 0.3s ease-in-out, background-image 0.3s ease-in-out',
        }}
      />
    </>
  );
};
