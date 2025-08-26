import React from 'react';

import { BuffEvent, DebuffEvent } from '../../../types/combatlogEvents';

import {
  createBuffLookup,
  createDebuffLookup,
  isBuffActive,
  isBuffActiveOnTarget,
  getActiveTargets,
} from './BuffLookupUtils';

interface BuffAnalysisExampleProps {
  buffEvents: BuffEvent[];
  debuffEvents: DebuffEvent[];
  fightStartTime: number;
  fightEndTime: number;
  playerId: number;
}

/**
 * Example component demonstrating the new target-specific buff lookup functionality
 */
export const BuffAnalysisExample: React.FC<BuffAnalysisExampleProps> = ({
  buffEvents,
  debuffEvents,
  fightStartTime,
  fightEndTime,
  playerId,
}) => {
  const buffAnalysis = React.useMemo(() => {
    if (!buffEvents.length) return null;

    // Create efficient lookup utilities
    const buffLookup = createBuffLookup(buffEvents, fightEndTime);
    const debuffLookup = createDebuffLookup(debuffEvents, fightEndTime);

    // Example ability IDs to analyze (replace with actual ability IDs)
    const exampleBuffAbility = 12345;
    const exampleDebuffAbility = 67890;
    const checkTimestamp = fightStartTime + 30000; // 30 seconds into fight

    return {
      // Check if specific buffs/debuffs were active at a timestamp
      buffActiveAnywhere: isBuffActive(buffLookup, exampleBuffAbility, checkTimestamp),
      buffActiveOnPlayer: isBuffActiveOnTarget(
        buffLookup,
        exampleBuffAbility,
        checkTimestamp,
        playerId
      ),
      buffActiveTargets: getActiveTargets(buffLookup, exampleBuffAbility, checkTimestamp),

      debuffActiveAnywhere: isBuffActive(debuffLookup, exampleDebuffAbility, checkTimestamp),
      debuffActiveOnPlayer: isBuffActiveOnTarget(
        debuffLookup,
        exampleDebuffAbility,
        checkTimestamp,
        playerId
      ),
      debuffActiveTargets: getActiveTargets(debuffLookup, exampleDebuffAbility, checkTimestamp),

      // Performance comparison data
      checkTimestamp,
      totalBuffEvents: buffEvents.length,
      totalDebuffEvents: debuffEvents.length,
    };
  }, [buffEvents, debuffEvents, fightStartTime, fightEndTime, playerId]);

  if (!buffAnalysis) {
    return <div>No buff data available</div>;
  }

  return (
    <div style={{ padding: '16px', border: '1px solid #ccc', margin: '8px' }}>
      <h3>Target-Specific Buff Analysis Example</h3>

      <div style={{ marginBottom: '16px' }}>
        <h4>Analysis at timestamp: {buffAnalysis.checkTimestamp}</h4>
        <p>Player ID: {playerId}</p>
        <p>Total buff events processed: {buffAnalysis.totalBuffEvents}</p>
        <p>Total debuff events processed: {buffAnalysis.totalDebuffEvents}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <h4>Buff Analysis (Ability 12345)</h4>
          <p>Active anywhere: {buffAnalysis.buffActiveAnywhere ? 'Yes' : 'No'}</p>
          <p>Active on player: {buffAnalysis.buffActiveOnPlayer ? 'Yes' : 'No'}</p>
          <p>Active targets: [{buffAnalysis.buffActiveTargets.join(', ')}]</p>
        </div>

        <div>
          <h4>Debuff Analysis (Ability 67890)</h4>
          <p>Active anywhere: {buffAnalysis.debuffActiveAnywhere ? 'Yes' : 'No'}</p>
          <p>Active on player: {buffAnalysis.debuffActiveOnPlayer ? 'Yes' : 'No'}</p>
          <p>Active targets: [{buffAnalysis.debuffActiveTargets.join(', ')}]</p>
        </div>
      </div>

      <div style={{ marginTop: '16px', padding: '8px', background: '#f5f5f5' }}>
        <h4>Usage Examples:</h4>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {`// Create lookup utilities (once)
const buffLookup = createBuffLookup(buffEvents, fightEndTime);
const debuffLookup = createDebuffLookup(debuffEvents, fightEndTime);

// Check if buff is active on any target
const isActiveAnywhere = buffLookup.isBuffActive(abilityId, timestamp);

// Check if buff is active on specific target
const isActiveOnTarget = buffLookup.isBuffActiveOnTarget(abilityId, timestamp, targetId);

// Get all targets with active buff
const activeTargets = buffLookup.getActiveTargets(abilityId, timestamp);

// Performance: O(log n) vs O(n) for each query`}
        </pre>
      </div>
    </div>
  );
};

/**
 * Time-series analysis example showing buff activity over time
 */
export const BuffTimeSeriesExample: React.FC<BuffAnalysisExampleProps> = ({
  buffEvents,
  debuffEvents,
  fightStartTime,
  fightEndTime,
  playerId,
}) => {
  const timeSeriesData = React.useMemo(() => {
    if (!buffEvents.length) return [];

    const buffLookup = createBuffLookup(buffEvents, fightEndTime);
    const debuffLookup = createDebuffLookup(debuffEvents, fightEndTime);

    const exampleBuffAbility = 12345;
    const exampleDebuffAbility = 67890;
    const timePoints = [];
    const intervalMs = 5000; // 5 second intervals

    for (let t = fightStartTime; t <= fightEndTime; t += intervalMs) {
      const relativeTime = (t - fightStartTime) / 1000; // seconds

      timePoints.push({
        timestamp: t,
        relativeTime,
        buffActiveOnPlayer: isBuffActiveOnTarget(buffLookup, exampleBuffAbility, t, playerId),
        buffActiveTargets: getActiveTargets(buffLookup, exampleBuffAbility, t).length,
        debuffActiveOnPlayer: isBuffActiveOnTarget(debuffLookup, exampleDebuffAbility, t, playerId),
        debuffActiveTargets: getActiveTargets(debuffLookup, exampleDebuffAbility, t).length,
      });
    }

    return timePoints;
  }, [buffEvents, debuffEvents, fightStartTime, fightEndTime, playerId]);

  return (
    <div style={{ padding: '16px', border: '1px solid #ccc', margin: '8px' }}>
      <h3>Buff Activity Over Time</h3>
      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '4px', border: '1px solid #ddd' }}>Time (s)</th>
              <th style={{ padding: '4px', border: '1px solid #ddd' }}>Buff on Player</th>
              <th style={{ padding: '4px', border: '1px solid #ddd' }}>Buff Targets</th>
              <th style={{ padding: '4px', border: '1px solid #ddd' }}>Debuff on Player</th>
              <th style={{ padding: '4px', border: '1px solid #ddd' }}>Debuff Targets</th>
            </tr>
          </thead>
          <tbody>
            {timeSeriesData.map((point, index) => (
              <tr key={index}>
                <td style={{ padding: '4px', border: '1px solid #ddd' }}>
                  {point.relativeTime.toFixed(1)}
                </td>
                <td style={{ padding: '4px', border: '1px solid #ddd' }}>
                  {point.buffActiveOnPlayer ? '✓' : '✗'}
                </td>
                <td style={{ padding: '4px', border: '1px solid #ddd' }}>
                  {point.buffActiveTargets}
                </td>
                <td style={{ padding: '4px', border: '1px solid #ddd' }}>
                  {point.debuffActiveOnPlayer ? '✓' : '✗'}
                </td>
                <td style={{ padding: '4px', border: '1px solid #ddd' }}>
                  {point.debuffActiveTargets}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
