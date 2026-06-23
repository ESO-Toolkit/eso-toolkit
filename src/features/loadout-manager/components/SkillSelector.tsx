/**
 * Skill Selector Component
 *
 * Thin Redux wrapper around the shared SkillBarPicker (src/components/skills).
 * Section B3 of the build⇄loadout bridge: the Loadout Manager's setup editor
 * now uses the same front/back bar editor as the Build Editor instead of its
 * own inline Autocomplete search, so skill editing is consistent across both
 * surfaces. Public props are unchanged, so SetupEditor is untouched.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { SkillBarPicker } from '@/components/skills/SkillBarPicker';

import { updateSkills } from '../store/loadoutSlice';
import type { SkillsConfig } from '../types/loadout.types';

interface SkillSelectorProps {
  skills: SkillsConfig;
  trialId: string;
  pageIndex: number;
  setupIndex: number;
}

const EMPTY_SKILLS: SkillsConfig = { 0: {}, 1: {} };

// Loadout setups carry no class context (no "my build" class-line filter), so
// the picker shows every class line. Module-level for referential stability.
const NO_CLASS_LINES: readonly (string | null)[] = [null, null, null];

export const SkillSelector: React.FC<SkillSelectorProps> = ({
  skills,
  trialId,
  pageIndex,
  setupIndex,
}) => {
  const dispatch = useDispatch();

  const handleChange = useCallback(
    (updated: SkillsConfig) => {
      dispatch(updateSkills({ trialId, pageIndex, setupIndex, skills: updated }));
    },
    [dispatch, trialId, pageIndex, setupIndex],
  );

  return (
    <SkillBarPicker
      skills={skills ?? EMPTY_SKILLS}
      selectedClassLineIds={NO_CLASS_LINES}
      onChange={handleChange}
    />
  );
};
