/**
 * Class Mastery cluster — a compact, class-coloured glass chip on a report
 * player card showing the up-to-2 Class Mastery passives a non-subclassed player
 * chose (U50). Built in the card's chip language (like the Champion Point and
 * gear-set chips) and tinted with the owning class's accent from CLASS_COLOR_MAP
 * — the same per-class palette the build editor uses — so each player's chip
 * carries their class colour.
 *
 * On reveal the chip assembles: it fades/scales in, the passive gems pop in with
 * a slight overshoot, and the label slides in. Hovering (or focusing) the chip
 * surfaces a rich "Class Mastery" overview tooltip listing both passives; each
 * gem also stays individually keyboard-focusable. All motion respects
 * prefers-reduced-motion. Renders nothing when the player has no picks.
 */

import { Box, Divider, Tooltip, Typography } from '@mui/material';
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

// ── Overview tooltip ──────────────────────────────────────────────────────────

const ClassMasteryOverview: React.FC<{ picks: ClassMasteryPick[]; accent: string }> = ({
  picks,
  accent,
}) => (
  <Box sx={{ maxWidth: 320 }}>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 0.25 }}>
      <Typography
        sx={{
          fontFamily: 'Space Grotesk, Inter, system-ui',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: accent,
        }}
      >
        Class Mastery
      </Typography>
      <Typography sx={{ fontSize: 9.5, opacity: 0.6, letterSpacing: '0.02em' }}>
        {picks.length} of 5 · non-subclassed
      </Typography>
    </Box>
    <Divider sx={{ borderColor: alpha(accent, 0.35), mb: 0.75 }} />
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
      {picks.map((pick) => (
        <Box key={pick.id} sx={{ display: 'flex', gap: 0.85 }}>
          <Box
            component="img"
            src={`${ICON_URL}${pick.icon}.png`}
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
            sx={{
              width: 26,
              height: 26,
              flexShrink: 0,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `1.5px solid ${alpha(accent, 0.7)}`,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 11.5,
                lineHeight: 1.25,
                fontFamily: 'Space Grotesk, Inter, system-ui',
              }}
            >
              {pick.name}
            </Typography>
            {pick.description && (
              <Typography sx={{ fontSize: 10.5, opacity: 0.82, lineHeight: 1.35, mt: 0.15 }}>
                {firstMechanicsParagraph(pick.description)}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
);

// ── Passive gem ───────────────────────────────────────────────────────────────

interface ClassMasteryIconProps {
  pick: ClassMasteryPick;
  accent: string;
  /** Contrast-safe accent for the keyboard focus ring (>=3:1 on the card surface). */
  focusColor: string;
  isDark: boolean;
  /** Tuck this gem partly behind the previous one (avatar-stack within the chip). */
  overlap: boolean;
  /** Stagger position for the entrance pop. */
  index: number;
}

const ClassMasteryIcon: React.FC<ClassMasteryIconProps> = ({
  pick,
  accent,
  focusColor,
  isDark,
  overlap,
  index,
}) => {
  // A neutral halo ring separates overlapping gems from each other and from the
  // tinted chip behind them.
  const halo = isDark ? 'rgba(13,19,32,0.92)' : 'rgba(244,246,252,0.96)';

  return (
    <Box
      tabIndex={0}
      role="img"
      aria-label={`${pick.name} — Class Mastery passive`}
      sx={{
        width: { xs: 24, sm: 22, md: 21 },
        height: { xs: 24, sm: 22, md: 21 },
        ml: overlap ? { xs: '-7px', md: '-6px' } : 0,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'help',
        background: alpha(accent, isDark ? 0.2 : 0.12),
        border: `1.5px solid ${alpha(accent, isDark ? 0.7 : 0.6)}`,
        boxShadow: `0 0 0 2px ${halo}`,
        // Staggered pop-in (overshoot easing); `backwards` fill so the resting
        // transform reverts to none and the hover scale below still works.
        '@keyframes cmGemIn': {
          from: { opacity: 0, transform: 'scale(0.4)' },
          to: { opacity: 1, transform: 'none' },
        },
        animation: `cmGemIn 360ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards`,
        animationDelay: `${140 + index * 95}ms`,
        transition: 'box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease',
        '&:hover, &:focus-visible': {
          zIndex: 2,
          borderColor: alpha(accent, 0.95),
          boxShadow: `0 0 0 2px ${halo}, 0 0 9px ${alpha(accent, isDark ? 0.55 : 0.36)}`,
          transform: 'scale(1.1)',
        },
        '&:focus-visible': {
          outline: `2px solid ${focusColor}`,
          outlineOffset: 2,
        },
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
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
  );
};

// ── Cluster ───────────────────────────────────────────────────────────────────

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
  // The "Class Mastery" label is the smallest text on the card, so hold it to
  // body-text contrast (4.5:1); the focus ring is a non-text indicator (3:1).
  // Both keep the class hue via readableAccent rather than a neutral colour.
  const labelColor = readableAccent(accent, isDark, 4.5);
  const focusColor = readableAccent(accent, isDark, 3);
  const chipShadowRest = isDark
    ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
    : 'inset 0 1px 0 rgba(255,255,255,0.55)';

  return (
    <Tooltip
      arrow
      placement="top-start"
      enterTouchDelay={0}
      leaveTouchDelay={4000}
      title={<ClassMasteryOverview picks={picks} accent={accent} />}
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: isDark ? 'rgba(13,19,32,0.97)' : 'rgba(255,255,255,0.98)',
            color: isDark ? '#e8eef7' : '#1b2433',
            border: `1px solid ${alpha(accent, 0.4)}`,
            borderRadius: 2,
            p: 1.25,
            maxWidth: 340,
            boxShadow: `0 10px 28px rgba(0,0,0,${isDark ? 0.55 : 0.22})`,
            backdropFilter: 'blur(8px)',
          },
        },
        arrow: { sx: { color: isDark ? 'rgba(13,19,32,0.97)' : 'rgba(255,255,255,0.98)' } },
      }}
    >
      <Box
        data-testid="class-mastery-cluster"
        role="group"
        aria-label="Class Mastery passives"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          width: 'fit-content',
          maxWidth: '100%',
          minWidth: 0,
          mt: 0.25,
          mb: 1,
          pl: '5px',
          pr: 1.25,
          py: '3px',
          borderRadius: 999,
          cursor: 'default',
          background: alpha(accent, isDark ? 0.12 : 0.1),
          border: `1px solid ${alpha(accent, 0.3)}`,
          boxShadow: chipShadowRest,
          // Chip reveal: fade + lift + settle (no resting transform → no sticky
          // transform interfering with the gems' hover scale).
          '@keyframes cmChipIn': {
            from: { opacity: 0, transform: 'translateY(4px) scale(0.96)' },
            to: { opacity: 1, transform: 'none' },
          },
          animation: 'cmChipIn 300ms ease-out backwards',
          transition: 'box-shadow 180ms ease, border-color 180ms ease',
          '&:hover': {
            borderColor: alpha(accent, 0.5),
            boxShadow: `${chipShadowRest}, 0 0 0 1px ${alpha(accent, 0.35)}, 0 5px 16px ${alpha(
              accent,
              isDark ? 0.3 : 0.18,
            )}`,
          },
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            transition: 'none',
          },
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          {picks.map((pick, index) => (
            <ClassMasteryIcon
              key={pick.id}
              pick={pick}
              accent={accent}
              focusColor={focusColor}
              isDark={isDark}
              overlap={index > 0}
              index={index}
            />
          ))}
        </Box>
        <Typography
          component="span"
          sx={{
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontSize: { xs: 9.5, sm: 9, md: 8.5 },
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1,
            color: labelColor,
            whiteSpace: 'nowrap',
            '@keyframes cmLabelIn': {
              from: { opacity: 0, transform: 'translateX(-4px)' },
              to: { opacity: 1, transform: 'none' },
            },
            animation: 'cmLabelIn 320ms ease-out 200ms backwards',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          Class Mastery
        </Typography>
      </Box>
    </Tooltip>
  );
};

export const ClassMasteryCluster = React.memo(ClassMasteryClusterComponent);
