/**
 * Class Mastery Section — U50 passive-only line for non-subclassed builds.
 *
 * Shows the base class's five Class Mastery passives as pickable rows
 * (2-of-5, mirroring Class Mastery Points in game). The whole section is
 * gated: slotting any other class's skill line in Subclassing disables it,
 * and picks are kept (greyed out) until the gate reopens. Tooltips come
 * straight from the skill-line data descriptions.
 */

import { Check as CheckIcon, LockOutlined as LockIcon } from '@mui/icons-material';
import { Box, ButtonBase, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getClassMasteryLine } from '@/data/skill-lines/class/classMastery';
import type { SkillData } from '@/data/types/skill-line-types';

import { ESO_CLASSES } from '../../data/esoStaticData';
import {
  selectBuildClassSkillLines,
  selectBuildEsoClass,
  selectClassMasteryPassives,
} from '../../store/buildEditorSelectors';
import { toggleClassMasteryPassive } from '../../store/buildEditorSlice';
import { CLASS_COLOR_MAP } from '../../theme/classColorMap';
import { CLASS_MASTERY_MAX_PICKS, getClassMasteryGate } from '../../utils/classMasteryEligibility';

const ICON_URL = 'https://assets.rpglogs.com/img/eso/abilities/';

// ── Passive row ───────────────────────────────────────────────────────────────

interface PassiveRowProps {
  skill: SkillData;
  isSelected: boolean;
  isLocked: boolean;
  accent: string;
  onToggle: (skillId: number) => void;
}

const PassiveRow: React.FC<PassiveRowProps> = ({
  skill,
  isSelected,
  isLocked,
  accent,
  onToggle,
}) => {
  const isDark = useTheme().palette.mode === 'dark';

  return (
    <Tooltip
      title={
        <Box sx={{ maxWidth: 320 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{skill.name}</Typography>
          {skill.description && (
            <Typography sx={{ fontSize: 11, opacity: 0.85, whiteSpace: 'pre-line', mt: 0.5 }}>
              {skill.description}
            </Typography>
          )}
        </Box>
      }
      arrow
      placement="top"
      enterDelay={250}
    >
      {/* span keeps the tooltip working when the button is disabled */}
      <Box component="span" sx={{ display: 'block' }}>
        <ButtonBase
          onClick={() => onToggle(skill.id)}
          disabled={isLocked}
          aria-pressed={isSelected}
          aria-label={`${skill.name}${isSelected ? ' (selected)' : ''}`}
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            py: 0.75,
            px: 1,
            borderRadius: 2,
            textAlign: 'left',
            border: `1.5px solid ${
              isSelected
                ? alpha(accent, 0.55)
                : isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.07)'
            }`,
            background: isSelected
              ? alpha(accent, isDark ? 0.12 : 0.07)
              : isDark
                ? 'rgba(255,255,255,0.025)'
                : 'rgba(0,0,0,0.015)',
            opacity: isLocked ? 0.45 : 1,
            transition: 'all 150ms',
            '&:hover': isLocked
              ? undefined
              : {
                  borderColor: alpha(accent, 0.6),
                  background: alpha(accent, isDark ? 0.1 : 0.06),
                },
          }}
        >
          <img
            src={`${ICON_URL}${skill.icon}.png`}
            alt=""
            loading="lazy"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              flexShrink: 0,
              objectFit: 'cover',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                lineHeight: 1.3,
              }}
            >
              {skill.name}
            </Typography>
            {skill.description && (
              <Typography
                sx={{
                  fontSize: 10.5,
                  lineHeight: 1.35,
                  color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {/* First mechanics paragraph — flavor text sits before the first blank line */}
                {skill.description.split('\n\n')[1] ?? skill.description}
              </Typography>
            )}
          </Box>
          {isSelected && (
            <CheckIcon sx={{ fontSize: 16, color: accent, flexShrink: 0 }} aria-hidden />
          )}
        </ButtonBase>
      </Box>
    </Tooltip>
  );
};

// ── Main section ──────────────────────────────────────────────────────────────

const ClassMasterySectionComponent: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const esoClass = useSelector(selectBuildEsoClass);
  const classSkillLines = useSelector(selectBuildClassSkillLines);
  const picks = useSelector(selectClassMasteryPassives);

  const gate = useMemo(
    () => getClassMasteryGate(esoClass, classSkillLines),
    [esoClass, classSkillLines],
  );
  const line = useMemo(() => getClassMasteryLine(esoClass), [esoClass]);
  const classLabel = ESO_CLASSES.find((c) => c.id === esoClass)?.label ?? esoClass;
  const accent = CLASS_COLOR_MAP[esoClass]?.accent ?? theme.palette.primary.main;

  const handleToggle = useCallback(
    (skillId: number) => {
      dispatch(toggleClassMasteryPassive(skillId));
    },
    [dispatch],
  );

  const subtleText = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)';

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            fontSize: 11,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: subtleText,
            lineHeight: 1.5,
          }}
        >
          Pick {CLASS_MASTERY_MAX_PICKS} of your class&apos;s 5 Class Mastery passives. Only
          non-subclassed characters can use Class Mastery — slotting another class&apos;s skill line
          disables it.
        </Typography>
      </Box>

      {/* Gate / progress status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {gate.eligible ? (
          <Chip
            size="small"
            label={`${picks.length} / ${CLASS_MASTERY_MAX_PICKS} picked — ${classLabel}`}
            sx={{
              height: 20,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              letterSpacing: 0.5,
              background: alpha(accent, isDark ? 0.14 : 0.08),
              border: `1px solid ${alpha(accent, 0.3)}`,
              color: accent,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        ) : (
          <Chip
            size="small"
            icon={<LockIcon sx={{ fontSize: '12px !important', ml: '6px !important' }} />}
            label={
              gate.reason === 'no-class'
                ? 'Pick a class in Identity to unlock'
                : 'Disabled while subclassed'
            }
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
      </Box>

      {gate.eligible === false && gate.reason === 'subclassed' && (
        <Typography variant="caption" sx={{ fontSize: 11, color: subtleText, lineHeight: 1.5 }}>
          All three Subclassing slots must be {classLabel} lines (or empty) to use Class Mastery.
          {picks.length > 0 && ' Your picks are kept and re-activate when you un-subclass.'}
        </Typography>
      )}

      {/* The five passives of the base class */}
      {line && (
        <Stack spacing={0.75}>
          {line.skills.map((skill) => {
            const isSelected = picks.includes(skill.id);
            return (
              <PassiveRow
                key={skill.id}
                skill={skill}
                isSelected={isSelected}
                isLocked={
                  !gate.eligible || (!isSelected && picks.length >= CLASS_MASTERY_MAX_PICKS)
                }
                accent={accent}
                onToggle={handleToggle}
              />
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};

export const ClassMasterySection = React.memo(ClassMasterySectionComponent);
