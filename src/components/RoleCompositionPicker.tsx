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
import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useState } from 'react';

import type { RoleComposition } from '../types/roster';
import { ROSTER_SIZE } from '../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';

// ─── Preset compositions ────────────────────────────────────────

interface CompositionPreset {
  label: string;
  comp: RoleComposition;
}

const PRESETS: CompositionPreset[] = [
  { label: 'Standard', comp: { tanks: 2, healers: 2, dps: 8 } },
  { label: 'Burn', comp: { tanks: 1, healers: 2, dps: 9 } },
  { label: 'Progression', comp: { tanks: 3, healers: 2, dps: 7 } },
  { label: '3-Heal', comp: { tanks: 2, healers: 3, dps: 7 } },
];

// ─── Props ──────────────────────────────────────────────────────

interface RoleCompositionPickerProps {
  composition: RoleComposition;
  onChange: (comp: RoleComposition) => void;
}

// ─── Component ──────────────────────────────────────────────────

export const RoleCompositionPicker = React.memo<RoleCompositionPickerProps>(
  function RoleCompositionPicker({ composition, onChange }) {
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

    const handleIncrement = useCallback(
      (role: 'tanks' | 'healers') => {
        setLocal((prev) => {
          if (prev.dps <= 0) return prev;
          const next = { ...prev, [role]: prev[role] + 1, dps: prev.dps - 1 };
          // Fire onChange async so the UI updates first
          setTimeout(() => onChange(next), 0);
          return next;
        });
      },
      [onChange],
    );

    const handleDecrement = useCallback(
      (role: 'tanks' | 'healers') => {
        setLocal((prev) => {
          if (prev[role] <= 0) return prev;
          const next = { ...prev, [role]: prev[role] - 1, dps: prev.dps + 1 };
          setTimeout(() => onChange(next), 0);
          return next;
        });
      },
      [onChange],
    );

    const handlePreset = useCallback(
      (preset: CompositionPreset) => {
        const next = { ...preset.comp };
        setLocal(next);
        setTimeout(() => onChange(next), 0);
      },
      [onChange],
    );

    const isPresetActive = (preset: CompositionPreset): boolean =>
      local.tanks === preset.comp.tanks &&
      local.healers === preset.comp.healers &&
      local.dps === preset.comp.dps;

    const bgBase = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)';
    const borderBase = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';

    const renderRoleStepper = (
      role: 'tanks' | 'healers',
      icon: React.ReactNode,
      label: string,
      color: string,
    ): React.ReactNode => {
      const count = local[role];
      const canIncrement = local.dps > 0 && local[role] < ROSTER_SIZE;
      const canDecrement = count > 0;

      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1,
            py: 0.5,
            borderRadius: '8px',
            bgcolor: `${color}10`,
            border: `1px solid ${color}25`,
          }}
        >
          {icon}
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              minWidth: 48,
            }}
          >
            {label}
          </Typography>

          <ButtonBase
            onClick={() => handleDecrement(role)}
            disabled={!canDecrement}
            sx={{
              width: 22,
              height: 22,
              borderRadius: '6px',
              bgcolor: canDecrement ? `${color}18` : 'transparent',
              border: `1px solid ${canDecrement ? `${color}40` : borderBase}`,
              color: canDecrement ? color : 'text.disabled',
              fontSize: '0.85rem',
              fontWeight: 700,
              lineHeight: 1,
              '&:hover': canDecrement ? { bgcolor: `${color}30` } : {},
            }}
          >
            −
          </ButtonBase>

          <Typography
            sx={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color,
              minWidth: 16,
              textAlign: 'center',
              fontFamily: '"Space Grotesk", monospace',
            }}
          >
            {count}
          </Typography>

          <ButtonBase
            onClick={() => handleIncrement(role)}
            disabled={!canIncrement}
            sx={{
              width: 22,
              height: 22,
              borderRadius: '6px',
              bgcolor: canIncrement ? `${color}18` : 'transparent',
              border: `1px solid ${canIncrement ? `${color}40` : borderBase}`,
              color: canIncrement ? color : 'text.disabled',
              fontSize: '0.85rem',
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
          gap: 1.5,
          p: 1,
          borderRadius: '10px',
          bgcolor: bgBase,
          border: `1px solid ${borderBase}`,
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

        {/* DPS counter (read-only, auto-adjusts) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1,
            py: 0.5,
            borderRadius: '8px',
            bgcolor: `${roleColors.dps}10`,
            border: `1px solid ${roleColors.dps}25`,
          }}
        >
          <DpsIcon sx={{ fontSize: '0.85rem', color: roleColors.dps }} />
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: roleColors.dps,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              minWidth: 24,
            }}
          >
            DPS
          </Typography>
          <Typography
            sx={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: roleColors.dps,
              fontFamily: '"Space Grotesk", monospace',
            }}
          >
            {local.dps}
          </Typography>
        </Box>

        {/* Divider */}
        <Box sx={{ width: 1, height: 24, bgcolor: borderBase, mx: 0.25 }} />

        {/* Presets */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {PRESETS.map((preset) => {
            const active = isPresetActive(preset);
            return (
              <Tooltip
                key={preset.label}
                title={`${preset.comp.tanks}T / ${preset.comp.healers}H / ${preset.comp.dps}DPS`}
                arrow
              >
                <ButtonBase
                  onClick={() => handlePreset(preset)}
                  sx={{
                    px: 1,
                    py: 0.4,
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: active ? 700 : 500,
                    fontFamily: '"Space Grotesk", sans-serif',
                    letterSpacing: '0.02em',
                    color: active ? (isDark ? '#fff' : '#0f172a') : 'text.secondary',
                    bgcolor: active
                      ? isDark
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(15,23,42,0.08)'
                      : 'transparent',
                    border: `1px solid ${active ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.15)') : 'transparent'}`,
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
                    },
                  }}
                >
                  {preset.label}
                </ButtonBase>
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    );
  },
);
