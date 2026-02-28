/**
 * Enhanced Texture Styles for AAA Fantasy RPG Card-Style Loadout Manager
 * Centralized visual effects including SVG filters, CSS blend modes,
 * nebula backgrounds, metallic borders, glossy orbs, gem icons, and
 * equipped highlights with spring-physics animations.
 */

import { SxProps, Theme } from '@mui/material/styles';

// ============================================================================
// LAYER 1: Background Base
// ============================================================================

export const nebulaBackgroundBase: SxProps<Theme> = {
  position: 'fixed',
  inset: 0,
  background: `
    radial-gradient(ellipse at 20% 30%, rgba(100, 50, 255, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(0, 217, 255, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(50, 0, 100, 0.1) 0%, transparent 60%),
    linear-gradient(135deg, #050810 0%, #0a0f1e 50%, #050810 100%)
  `,
  zIndex: 0,
};

// ============================================================================
// LAYER 3: CSS Blend Mode Overlays
// ============================================================================

/**
 * Screen blend mode overlay for brightening
 * Use on top of dark backgrounds to add luminous depth
 */
export const blendOverlayScreen: SxProps<Theme> = {
  position: 'absolute',
  inset: 0,
  background: `
    radial-gradient(circle at 30% 40%, rgba(167, 139, 250, 0.15) 0%, transparent 40%),
    radial-gradient(circle at 70% 60%, rgba(124, 58, 237, 0.1) 0%, transparent 35%)
  `,
  mixBlendMode: 'screen' as const,
  opacity: 0.7,
  pointerEvents: 'none',
  zIndex: 5,
};

/**
 * Multiply blend mode overlay for darkening/depth
 * Use for ambient occlusion simulation
 */
export const blendOverlayMultiply: SxProps<Theme> = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(circle at 50% 80%, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
  mixBlendMode: 'multiply' as const,
  pointerEvents: 'none',
  zIndex: 5,
};

// ============================================================================
// SVG FILTER APPLICATORS
// ============================================================================

/**
 * Apply metallic shine effect via SVG filter
 * Use on borders and frames
 */
export const withMetallicShine = (baseSx: SxProps<Theme>): SxProps<Theme> => ({
  ...baseSx,
  filter: 'url(#metallicShine)',
});

/**
 * Apply gem glow effect via SVG filter
 * Use on skill icons and gems
 */
export const withGemGlow = (baseSx: SxProps<Theme>): SxProps<Theme> => ({
  ...baseSx,
  filter: 'url(#gemGlow) url(#innerLight)',
});

/**
 * Apply ambient glow for equipped items
 */
export const withAmbientGlow = (baseSx: SxProps<Theme>): SxProps<Theme> => ({
  ...baseSx,
  filter: 'url(#ambientGlow)',
});

// ============================================================================
// ENHANCED COMPONENT STYLES (with SVG filters)
// ============================================================================

/**
 * Main container with metallic border and SVG filter
 */
export const metallicPanelEnhanced: SxProps<Theme> = {
  backgroundColor: 'rgba(15, 25, 45, 0.95)',
  borderRadius: 4,
  border: '3px solid transparent',
  background: `
    linear-gradient(#0f192d, #0f192d) padding-box,
    url(#metallicGradient) border-box
  `,
  boxShadow: `
    0 0 40px rgba(0, 0, 0, 0.8),
    0 0 80px rgba(0, 217, 255, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3)
  `,
  overflow: 'hidden',
  position: 'relative',
  // Apply SVG filter for metallic shine
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    padding: '3px',
    background:
      'linear-gradient(135deg, rgba(255,255,255,0.2), transparent 50%, rgba(255,255,255,0.1))',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    pointerEvents: 'none',
  },
};

/**
 * Sidebar with enhanced metallic border
 */
export const metallicSidebarEnhanced: SxProps<Theme> = {
  width: '30%',
  height: '100%',
  backgroundColor: 'rgba(10, 18, 35, 0.98)',
  borderRadius: 3,
  border: '2px solid transparent',
  background: `
    linear-gradient(rgba(10, 18, 35, 0.98), rgba(10, 18, 35, 0.98)) padding-box,
    linear-gradient(135deg,
      rgba(0, 217, 255, 0.4) 0%,
      rgba(255, 255, 255, 0.15) 25%,
      rgba(0, 217, 255, 0.35) 50%,
      rgba(255, 255, 255, 0.1) 75%,
      rgba(0, 217, 255, 0.4) 100%
    ) border-box
  `,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: `
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 20px rgba(0, 0, 0, 0.4)
  `,
};

