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

export const SkillsSection: React.FC = React.memo(function SkillsSection() {
  const dispatch = useDispatch();
  const skills = useSelector(
    (s: RootState) => s.buildEditor.build.setups[s.buildEditor.activeSetupIndex]?.skills,
  );
  const classSkillLines = useSelector((s: RootState) => s.buildEditor.build.classSkillLines);

  return (
    <SkillBarPicker
      skills={skills}
      selectedClassLineIds={classSkillLines}
      onChange={(updated) => dispatch(setSkills(updated))}
    />
  );
});
