/**
 * Champion Section — thin Redux wrapper around ChampionPointsPicker.
 *
 * Reads cp from the active setup and delegates all UI to ChampionPointsPicker.
 * On change, dispatches setChampionPoints with the updated full cp object.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { setChampionPoints } from '../../store/buildEditorSlice';
import { ChampionPointsPicker } from '../pickers/ChampionPointsPicker';

export const ChampionSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  return (
    <ChampionPointsPicker
      cp={setup.cp}
      onChange={(updated) => dispatch(setChampionPoints(updated))}
    />
  );
};
