/**
 * Subclassing Section
 * Lets users pick any 3 class skill lines from the full pool of 21 (7 classes × 3 lines).
 * A "pure" build picks all 3 from the base class. A "hybrid" picks from multiple classes.
 *
 * Base class (esoClass) is set separately in GeneralSection and drives theming.
 * Skill line selection here is independent — it documents which lines the build uses.
 */

import {
  AutoAwesome as HybridIcon,
  Close as ClearIcon,
  ExpandMore as ChevronIcon,
} from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Chip,
  Divider,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  CLASS_SKILL_LINES,
  ESO_CLASSES,
  getSkillLineDef,
  type ClassSkillLineDef,
} from '../../data/esoStaticData';
import { selectBuildClassSkillLines } from '../../store/buildEditorSelectors';
import { setClassSkillLine } from '../../store/buildEditorSlice';
import { CLASS_COLOR_MAP } from '../../theme/classColorMap';
import type { ClassSkillLineId } from '../../types/build.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sectionLabelSx = {
  fontWeight: 700,
  mb: 0.75,
  display: 'block',
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  fontFamily: 'Space Grotesk, Inter, system-ui',
};

/** Groups CLASS_SKILL_LINES by ownerClass, preserving the ESO_CLASSES order.
 *  Excludes 'any-class' since it owns no skill lines. */
const LINES_BY_CLASS = ESO_CLASSES.filter((cls) => cls.id !== 'any-class').map((cls) => ({
  cls,
  lines: CLASS_SKILL_LINES.filter((l) => l.ownerClass === cls.id),
}));

// ─── Slot Picker Button ───────────────────────────────────────────────────────

interface SlotPickerProps {
  slot: 0 | 1 | 2;
  value: ClassSkillLineId | null;
  disabledIds: Set<ClassSkillLineId>;
  onChange: (slot: 0 | 1 | 2, id: ClassSkillLineId | null) => void;
}

