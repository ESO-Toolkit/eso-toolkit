import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { usePlayerData } from '../../../hooks';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';

import { PenetrationPanelView } from './PenetrationPanelView';

interface PenetrationPanelProps {
  fight: FightFragment;
}

/**
 * Smart component that handles data processing and state management for penetration panel
 */
export const PenetrationPanel: React.FC<PenetrationPanelProps> = ({ fight }) => {
  // Use hooks to get data
  const { playerData } = usePlayerData();
  const selectedTargetId = useSelector(selectSelectedTargetId);

  // State to manage which accordion panels are expanded
  const [expandedPlayers, setExpandedPlayers] = React.useState<Record<string, boolean>>({});

  // Get all players for accordion
  const players = React.useMemo(() => {
    if (!playerData?.playersById) {
      return [];
    }

    return Object.values(playerData?.playersById)
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [playerData?.playersById]);

  // Handler for accordion expand/collapse
  const handlePlayerExpandChange = React.useCallback(
    (playerId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPlayers((prev) => ({
        ...prev,
        [playerId]: isExpanded,
      }));
    },
    []
  );

  return (
    <PenetrationPanelView
      players={players}
      selectedTargetId={selectedTargetId}
      fight={fight}
      expandedPlayers={expandedPlayers}
      onPlayerExpandChange={handlePlayerExpandChange}
    />
  );
};
