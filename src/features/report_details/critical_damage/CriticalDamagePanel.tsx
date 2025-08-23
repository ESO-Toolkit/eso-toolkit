import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { RootState } from '../../../store/storeWithHistory';
import { resolveActorName } from '../../../utils/resolveActorName';

import CriticalDamagePanelView from './CriticalDamagePanelView';

interface CriticalDamagePanelProps {
  fight: FightFragment;
}

/**
 * Smart component that handles data processing and state management for critical damage panel
 */
const CriticalDamagePanel: React.FC<CriticalDamagePanelProps> = ({ fight }) => {
  // Get report actors from masterData
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);

  // Process player data
  const players = React.useMemo(() => {
    return Object.values(actorsById)
      .filter((actor) => actor.type === 'Player' && actor.id)
      .map((actor) => ({
        id: String(actor.id),
        name: String(resolveActorName(actor)),
      }));
  }, [actorsById]);

  // Track which panels are expanded
  const [expandedPanels, setExpandedPanels] = React.useState<Record<string, boolean>>({});

  const handleExpandChange = React.useCallback(
    (playerId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanels((prev) => ({
        ...prev,
        [playerId]: isExpanded,
      }));
    },
    []
  );

  return (
    <CriticalDamagePanelView
      players={players}
      fight={fight}
      expandedPanels={expandedPanels}
      onExpandChange={handleExpandChange}
    />
  );
};

export default CriticalDamagePanel;
