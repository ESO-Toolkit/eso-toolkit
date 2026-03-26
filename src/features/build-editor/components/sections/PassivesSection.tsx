/**
 * Passives Section — thin Redux wrapper around PassivesPicker.
 *
 * Reads passives from the active setup and delegates all UI to PassivesPicker.
 * On change, dispatches setPassives with the updated array.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { setPassives } from '../../store/buildEditorSlice';
import { PassivesPicker } from '../pickers/PassivesPicker';

export const PassivesSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  return (
    <PassivesPicker
      passives={setup.passives}
      onChange={(updated) => dispatch(setPassives(updated))}
    />
  );
};
