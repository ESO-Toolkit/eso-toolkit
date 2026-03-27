/**
 * SlotFullModePanel — collapsible tabs that appear below a roster slot card
 * when mode === 'full'. Shows Gear, Skill Lines, Skills, Champion, Food,
 * and Passives pickers using the Redux-free picker components from the
 * build editor.
 *
 * Props are fully generic (no slot-type coupling) — callers pass the current
 * values and individual onChange callbacks.
 */

import { Box, ButtonBase, Collapse, Divider, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';

import { ChampionPointsPicker } from '../../features/build-editor/components/pickers/ChampionPointsPicker';
import { EquipmentPicker } from '../../features/build-editor/components/pickers/EquipmentPicker';
import { FoodPicker } from '../../features/build-editor/components/pickers/FoodPicker';
import { PassivesPicker } from '../../features/build-editor/components/pickers/PassivesPicker';
import { SkillBarPicker } from '../../features/build-editor/components/pickers/SkillBarPicker';
import type { BuildChampionPoints } from '../../features/build-editor/types/build.types';
import type { GearConfig, SkillsConfig } from '../../features/loadout-manager/types/loadout.types';
import type { SkillLineConfig } from '../../types/roster';

import { SkillLinePickerGroup } from './shared/skill-line-picker';

// ─── Defaults ────────────────────────────────────────────────────────────────

const EMPTY_SKILLS: SkillsConfig = { 0: {}, 1: {} };
const EMPTY_CP: BuildChampionPoints = {
  warfare: { slots: [null, null, null, null], passives: {} },
  fitness: { slots: [null, null, null, null], passives: {} },
  craft: { slots: [null, null, null, null], passives: {} },
};
const EMPTY_GEAR: GearConfig = {};

// ─── Tab pill strip ───────────────────────────────────────────────────────────

const FULL_TABS = [
  { id: 'skills', label: 'Skills' },
  { id: 'gear', label: 'Gear' },
  { id: 'champion', label: 'Champion' },
  { id: 'food', label: 'Food' },
  { id: 'passives', label: 'Passives' },
] as const;

type FullTab = (typeof FULL_TABS)[number]['id'];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SlotFullModePanelProps {
  gear: GearConfig | undefined;
  skillLines: SkillLineConfig | undefined;
  skills: SkillsConfig | undefined;
  cpPoints: BuildChampionPoints | undefined;
  food: { id?: number; name?: string } | undefined;
  passives: number[] | undefined;
  onGearChange: (gear: GearConfig) => void;
  onSkillLinesChange: (config: SkillLineConfig) => void;
  onSkillsChange: (skills: SkillsConfig) => void;
  onCpPointsChange: (cpPoints: BuildChampionPoints) => void;
  onFoodChange: (food: { id?: number; name?: string }) => void;
  onPassivesChange: (passives: number[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SlotFullModePanel: React.FC<SlotFullModePanelProps> = ({
  gear,
  skillLines,
  skills,
  cpPoints,
  food,
  passives,
  onGearChange,
  onSkillLinesChange,
  onSkillsChange,
  onCpPointsChange,
  onFoodChange,
  onPassivesChange,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [activeTab, setActiveTab] = useState<FullTab | null>(null);

  const toggle = (tab: FullTab): void => setActiveTab((prev) => (prev === tab ? null : tab));

  return (
    <Box sx={{ mt: 1.5 }}>
      <Divider
        sx={{
          mb: 1.5,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }}
      />

      {/* Tab pill strip */}
      <Box role="tablist" aria-label="Build detail tabs" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
        {FULL_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <ButtonBase
              key={tab.id}
              onClick={() => toggle(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.label} tab${isActive ? ', selected' : ''}`}
              sx={{
                px: 1.25,
                py: 0.5,
                borderRadius: '99px',
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                letterSpacing: 0.3,
                color: isActive
                  ? 'var(--be-accent, #38bdf8)'
                  : isDark
                    ? 'rgba(255,255,255,0.50)'
                    : 'rgba(0,0,0,0.50)',
                background: isActive
                  ? isDark
                    ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)'
                    : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.07)'
                  : isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.035)',
                border: `1px solid ${
                  isActive
                    ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.28)'
                    : isDark
                      ? 'rgba(255,255,255,0.07)'
                      : 'rgba(0,0,0,0.07)'
                }`,
                transition: 'all 0.15s',
                '&:hover': {
                  background: isActive
                    ? isDark
                      ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.14)'
                      : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)'
                    : isDark
                      ? 'rgba(255,255,255,0.07)'
                      : 'rgba(0,0,0,0.055)',
                },
              }}
            >
              <Typography
                component="span"
                sx={{ fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit' }}
              >
                {tab.label}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Panel content */}
      <Collapse in={activeTab === 'skills'} unmountOnExit>
        <Box sx={{ pt: 0.5, pb: 1.5 }}>
          <Stack spacing={2.5}>
            <SkillLinePickerGroup value={skillLines} onChange={onSkillLinesChange} />
            <SkillBarPicker
              skills={skills ?? EMPTY_SKILLS}
              selectedClassLineIds={[null, null, null]}
              onChange={onSkillsChange}
            />
          </Stack>
        </Box>
      </Collapse>

      <Collapse in={activeTab === 'gear'} unmountOnExit>
        <Box sx={{ pt: 0.5, pb: 1.5 }}>
          <EquipmentPicker gear={gear ?? EMPTY_GEAR} onChange={onGearChange} />
        </Box>
      </Collapse>

      <Collapse in={activeTab === 'champion'} unmountOnExit>
        <Box sx={{ pt: 0.5, pb: 1.5 }}>
          <ChampionPointsPicker cp={cpPoints ?? EMPTY_CP} onChange={onCpPointsChange} />
        </Box>
      </Collapse>

      <Collapse in={activeTab === 'food'} unmountOnExit>
        <Box sx={{ pt: 0.5, pb: 1.5 }}>
          <FoodPicker food={food ?? {}} onChange={onFoodChange} />
        </Box>
      </Collapse>

      <Collapse in={activeTab === 'passives'} unmountOnExit>
        <Box sx={{ pt: 0.5, pb: 1.5 }}>
          <PassivesPicker passives={passives ?? []} onChange={onPassivesChange} />
        </Box>
      </Collapse>
    </Box>
  );
};
