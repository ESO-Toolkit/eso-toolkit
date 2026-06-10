/**
 * SkillLinePickerGroup — class skill line picker matching the build editor's SubclassingSection style.
 *
 * Three slot picker buttons with class-grouped dropdown menus, color-coded dots,
 * and an "Any class" flex toggle. Stores plain string labels for encoding compatibility.
 */

import { Close as ClearIcon, ExpandMore as ChevronIcon } from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Checkbox,
  Divider,
  FormControlLabel,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useRef, useState } from 'react';

import {
  CLASS_SKILL_LINES as BUILD_EDITOR_SKILL_LINES,
  ESO_CLASSES,
} from '@/features/build-editor/data/esoStaticData';
import { CLASS_COLOR_MAP } from '@/features/build-editor/theme/classColorMap';
import type { SkillLineConfig } from '@/types/roster';

export interface SkillLinePickerGroupProps {
  value?: SkillLineConfig;
  onChange: (config: SkillLineConfig) => void;
}

const DEFAULT_CONFIG: SkillLineConfig = {
  line1: '',
  line2: '',
  line3: '',
  isFlex: true,
};

// Group skill line defs by class (excluding 'any-class')
const LINES_BY_CLASS = ESO_CLASSES.filter((cls) => cls.id !== 'any-class').map((cls) => ({
  cls,
  lines: BUILD_EDITOR_SKILL_LINES.filter((l) => l.ownerClass === cls.id),
}));

const FIELDS = ['line1', 'line2', 'line3'] as const;

// ── Slot Picker Button ─────────────────────────────────────────────────────

interface SlotPickerProps {
  slot: 0 | 1 | 2;
  value: string;
  disabledLabels: Set<string>;
  onChange: (slot: 0 | 1 | 2, label: string) => void;
}

