import { calibrateFromEvents, isUltimateResourceEvent } from '../calibration';
import type { ResourceChangeEvent, Resources } from '../../../../types/combatlogEvents';

const MAX_ULT = 500;

function resources(ultimate: number): Resources {
  return {
    hitPoints: 30000,
    maxHitPoints: 30000,
    magicka: 20000,
    maxMagicka: 20000,
    stamina: 20000,
    maxStamina: 20000,
    ultimate,
    maxUltimate: MAX_ULT,
    werewolf: 0,
    maxWerewolf: 0,
    absorb: 0,
    championPoints: 3600,
    x: 0,
    y: 0,
    facing: 0,
  };
}

/** An event carrying actor `targetID`'s ultimate snapshot at `ultimate`. */
function snapshotEvent(
  targetID: number,
  ultimate: number,
  partial: Partial<ResourceChangeEvent> = {},
): ResourceChangeEvent {
  return {
    timestamp: 0,
    type: 'resourcechange',
    sourceID: targetID,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: true,
    abilityGameID: 0,
    fight: 1,
    resourceChange: 0,
    resourceChangeType: 0,
    otherResourceChange: 0,
    maxResourceAmount: MAX_ULT,
    waste: 0,
    castTrackID: 0,
    sourceResources: resources(ultimate),
    targetResources: resources(ultimate),
    ...partial,
  };
}

describe('calibrateFromEvents (snapshot / conservation method)', () => {
  it('sums positive ultimate-snapshot deltas as total generation', () => {
    // Ultimate rises 0 → 3 → 7 → 12 (gains 3,4,5 = 12 generated).
    const events = [
      snapshotEvent(1, 0),
      snapshotEvent(1, 3),
      snapshotEvent(1, 7),
      snapshotEvent(1, 12),
    ];
    const r = calibrateFromEvents({ events, fightDurationSeconds: 6, targetActorID: 1 });
    expect(r.totalGenerated).toBe(12);
    expect(r.totalSpent).toBe(0);
    expect(r.approxCasts).toBe(0);
    expect(r.perSecond).toBeCloseTo(2.0, 5);
    expect(r.samples).toBe(4);
    expect(r.hitCap).toBe(false);
  });

  it('counts spends (negative deltas) without subtracting from generation', () => {
    // 0 → 250 (gen 250) → cast to 0 (spent 250) → 100 (gen 100). gen=350, spent=250.
    const events = [
      snapshotEvent(1, 0),
      snapshotEvent(1, 250),
      snapshotEvent(1, 0),
      snapshotEvent(1, 100),
    ];
    const r = calibrateFromEvents({ events, fightDurationSeconds: 10, targetActorID: 1 });
    expect(r.totalGenerated).toBe(350);
    expect(r.totalSpent).toBe(250);
    expect(r.approxCasts).toBe(1);
  });

  it('obeys the conservation identity gen = spent + (final - initial)', () => {
    // Mirror the real Arc Daddy fight: initial 198, final 76, spent 743 → gen 621.
    const events = [
      snapshotEvent(4, 198),
      snapshotEvent(4, 261), // +63
      snapshotEvent(4, 11), // cast -250
      snapshotEvent(4, 200), // +189
      snapshotEvent(4, 50), // cast -150
      snapshotEvent(4, 369), // +319 ... arrange to land on the identity
      snapshotEvent(4, 26), // cast -343
      snapshotEvent(4, 76), // +50
    ];
    const r = calibrateFromEvents({ events, fightDurationSeconds: 186, targetActorID: 4 });
    const initial = 198;
    const final = 76;
    expect(r.totalGenerated - r.totalSpent).toBe(final - initial);
    expect(r.totalGenerated).toBe(r.totalSpent + (final - initial));
  });

  it('measures only the requested actor', () => {
    const events = [
      snapshotEvent(7, 0),
      snapshotEvent(8, 0),
      snapshotEvent(7, 10),
      snapshotEvent(8, 99),
    ];
    const r = calibrateFromEvents({ events, fightDurationSeconds: 1, targetActorID: 7 });
    expect(r.totalGenerated).toBe(10);
    expect(r.samples).toBe(2);
  });

  it('reads the snapshot from sourceResources when the actor is the source', () => {
    const events = [
      snapshotEvent(5, 0, { sourceID: 5, targetID: 99, targetResources: resources(0) }),
      snapshotEvent(5, 20, { sourceID: 5, targetID: 99, targetResources: resources(0) }),
    ];
    // Actor 5 appears as SOURCE; its ultimate is in sourceResources.
    const r = calibrateFromEvents({ events, fightDurationSeconds: 1, targetActorID: 5 });
    expect(r.totalGenerated).toBe(20);
  });

  it('flags hitCap when ultimate reaches the 500 pool cap (gen is a lower bound)', () => {
    const events = [snapshotEvent(1, 480), snapshotEvent(1, 500), snapshotEvent(1, 500)];
    const r = calibrateFromEvents({ events, fightDurationSeconds: 5, targetActorID: 1 });
    expect(r.hitCap).toBe(true);
  });

  it('returns zeros when the actor was never snapshotted', () => {
    const events = [snapshotEvent(1, 50), snapshotEvent(1, 80)];
    const r = calibrateFromEvents({ events, fightDurationSeconds: 10, targetActorID: 42 });
    expect(r.samples).toBe(0);
    expect(r.totalGenerated).toBe(0);
    expect(r.perSecond).toBe(0);
  });
});

describe('isUltimateResourceEvent', () => {
  it('identifies ultimate events by maxResourceAmount === maxUltimate', () => {
    expect(isUltimateResourceEvent(snapshotEvent(1, 100, { maxResourceAmount: MAX_ULT }))).toBe(true);
    // maxResourceAmount matching magicka, not ultimate → not an ultimate event.
    expect(
      isUltimateResourceEvent(snapshotEvent(1, 100, { maxResourceAmount: 20000 })),
    ).toBe(false);
  });

  it('falls back to the verified type code (2) when no snapshot is present', () => {
    const bare: ResourceChangeEvent = {
      ...snapshotEvent(1, 0),
      sourceResources: undefined as never,
      targetResources: undefined as never,
      maxResourceAmount: 0,
      resourceChangeType: 2,
    };
    expect(isUltimateResourceEvent(bare)).toBe(true);
    expect(isUltimateResourceEvent({ ...bare, resourceChangeType: 0 })).toBe(false);
  });
});
