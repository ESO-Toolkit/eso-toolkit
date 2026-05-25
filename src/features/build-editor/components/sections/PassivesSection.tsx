/**
 * Passives Section — thin Redux wrapper around PassivesPicker.
 *
 * Reads passives from the active setup and delegates all UI to PassivesPicker.
 * On change, dispatches setPassives with the updated array.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectActiveSetup } from '../../store/buildEditorSelectors';
import { setPassives } from '../../store/buildEditorSlice';
import { PassivesPicker } from '../pickers/PassivesPicker';

const PassivesSectionComponent: React.FC = () => {
  const dispatch = useDispatch();
  const setup = useSelector(selectActiveSetup);

  if (!setup) return null;

  return (
    <PassivesPicker
      passives={setup.passives}
      onChange={(updated) => dispatch(setPassives(updated))}
    />
  );
};

export const PassivesSection = React.memo(PassivesSectionComponent);
