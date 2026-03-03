/**
 * Aurora Background Component (Light Mode)
 *
 * Light-mode counterpart to NebulaBackground. Renders an ethereal,
 * luminous atmosphere with soft pastel gradient clouds, floating light motes,
 * and gentle movement — like sunlit mist or a faint daytime aurora.
 *
 * Layers (back → front):
 *   1. Base gradient wash — warm-white to cool-blue foundation
 *   2. Animated pastel clouds — soft lavender, sky-blue, and rose blobs with drift + blur
 *   3. Light-mote particles — tiny coloured dots that float gently
 *   4. Subtle grid overlay — faint structural grid, echoing dark-mode nebula
 */

import { Box } from '@mui/material';
import React, { useMemo } from 'react';

// Mote colour palette — soft pastels that feel luminous on white
const MOTE_COLORS = [
  'rgba(147, 130, 220, 0.45)', // lavender
  'rgba(56, 189, 248, 0.40)', // sky blue
  'rgba(94, 234, 212, 0.35)', // teal
  'rgba(236, 172, 190, 0.35)', // rose
  'rgba(165, 180, 252, 0.40)', // periwinkle
] as const;

export const AuroraBackground: React.FC = () => {
  // Generate mote particles — fewer and subtler than dark-mode stars
  const motes = useMemo(() => {
    return Array.from({ length: 45 }, (_, i) => ({
      id: i,
      size: Math.random() * 3.5 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 10 + Math.random() * 18,
      delay: Math.random() * 10,
      opacity: 0.25 + Math.random() * 0.5,
      color: MOTE_COLORS[i % MOTE_COLORS.length],
      hasGlow: Math.random() > 0.75, // 25 % of motes get a soft halo
    }));
  }, []);

  return (
    <>
      {/* ── Keyframe animations ── */}
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

          @keyframes aurShimmer {
            0%, 100% { opacity: 0.3; }
            50%      { opacity: 0.6; }
          }
        `}
      </style>

      {/* ── Layer 1: Base gradient wash ── */}
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

      {/* ── Layer 2: Animated pastel clouds ── */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {/* Lavender cloud — upper-left */}
        <Box
          sx={{
            position: 'absolute',
            width: '65%',
            height: '65%',
            top: '10%',
            left: '5%',
            background: 'radial-gradient(ellipse, rgba(165, 180, 252, 0.14), transparent 70%)',
            filter: 'blur(80px)',
            animation: 'aurCloudDriftA 42s ease-in-out infinite',
          }}
        />

        {/* Sky-blue cloud — lower-right */}
        <Box
          sx={{
            position: 'absolute',
            width: '55%',
            height: '55%',
            bottom: '10%',
            right: '5%',
            background: 'radial-gradient(ellipse, rgba(56, 189, 248, 0.10), transparent 70%)',
            filter: 'blur(70px)',
            animation: 'aurCloudDriftB 34s ease-in-out infinite reverse',
          }}
        />

        {/* Rose cloud — centre */}
        <Box
          sx={{
            position: 'absolute',
            width: '45%',
            height: '45%',
            top: '30%',
            right: '20%',
            background: 'radial-gradient(ellipse, rgba(236, 172, 190, 0.10), transparent 70%)',
            filter: 'blur(65px)',
            animation: 'aurCloudDriftC 48s ease-in-out infinite',
          }}
        />

        {/* Teal accent cloud — bottom-left */}
        <Box
          sx={{
            position: 'absolute',
            width: '40%',
            height: '40%',
            bottom: '20%',
            left: '15%',
            background: 'radial-gradient(ellipse, rgba(94, 234, 212, 0.08), transparent 70%)',
            filter: 'blur(60px)',
            animation: 'aurCloudDriftA 52s ease-in-out infinite reverse',
          }}
        />
      </Box>

      {/* ── Layer 3: Light-mote particles ── */}
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

      {/* ── Layer 4: Subtle grid overlay ── */}
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
