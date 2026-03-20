/**
 * Build Editor Layout — Bento Grid Orchestrator
 *
 * Replaces the old sidebar+content-panel router with a scrollable bento grid
 * that renders ALL sections simultaneously. The nav rail provides scroll-spy
 * icons; the setup tab bar sits at the bottom.
 *
 * Desktop (≥960px): CSS Grid bento layout with nav rail on left.
 * Mobile (<960px): Single column, sections collapsible, bottom nav bar.
 */

import {
  AccountTreeOutlined as SubclassingIcon,
  AutoFixHigh as ChampionIcon,
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
import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { useSectionProgress } from '../hooks/useSectionProgress';

import { BuildCompletionHeader } from './BuildCompletionHeader';
import { BuildNavRail } from './BuildNavRail';
import { staggerContainer } from './motion/variants';
import { SectionCard } from './primitives/SectionCard';
import { ChampionSection } from './sections/ChampionSection';
import { CharacterSection } from './sections/CharacterSection';
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const prefersReduced = useReducedMotion();
  const progress = useSectionProgress();
  return (
    <Box component="main" sx={{ display: 'flex', flexDirection: 'column', minHeight: 600 }}>
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
          <motion.div
            variants={prefersReduced ? undefined : staggerContainer}
            initial={prefersReduced ? undefined : 'hidden'}
            animate={prefersReduced ? undefined : 'visible'}
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
              {/* Row 1: Identity (primary) + Character */}
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

              <SectionCard
                id="character"
                title="Character"
                icon={<CharacterIcon />}
                complete={progress.character}
                defaultExpanded={!isMobile}
              >
                <CharacterSection />
              </SectionCard>

              {/* Row 2: Subclassing */}
              <SectionCard
                id="subclassing"
                title="Subclassing"
                icon={<SubclassingIcon />}
                complete={progress.subclassing}
                defaultExpanded={!isMobile}
              >
                <SubclassingSection />
              </SectionCard>

              {/* Row 3–4: Equipment spans 2 rows; Skills + Consumables stack on right */}
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

              <SectionCard
                id="consumables"
                title="Consumables"
                icon={<ConsumableIcon />}
                complete={progress.consumables}
                defaultExpanded={!isMobile}
              >
                <ConsumablesSection />
              </SectionCard>

              {/* Champion Points — full width */}
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

              {/* Passives — half width */}
              <SectionCard
                id="passives"
                title="Passives"
                icon={<PassiveIcon />}
                complete={progress.passives}
                defaultExpanded={!isMobile}
              >
                <PassivesSection />
              </SectionCard>

              {/* Stats — full width */}
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

              {/* Guide & Media — full width */}
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

              {/* Settings — full width footer */}
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
            </Box>
          </motion.div>
        </Box>
      </Box>

      {/* Setup tab bar at bottom */}
      <SetupTabBar />

      {/* Mobile bottom nav */}
      {isMobile && <BuildNavRail progress={progress} />}
    </Box>
  );
};
