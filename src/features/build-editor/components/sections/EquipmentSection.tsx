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
import { setGear, setGearEnchant, setGearTrait, setGearWeight } from '../../store/buildEditorSlice';
import { EquipmentPicker } from '../pickers/EquipmentPicker';

export const EquipmentSection: React.FC = React.memo(function EquipmentSection() {
  const dispatch = useDispatch();
  const gear = useSelector(
    (s: RootState) => s.buildEditor.build.setups[s.buildEditor.activeSetupIndex]?.gear,
  );

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

  const handleTraitChange = useCallback(
    (slot: number, trait: string | undefined) => {
      dispatch(setGearTrait({ slot, trait }));
    },
    [dispatch],
  );

  const handleEnchantChange = useCallback(
    (slot: number, enchant: string | undefined) => {
      dispatch(setGearEnchant({ slot, enchant }));
    },
    [dispatch],
  );

  return (
    <EquipmentPicker
      gear={gear}
      onChange={handleChange}
      onWeightChange={handleWeightChange}
      onTraitChange={handleTraitChange}
      onEnchantChange={handleEnchantChange}
    />
  );
});
