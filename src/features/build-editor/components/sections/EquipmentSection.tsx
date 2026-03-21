/**
 * Equipment Section — Redux-connected wrapper around EquipmentPicker.
 *
 * Reads gear state from the Redux store, dispatches setGear on changes
 * and setGearWeight when armor weight is cycled.
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import type { ArmorWeight, GearConfig } from '../../../loadout-manager/types/loadout.types';
import { setGear, setGearWeight } from '../../store/buildEditorSlice';
import { EquipmentPicker } from '../pickers/EquipmentPicker';

export const EquipmentSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const handleChange = useCallback(
    (gear: GearConfig) => {
      dispatch(setGear(gear));
    },
    [dispatch],
  );

  const handleWeightChange = useCallback(
    (slot: number, weight: ArmorWeight) => {
      dispatch(setGearWeight({ slot, weight }));
    },
    [dispatch],
  );

  return (
    <EquipmentPicker
      gear={setup.gear}
      onChange={handleChange}
      onWeightChange={handleWeightChange}
    />
  );
};
