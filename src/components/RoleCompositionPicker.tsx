/**
 * RoleCompositionPicker — compact stepper bar for configuring tank/healer/DPS counts.
 *
 * Constraints: each role 0–12, total always equals 12.
 * DPS acts as the flex role: when tanks or healers change, DPS adjusts automatically.
 */

import {
  Shield as TankIcon,
  Favorite as HealerIcon,
  AutoAwesome as DpsIcon,
} from '@mui/icons-material';
import { Box, ButtonBase, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useState } from 'react';

import type { RoleComposition } from '../types/roster';
import { ROSTER_SIZE } from '../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';

// ─── Props ──────────────────────────────────────────────────────

interface RoleCompositionPickerProps {
  composition: RoleComposition;
  onChange: (comp: RoleComposition) => void;
  /** 'standalone' renders its own bg/border; 'embedded' is borderless for nesting in a parent card */
  variant?: 'standalone' | 'embedded';
}

// ─── Component ──────────────────────────────────────────────────

export const RoleCompositionPicker = React.memo<RoleCompositionPickerProps>(
  function RoleCompositionPicker({ composition, onChange, variant = 'standalone' }) {
    const embedded = variant === 'embedded';
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const roleColors = isDark ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;

    // Optimistic local state — updates numbers instantly on click.
    // The parent's onChange triggers the slow roster resize; when it completes,
    // the composition prop updates and syncs back here.
    const [local, setLocal] = useState(composition);
    React.useEffect(() => {
      setLocal(composition);
    }, [composition]);

    // Refs for direct DOM updates — bypasses React render entirely for
    // instant number feedback. React syncs on the next render via local state.
    const tanksRef = React.useRef<HTMLSpanElement>(null);
    const healersRef = React.useRef<HTMLSpanElement>(null);
    const dpsRef = React.useRef<HTMLSpanElement>(null);

    const updateDOMImmediate = useCallback((comp: RoleComposition): void => {
      if (tanksRef.current) tanksRef.current.textContent = String(comp.tanks);
      if (healersRef.current) healersRef.current.textContent = String(comp.healers);
      if (dpsRef.current) dpsRef.current.textContent = String(comp.dps);
    }, []);

    // Deferred onChange: update DOM refs instantly, then yield to the browser
    // for a paint frame, THEN trigger the heavy roster resize via onChange.
    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;

    const applyChange = useCallback(
      (next: RoleComposition) => {
        setLocal(next);
        updateDOMImmediate(next);
        // setTimeout(0) yields to the browser paint loop before React starts
        // the heavy roster resize. This ensures the number visually updates
        // before the main thread blocks.
        setTimeout(() => onChangeRef.current(next), 0);
      },
      [updateDOMImmediate],
    );

    const handleIncrement = useCallback(
      (role: 'tanks' | 'healers') => {
        if (local.dps <= 0) return;
        applyChange({ ...local, [role]: local[role] + 1, dps: local.dps - 1 });
      },
      [local, applyChange],
    );

    const handleDecrement = useCallback(
      (role: 'tanks' | 'healers') => {
        if (local[role] <= 0) return;
        applyChange({ ...local, [role]: local[role] - 1, dps: local.dps + 1 });
      },
      [local, applyChange],
    );

    const bgBase = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)';
    const borderBase = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
    const compact = !useMediaQuery(theme.breakpoints.up('sm'));

    const renderRoleStepper = (
      role: 'tanks' | 'healers',
      icon: React.ReactNode,
      label: string,
      color: string,
    ): React.ReactNode => {
      const count = local[role];
      const canIncrement = local.dps > 0 && local[role] < ROSTER_SIZE;
      const canDecrement = count > 0;

      const btnSize = compact ? 36 : 26;
      const btnRadius = compact ? '8px' : '6px';

      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: compact ? 1 : 0.75,
            px: compact ? 1.25 : 1,
            py: compact ? 0.75 : 0.5,
            borderRadius: compact ? '10px' : '8px',
            bgcolor: `${color}10`,
            border: `1px solid ${color}25`,
            flex: compact ? '1 1 100%' : '0 0 auto',
          }}
        >
          {icon}
          <Typography
            sx={{
              fontSize: compact ? '0.75rem' : '0.7rem',
              fontWeight: 600,
              color,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              flex: 1,
              minWidth: 0,
            }}
          >
            {label}
          </Typography>

          <ButtonBase
            onClick={() => handleDecrement(role)}
            disabled={!canDecrement}
            aria-label={`Decrease ${label}`}
            sx={{
              width: btnSize,
              height: btnSize,
              borderRadius: btnRadius,
              bgcolor: canDecrement ? `${color}18` : 'transparent',
              border: `1px solid ${canDecrement ? `${color}40` : borderBase}`,
              color: canDecrement ? color : 'text.disabled',
              fontSize: compact ? '1.1rem' : '0.95rem',
              fontWeight: 700,
              lineHeight: 1,
              '&:hover': canDecrement ? { bgcolor: `${color}30` } : {},
            }}
          >
            −
          </ButtonBase>

          <Typography
            ref={role === 'tanks' ? tanksRef : healersRef}
            sx={{
              fontSize: compact ? '1rem' : '0.9rem',
              fontWeight: 700,
              color,
              minWidth: compact ? 20 : 16,
              textAlign: 'center',
              fontFamily: '"Space Grotesk", monospace',
            }}
          >
            {count}
          </Typography>

          <ButtonBase
            onClick={() => handleIncrement(role)}
            disabled={!canIncrement}
            aria-label={`Increase ${label}`}
            sx={{
              width: btnSize,
              height: btnSize,
              borderRadius: btnRadius,
              bgcolor: canIncrement ? `${color}18` : 'transparent',
              border: `1px solid ${canIncrement ? `${color}40` : borderBase}`,
              color: canIncrement ? color : 'text.disabled',
              fontSize: compact ? '1.1rem' : '0.95rem',
              fontWeight: 700,
              lineHeight: 1,
              '&:hover': canIncrement ? { bgcolor: `${color}30` } : {},
            }}
          >
            +
          </ButtonBase>
        </Box>
      );
    };

    return (
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: compact ? 1 : 1.5,
          ...(embedded
            ? { p: 0 }
            : {
                p: compact ? 1.25 : 1,
                borderRadius: compact ? '12px' : '10px',
                bgcolor: bgBase,
                border: `1px solid ${borderBase}`,
              }),
        }}
      >
        {/* Role steppers */}
        {renderRoleStepper(
          'tanks',
          <TankIcon sx={{ fontSize: '0.85rem', color: roleColors.tank }} />,
          'Tanks',
          roleColors.tank,
        )}

        {renderRoleStepper(
          'healers',
          <HealerIcon sx={{ fontSize: '0.85rem', color: roleColors.healer }} />,
          'Healers',
          roleColors.healer,
        )}

        {/* Separator — interactive roles vs auto-calculated */}
        {!compact && (
          <Box
            sx={{
              width: '1px',
              height: 20,
              bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
              mx: 0.25,
            }}
          />
        )}

        {/* DPS counter + total — on mobile these share a full-width row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: compact ? 1.5 : 0.75,
            ...(compact && { flex: '1 1 100%' }),
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: compact ? 1 : 0.75,
              px: compact ? 1.25 : 1,
              py: compact ? 0.75 : 0.5,
              borderRadius: compact ? '10px' : '8px',
              bgcolor: `${roleColors.dps}08`,
              border: `1px dashed ${roleColors.dps}20`,
              opacity: 0.85,
              flex: compact ? 1 : '0 0 auto',
            }}
          >
            <DpsIcon sx={{ fontSize: '0.85rem', color: roleColors.dps }} />
            <Typography
              sx={{
                fontSize: compact ? '0.75rem' : '0.7rem',
                fontWeight: 600,
                color: roleColors.dps,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flex: compact ? 1 : 'unset',
                minWidth: compact ? 0 : 24,
              }}
            >
              DPS
            </Typography>
            <Typography
              ref={dpsRef}
              sx={{
                fontSize: compact ? '1rem' : '0.9rem',
                fontWeight: 700,
                color: roleColors.dps,
                fontFamily: '"Space Grotesk", monospace',
              }}
            >
              {local.dps}
            </Typography>
          </Box>

          {/* Total roster size indicator */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.3)',
                fontFamily: '"Space Grotesk", monospace',
              }}
            >
              {ROSTER_SIZE}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 500,
                color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              players
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  },
);
