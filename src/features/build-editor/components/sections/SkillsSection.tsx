/**
 * Skills Section — thin Redux wrapper around SkillBarPicker.
 *
 * Reads skills and classSkillLines from the build editor store and delegates
 * all UI to SkillBarPicker. On change, dispatches setSkills.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { setSkills } from '../../store/buildEditorSlice';
import { SkillBarPicker } from '../pickers/SkillBarPicker';

export const SkillsSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  return (
    <SkillBarPicker
      skills={setup.skills}
      selectedClassLineIds={build.classSkillLines}
      onChange={(updated) => dispatch(setSkills(updated))}
    />
  );
};
