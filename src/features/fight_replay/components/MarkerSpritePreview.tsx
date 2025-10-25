import { Box } from '@mui/material';
import React from 'react';

import type { MorMarker } from '@/types/mapMarkers';
import { ELMS_ICON_MAP } from '@/utils/elmsMarkersDecoder';

type MarkerShape = 'blank' | 'circle' | 'square' | 'diamond' | 'hexagon' | 'chevron' | 'octagon';

const TEXTURE_TO_SHAPE: Record<string, MarkerShape> = {
  'M0RMarkers/textures/blank.dds': 'blank',
  'M0RMarkers/textures/circle.dds': 'circle',
  'M0RMarkers/textures/square.dds': 'square',
  'M0RMarkers/textures/diamond.dds': 'diamond',
  'M0RMarkers/textures/hexagon.dds': 'hexagon',
  'M0RMarkers/textures/chevron.dds': 'chevron',
  'M0RMarkers/textures/octagon.dds': 'octagon',
  'M0RMarkers/textures/sharkpog.dds': 'square',
};

const CLIP_PATHS: Partial<Record<MarkerShape, string>> = {
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  chevron: 'polygon(50% 0%, 95% 90%, 80% 100%, 50% 30%, 20% 100%, 5% 90%)',
  octagon: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
};

const FALLBACK_COLOUR: MorMarker['colour'] = [0.28, 0.43, 0.86, 1];
const BLANK_BACKGROUND = 'linear-gradient(135deg, rgba(67, 80, 140, 0.9), rgba(38, 46, 82, 0.9))';

function toCssColour(colour: MorMarker['colour']): string {
  const [r, g, b, a] = colour;
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha.toFixed(3)})`;
}

function pickTextColour(colour: MorMarker['colour'] | undefined): string {
  if (!colour) {
    return 'rgba(255, 255, 255, 0.95)';
  }

  const [r, g, b] = colour;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? 'rgba(14, 18, 28, 0.92)' : 'rgba(255, 255, 255, 0.95)';
}

function computeFontSize(symbol: string | undefined): string {
  if (!symbol) {
    return '0.8rem';
  }

  if (symbol === '↓') {
    return '1rem';
  }

  if (symbol.length >= 3) {
    return '0.6rem';
  }

  if (symbol.length === 2) {
    return /^\d{2}$/.test(symbol) ? '0.68rem' : '0.72rem';
  }

  return '0.82rem';
}

interface MarkerSpritePreviewProps {
  iconKey: number;
  label?: string;
}

export const MarkerSpritePreview: React.FC<MarkerSpritePreviewProps> = ({ iconKey, label }) => {
  const template = ELMS_ICON_MAP[iconKey];
  const templateColour = template?.colour as MorMarker['colour'] | undefined;

  const shape: MarkerShape = template?.bgTexture
    ? (TEXTURE_TO_SHAPE[template.bgTexture] ?? 'square')
    : 'blank';

  const isBlank = shape === 'blank';
  const hasColour = Boolean(templateColour);

  const backgroundColour = templateColour
    ? toCssColour(templateColour)
    : isBlank
      ? BLANK_BACKGROUND
      : toCssColour(FALLBACK_COLOUR);

  const borderColour = hasColour ? 'rgba(12, 12, 18, 0.6)' : 'rgba(255, 255, 255, 0.3)';
  const clipPath = CLIP_PATHS[shape];

  const borderRadius = (() => {
    if (shape === 'circle' || isBlank) {
      return '50%';
    }
    if (shape === 'square') {
      return '8px';
    }
    return '10px';
  })();

  const symbol = typeof template?.text === 'string' ? template.text : undefined;
  const displaySymbol = symbol && symbol.trim().length > 0 ? symbol : undefined;

  return (
    <Box
      component="span"
      role="img"
      aria-label={label ?? `Marker ${iconKey}`}
      sx={{
        width: 32,
        height: 32,
        minWidth: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius,
        clipPath,
        background: backgroundColour,
        border: `1px solid ${borderColour}`,
        boxShadow: hasColour ? '0 1px 0 rgba(0, 0, 0, 0.4)' : '0 0 0 1px rgba(255, 255, 255, 0.12)',
        color: pickTextColour(templateColour),
        fontWeight: 700,
        fontSize: computeFontSize(displaySymbol),
        lineHeight: 1,
        textTransform: displaySymbol && displaySymbol.length <= 2 ? 'uppercase' : 'none',
        letterSpacing: displaySymbol && displaySymbol.length === 1 ? '0.04em' : undefined,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {displaySymbol ?? null}
    </Box>
  );
};
