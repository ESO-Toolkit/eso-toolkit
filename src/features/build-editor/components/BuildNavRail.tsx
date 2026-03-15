/**
 * BuildNavRail
 * Desktop: 56px vertical icon rail with scroll-spy active indicator.
 * Mobile: bottom tab bar with horizontal icons.
 */

import {
  AutoFixHigh as ChampionIcon,
  BookOutlined as GuideIcon,
  CameraAltOutlined as ScreenshotIcon,
  Inventory2Outlined as EquipmentIcon,
  LocalDrinkOutlined as ConsumableIcon,
  PersonOutlined as GeneralIcon,
  PsychologyOutlined as PassiveIcon,
  SettingsOutlined as SettingsIcon,
  SportsEsportsOutlined as SkillsIcon,
  TuneOutlined as CharacterIcon,
} from '@mui/icons-material';
import { Box, ButtonBase, Tooltip, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { SectionProgressMap } from '../hooks/useSectionProgress';
import { BE_TOKENS, type SectionId } from '../theme/buildEditorTokens';

const NAV_ITEMS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Identity', icon: <GeneralIcon sx={{ fontSize: 20 }} /> },
  { id: 'character', label: 'Character', icon: <CharacterIcon sx={{ fontSize: 20 }} /> },
  { id: 'equipment', label: 'Equipment', icon: <EquipmentIcon sx={{ fontSize: 20 }} /> },
  { id: 'skills', label: 'Skills', icon: <SkillsIcon sx={{ fontSize: 20 }} /> },
  { id: 'champion', label: 'Champion', icon: <ChampionIcon sx={{ fontSize: 20 }} /> },
  { id: 'consumables', label: 'Consumables', icon: <ConsumableIcon sx={{ fontSize: 20 }} /> },
  { id: 'passives', label: 'Passives', icon: <PassiveIcon sx={{ fontSize: 20 }} /> },
  { id: 'guide', label: 'Guide', icon: <GuideIcon sx={{ fontSize: 20 }} /> },
  { id: 'screenshots', label: 'Screenshots', icon: <ScreenshotIcon sx={{ fontSize: 20 }} /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon sx={{ fontSize: 20 }} /> },
];

interface BuildNavRailProps {
  progress: SectionProgressMap;
}

export const BuildNavRail: React.FC<BuildNavRailProps> = ({ progress }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeSection, setActiveSection] = useState<SectionId>('general');
  const isScrollingRef = useRef(false);

  // Scroll-spy: observe which section is in view.
  // Picks the topmost intersecting section to avoid the "last entry wins" bug.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Skip observer updates during programmatic scroll
        if (isScrollingRef.current) return;

        // Find the topmost intersecting section (smallest positive top value)
        let best: { id: SectionId; top: number } | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id.replace('section-', '') as SectionId;
            if (BE_TOKENS.sectionIds.includes(sectionId)) {
              const top = entry.boundingClientRect.top;
              if (!best || top < best.top) {
                best = { id: sectionId, top };
              }
            }
          }
        }
        if (best) {
          setActiveSection(best.id);
        }
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    );

    BE_TOKENS.sectionIds.forEach((id) => {
      const el = document.getElementById(`section-${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((sectionId: SectionId) => {
    // Immediately set active section on click, then temporarily suppress
    // the observer so a competing section can't steal the highlight.
    setActiveSection(sectionId);
    isScrollingRef.current = true;

    const el = document.getElementById(`section-${sectionId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Re-enable observer after scroll settles
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  }, []);

  const railBg = isDark ? alpha('#0b1220', 0.9) : alpha('#f8fafc', 0.95);
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // ── Mobile: bottom bar ──
  if (isMobile) {
    return (
      <nav
        role="tablist"
        aria-label="Build editor sections"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: BE_TOKENS.navRail.mobileHeight,
          background: railBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 4px',
          zIndex: 1200,
          overflowX: 'auto',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = activeSection === item.id;
          return (
            <Tooltip key={item.id} title={item.label} placement="top">
              <ButtonBase
                role="tab"
                aria-selected={active}
                aria-label={item.label}
                onClick={() => scrollToSection(item.id)}
                sx={{
                  background: active
                    ? isDark
                      ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)'
                      : 'rgba(15, 23, 42, 0.07)'
                    : 'transparent',
                  color: active ? 'var(--be-accent, #38bdf8)' : 'text.disabled',
                  borderRadius: 1.5,
                  p: 0.75,
                  minWidth: 36,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.25,
                  transition: 'all 0.15s',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {item.icon}
                {progress[item.id] && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 5,
                      height: 5,
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

  // ── Desktop: vertical rail ──
  return (
    <nav
      role="tablist"
      aria-label="Build editor sections"
      style={{
        width: BE_TOKENS.navRail.width,
        flexShrink: 0,
        background: railBg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 2,
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        maxHeight: '100vh',
        overflowY: 'auto',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = activeSection === item.id;
        return (
          <Tooltip key={item.id} title={item.label} placement="right">
            <ButtonBase
              role="tab"
              aria-selected={active}
              aria-label={item.label}
              onClick={() => scrollToSection(item.id)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: active
                  ? isDark
                    ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.15)'
                    : 'rgba(15, 23, 42, 0.08)'
                  : 'transparent',
                color: active
                  ? 'var(--be-accent, #38bdf8)'
                  : isDark
                    ? 'rgba(255,255,255,0.4)'
                    : 'rgba(0,0,0,0.35)',
                transition: 'all 0.15s',
                '&:hover': {
                  background: isDark ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.1)' : 'rgba(15, 23, 42, 0.06)',
                  color: 'var(--be-accent, #38bdf8)',
                },
              }}
            >
              {item.icon}
              {active && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: 3,
                    borderRadius: '0 2px 2px 0',
                    background: 'var(--be-accent, #38bdf8)',
                  }}
                />
              )}
              {progress[item.id] && !active && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 5,
                    height: 5,
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
};
