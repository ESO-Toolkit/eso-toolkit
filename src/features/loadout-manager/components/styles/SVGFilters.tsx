import { Box } from '@mui/material';

/**
 * Global SVG filter definitions for AAA-quality visual effects.
 * Mount this component once at the top level of LoadoutManager.
 *
 * Filters available:
 * - #metallicShine: Realistic metallic reflection with specular highlights
 * - #gemGlow: Organic gem glow with turbulence
 * - #nebulaTurbulence: Animated nebula distortion
 * - #portraitVignette: Character portrait depth effect
 * - #innerLight: Inner glow for gem icons
 * - #ambientGlow: Ambient glow for equipped items
 */
export const SVGFilters: React.FC = () => {
  return (
    <Box
      component="svg"
      sx={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Metallic border with realistic specular highlight */}
        <filter id="metallicShine" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="3"
            specularConstant="0.75"
            specularExponent="20"
            lightingColor="#ffffff"
            result="specular"
          >
            <fePointLight x="-5000" y="-10000" z="20000" />
          </feSpecularLighting>
          <feComposite
            in="specular"
            in2="SourceGraphic"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
            result="lit"
          />
          <feComposite in="lit" in2="SourceGraphic" operator="in" />
        </filter>

        {/* Gem glow with organic turbulence */}
        <filter id="gemGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feColorMatrix in="blur" type="saturate" values="1.5" result="saturated" />
          <feMerge>
            <feMergeNode in="saturated" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Nebula turbulence for background animation */}
        <filter id="nebulaTurbulence">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves="3"
            seed="5"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="30"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Inner light for gem icons */}
        <filter id="innerLight" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
          <feOffset in="blur" dx="2" dy="2" result="offsetBlur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="5"
            specularConstant="0.5"
            specularExponent="15"
            lightingColor="#00d9ff"
            result="specular"
          >
            <fePointLight x="-500" y="-1000" z="1500" />
          </feSpecularLighting>
          <feComposite in="specular" in2="SourceAlpha" operator="in" result="specular" />
          <feComposite
            in="SourceGraphic"
            in2="specular"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
          />
        </filter>

        {/* Ambient glow for equipped items */}
        <filter id="ambientGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0
                     0 0.85 0 0 0
                     0 0 1 0 0
                     0 0 0 1 0"
            result="coloredBlur"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradient definitions */}
        <linearGradient id="metallicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d9ff" stopOpacity="0.8" />
          <stop offset="25%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#00d9ff" stopOpacity="0.7" />
          <stop offset="75%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00d9ff" stopOpacity="0.8" />
        </linearGradient>

        <radialGradient id="portraitVignette" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="70%" stopColor="#0a0f1e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#050810" stopOpacity="0.7" />
        </radialGradient>

        <radialGradient id="gemInnerGlow" cx="35%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#00d9ff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0a0f1e" stopOpacity="0.9" />
        </radialGradient>

        <radialGradient id="gemInnerGlowUltimate" cx="35%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ff9500" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0a0f1e" stopOpacity="0.9" />
        </radialGradient>
      </defs>
    </Box>
  );
};