/**
 * Details panel with enhanced border
 */
export const metallicDetailsEnhanced: SxProps<Theme> = {
  width: '70%',
  height: '100%',
  backgroundColor: 'rgba(15, 25, 45, 0.92)',
  borderRadius: 3,
  border: '2px solid transparent',
  background: `
    linear-gradient(rgba(15, 25, 45, 0.92), rgba(15, 25, 45, 0.92)) padding-box,
    linear-gradient(135deg,
      rgba(0, 217, 255, 0.35) 0%,
      rgba(255, 255, 255, 0.12) 50%,
      rgba(0, 217, 255, 0.3) 100%
    ) border-box
  `,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: `
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 0 20px rgba(0, 0, 0, 0.4)
  `,
};

// ============================================================================
// GEM ICON STYLES (with SVG filters)
// ============================================================================

/**
 * Gem icon with SVG filter enhancement
 */
export const gemIconEnhanced = (isUltimate: boolean = false): SxProps<Theme> => {
  const color = isUltimate ? '#ff9500' : '#00d9ff';
  const gradientId = isUltimate ? 'url(#gemInnerGlowUltimate)' : 'url(#gemInnerGlow)';
  return {
    borderRadius: '50%',
    background: gradientId,
    boxShadow: `
      inset 0 0 15px ${color}55,
      inset 0 0 6px rgba(255, 255, 255, 0.2),
      inset 0 -2px 8px rgba(0, 0, 0, 0.4),
      0 0 12px ${color}55,
      0 0 0 1px ${color}66
    `,
    border: `1px solid ${color}77`,
    position: 'relative',
    // Apply SVG filters
    filter: 'url(#gemGlow) drop-shadow(0 0 3px rgba(0, 217, 255, 0.5))',
    // Glossy highlight
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: '15%',
      borderRadius: '50%',
      background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), transparent 60%)',
      pointerEvents: 'none',
    },
    // Secondary shine
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '8%',
      left: '12%',
      width: '20%',
      height: '20%',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent)',
      filter: 'blur(1px)',
      pointerEvents: 'none',
    },
    '&:hover': {
      filter: 'url(#gemGlow) drop-shadow(0 0 6px rgba(0, 217, 255, 0.7))',
      transform: 'scale(1.1)',
    },
  };
};

/**
 * Empty gem slot
 */
export const emptyGemSlotEnhanced = (isUltimate: boolean = false): SxProps<Theme> => {
  const color = isUltimate ? '#ff9500' : '#00d9ff';
  return {
    borderRadius: '50%',
    background: `
      radial-gradient(circle at 35% 35%,
        rgba(255, 255, 255, 0.05) 0%,
        ${color}10 30%,
        #0a0f1e 100%
      )
    `,
    boxShadow: `
      inset 0 0 8px rgba(0, 0, 0, 0.5),
      0 0 0 1px dashed ${color}44
    `,
    border: `1px dashed ${color}33`,
  };
};

// ============================================================================
// EQUIPPED ITEM HIGHLIGHTS (with pulsing)
// ============================================================================

/**
 * Equipped item with enhanced glow and pulse
 */
export const equippedHighlightEnhanced: SxProps<Theme> = {
  border: '2px solid #00d9ff',
  background: `
    radial-gradient(circle at 50% 50%,
      rgba(0, 217, 255, 0.2) 0%,
      rgba(10, 15, 30, 0.9) 100%
    )
  `,
  boxShadow: `
    0 0 20px rgba(0, 217, 255, 0.6),
    0 0 40px rgba(0, 217, 255, 0.4),
    0 0 60px rgba(0, 217, 255, 0.2),
    inset 0 0 20px rgba(0, 217, 255, 0.4)
  `,
  filter: 'url(#ambientGlow)',
  animation: 'equippedPulseEnhanced 2s ease-in-out infinite',
  position: 'relative',
  // Inner glow overlay
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    background: 'radial-gradient(circle, rgba(0, 217, 255, 0.3), transparent 70%)',
    pointerEvents: 'none',
  },
};

