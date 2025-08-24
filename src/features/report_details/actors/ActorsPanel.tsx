import React from 'react';
import { useSelector } from 'react-redux';

import { selectActorsById } from '../../../store/master_data/masterDataSelectors';

import ActorsPanelView from './ActorsPanelView';

const ActorsPanel: React.FC = () => {
  const actorsById = useSelector(selectActorsById);

  // Convert actors object to array for the data grid
  const actors = React.useMemo(() => {
    return Object.values(actorsById).map((actor) => ({
      id: actor.id ?? '',
      name: actor.name || 'Unknown',
      displayName: actor.displayName || null,
      type: actor.type || 'Unknown',
      subType: actor.subType || null,
      server: actor.server || '',
      gameID: actor.gameID || 0,
    }));
  }, [actorsById]);

  return <ActorsPanelView actors={actors} />;
};

export default ActorsPanel;

