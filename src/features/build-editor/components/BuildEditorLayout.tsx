/**
 * Build Editor Layout — Bento Grid Orchestrator
 *
 * Scrollable bento grid of build-editor sections. The nav rail on the left
 * provides click-to-jump navigation; the setup tab bar sits at the bottom.
 *
 * Wide desktop (≥1200px): CSS Grid bento layout with nav rail on left. Below-the-fold
 * sections are wrapped in `LazySection` — they render as cheap placeholder
 * boxes until scrolled within ~1 viewport, then mount their real subtree and
 * stay mounted for the rest of the session. This keeps the initial React render
 * bounded to ~3 sections instead of all 11.
 *
 * Compact layouts (<1200px): Single-column cards so dense editors retain useful
 * target sizes. Mobile (<900px) also switches to the bottom nav bar. Sections start expanded so
 * the user lands on actionable content rather than a wall of collapsed headers;
 * each section can still be collapsed manually via its header. (SectionCard's
 * <Collapse> mounts the content immediately when expanded.)
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
import { visuallyHidden } from '@mui/utils';
import React from 'react';
import { useSelector } from 'react-redux';

import { useSaveBuild } from '../hooks/useSaveBuild';
import { useSaveShortcut } from '../hooks/useSaveShortcut';
import { useSectionProgress } from '../hooks/useSectionProgress';
import { selectActiveSetup } from '../store/buildEditorSelectors';

import { BuildCompletionHeader } from './BuildCompletionHeader';
import { BuildNavRail } from './BuildNavRail';
import { LazySection } from './primitives/LazySection';
import { SectionCard } from './primitives/SectionCard';
import { SectionHeaderActions } from './SectionHeaderActions';
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
import { BUILD_EDITOR_SETUP_PANEL_ID, getBuildSetupTabId, SetupTabBar } from './SetupTabBar';

export const BuildEditorLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSingleColumn = useMediaQuery(theme.breakpoints.down('lg'));
  const progress = useSectionProgress();
  const activeSetup = useSelector(selectActiveSetup);
  // The first two rows sit above the fold and render immediately. Every later
  // section is lazy on desktop and mobile; placeholders retain stable ids so
  // rail navigation can scroll to a section before its heavy subtree mounts.
  const saveCurrentBuild = useSaveBuild();

  useSaveShortcut(saveCurrentBuild);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box component="h1" sx={visuallyHidden}>
        Build editor
      </Box>

      {/* Header: build name + progress + save/share.
          Sticky on mobile so Save/Publish stay within thumb reach from any
          scroll position (H5). On desktop the inner bento grid is the scroll
          container and the header is already always visible. */}
      <Box
        sx={{
          position: isMobile ? 'sticky' : 'relative',
          top: 0,
          zIndex: isMobile ? 100 : 1,
        }}
      >
        <BuildCompletionHeader />
      </Box>

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
          data-build-editor-scroll-region
          sx={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            pt: { xs: 1.5, md: 2.5 },
            pl: { xs: 1.5, md: 2.5 },
            pr: { xs: 1.5, md: 2.5 },
            // Avoid p+pb shorthand conflicts — use explicit paddingBottom so it
            // never gets overridden by the `padding` shorthand class cascade.
            // Adds enough clearance for the fixed bottom nav (64px) + iOS home
            // indicator safe area, with a generous 24px buffer.
            paddingBottom: isMobile ? 'calc(88px + env(safe-area-inset-bottom))' : '20px',
          }}
        >
          {/* Setup tab bar at top on mobile — surfaced above sections so users
              discover multi-setup support without scrolling ~3 000px down. */}
          {isMobile && <SetupTabBar />}

          <Box
            id={BUILD_EDITOR_SETUP_PANEL_ID}
            role="tabpanel"
            aria-labelledby={activeSetup ? getBuildSetupTabId(activeSetup.id) : undefined}
            aria-label={activeSetup ? undefined : 'Build setup'}
            sx={{
              display: 'grid',
              gap: { xs: 2, md: 2.5, lg: 3 },
              // Keep cards full-width through tablet and small-laptop layouts.
              // At 900px the nav rail and content gutters otherwise leave the
              // Skills hotbar with undersized targets despite ample viewport width.
              gridTemplateColumns: isSingleColumn ? '1fr' : 'repeat(2, 1fr)',
              gridAutoFlow: isSingleColumn ? undefined : 'dense',
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
                defaultExpanded
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
                defaultExpanded
                headerAction={<SectionHeaderActions section="character" />}
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
                defaultExpanded
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
                defaultExpanded
              >
                <ClassMasterySection />
              </SectionCard>
            </LazySection>

            {/* Row 3–4: Equipment spans 2 rows; Skills + Consumables stack on right */}
            <LazySection
              sectionId="equipment"
              placeholderMinHeight={560}
              gridRow={isSingleColumn ? undefined : 'span 2'}
            >
              <SectionCard
                id="equipment"
                title="Equipment"
                icon={<EquipmentIcon />}
                complete={progress.equipment}
                variant="primary"
                gridRow={isSingleColumn ? undefined : 'span 2'}
                defaultExpanded
                headerAction={<SectionHeaderActions section="gear" />}
              >
                <EquipmentSection />
              </SectionCard>
            </LazySection>

            <LazySection sectionId="skills" placeholderMinHeight={360}>
              <SectionCard
                id="skills"
                title="Skills"
                icon={<SkillsIcon />}
                complete={progress.skills}
                variant="primary"
                defaultExpanded
                headerAction={<SectionHeaderActions section="skills" />}
              >
                <SkillsSection />
              </SectionCard>
            </LazySection>

            <LazySection sectionId="consumables" placeholderMinHeight={280}>
              <SectionCard
                id="consumables"
                title="Consumables"
                icon={<ConsumableIcon />}
                complete={progress.consumables}
                defaultExpanded
                headerAction={<SectionHeaderActions section="consumables" />}
              >
                <ConsumablesSection />
              </SectionCard>
            </LazySection>

            {/* Champion Points — full width */}
            <LazySection
              sectionId="champion"
              placeholderMinHeight={520}
              gridColumn={isSingleColumn ? undefined : 'span 2'}
            >
              <SectionCard
                id="champion"
                title="Champion Points"
                icon={<ChampionIcon />}
                complete={progress.champion}
                variant="primary"
                gridColumn={isSingleColumn ? undefined : 'span 2'}
                defaultExpanded
                headerAction={<SectionHeaderActions section="champion" />}
              >
                <ChampionSection />
              </SectionCard>
            </LazySection>

            {/* Passives — half width */}
            <LazySection sectionId="passives" placeholderMinHeight={320}>
              <SectionCard
                id="passives"
                title="Passives"
                icon={<PassiveIcon />}
                complete={progress.passives}
                defaultExpanded
                headerAction={<SectionHeaderActions section="passives" />}
              >
                <PassivesSection />
              </SectionCard>
            </LazySection>

            {/* Stats — full width */}
            <LazySection
              sectionId="stats"
              placeholderMinHeight={520}
              gridColumn={isSingleColumn ? undefined : 'span 2'}
            >
              <SectionCard
                id="stats"
                title="Stats"
                icon={<StatsIcon />}
                complete={progress.stats}
                variant="primary"
                gridColumn={isSingleColumn ? undefined : 'span 2'}
                defaultExpanded
              >
                <StatsSection />
              </SectionCard>
            </LazySection>

            {/* Guide & Media — full width */}
            <LazySection
              sectionId="guide"
              placeholderMinHeight={360}
              gridColumn={isSingleColumn ? undefined : 'span 2'}
            >
              <SectionCard
                id="guide"
                title="Guide & Media"
                icon={<GuideIcon />}
                complete={progress.guide}
                gridColumn={isSingleColumn ? undefined : 'span 2'}
                defaultExpanded
              >
                <GuideSection />
              </SectionCard>
            </LazySection>

            {/* Settings — full width footer */}
            <LazySection
              sectionId="settings"
              placeholderMinHeight={200}
              gridColumn={isSingleColumn ? undefined : 'span 2'}
            >
              <SectionCard
                id="settings"
                title="Settings"
                icon={<SettingsIcon />}
                complete={progress.settings}
                variant="subtle"
                gridColumn={isSingleColumn ? undefined : 'span 2'}
                defaultExpanded
              >
                <SettingsSection />
              </SectionCard>
            </LazySection>
          </Box>
        </Box>
      </Box>

      {/* Setup tab bar at bottom on desktop */}
      {!isMobile && <SetupTabBar />}

      {/* Mobile bottom nav */}
      {isMobile && <BuildNavRail progress={progress} />}
    </Box>
  );
};
