/**
 * GearDetailsSheet — bottom sheet that shows a set's gear details on touch /
 * small screens, where the row's hover tooltip isn't reachable.
 *
 * Renders the info natively on the sheet surface (set name as the title, a
 * type + role chip row, then bonus rows) — NOT the desktop tooltip Card, which
 * would read as a box-inside-a-box on mobile. Mirrors the app's MobileFilterSheet
 * chrome: bottom Drawer, rounded top, drag handle, safe-area padding, dismiss.
 */

import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Chip, Divider, Drawer, IconButton, Stack, Typography, useTheme } from '@mui/material';
import React from 'react';

import { SET_TYPE_COLORS } from '../../features/build-editor/data/gearSetRegistry';
import { highlightMetrics } from '../../utils/highlightMetrics';

import { type AssignableSet, type SetRole } from './allSetsCatalog';

interface GearDetailsSheetProps {
  /** The set to show, or null when closed. */
  set: AssignableSet | null;
  open: boolean;
  onClose: () => void;
  /** Assignment labels for this set, if any (e.g. ["Tank 1 (Set 1)"]). */
  assignedTo: string[];
  /** Role colors from the parent (tank/healer/dps). */
  roleColors: { tank: string; healer: string; dps: string };
}

const ROLE_LABEL: Record<SetRole, string> = {
  tank: 'Tank',
  healer: 'Healer',
  both: 'Tank / Healer',
};

const splitBonus = (bonus: string): { pieces: string; effect: string } => {
  const m = bonus.match(/\((\d+)\s*items?\)/i);
  return {
    pieces: m ? m[1] : '•',
    effect: bonus.replace(/\(\d+\s*items?\)\s*/i, '').trim(),
  };
};

export const GearDetailsSheet: React.FC<GearDetailsSheetProps> = ({
  set,
  open,
  onClose,
  assignedTo,
  roleColors,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const catColor = set ? SET_TYPE_COLORS[set.setType] : '#78909c';
  const roleColor = !set
    ? roleColors.dps
    : set.role === 'tank'
      ? roleColors.tank
      : set.role === 'healer'
        ? roleColors.healer
        : roleColors.dps;
  const slotLine =
    set?.slotKind === 'monster'
      ? '1–2 piece · Monster / Mythic slot'
      : '5-piece · Body set (Set 1 / Set 2)';

  return (
    <Drawer
      anchor="bottom"
      open={open && set !== null}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            px: 2.25,
            pt: 1,
            pb: 'calc(20px + env(safe-area-inset-bottom))',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            // Opaque surface — the translucent default let the list bleed through.
            backgroundImage: 'none',
            backgroundColor: isDark ? '#11151f' : '#ffffff',
            boxShadow: isDark ? '0 -8px 40px rgba(0,0,0,0.6)' : '0 -8px 40px rgba(15,23,42,0.18)',
          },
        },
      }}
    >
      {/* Drag handle */}
      <Box
        sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mb: 1.25 }}
        aria-hidden
      />

      {/* Header row: eyebrow + close */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}
      >
        <Typography
          sx={{
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            fontFamily: 'Space Grotesk, Inter, system-ui',
          }}
        >
          Set details
        </Typography>
        <IconButton onClick={onClose} aria-label="Close set details" edge="end" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {set && (
        <Box sx={{ overflowY: 'auto', minHeight: 0 }}>
          {/* Title */}
          <Typography
            component="h2"
            sx={{
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 800,
              fontSize: '1.35rem',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: isDark ? '#f1f5f9' : '#0f172a',
            }}
          >
            {set.name}
          </Typography>

          {/* Chip row: type + role */}
          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.75 }}>
            <Chip
              label={set.setType}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: catColor,
                background: `${catColor}22`,
                border: `1px solid ${catColor}44`,
              }}
            />
            <Chip
              label={ROLE_LABEL[set.role]}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: roleColor,
                background: `${roleColor}1f`,
                border: `1px solid ${roleColor}40`,
              }}
            />
          </Stack>

          {/* Slot line */}
          <Typography
            sx={{
              mt: 1,
              fontSize: '0.78rem',
              color: 'text.secondary',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            {slotLine}
          </Typography>

          <Divider sx={{ my: 1.75 }} />

          {/* Bonuses */}
          {set.bonuses.length > 0 ? (
            <Stack spacing={1.25} sx={{ pb: 0.5 }}>
              {set.bonuses.map((bonus, i) => {
                const { pieces, effect } = splitBonus(bonus);
                return (
                  <Box key={i} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        flexShrink: 0,
                        mt: '1px',
                        minWidth: 30,
                        height: 22,
                        px: 0.75,
                        borderRadius: '7px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        color: isDark ? '#94d2ff' : '#0369a1',
                        background: isDark ? 'rgba(148,210,255,0.10)' : 'rgba(3,105,161,0.08)',
                        border: `1px solid ${isDark ? 'rgba(148,210,255,0.22)' : 'rgba(3,105,161,0.18)'}`,
                      }}
                    >
                      {pieces}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.86rem',
                        lineHeight: 1.45,
                        color: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(15,23,42,0.82)',
                      }}
                    >
                      {highlightMetrics(effect, isDark)}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Box
              sx={{
                p: 1.5,
                borderRadius: '12px',
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
                border: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  color: 'text.secondary',
                }}
              >
                Set bonus details aren’t in the gear catalog yet — you can still assign {set.name}{' '}
                to a slot.
              </Typography>
            </Box>
          )}

          {assignedTo.length > 0 && (
            <Typography
              sx={{
                display: 'block',
                mt: 2,
                fontSize: '0.78rem',
                color: roleColor,
                fontWeight: 600,
              }}
            >
              Assigned to {assignedTo.join(', ')}
            </Typography>
          )}
        </Box>
      )}
    </Drawer>
  );
};
