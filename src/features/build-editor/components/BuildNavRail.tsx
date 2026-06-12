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
  BarChartOutlined as StatsIcon,
  BookOutlined as GuideIcon,
  CheckCircleOutlineRounded as CheckIcon,
  Close as CloseIcon,
  Inventory2Outlined as EquipmentIcon,
  LocalDrinkOutlined as ConsumableIcon,
  MoreHoriz as MoreHorizIcon,
  PersonOutlined as GeneralIcon,
  PsychologyOutlined as PassiveIcon,
  RadioButtonUncheckedRounded as EmptyIcon,
  SchoolOutlined as ClassMasteryIcon,
  SettingsOutlined as SettingsIcon,
  SportsEsportsOutlined as SkillsIcon,
  TuneOutlined as CharacterIcon,
} from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useState } from 'react';

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

// Five highest-traffic sections shown directly in the mobile bottom bar.
// Everything else goes in the "More" bottom sheet.
const PRIMARY_ITEM_IDS: ReadonlySet<SectionId> = new Set([
  'general',
  'equipment',
  'skills',
  'consumables',
  'champion',
]);
const PRIMARY_NAV_ITEMS = ALL_ITEMS.filter((item) => PRIMARY_ITEM_IDS.has(item.id));
const MORE_NAV_ITEMS = ALL_ITEMS.filter((item) => !PRIMARY_ITEM_IDS.has(item.id));

// Mobile nav bar height with labels — taller than the token to fit icon + text.
const MOBILE_NAV_HEIGHT_WITH_LABELS = 64;

interface BuildNavRailProps {
  progress: SectionProgressMap;
}

const BuildNavRailComponent: React.FC<BuildNavRailProps> = ({ progress }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [moreOpen, setMoreOpen] = useState(false);

  const scrollToSection = useCallback((sectionId: SectionId) => {
    const el = document.getElementById(`section-${sectionId}`);
    if (!el) return;
    // H3: expand the section first if it's collapsed, then scroll to it.
    const collapsedHeader = el.querySelector('[aria-expanded="false"]') as HTMLElement | null;
    if (collapsedHeader) {
      collapsedHeader.click();
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const railBg = isDark ? alpha('#08121a', 0.92) : alpha('#f5f8fc', 0.96);
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  // ── Mobile: bottom bar (H1: 5 primary items + More; ≥44px; labels) ─────
  if (isMobile) {
    const navBtnSx = {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2px',
      flex: 1,
      minWidth: 44,
      minHeight: 44,
      borderRadius: 1.5,
      position: 'relative' as const,
      transition: 'color 0.2s',
      // Gate hover behind pointer:fine so sticky-hover doesn't linger on touch
      '@media (hover: hover)': {
        '&:hover': {
          color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)',
        },
      },
    };

    return (
      <>
        <nav
          aria-label="Build editor sections"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: `calc(${MOBILE_NAV_HEIGHT_WITH_LABELS}px + env(safe-area-inset-bottom))`,
            background: railBg,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'flex-start',
            paddingTop: '4px',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: '4px',
            paddingRight: '4px',
            zIndex: 1200,
          }}
        >
          {PRIMARY_NAV_ITEMS.map((item) => {
            const done = progress[item.id];
            // Shorten long labels to keep the bottom bar readable at 390px
            const shortLabel =
              item.label === 'Consumables'
                ? 'Food'
                : item.label === 'Champion'
                  ? 'Champ'
                  : item.label;
            return (
              <ButtonBase
                key={item.id}
                aria-label={`${item.label}${done ? ' (complete)' : ''}`}
                onClick={() => scrollToSection(item.id)}
                sx={{
                  ...navBtnSx,
                  color: done
                    ? 'var(--be-accent, #38bdf8)'
                    : isDark
                      ? 'rgba(255,255,255,0.45)'
                      : 'rgba(0,0,0,0.38)',
                }}
              >
                {item.icon}
                <Typography
                  sx={{
                    fontSize: 9,
                    fontWeight: 600,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    lineHeight: 1,
                    letterSpacing: 0.2,
                  }}
                >
                  {shortLabel}
                </Typography>
                {done && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 8,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--be-accent, #22c55e)',
                    }}
                  />
                )}
              </ButtonBase>
            );
          })}

          {/* More button — opens bottom sheet with remaining sections */}
          <ButtonBase
            aria-label="More sections"
            onClick={() => setMoreOpen(true)}
            sx={{
              ...navBtnSx,
              color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.38)',
            }}
          >
            <MoreHorizIcon sx={{ fontSize: 20 }} />
            <Typography
              sx={{
                fontSize: 9,
                fontWeight: 600,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                lineHeight: 1,
                letterSpacing: 0.2,
              }}
            >
              More
            </Typography>
          </ButtonBase>
        </nav>

        {/* More sections bottom sheet */}
        <Drawer
          anchor="bottom"
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '20px 20px 0 0',
                background: isDark
                  ? 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(8,18,26,0.99) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.99) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${borderColor}`,
                borderBottom: 'none',
                maxHeight: '80vh',
              },
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2.5,
              pt: 2,
              pb: 1,
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontSize: 14,
                color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.70)',
              }}
            >
              All Sections
            </Typography>
            <IconButton
              size="small"
              onClick={() => setMoreOpen(false)}
              aria-label="Close section menu"
              sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)' }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <List dense sx={{ pb: 'env(safe-area-inset-bottom)', px: 1 }}>
            {MORE_NAV_ITEMS.map((item) => {
              const done = progress[item.id];
              return (
                <ListItemButton
                  key={item.id}
                  onClick={() => {
                    scrollToSection(item.id);
                    setMoreOpen(false);
                  }}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.25,
                    color: done
                      ? 'var(--be-accent, #38bdf8)'
                      : isDark
                        ? 'rgba(255,255,255,0.72)'
                        : 'rgba(0,0,0,0.65)',
                    '&:hover': {
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: 13,
                          fontWeight: done ? 600 : 400,
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                        },
                      },
                    }}
                  />
                  {done ? (
                    <CheckIcon
                      sx={{ fontSize: 15, color: 'var(--be-accent, #22c55e)', opacity: 0.85 }}
                    />
                  ) : (
                    <EmptyIcon
                      sx={{
                        fontSize: 15,
                        color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                      }}
                    />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        </Drawer>
      </>
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
