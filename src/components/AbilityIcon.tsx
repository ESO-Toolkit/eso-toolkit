import { Avatar } from '@mui/material';
import React from 'react';

import { useReportMasterData } from '../hooks';

export interface AbilityIconProps {
  abilityId: string | number;
  /** Optional icon filename (without extension) to use if the ability is missing from master data */
  fallbackIcon?: string;
}

export function AbilityIcon(props: AbilityIconProps): React.ReactElement | null {
  const { reportMasterData } = useReportMasterData();

  const ability = reportMasterData?.abilitiesById[props.abilityId];

  // Determine icon filename: prefer master data, fall back to explicit prop if provided
  const iconFile = ability?.icon || props.fallbackIcon;

  if (!iconFile) {
    return null;
  }

  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      alt={ability?.name || `Ability ${props.abilityId}`}
      sx={{ width: 32, height: 32, borderRadius: 1, boxShadow: 1 }}
      variant="rounded"
    />
  );
}
