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

export const PassivesSection: React.FC = React.memo(function PassivesSection() {
  const dispatch = useDispatch();
  const passives = useSelector(
    (s: RootState) => s.buildEditor.build.setups[s.buildEditor.activeSetupIndex]?.passives,
  );

  return (
    <PassivesPicker passives={passives} onChange={(updated) => dispatch(setPassives(updated))} />
  );
});