// ============================================================================
// ENHANCED KEYFRAME ANIMATIONS (with spring physics)
// ============================================================================

export const globalKeyframesEnhanced = `
  @keyframes equippedPulseEnhanced {
    0%, 100% {
      box-shadow:
        0 0 20px rgba(0, 217, 255, 0.6),
        0 0 40px rgba(0, 217, 255, 0.4),
        0 0 60px rgba(0, 217, 255, 0.2),
        inset 0 0 20px rgba(0, 217, 255, 0.4);
    }
    50% {
      box-shadow:
        0 0 30px rgba(0, 217, 255, 0.8),
        0 0 60px rgba(0, 217, 255, 0.5),
        0 0 90px rgba(0, 217, 255, 0.3),
        inset 0 0 30px rgba(0, 217, 255, 0.5);
    }
  }

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

  @keyframes gemShimmer {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  @keyframes borderShineEnhanced {
    0% {
      left: -100%;
      opacity: 0;
    }
    50% {
      opacity: 0.15;
    }
    100% {
      left: 200%;
      opacity: 0;
    }
  }

  @keyframes frameGlowEnhanced {
    0%, 100% {
      box-shadow:
        0 0 20px rgba(0, 217, 255, 0.5),
        0 0 40px rgba(0, 217, 255, 0.3),
        inset 0 0 25px rgba(0, 217, 255, 0.3);
    }
    50% {
      box-shadow:
        0 0 35px rgba(0, 217, 255, 0.7),
        0 0 70px rgba(0, 217, 255, 0.4),
        inset 0 0 40px rgba(0, 217, 255, 0.4);
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
`;

// ============================================================================
// LEGACY STYLES (kept for backward compatibility)
// ============================================================================

// Nebula background with particle effects
export const nebulaBackground: SxProps<Theme> = {
  position: 'fixed',
  inset: 0,
  background: `
    radial-gradient(ellipse at 20% 30%, rgba(100, 50, 255, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(0, 217, 255, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(50, 0, 100, 0.1) 0%, transparent 60%),
    #050810
  `,
  zIndex: -1,
  overflow: 'hidden',
};

// Metallic border with shine effect
export const metallicBorder = (color: string = '#00d9ff'): SxProps<Theme> => ({
  border: '2px solid transparent',
  background: `
    linear-gradient(#0f192d, #0f192d) padding-box,
    linear-gradient(135deg,
      ${color}66 0%,
      rgba(255, 255, 255, 0.25) 25%,
      ${color}55 50%,
      rgba(255, 255, 255, 0.15) 75%,
      ${color}66 100%
    ) border-box
  `,
  position: 'relative',
});

// Glossy orb effect for icons/portraits
export const glossyOrb = (size: number, accentColor: string = '#00d9ff'): SxProps<Theme> => ({
  width: size,
  height: size,
  borderRadius: '50%',
  background: `
    radial-gradient(circle at 30% 30%,
      rgba(255, 255, 255, 0.35) 0%,
      ${accentColor}22 40%,
      rgba(10, 15, 30, 0.9) 70%,
      #050810 100%
    )
  `,
  boxShadow: `
    0 0 20px ${accentColor}44,
    0 0 40px ${accentColor}22,
    inset 0 0 30px ${accentColor}22,
    inset 0 2px 10px rgba(255, 255, 255, 0.15)
  `,
  border: `1px solid ${accentColor}55`,
  position: 'relative',
});

// Gem effect with inner glow
export const gemIcon = (isUltimate: boolean = false): SxProps<Theme> => {
  const color = isUltimate ? '#ff9500' : '#00d9ff';
  return {
    borderRadius: '50%',
    background: `
      radial-gradient(circle at 35% 35%,
        rgba(255, 255, 255, 0.25) 0%,
        ${color}15 50%,
        #0a0f1e 100%
      )
    `,
    boxShadow: `
      inset 0 0 12px ${color}44,
      inset 0 0 4px rgba(255, 255, 255, 0.15),
      0 0 8px ${color}40,
      0 0 0 1px ${color}55
    `,
    position: 'relative',
  };
};

