import type { ReportAbilityFragment } from '../../../graphql/gql/graphql';
import type { CastEvent } from '../../../types/combatlogEvents';

import { extractSynergyData, isSynergyAbility } from './synergyUtils';

// Helper to build a minimal ability entry
function ability(gameID: number, name: string, icon: string | null = null): ReportAbilityFragment {
  return { __typename: 'ReportAbility', gameID, name, icon };
}

// Helper to build a cast event
function castEvent(
  sourceID: number,
  abilityGameID: number,
  timestamp: number,
  sourceIsFriendly = true,
): CastEvent {
  return {
    type: 'cast',
    sourceID,
    sourceIsFriendly,
    targetID: 0,
    targetIsFriendly: false,
    abilityGameID,
    fight: 1,
    timestamp,
  };
}

describe('isSynergyAbility', () => {
  it('returns true for IDs in SYNERGY_ABILITY_IDS', () => {
    expect(isSynergyAbility(41963)).toBe(true);
    expect(isSynergyAbility(26832)).toBe(true);
  });

  it('returns false for non-synergy abilities', () => {
    expect(isSynergyAbility(99999)).toBe(false);
  });

  it('returns false for unknown ability IDs', () => {
    expect(isSynergyAbility(77777)).toBe(false);
  });
});

describe('extractSynergyData', () => {
  const abilitiesById: Record<number, ReportAbilityFragment> = {
    41963: ability(41963, 'Blood Feast', 'blood_feast'),
    32910: ability(32910, 'Shackle', 'shackle'),
    99999: ability(99999, 'Flame Lash'),
  };

  const actorsById: Record<number, { name: string; displayName?: string }> = {
    1: { name: 'Tank', displayName: '@TankPlayer' },
    2: { name: 'Healer', displayName: '@HealerPlayer' },
    3: { name: 'DPS1', displayName: '@DPSPlayer' },
  };

  const friendlyPlayerIds = [1, 2, 3];

  it('returns empty data when there are no synergy events', () => {
    const events = [castEvent(1, 99999, 1000)];
    const result = extractSynergyData(events, abilitiesById, actorsById, friendlyPlayerIds);

    expect(result.totalCount).toBe(0);
    expect(result.activations).toHaveLength(0);
    expect(result.byPlayer).toHaveLength(0);
    expect(result.byAbility).toHaveLength(0);
  });

  it('identifies synergy events by ID', () => {
    const events = [castEvent(1, 41963, 1000), castEvent(2, 99999, 1500)];
    const result = extractSynergyData(events, abilitiesById, actorsById, friendlyPlayerIds);

    expect(result.totalCount).toBe(1);
    expect(result.activations[0].abilityGameID).toBe(41963);
    expect(result.activations[0].sourceID).toBe(1);
  });

  it('identifies multiple synergy abilities', () => {
    const events = [castEvent(3, 32910, 2000)];
    const result = extractSynergyData(events, abilitiesById, actorsById, friendlyPlayerIds);

    expect(result.totalCount).toBe(1);
    expect(result.activations[0].abilityName).toBe('Shackle');
  });

  it('groups by player correctly', () => {
    const events = [
      castEvent(1, 41963, 1000),
      castEvent(1, 32910, 2000),
      castEvent(2, 41963, 3000),
    ];
    const result = extractSynergyData(events, abilitiesById, actorsById, friendlyPlayerIds);

    expect(result.byPlayer).toHaveLength(2);
    // Sorted by count descending: player 1 has 2, player 2 has 1
    expect(result.byPlayer[0].playerName).toBe('Tank');
    expect(result.byPlayer[0].displayName).toBe('@TankPlayer');
    expect(result.byPlayer[0].totalCount).toBe(2);
    expect(result.byPlayer[1].playerName).toBe('Healer');
    expect(result.byPlayer[1].displayName).toBe('@HealerPlayer');
    expect(result.byPlayer[1].totalCount).toBe(1);
  });

  it('groups by ability correctly', () => {
    const events = [
      castEvent(1, 41963, 1000),
      castEvent(2, 41963, 2000),
      castEvent(3, 32910, 3000),
    ];
    const result = extractSynergyData(events, abilitiesById, actorsById, friendlyPlayerIds);

    expect(result.byAbility).toHaveLength(2);
    // Blood Feast has 2 activations, Shackle has 1
    expect(result.byAbility[0].abilityName).toBe('Blood Feast');
    expect(result.byAbility[0].totalCount).toBe(2);
    expect(result.byAbility[1].abilityName).toBe('Shackle');
    expect(result.byAbility[1].totalCount).toBe(1);
  });

  it('excludes non-friendly players', () => {
    const events = [
      castEvent(1, 41963, 1000, true),
      castEvent(100, 41963, 2000, false), // enemy player
    ];
    const result = extractSynergyData(events, abilitiesById, actorsById, friendlyPlayerIds);

    expect(result.totalCount).toBe(1);
  });

  it('excludes begincast events', () => {
    const events = [
      {
        ...castEvent(1, 41963, 1000),
        type: 'begincast' as const,
        castTrackID: 1,
        sourceResources: {
          hitPoints: 100,
          maxHitPoints: 100,
          attackPower: 0,
          spellPower: 0,
          resolve: 0,
          stamina: 100,
          maxStamina: 100,
          ultimatePoints: 0,
          x: 0,
          y: 0,
        },
        targetResources: {
          hitPoints: 100,
          maxHitPoints: 100,
          attackPower: 0,
          spellPower: 0,
          resolve: 0,
          stamina: 100,
          maxStamina: 100,
          ultimatePoints: 0,
          x: 0,
          y: 0,
        },
      },
      castEvent(1, 41963, 1500),
    ];
    const result = extractSynergyData(events, abilitiesById, actorsById, friendlyPlayerIds);

    expect(result.totalCount).toBe(1);
    expect(result.activations[0].timestamp).toBe(1500);
  });

  it('sorts activations chronologically', () => {
    const events = [
      castEvent(1, 41963, 3000),
      castEvent(2, 32910, 1000),
      castEvent(3, 41963, 2000),
    ];
    const result = extractSynergyData(events, abilitiesById, actorsById, friendlyPlayerIds);

    expect(result.activations[0].timestamp).toBe(1000);
    expect(result.activations[1].timestamp).toBe(2000);
    expect(result.activations[2].timestamp).toBe(3000);
  });

  it('handles players not in actorsById gracefully', () => {
    const events = [castEvent(999, 41963, 1000)];
    const result = extractSynergyData(events, abilitiesById, actorsById, [999]);

    expect(result.byPlayer[0].playerName).toBe('Player 999');
  });
});
