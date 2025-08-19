import { Box } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import abilitiesJson from './data/abilities.json';
import BuffUptimesPanel, { Ability } from './features/BuffUptimesPanel';
import DamageDonePanel from './features/DamageDonePanel';
import EventsPanel from './features/EventsPanel';
import { FightFragment } from './graphql/generated';
import { RootState } from './store';

interface FightDetailsProps {
  fight: FightFragment;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight }) => {
  const [page, setPage] = React.useState(0);
  const EVENTS_PER_PAGE = 25;
  const reduxAbilities = useSelector((state: RootState) => state.abilities.abilities);
  const abilities: Record<string, Ability> = React.useMemo(
    () => ({ ...abilitiesJson, ...reduxAbilities }),
    [reduxAbilities]
  );

  return (
    <Box mt={2}>
      <DamageDonePanel fight={fight} />
      <BuffUptimesPanel abilities={abilities} fight={fight} />
      <EventsPanel page={page} setPage={setPage} EVENTS_PER_PAGE={EVENTS_PER_PAGE} />
    </Box>
  );
};

export default FightDetails;
