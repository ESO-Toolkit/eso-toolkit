import { Avatar } from '@mui/material';
import React from 'react';

import { useReportMasterData } from '../hooks';
import { abilityIconUrl } from '../utils/abilityIconCorrections';

export interface AbilityIconProps {
  abilityId: string | number;
  /** Optional icon filename (without extension) to use if the ability is missing from master data */
  fallbackIcon?: string;
}

export function AbilityIcon(props: AbilityIconProps): React.ReactElement | null {
  const { reportMasterData } = useReportMasterData();

  const ability = reportMasterData?.abilitiesById[props.abilityId];

  // Determine icon filename: prefer master data, fall back to explicit prop if
  // provided. Correct known-broken filenames (e.g. Magma Fist) via the ability
  // id, which applies even when master data has no entry for this ability.
  const src = abilityIconUrl(ability?.icon || props.fallbackIcon, props.abilityId);

  if (!src) {
    return null;
  }

  return (
    <Avatar
      src={src}
      alt={ability?.name || `Ability ${props.abilityId}`}
      sx={{ width: 32, height: 32, borderRadius: 1, boxShadow: 1 }}
      variant="rounded"
    />
  );
}
