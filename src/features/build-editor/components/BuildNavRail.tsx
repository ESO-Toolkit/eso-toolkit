/**
 * BuildNavRail
 * Desktop: progress-oriented navigation sidebar. No scroll-spy — just click-to-jump
 * with completion indicators. Avoids the misleading single-highlight problem
 * that scroll-spy causes in a 2-column bento grid.
 *
 * Mobile: compact bottom tab bar with icons + completion dots.
 */

import {
  AccountTreeOutlined as SubclassingIcon,
  AutoFixHigh as ChampionIcon,
  SchoolOutlined as ClassMasteryIcon,
  BarChartOutlined as StatsIcon,
  BookOutlined as GuideIcon,
  CheckCircleOutlineRounded as CheckIcon,
  Inventory2Outlined as EquipmentIcon,
  LocalDrinkOutlined as ConsumableIcon,
  PersonOutlined as GeneralIcon,
  PsychologyOutlined as PassiveIcon,
  RadioButtonUncheckedRounded as EmptyIcon,
  SettingsOutlined as SettingsIcon,
  SportsEsportsOutlined as SkillsIcon,
  TuneOutlined as CharacterIcon,
} from '@mui/icons-material';
import { Box, ButtonBase, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback } from 'react';

import type { SectionProgressMap } from '../hooks/useSectionProgress';
import { BE_TOKENS, type SectionId } from '../theme/buildEditorTokens';

/* ── Section groups — mirror the bento grid spatial layout ────────────── */

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Build',
    items: [
      { id: 'general', label: 'Identity', icon: <GeneralIcon sx={{ fontSize: 18 }} /> },
      { id: 'character', label: 'Character', icon: <CharacterIcon sx={{ fontSize: 18 }} /> },
      { id: 'subclassing', label: 'Subclassing', icon: <SubclassingIcon sx={{ fontSize: 18 }} /> },
      {
        id: 'class-mastery',
        label: 'Class Mastery',
        icon: <ClassMasteryIcon sx={{ fontSize: 18 }} />,
      },
    ],
  },
  {
    label: 'Loadout',
    items: [
      { id: 'equipment', label: 'Equipment', icon: <EquipmentIcon sx={{ fontSize: 18 }} /> },
      { id: 'skills', label: 'Skills', icon: <SkillsIcon sx={{ fontSize: 18 }} /> },
      { id: 'consumables', label: 'Consumables', icon: <ConsumableIcon sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    label: 'Progression',
    items: [
      { id: 'champion', label: 'Champion', icon: <ChampionIcon sx={{ fontSize: 18 }} /> },
      { id: 'passives', label: 'Passives', icon: <PassiveIcon sx={{ fontSize: 18 }} /> },
      { id: 'stats', label: 'Stats', icon: <StatsIcon sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    label: 'Details',
    items: [
      { id: 'guide', label: 'Guide & Media', icon: <GuideIcon sx={{ fontSize: 18 }} /> },
      { id: 'settings', label: 'Settings', icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
    ],
  },
];

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

interface BuildNavRailProps {
  progress: SectionProgressMap;
}

const BuildNavRailComponent: React.FC<BuildNavRailProps> = ({ progress }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const scrollToSection = useCallback((sectionId: SectionId) => {
    const el = document.getElementById(`section-${sectionId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const railBg = isDark ? alpha('#08121a', 0.92) : alpha('#f5f8fc', 0.96);
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  // ── Mobile: bottom bar ──────────────────────────────────────────────────
  if (isMobile) {
    const fadeBg = isDark ? '8, 18, 26' : '245, 248, 252';
    return (
      <nav
        aria-label="Build editor sections"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: BE_TOKENS.navRail.mobileHeight,
          background: railBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 4px',
          zIndex: 1200,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {/* Scroll fade indicators */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: 24,
            height: BE_TOKENS.navRail.mobileHeight,
            background: `linear-gradient(to right, rgba(${fadeBg}, 0.9), transparent)`,
            pointerEvents: 'none',
            zIndex: 1201,
          }}
        />
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            width: 24,
            height: BE_TOKENS.navRail.mobileHeight,
            background: `linear-gradient(to left, rgba(${fadeBg}, 0.9), transparent)`,
            pointerEvents: 'none',
            zIndex: 1201,
          }}
        />
        {ALL_ITEMS.map((item) => {
          const done = progress[item.id];
          return (
            <Tooltip key={item.id} title={item.label} placement="top">
              <ButtonBase
                aria-label={item.label}
                onClick={() => scrollToSection(item.id)}
                sx={{
                  color: done
                    ? 'var(--be-accent, #38bdf8)'
                    : isDark
                      ? 'rgba(255,255,255,0.45)'
                      : 'rgba(0,0,0,0.38)',
                  borderRadius: 1.5,
                  p: 0.75,
                  minWidth: 36,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.25,
                  transition: 'color 0.2s',
                  position: 'relative',
                  flexShrink: 0,
                  '&:hover': {
                    color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)',
                  },
                }}
              >
                {item.icon}
                {done && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--be-accent, #22c55e)',
                    }}
                  />
                )}
              </ButtonBase>
            </Tooltip>
          );
        })}
      </nav>
    );
  }

  // ── Desktop: grouped progress navigation ────────────────────────────────
  return (
    <nav
      aria-label="Build editor sections"
      style={{
        width: BE_TOKENS.navRail.width,
        flexShrink: 0,
        background: railBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 0',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        maxHeight: '100vh',
        overflowY: 'auto',
      }}
    >
      {NAV_GROUPS.map((group, groupIdx) => (
        <React.Fragment key={group.label}>
          {/* Group divider */}
          {groupIdx > 0 && (
            <Box
              sx={{
                height: '1px',
                mx: 1.5,
                my: 0.75,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}
            />
          )}

          {/* Group label */}
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 600,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              color: isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.45)',
              px: 1.5,
              pt: groupIdx === 0 ? 0.5 : 0.75,
              pb: 0.5,
              userSelect: 'none',
            }}
          >
            {group.label}
          </Typography>

          {/* Section items */}
          {group.items.map((item) => {
            const done = progress[item.id];

            return (
              <ButtonBase
                key={item.id}
                aria-label={`${item.label}${done ? ' (complete)' : ''}`}
                onClick={() => scrollToSection(item.id)}
                sx={{
                  width: 'calc(100% - 12px)',
                  mx: '6px',
                  minHeight: 34,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  px: 1,
                  py: 0.4,
                  borderRadius: 1.5,
                  justifyContent: 'flex-start',

                  background: 'transparent',

                  color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.58)',

                  transition: 'all 0.15s ease',

                  '&:hover': {
                    background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                    color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.80)',
                  },
                }}
              >
                {/* Section icon */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                  }}
                >
                  {item.icon}
                </Box>

                {/* Label */}
                <Typography
                  component="span"
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    letterSpacing: 0.15,
                    lineHeight: 1.2,
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.label}
                </Typography>

                {/* Completion indicator */}
                {done ? (
                  <CheckIcon
                    sx={{
                      fontSize: 15,
                      color: 'var(--be-accent, #22c55e)',
                      opacity: 0.8,
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <EmptyIcon
                    sx={{
                      fontSize: 15,
                      color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                      flexShrink: 0,
                    }}
                  />
                )}
              </ButtonBase>
            );
          })}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Memoized — `progress` is a stable reference from useSectionProgress when
// no section's completeness flipped, so the rail re-renders only when a
// dot actually needs to change.
export const BuildNavRail = React.memo(BuildNavRailComponent);