const SlotPicker: React.FC<SlotPickerProps> = ({ slot, value, disabledIds, onChange }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const def = value ? getSkillLineDef(value) : null;
  const ownerColor = def ? CLASS_COLOR_MAP[def.ownerClass].accent : undefined;

  const handleSelect = useCallback(
    (id: ClassSkillLineId) => {
      onChange(slot, id);
      setOpen(false);
    },
    [slot, onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(slot, null);
    },
    [slot, onChange],
  );

  return (
    <>
      {/* Slot card — uses Box + role="button" to avoid <button> nesting with clear button */}
      <Box
        ref={anchorRef}
        role="button"
        tabIndex={0}
        aria-label={
          def
            ? `${slot + 1}, ${def.label}, ${ESO_CLASSES.find((c) => c.id === def.ownerClass)?.label ?? ''}`
            : `${slot + 1}, empty, click to select a skill line`
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
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
            outline: `2px solid ${def ? ownerColor : 'var(--be-accent, #38bdf8)'}`,
            outlineOffset: '2px',
          }),
        }}
      >
        {/* Slot number label */}
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
                  justifyContent: 'center',
                  color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
                  flexShrink: 0,
                  borderRadius: 1,
                  minWidth: 24,
                  minHeight: 24,
                  p: 0.625,
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
      </Box>

      {/* Picker menu grouped by class */}
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
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 2,
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
            },
          },
        }}
        MenuListProps={{ dense: true, 'aria-label': `Skill line picker for slot ${slot + 1}` }}
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
              const isDisabled = disabledIds.has(line.id);
              const isSelected = value === line.id;
              return (
                <MenuItem
                  key={line.id}
                  selected={isSelected}
                  disabled={isDisabled}
                  onClick={() => handleSelect(line.id)}
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

// ─── Hybrid Status Badge ──────────────────────────────────────────────────────

interface StatusBadgeProps {
  classSkillLines: [ClassSkillLineId | null, ClassSkillLineId | null, ClassSkillLineId | null];
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ classSkillLines }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const involvedClasses = useMemo(() => {
    const seen = new Set<string>();
    const result: ClassSkillLineDef[] = [];
    for (const id of classSkillLines) {
      if (!id) continue;
      const def = getSkillLineDef(id);
      if (def && !seen.has(def.ownerClass)) {
        seen.add(def.ownerClass);
        result.push(def);
      }
    }
    return result;
  }, [classSkillLines]);

  const filledCount = classSkillLines.filter(Boolean).length;
  if (filledCount === 0) return null;

  const isHybrid = involvedClasses.length > 1;
  const isPure = !isHybrid && filledCount > 0;

  const primaryDef = involvedClasses[0];
  const primaryColor = primaryDef ? CLASS_COLOR_MAP[primaryDef.ownerClass].accent : undefined;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      {isPure && primaryColor && (
        <Chip
          size="small"
          label={`Pure ${ESO_CLASSES.find((c) => c.id === primaryDef.ownerClass)?.label}`}
          sx={{
            height: 20,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            letterSpacing: 0.5,
            background: alpha(primaryColor, isDark ? 0.14 : 0.08),
            border: `1px solid ${alpha(primaryColor, 0.3)}`,
            color: primaryColor,
            '& .MuiChip-label': { px: 1 },
          }}
        />
      )}
      {isHybrid && (
        <Chip
          size="small"
          icon={<HybridIcon sx={{ fontSize: '12px !important', ml: '6px !important' }} />}
          label="Hybrid"
          sx={{
            height: 20,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            letterSpacing: 0.5,
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}`,
            color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)',
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      )}
      {/* Class color dots for involved classes */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        {involvedClasses.map((def) => {
          const color = CLASS_COLOR_MAP[def.ownerClass].accent;
          return (
            <Tooltip
              key={def.ownerClass}
              title={ESO_CLASSES.find((c) => c.id === def.ownerClass)?.label ?? ''}
              enterDelay={300}
            >
              <Box
                role="img"
                aria-label={ESO_CLASSES.find((c) => c.id === def.ownerClass)?.label ?? ''}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 6px ${alpha(color, 0.55)}`,
                }}
              />
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
};

// ─── Main Section ─────────────────────────────────────────────────────────────

const SubclassingSectionComponent: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const classSkillLines = useSelector(selectBuildClassSkillLines);

  const handleChange = useCallback(
    (slot: 0 | 1 | 2, skillLineId: ClassSkillLineId | null) => {
      dispatch(setClassSkillLine({ slot, skillLineId }));
    },
    [dispatch],
  );

  // Build disabled sets per slot: all currently selected IDs except this slot's own value
  const getDisabledIds = (slot: 0 | 1 | 2): Set<ClassSkillLineId> => {
    const disabled = new Set<ClassSkillLineId>();
    classSkillLines.forEach((id, idx) => {
      if (id && idx !== slot) disabled.add(id);
    });
    return disabled;
  };

  return (
    <Stack spacing={2}>
      {/* Explainer */}
      <Box>
        <Typography variant="caption" sx={{ ...(sectionLabelSx), color: 'text.secondary' }}>
          Class Skill Lines
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            fontSize: 11,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
            mb: 1.5,
            lineHeight: 1.5,
          }}
        >
          Choose 3 class skill lines — any combination across all classes. Your base class and its
          unique passives are set in the Identity section.
        </Typography>

        {/* Status badge */}
        <StatusBadge classSkillLines={classSkillLines} />
      </Box>

      {/* Three slot pickers */}
      <Stack spacing={1}>
        {([0, 1, 2] as const).map((slot) => (
          <SlotPicker
            key={slot}
            slot={slot}
            value={classSkillLines[slot]}
            disabledIds={getDisabledIds(slot)}
            onChange={handleChange}
          />
        ))}
      </Stack>
    </Stack>
  );
};

export const SubclassingSection = React.memo(SubclassingSectionComponent);
