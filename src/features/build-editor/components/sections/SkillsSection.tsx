/**
 * Skills Section — thin Redux wrapper around SkillBarPicker.
 *
 * Reads skills and classSkillLines from the build editor store and delegates
 * all UI to SkillBarPicker. On change, dispatches setSkills.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { SkillBarPicker } from '@/components/skills/SkillBarPicker';

import { selectActiveSetup, selectBuildClassSkillLines } from '../../store/buildEditorSelectors';
import { setSkills } from '../../store/buildEditorSlice';

const SkillsSectionComponent: React.FC = () => {
  const dispatch = useDispatch();
  const setup = useSelector(selectActiveSetup);
  const classSkillLines = useSelector(selectBuildClassSkillLines);

  if (!setup) return null;

  return (
    <SkillBarPicker
      skills={setup.skills}
      selectedClassLineIds={classSkillLines}
      onChange={(updated) => dispatch(setSkills(updated))}
    />
  );
};

export const SkillsSection = React.memo(SkillsSectionComponent);
