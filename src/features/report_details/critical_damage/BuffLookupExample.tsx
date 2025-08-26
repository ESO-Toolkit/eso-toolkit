import React from 'react';
import { useSelector } from 'react-redux';

import {
  selectFriendlyBuffLookup,
  selectHostileBuffLookup,
  selectDebuffLookup,
  selectCombinedBuffLookup,
  selectFriendlyBuffEventsLoading,
  selectHostileBuffEventsLoading,
  selectDebuffEventsLoading,
} from '../../../store/selectors/eventsSelectors';

import { isBuffActiveOnTarget, isBuffActiveOnAnyTarget } from './BuffLookupUtils';

interface BuffLookupExampleProps {
  // Example props for demonstration
  playerId?: number;
  targetTimestamp?: number;
  buffAbilityId?: number;
}

/**
 * Example component demonstrating how to use the new buff lookup selectors.
 * This shows the recommended pattern for using buff lookups in React components.
 */
export const BuffLookupExample: React.FC<BuffLookupExampleProps> = ({
  playerId = 10,
  targetTimestamp = 15000,
  buffAbilityId = 123456,
}) => {
  // Use the new Redux selectors to get buff lookup data
  const friendlyBuffData = useSelector(selectFriendlyBuffLookup);
  const hostileBuffData = useSelector(selectHostileBuffLookup);
  const debuffData = useSelector(selectDebuffLookup);
  const combinedBuffData = useSelector(selectCombinedBuffLookup);

  // Get loading states separately
  const friendlyLoading = useSelector(selectFriendlyBuffEventsLoading);
  const hostileLoading = useSelector(selectHostileBuffEventsLoading);
  const debuffLoading = useSelector(selectDebuffEventsLoading);

  // Show loading state if any data is still loading
  if (friendlyLoading || hostileLoading || debuffLoading) {
    return <div>Loading buff data...</div>;
  }

  // Example queries using the buff lookup data
  const friendlyBuffActive =
    friendlyBuffData.buffIntervals.size > 0 &&
    isBuffActiveOnTarget(friendlyBuffData, buffAbilityId, targetTimestamp, playerId);

  const hostileBuffActive =
    hostileBuffData.buffIntervals.size > 0 &&
    isBuffActiveOnTarget(hostileBuffData, buffAbilityId, targetTimestamp, playerId);

  const debuffActive =
    debuffData.buffIntervals.size > 0 &&
    isBuffActiveOnTarget(debuffData, buffAbilityId, targetTimestamp, playerId);

  const anyBuffActiveAnywhere =
    combinedBuffData.buffIntervals.size > 0 &&
    isBuffActiveOnAnyTarget(combinedBuffData, buffAbilityId, targetTimestamp);

  return (
    <div>
      <h2>Buff Lookup Example</h2>
      <p>
        <strong>Query Parameters:</strong>
      </p>
      <ul>
        <li>Player ID: {playerId}</li>
        <li>Timestamp: {targetTimestamp}ms</li>
        <li>Buff Ability ID: {buffAbilityId}</li>
      </ul>

      <p>
        <strong>Results:</strong>
      </p>
      <ul>
        <li>
          Friendly buff active on player:{' '}
          <span style={{ color: friendlyBuffActive ? 'green' : 'red' }}>
            {friendlyBuffActive ? 'YES' : 'NO'}
          </span>
        </li>
        <li>
          Hostile buff active on player:{' '}
          <span style={{ color: hostileBuffActive ? 'orange' : 'red' }}>
            {hostileBuffActive ? 'YES' : 'NO'}
          </span>
        </li>
        <li>
          Debuff active on player:{' '}
          <span style={{ color: debuffActive ? 'red' : 'green' }}>
            {debuffActive ? 'YES' : 'NO'}
          </span>
        </li>
        <li>
          Any buff active anywhere:{' '}
          <span style={{ color: anyBuffActiveAnywhere ? 'blue' : 'gray' }}>
            {anyBuffActiveAnywhere ? 'YES' : 'NO'}
          </span>
        </li>
      </ul>

      <p>
        <strong>Data Availability:</strong>
      </p>
      <ul>
        <li>Friendly buffs loaded: {friendlyBuffData.buffIntervals.size > 0 ? 'YES' : 'NO'}</li>
        <li>Hostile buffs loaded: {hostileBuffData.buffIntervals.size > 0 ? 'YES' : 'NO'}</li>
        <li>Debuffs loaded: {debuffData.buffIntervals.size > 0 ? 'YES' : 'NO'}</li>
        <li>Combined buffs loaded: {combinedBuffData.buffIntervals.size > 0 ? 'YES' : 'NO'}</li>
      </ul>

      {friendlyBuffData.buffIntervals.size > 0 && (
        <p>
          <small>
            Friendly buff abilities tracked:{' '}
            {Array.from(friendlyBuffData.buffIntervals.keys()).join(', ')}
          </small>
        </p>
      )}
    </div>
  );
};
