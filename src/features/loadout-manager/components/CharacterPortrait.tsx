/**
 * Character Portrait Component
 * Circular character portrait with glossy orb effect and metallic ornate frame
 * Features animated glow and optional level badge
 */

import { Box, Typography } from '@mui/material';
import React from 'react';

interface CharacterPortraitProps {
  name: string;
  imageUrl?: string;
  level?: number;
  classType?: string;
  size?: number;
}

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
  name,
  imageUrl,
  level,
  classType,
  size = 120,
}) => {
  return (
    <>
      <style>
        {`
          @keyframes frameGlow {
            0%, 100% {
              box-shadow:
                0 0 20px rgba(0, 217, 255, 0.4),
                inset 0 0 20px rgba(0, 217, 255, 0.2);
            }
            50% {
              box-shadow:
                0 0 30px rgba(0, 217, 255, 0.6),
                inset 0 0 30px rgba(0, 217, 255, 0.3);
            }
          }
        `}
      </style>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {/* Portrait frame with metallic border */}
        <Box
          sx={{
            position: 'relative',
            width: size,
            height: size,
          }}
        >
          {/* Outer glow ring */}
          <Box
            sx={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: '2px solid transparent',
              background: `
                linear-gradient(#0f192d, #0f192d) padding-box,
                linear-gradient(135deg,
                  rgba(0, 217, 255, 0.6),
                  rgba(255, 255, 255, 0.3),
                  rgba(0, 217, 255, 0.5)
                ) border-box
              `,
              boxShadow: `
                0 0 20px rgba(0, 217, 255, 0.4),
                inset 0 0 20px rgba(0, 217, 255, 0.2)
              `,
              animation: 'frameGlow 3s ease-in-out infinite',
            }}
          />

          {/* Portrait with glossy orb effect */}
          <Box
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              overflow: 'hidden',
              background: imageUrl
                ? `url(${imageUrl}) center/cover`
                : 'radial-gradient(circle, #1a2332, #0f192d)',
              border: '3px solid #00d9ff',
              boxShadow: `
                inset 0 0 30px rgba(0, 217, 255, 0.3),
                0 0 20px rgba(0, 217, 255, 0.4)
              `,
              position: 'relative',
            }}
          >
            {/* Glossy overlay */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                background: `
                  radial-gradient(circle at 30% 25%,
                    rgba(255, 255, 255, 0.3) 0%,
                    transparent 50%
                  )
                `,
                pointerEvents: 'none',
              }}
            />

            {/* Inner specular highlight */}
            <Box
              sx={{
                position: 'absolute',
                top: '15%',
                left: '20%',
                width: '30%',
                height: '30%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.5), transparent)',
                filter: 'blur(4px)',
                pointerEvents: 'none',
              }}
            />
          </Box>

          {/* Level badge */}
          {level && (
            <Box
              sx={{
                position: 'absolute',
                bottom: -5,
                backgroundColor: 'rgba(0, 217, 255, 0.95)',
                color: '#0a0f1e',
                fontWeight: 700,
                fontSize: size < 100 ? '0.65rem' : '0.75rem',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                boxShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              {level}
            </Box>
          )}
        </Box>

        {/* Character name */}
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: size < 100 ? '0.875rem' : '1rem',
            color: '#ffffff',
            textShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
            textAlign: 'center',
          }}
        >
          {name}
        </Typography>

        {classType && (
          <Typography
            sx={{
              fontSize: '0.7rem',
              color: '#7a8599',
              textTransform: 'uppercase',
              letterSpacing: 1,
              textAlign: 'center',
            }}
          >
            {classType}
          </Typography>
        )}
      </Box>
    </>
  );
};
