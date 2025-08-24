import { Avatar } from '@mui/material';
import React from 'react';

import { useReportMasterData } from '../hooks';

export interface AbilityIconProps {
  abilityId: string | number;
}

export function AbilityIcon(props: AbilityIconProps): React.ReactElement | null {
  const { reportMasterData } = useReportMasterData();

  const ability = reportMasterData?.abilitiesById[props.abilityId];

  if (!ability) {
    return null;
  }

  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${ability.icon}.png`}
      alt={ability.name || `Ability ${props.abilityId}`}
      sx={{ width: 32, height: 32, borderRadius: 1, boxShadow: 1 }}
      variant="rounded"
    />
  );
}
