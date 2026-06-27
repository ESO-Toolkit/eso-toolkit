/**
 * Class Mastery cluster — a compact, class-coloured "mastery seal" on a report
 * player card showing the up-to-2 Class Mastery passives a non-subclassed player
 * chose (U50). Purely informational: each passive is a focusable, tooltip-rich
 * round icon ringed in the owning class's accent, set apart from the slotted
 * talent avatars (rounded squares) by its circular passive shape and "MASTERY"
 * eyebrow. Renders nothing when the player has no Class Mastery picks.
 */

import { Box, Tooltip, Typography } from '@mui/material';
import { alpha, darken, getContrastRatio, lighten, useTheme } from '@mui/material/styles';
import React from 'react';

import { CLASS_COLOR_MAP } from '@/features/build-editor/theme/classColorMap';
import type { ESOClass } from '@/features/build-editor/types/build.types';
import type { ClassAnalysisResult } from '@/utils/classDetectionUtils';
import { toClassKey } from '@/utils/classNameUtils';

import { getClassMasteryPicks, type ClassMasteryPick } from './classMasteryPicks';

const ICON_URL = 'https://assets.rpglogs.com/img/eso/abilities/';

// Conservative card-surface samples for contrast clamping. The card's light
// surface is a translucent light gradient and its dark surface a deep navy; we
// target slightly-harder-than-actual values so a pass here also passes against
// the real (easier) surface in each theme.
const LIGHT_SURFACE = '#dde4ef';
const DARK_SURFACE = '#1a2336';

/**
 * A class accent nudged just far enough (darker in light mode, lighter in dark
 * mode) to clear `target` contrast against the card surface, preserving the hue
 * so the label/focus ring still reads as the class colour. Bright accents like
 * Templar gold fail WCAG as raw small text on a light card; this keeps them
 * legible without dropping the class identity.
 */
const readableAccent = (accent: string, isDark: boolean, target: number): string => {
  const surface = isDark ? DARK_SURFACE : LIGHT_SURFACE;
  let color = accent;
  for (let i = 0; i < 16 && getContrastRatio(color, surface) < target; i++) {
    color = isDark ? lighten(color, 0.12) : darken(color, 0.12);
  }
  return color;
};

/** First mechanics paragraph — the flavour line precedes the first blank line. */
const firstMechanicsParagraph = (description: string): string =>
  description.split('\n\n')[1] ?? description;

interface ClassMasteryIconProps {
  pick: ClassMasteryPick;
  accent: string;
  /** Contrast-safe accent for the keyboard focus ring (>=3:1 on the card surface). */
  focusColor: string;
  isDark: boolean;
}

const ClassMasteryIcon: React.FC<ClassMasteryIconProps> = ({
  pick,
  accent,
  focusColor,
  isDark,
}) => {
  const ringHalo = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)';

  return (
    <Tooltip
      arrow
      placement="top"
      enterTouchDelay={0}
      leaveTouchDelay={3000}
      title={
        <Box sx={{ maxWidth: 300 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 12,
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            {pick.name}
          </Typography>
          {pick.description && (
            <Typography sx={{ fontSize: 11, opacity: 0.85, whiteSpace: 'pre-line', mt: 0.5 }}>
              {firstMechanicsParagraph(pick.description)}
            </Typography>
          )}
        </Box>
      }
    >
      <Box
        tabIndex={0}
        role="img"
        aria-label={`${pick.name} — Class Mastery passive`}
        sx={{
          width: { xs: 28, sm: 26, md: 25 },
          height: { xs: 28, sm: 26, md: 25 },
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'help',
          background: alpha(accent, isDark ? 0.16 : 0.1),
          border: `1.5px solid ${alpha(accent, isDark ? 0.65 : 0.55)}`,
          boxShadow: `0 0 0 1px ${ringHalo}, 0 0 7px ${alpha(accent, isDark ? 0.32 : 0.2)}`,
          transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
          '&:hover, &:focus-visible': {
            borderColor: alpha(accent, 0.95),
            boxShadow: `0 0 0 1px ${ringHalo}, 0 0 11px ${alpha(accent, isDark ? 0.5 : 0.34)}`,
            transform: 'translateY(-1px)',
          },
          '&:focus-visible': {
            outline: `2px solid ${focusColor}`,
            outlineOffset: 2,
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:hover, &:focus-visible': { transform: 'none' },
          },
        }}
      >
        <Box
          component="img"
          src={`${ICON_URL}${pick.icon}.png`}
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
          }}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </Box>
    </Tooltip>
  );
};

interface ClassMasteryClusterProps {
  classAnalysis?: ClassAnalysisResult;
}

const ClassMasteryClusterComponent: React.FC<ClassMasteryClusterProps> = ({ classAnalysis }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { className, picks } = React.useMemo(
    () => getClassMasteryPicks(classAnalysis),
    [classAnalysis],
  );

  if (picks.length === 0) return null;

  const accent =
    CLASS_COLOR_MAP[toClassKey(className) as ESOClass]?.accent ?? theme.palette.primary.main;
  // The "MASTERY" label is the smallest text on the card, so hold it to body-text
  // contrast (4.5:1); the focus ring is a non-text indicator (3:1). Both keep the
  // class hue via readableAccent rather than dropping to a neutral colour.
  const labelColor = readableAccent(accent, isDark, 4.5);
  const focusColor = readableAccent(accent, isDark, 3);

  return (
    <Box
      data-testid="class-mastery-cluster"
      role="group"
      aria-label="Class Mastery passives"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.85, sm: 0.75, md: 0.65 },
        minWidth: 0,
        mt: 0.25,
        mb: 1,
      }}
    >
      <Tooltip
        arrow
        enterTouchDelay={0}
        leaveTouchDelay={3000}
        title="Class Mastery — up to 2 of your class's 5 passives (non-subclassed only)"
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, flexShrink: 0 }}>
          <Box
            aria-hidden
            sx={{
              width: 2,
              height: 14,
              borderRadius: 1,
              flexShrink: 0,
              background: `linear-gradient(${labelColor}, ${alpha(labelColor, 0.35)})`,
            }}
          />
          <Typography
            component="span"
            sx={{
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontSize: { xs: 9.5, sm: 9, md: 8.5 },
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              lineHeight: 1,
              color: labelColor,
              whiteSpace: 'nowrap',
            }}
          >
            Mastery
          </Typography>
        </Box>
      </Tooltip>

      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: { xs: 0.6, md: 0.5 } }}>
        {picks.map((pick) => (
          <ClassMasteryIcon
            key={pick.id}
            pick={pick}
            accent={accent}
            focusColor={focusColor}
            isDark={isDark}
          />
        ))}
      </Box>
    </Box>
  );
};

export const ClassMasteryCluster = React.memo(ClassMasteryClusterComponent);
