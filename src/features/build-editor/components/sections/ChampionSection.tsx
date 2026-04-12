/**
 * Champion Section — thin Redux wrapper around ChampionPointsPicker.
 *
 * Reads cp from the active setup and delegates all UI to ChampionPointsPicker.
 * On change, dispatches setChampionPoints with the updated full cp object.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectActiveSetup } from '../../store/buildEditorSelectors';
import { setChampionPoints } from '../../store/buildEditorSlice';
import { ChampionPointsPicker } from '../pickers/ChampionPointsPicker';

const ChampionSectionComponent: React.FC = () => {
  const dispatch = useDispatch();
  const setup = useSelector(selectActiveSetup);

  if (!setup) return null;

  return (
    <ChampionPointsPicker
      cp={setup.cp}
      onChange={(updated) => dispatch(setChampionPoints(updated))}
    />
  );
};

export const ChampionSection = React.memo(ChampionSectionComponent);
