/**
 * Build Editor Layout — Bento Grid Orchestrator
 *
 * Scrollable bento grid of build-editor sections. The nav rail on the left
 * provides click-to-jump navigation; the setup tab bar sits at the bottom.
 *
 * Desktop (≥960px): CSS Grid bento layout with nav rail on left. Below-the-fold
 * sections are wrapped in `LazySection` — they render as cheap placeholder
 * boxes until scrolled within ~1 viewport, then mount their real subtree and
 * stay mounted for the rest of the session. This keeps the initial React render
 * bounded to ~3 sections instead of all 11.
 *
 * Mobile (<960px): Single column, sections collapsible (SectionCard's
 * <Collapse unmountOnExit> already handles lazy mounting), bottom nav bar.
 */

import {
  AccountTreeOutlined as SubclassingIcon,
  AutoFixHigh as ChampionIcon,
  SchoolOutlined as ClassMasteryIcon,
  BarChartOutlined as StatsIcon,
  BookOutlined as GuideIcon,
  Inventory2Outlined as EquipmentIcon,
  LocalDrinkOutlined as ConsumableIcon,
  PersonOutlined as GeneralIcon,
  PsychologyOutlined as PassiveIcon,
  SettingsOutlined as SettingsIcon,
  SportsEsportsOutlined as SkillsIcon,
  TuneOutlined as CharacterIcon,
} from '@mui/icons-material';
import { Box, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';

import { saveBuild } from '@/store/saved_builds';
import type { RootState } from '@/store/storeWithHistory';

import { useSectionProgress } from '../hooks/useSectionProgress';
import { selectIsDirty } from '../store/buildEditorSelectors';
import { BUILD_EDITOR_STORAGE_KEY, markSaved } from '../store/buildEditorSlice';

import { BuildCompletionHeader } from './BuildCompletionHeader';
import { BuildNavRail } from './BuildNavRail';
import { LazySection } from './primitives/LazySection';
import { SectionCard } from './primitives/SectionCard';
import { ChampionSection } from './sections/ChampionSection';
import { CharacterSection } from './sections/CharacterSection';
import { ClassMasterySection } from './sections/ClassMasterySection';
import { ConsumablesSection } from './sections/ConsumablesSection';
import { EquipmentSection } from './sections/EquipmentSection';
import { GeneralSection } from './sections/GeneralSection';
import { GuideSection } from './sections/GuideSection';
import { PassivesSection } from './sections/PassivesSection';
import { SettingsSection } from './sections/SettingsSection';
import { SkillsSection } from './sections/SkillsSection';
import { StatsSection } from './sections/StatsSection';
import { SubclassingSection } from './sections/SubclassingSection';
import { SetupTabBar } from './SetupTabBar';

export const BuildEditorLayout: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const progress = useSectionProgress();
  const isDirty = useSelector(selectIsDirty);
  // On mobile, SectionCard's <Collapse unmountOnExit> already lazy-mounts content,
  // so LazySection would be redundant — pass eager=true there. On desktop, the
  // first two rows (Identity, Character, Subclassing) sit above the fold and
  // should render immediately without IntersectionObserver wait.
  const lazyDesktop = !isMobile;
  // Lazy read via the store — subscribing to `build` here would force the
  // whole layout (and every SectionCard child) to re-render on every edit.
  const store = useStore<RootState>();

  // Warn user before leaving with unsaved changes
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
    },
    [isDirty],
  );

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);

  // Ctrl+S / Cmd+S keyboard shortcut to save.
  // Reads state lazily via the store so this effect registers the listener
  // exactly once — it never re-runs on build edits.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const { build, activeSetupIndex } = store.getState().buildEditor;
        if (!build.name.trim()) return;
        try {
          localStorage.setItem(
            BUILD_EDITOR_STORAGE_KEY,
            JSON.stringify({ build, activeSetupIndex }),
          );
        } catch {
          // Silently fail — localStorage might be full
        }
        dispatch(saveBuild(build));
        dispatch(markSaved());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, store]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 600 }}>
      {/* Header: build name + progress + save/share */}
      <BuildCompletionHeader />

      {/* Body: nav rail + bento grid */}
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          flexDirection: 'row',
        }}
      >
        {/* Desktop nav rail */}
        {!isMobile && <BuildNavRail progress={progress} />}

        {/* Bento grid content */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            p: { xs: 1.5, md: 2.5 },
            pb: isMobile ? 10 : 2.5, // Extra bottom padding for mobile nav bar
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 2, md: 2.5, lg: 3 },
              // Desktop: 2-column bento grid with dense packing
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gridAutoFlow: isMobile ? undefined : 'dense',
            }}
          >
            {/* Row 1: Identity (primary) + Character — above the fold, render eagerly */}
            <LazySection eager>
              <SectionCard
                id="general"
                title="Identity"
                icon={<GeneralIcon />}
                complete={progress.general}
                variant="primary"
                defaultExpanded={!isMobile}
              >
                <GeneralSection />
              </SectionCard>
            </LazySection>

            <LazySection eager>
              <SectionCard
                id="character"
                title="Character"
                icon={<CharacterIcon />}
                complete={progress.character}
                defaultExpanded={!isMobile}
              >
                <CharacterSection />
              </SectionCard>
            </LazySection>

            {/* Row 2: Subclassing + Class Mastery — just below fold, eager to avoid jump on load */}
            <LazySection eager>
              <SectionCard
                id="subclassing"
                title="Subclassing"
                icon={<SubclassingIcon />}
                complete={progress.subclassing}
                defaultExpanded={!isMobile}
              >
                <SubclassingSection />
              </SectionCard>
            </LazySection>

            <LazySection eager>
              <SectionCard
                id="class-mastery"
                title="Class Mastery"
                icon={<ClassMasteryIcon />}
                complete={progress['class-mastery']}
                defaultExpanded={!isMobile}
              >
                <ClassMasterySection />
              </SectionCard>
            </LazySection>

            {/* Row 3–4: Equipment spans 2 rows; Skills + Consumables stack on right */}
            <LazySection
              eager={!lazyDesktop}
              placeholderMinHeight={560}
              gridRow={isMobile ? undefined : 'span 2'}
            >
              <SectionCard
                id="equipment"
                title="Equipment"
                icon={<EquipmentIcon />}
                complete={progress.equipment}
                variant="primary"
                gridRow={isMobile ? undefined : 'span 2'}
                defaultExpanded={!isMobile}
              >
                <EquipmentSection />
              </SectionCard>
            </LazySection>

            <LazySection eager={!lazyDesktop} placeholderMinHeight={360}>
              <SectionCard
                id="skills"
                title="Skills"
                icon={<SkillsIcon />}
                complete={progress.skills}
                variant="primary"
                defaultExpanded={!isMobile}
              >
                <SkillsSection />
              </SectionCard>
            </LazySection>

            <LazySection eager={!lazyDesktop} placeholderMinHeight={280}>
              <SectionCard
                id="consumables"
                title="Consumables"
                icon={<ConsumableIcon />}
                complete={progress.consumables}
                defaultExpanded={!isMobile}
              >
                <ConsumablesSection />
              </SectionCard>
            </LazySection>

            {/* Champion Points — full width */}
            <LazySection
              eager={!lazyDesktop}
              placeholderMinHeight={520}
              gridColumn={isMobile ? undefined : 'span 2'}
            >
              <SectionCard
                id="champion"
                title="Champion Points"
                icon={<ChampionIcon />}
                complete={progress.champion}
                variant="primary"
                gridColumn={isMobile ? undefined : 'span 2'}
                defaultExpanded={!isMobile}
              >
                <ChampionSection />
              </SectionCard>
            </LazySection>

            {/* Passives — half width */}
            <LazySection eager={!lazyDesktop} placeholderMinHeight={320}>
              <SectionCard
                id="passives"
                title="Passives"
                icon={<PassiveIcon />}
                complete={progress.passives}
                defaultExpanded={!isMobile}
              >
                <PassivesSection />
              </SectionCard>
            </LazySection>

            {/* Stats — full width */}
            <LazySection
              eager={!lazyDesktop}
              placeholderMinHeight={520}
              gridColumn={isMobile ? undefined : 'span 2'}
            >
              <SectionCard
                id="stats"
                title="Stats"
                icon={<StatsIcon />}
                complete={progress.stats}
                variant="primary"
                gridColumn={isMobile ? undefined : 'span 2'}
                defaultExpanded={!isMobile}
              >
                <StatsSection />
              </SectionCard>
            </LazySection>

            {/* Guide & Media — full width */}
            <LazySection
              eager={!lazyDesktop}
              placeholderMinHeight={360}
              gridColumn={isMobile ? undefined : 'span 2'}
            >
              <SectionCard
                id="guide"
                title="Guide & Media"
                icon={<GuideIcon />}
                complete={progress.guide}
                gridColumn={isMobile ? undefined : 'span 2'}
                defaultExpanded={!isMobile}
              >
                <GuideSection />
              </SectionCard>
            </LazySection>

            {/* Settings — full width footer */}
            <LazySection
              eager={!lazyDesktop}
              placeholderMinHeight={200}
              gridColumn={isMobile ? undefined : 'span 2'}
            >
              <SectionCard
                id="settings"
                title="Settings"
                icon={<SettingsIcon />}
                complete={progress.settings}
                variant="subtle"
                gridColumn={isMobile ? undefined : 'span 2'}
                defaultExpanded={!isMobile}
              >
                <SettingsSection />
              </SectionCard>
            </LazySection>
          </Box>
        </Box>
      </Box>

      {/* Setup tab bar at bottom */}
      <SetupTabBar />

      {/* Mobile bottom nav */}
      {isMobile && <BuildNavRail progress={progress} />}
    </Box>
  );
};
