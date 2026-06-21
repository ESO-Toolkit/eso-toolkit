/**
 * Passives Section — thin Redux wrapper around PassivesPicker.
 *
 * Reads passives from the active setup and delegates all UI to PassivesPicker.
 * On change, dispatches setPassives with the updated array.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { CLASS_MASTERY_SKILL_IDS } from '@/data/skill-lines/class/classMastery';

import {
  selectActiveSetup,
  selectBuildEsoClass,
  selectBuildRaces,
} from '../../store/buildEditorSelectors';
import { setPassives } from '../../store/buildEditorSlice';
import { PassivesPicker } from '../pickers/PassivesPicker';

const PassivesSectionComponent: React.FC = () => {
  const dispatch = useDispatch();
  const setup = useSelector(selectActiveSetup);
  const esoClass = useSelector(selectBuildEsoClass);
  const races = useSelector(selectBuildRaces);

  if (!setup) return null;

  // Class Mastery picks live on build.classMasteryPassives, not here. Defend
  // against legacy/imported builds that left CM ids in setup.passives: hide them
  // from the picker, but carry them back on every edit so they aren't silently
  // dropped before they can be recovered/migrated on export.
  const hiddenClassMasteryIds = setup.passives.filter((id) => CLASS_MASTERY_SKILL_IDS.has(id));
  const regularPassives = setup.passives.filter((id) => !CLASS_MASTERY_SKILL_IDS.has(id));

  return (
    <PassivesPicker
      passives={regularPassives}
      onChange={(updated) =>
        dispatch(
          setPassives(
            hiddenClassMasteryIds.length ? [...updated, ...hiddenClassMasteryIds] : updated,
          ),
        )
      }
      esoClass={esoClass}
      races={races}
      setupSkills={setup.skills}
    />
  );
};

export const PassivesSection = React.memo(PassivesSectionComponent);