// Empty gem slot styling
export const emptyGemSlot = (isUltimate: boolean = false): SxProps<Theme> => {
  const color = isUltimate ? '#ff9500' : '#00d9ff';
  return {
    borderRadius: '50%',
    background: `
      radial-gradient(circle at 35% 35%,
        rgba(255, 255, 255, 0.1) 0%,
        ${color}08 40%,
        #0a0f1e 100%
      )
    `,
    boxShadow: `0 0 0 1px dashed ${color}33`,
  };
};

// Equipped item highlight with pulse
export const equippedHighlight: SxProps<Theme> = {
  border: '2px solid #00d9ff',
  background:
    'radial-gradient(circle at 50% 50%, rgba(0, 217, 255, 0.15) 0%, rgba(10, 15, 30, 0.9) 100%)',
  boxShadow: `
    0 0 15px rgba(0, 217, 255, 0.5),
    0 0 30px rgba(0, 217, 255, 0.3),
    inset 0 0 15px rgba(0, 217, 255, 0.3)
  `,
};

// CSS keyframe animations as a string for injection
export const globalKeyframes = `
  @keyframes drift {
    0% { transform: translate(0, 0) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(5deg); }
  }
  @keyframes shine {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes equippedPulse {
    0%, 100% {
      box-shadow:
        0 0 15px rgba(0, 217, 255, 0.5),
        0 0 30px rgba(0, 217, 255, 0.3),
        inset 0 0 15px rgba(0, 217, 255, 0.3);
    }
    50% {
      box-shadow:
        0 0 25px rgba(0, 217, 255, 0.7),
        0 0 50px rgba(0, 217, 255, 0.4),
        inset 0 0 20px rgba(0, 217, 255, 0.4);
    }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
    25% { transform: translateY(-10px) translateX(5px); opacity: 0.8; }
    50% { transform: translateY(-20px) translateX(-5px); opacity: 0.5; }
    75% { transform: translateY(-10px) translateX(10px); opacity: 0.7; }
  }
  @keyframes nebulaDrift {
    0%, 100% { transform: scale(1) translate(0, 0); }
    50% { transform: scale(1.1) translate(-20px, 10px); }
  }
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
  @keyframes borderShine {
    0%, 100% { left: -1000px; }
    50% { left: 100%; }
  }
`;

// Panel container with metallic border and shine
export const metallicPanel = (_accentColor: string = '#00d9ff'): SxProps<Theme> => ({
  backgroundColor: 'rgba(15, 25, 45, 0.95)',
  borderRadius: 4,
  border: '2px solid transparent',
  background: `
    linear-gradient(#0f192d, #0f192d) padding-box,
    linear-gradient(135deg,
      rgba(0, 217, 255, 0.5) 0%,
      rgba(255, 255, 255, 0.2) 25%,
      rgba(0, 217, 255, 0.4) 50%,
      rgba(255, 255, 255, 0.15) 75%,
      rgba(0, 217, 255, 0.5) 100%
    ) border-box
  `,
  boxShadow: `
    0 0 40px rgba(0, 0, 0, 0.8),
    0 0 80px rgba(0, 217, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1)
  `,
  overflow: 'hidden',
  position: 'relative',
});

// Sidebar panel with metallic border
export const metallicSidebar: SxProps<Theme> = {
  backgroundColor: 'rgba(10, 18, 35, 0.95)',
  borderRadius: 3,
  border: '1px solid transparent',
  background: `
    linear-gradient(rgba(10, 18, 35, 0.95), rgba(10, 18, 35, 0.95)) padding-box,
    linear-gradient(135deg,
      rgba(0, 217, 255, 0.3) 0%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(0, 217, 255, 0.25) 100%
    ) border-box
  `,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

// Details panel with subtle metallic border
export const metallicDetails: SxProps<Theme> = {
  backgroundColor: 'rgba(15, 25, 45, 0.9)',
  borderRadius: 3,
  border: '1px solid transparent',
  background: `
    linear-gradient(rgba(15, 25, 45, 0.9), rgba(15, 25, 45, 0.9)) padding-box,
    linear-gradient(135deg,
      rgba(0, 217, 255, 0.25) 0%,
      rgba(255, 255, 255, 0.08) 50%,
      rgba(0, 217, 255, 0.2) 100%
    ) border-box
  `,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};