const SlotPicker: React.FC<SlotPickerProps> = ({ slot, value, disabledLabels, onChange }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Find the matching skill line def by label
  const def = value ? BUILD_EDITOR_SKILL_LINES.find((l) => l.label === value) : null;
  const ownerColor = def ? CLASS_COLOR_MAP[def.ownerClass].accent : undefined;

  const handleSelect = useCallback(
    (label: string) => {
      onChange(slot, label);
      setOpen(false);
    },
    [slot, onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(slot, '');
    },
    [slot, onChange],
  );

  return (
    <>
      <ButtonBase
        ref={anchorRef}
        aria-label={
          def
            ? `Slot ${slot + 1}: ${def.label} — click to change`
            : `Slot ${slot + 1}: empty — click to select a skill line`
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        sx={{
          width: '100%',
          borderRadius: 2,
          border: def
            ? `1px solid ${alpha(ownerColor!, 0.35)}`
            : `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
          background: def
            ? isDark
              ? alpha(ownerColor!, 0.09)
              : alpha(ownerColor!, 0.05)
            : isDark
              ? 'rgba(255,255,255,0.02)'
              : 'rgba(0,0,0,0.02)',
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          textAlign: 'left',
          transition: 'all 0.18s',
          '&:hover': {
            background: def
              ? isDark
                ? alpha(ownerColor!, 0.15)
                : alpha(ownerColor!, 0.09)
              : isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.04)',
            borderColor: def
              ? alpha(ownerColor!, 0.55)
              : isDark
                ? 'rgba(255,255,255,0.22)'
                : 'rgba(0,0,0,0.20)',
          },
          ...(open && {
            outline: `2px solid ${def ? ownerColor : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
            outlineOffset: '2px',
          }),
        }}
      >
        {/* Slot number */}
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.28)',
            minWidth: 16,
            flexShrink: 0,
          }}
        >
          {slot + 1}
        </Typography>

        {def ? (
          <>
            {/* Class color dot */}
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: ownerColor,
                flexShrink: 0,
                boxShadow: `0 0 6px ${alpha(ownerColor!, 0.5)}`,
              }}
            />
            {/* Skill line name + class label */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  color: ownerColor,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {def.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 400,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
                  lineHeight: 1.2,
                  mt: 0.25,
                }}
              >
                {ESO_CLASSES.find((c) => c.id === def.ownerClass)?.label}
              </Typography>
            </Box>
            {/* Clear button */}
            <Tooltip title="Clear slot" enterDelay={600}>
              <ButtonBase
                onClick={handleClear}
                aria-label="Clear this skill line slot"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
                  flexShrink: 0,
                  borderRadius: 1,
                  p: 0.25,
                  '&:hover': { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' },
                }}
              >
                <ClearIcon sx={{ fontSize: 14 }} />
              </ButtonBase>
            </Tooltip>
          </>
        ) : (
          <>
            {/* Empty state */}
            <Typography
              sx={{
                flex: 1,
                fontSize: 12,
                fontWeight: 400,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                fontStyle: 'italic',
              }}
            >
              Select a class skill line…
            </Typography>
            <ChevronIcon
              sx={{
                fontSize: 16,
                color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                flexShrink: 0,
              }}
            />
          </>
        )}
      </ButtonBase>

      {/* Dropdown menu grouped by class */}
      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 240,
              maxHeight: 380,
              background: isDark ? 'rgba(10, 18, 30, 0.97)' : 'rgba(248, 250, 252, 0.98)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 2,
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
            },
          },
          list: { dense: true, 'aria-label': `Skill line picker for slot ${slot + 1}` },
        }}
      >
        {LINES_BY_CLASS.map(({ cls, lines }, groupIdx) => {
          const clsColor = CLASS_COLOR_MAP[cls.id].accent;
          return [
            groupIdx > 0 && (
              <Divider
                key={`divider-${cls.id}`}
                sx={{
                  my: 0.25,
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                }}
              />
            ),
            <ListSubheader
              key={`header-${cls.id}`}
              disableSticky
              sx={{
                fontSize: 9,
                fontWeight: 700,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: clsColor,
                lineHeight: '28px',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: clsColor,
                  boxShadow: `0 0 5px ${alpha(clsColor, 0.6)}`,
                  flexShrink: 0,
                }}
              />
              {cls.label}
            </ListSubheader>,
            ...lines.map((line) => {
              const isDisabled = disabledLabels.has(line.label);
              const isSelected = value === line.label;
              return (
                <MenuItem
                  key={line.id}
                  selected={isSelected}
                  disabled={isDisabled}
                  onClick={() => handleSelect(line.label)}
                  sx={{
                    fontSize: 12,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    fontWeight: isSelected ? 600 : 400,
                    px: 1.5,
                    py: 0.6,
                    gap: 1,
                    color: isSelected
                      ? clsColor
                      : isDark
                        ? 'rgba(255,255,255,0.80)'
                        : 'rgba(0,0,0,0.75)',
                    '&.Mui-selected': {
                      background: alpha(clsColor, 0.12),
                      '&:hover': { background: alpha(clsColor, 0.18) },
                    },
                    '&:hover:not(.Mui-disabled)': {
                      background: isDark ? alpha(clsColor, 0.1) : alpha(clsColor, 0.07),
                    },
                    '&.Mui-disabled': {
                      opacity: 0.35,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: clsColor,
                      flexShrink: 0,
                      opacity: isDisabled ? 0.4 : 1,
                    }}
                  />
                  {line.label}
                </MenuItem>
              );
            }),
          ];
        })}
      </Menu>
    </>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

export const SkillLinePickerGroup: React.FC<SkillLinePickerGroupProps> = ({
  value = DEFAULT_CONFIG,
  onChange,
}) => {
  const isDark = useTheme().palette.mode === 'dark';

  const handleSlotChange = useCallback(
    (slot: 0 | 1 | 2, label: string) => {
      onChange({ ...value, [FIELDS[slot]]: label });
    },
    [value, onChange],
  );

  // Build disabled labels per slot: all currently selected labels except this slot's own value
  const getDisabledLabels = (slot: 0 | 1 | 2): Set<string> => {
    const disabled = new Set<string>();
    FIELDS.forEach((field, idx) => {
      if (idx !== slot && value[field]) disabled.add(value[field]);
    });
    return disabled;
  };

  return (
    <Stack spacing={1}>
      {/* Header row with "Any class" toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
          }}
        >
          Class Skill Lines
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={value.isFlex}
              onChange={(e) =>
                onChange({
                  ...value,
                  isFlex: e.target.checked,
                })
              }
              sx={{ p: 0.5 }}
            />
          }
          label="Any class"
          sx={{
            ml: 'auto',
            mr: 0,
            '& .MuiFormControlLabel-label': {
              fontSize: '0.75rem',
              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
            },
          }}
        />
      </Box>

      {/* Slot pickers — only shown when isFlex is false */}
      {!value.isFlex && (
        <Stack spacing={1}>
          {([0, 1, 2] as const).map((slot) => (
            <SlotPicker
              key={slot}
              slot={slot}
              value={value[FIELDS[slot]]}
              disabledLabels={getDisabledLabels(slot)}
              onChange={handleSlotChange}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
};
