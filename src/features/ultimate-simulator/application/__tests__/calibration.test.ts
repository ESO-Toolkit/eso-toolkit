import { calibrateFromEvents, RESOURCE_CHANGE_TYPE } from '../calibration';
import type { ResourceChangeEvent } from '../../../../types/combatlogEvents';

function ultEvent(partial: Partial<ResourceChangeEvent>): ResourceChangeEvent {
  return {
    timestamp: 0,
    type: 'resourcechange',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID: 1,
    targetIsFriendly: true,
    abilityGameID: 0,
    fight: 1,
    resourceChange: 0,
    resourceChangeType: RESOURCE_CHANGE_TYPE.ultimate,
    otherResourceChange: 0,
    maxResourceAmount: 500,
    waste: 0,
    castTrackID: 0,
    // sourceResources/targetResources are not read by the analyzer.
    sourceResources: undefined as never,
    targetResources: undefined as never,
    ...partial,
  };
}

describe('calibrateFromEvents', () => {
  it('buckets ultimate gains by ability and sums net/waste', () => {
    const events = [
      ultEvent({ abilityGameID: 100, resourceChange: 3, waste: 0 }),
      ultEvent({ abilityGameID: 100, resourceChange: 3, waste: 1 }),
      ultEvent({ abilityGameID: 200, resourceChange: 4, waste: 0 }),
    ];
    const result = calibrateFromEvents({ events, fightDurationSeconds: 10 });

    expect(result.totalNetUltimate).toBe(10);
    expect(result.totalWastedUltimate).toBe(1);
    expect(result.perSecond).toBeCloseTo(1.0, 5);
    expect(result.bySource).toHaveLength(2);
    // Sorted by netUltimate desc: ability 100 (6) before 200 (4).
    expect(result.bySource[0].abilityGameID).toBe(100);
    expect(result.bySource[0].netUltimate).toBe(6);
    expect(result.bySource[0].events).toBe(2);
  });

  it('ignores non-ultimate resource changes', () => {
    const events = [
      ultEvent({ abilityGameID: 1, resourceChange: 5, resourceChangeType: RESOURCE_CHANGE_TYPE.magicka }),
      ultEvent({ abilityGameID: 1, resourceChange: 5, resourceChangeType: RESOURCE_CHANGE_TYPE.stamina }),
      ultEvent({ abilityGameID: 1, resourceChange: 5, resourceChangeType: RESOURCE_CHANGE_TYPE.ultimate }),
    ];
    const result = calibrateFromEvents({ events, fightDurationSeconds: 1 });
    expect(result.totalNetUltimate).toBe(5);
  });

  it('ignores ultimate SPENDS (non-positive change)', () => {
    const events = [
      ultEvent({ abilityGameID: 1, resourceChange: -250 }),
      ultEvent({ abilityGameID: 1, resourceChange: 3 }),
    ];
    const result = calibrateFromEvents({ events, fightDurationSeconds: 1 });
    expect(result.totalNetUltimate).toBe(3);
  });

  it('filters to the target actor when provided', () => {
    const events = [
      ultEvent({ abilityGameID: 1, resourceChange: 3, targetID: 7 }),
      ultEvent({ abilityGameID: 1, resourceChange: 9, targetID: 8 }),
    ];
    const result = calibrateFromEvents({ events, fightDurationSeconds: 1, targetActorID: 7 });
    expect(result.totalNetUltimate).toBe(3);
  });

  it('resolves ability labels from masterData when supplied', () => {
    const events = [ultEvent({ abilityGameID: 999, resourceChange: 1 })];
    const result = calibrateFromEvents({
      events,
      fightDurationSeconds: 1,
      abilityNames: new Map([[999, 'Minor Heroism']]),
    });
    expect(result.bySource[0].label).toBe('Minor Heroism');
  });
});
