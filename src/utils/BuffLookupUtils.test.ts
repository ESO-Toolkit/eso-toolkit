import { BuffEvent, DebuffEvent } from '../types/combatlogEvents';

import {
  createBuffLookup,
  createDebuffLookup,
  isBuffActive,
  isBuffActiveOnTarget,
} from './BuffLookupUtils';

describe('BuffLookupUtils', () => {
  // Mock buff events for testing
  const createApplyBuffEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number
  ): BuffEvent => ({
    timestamp,
    type: 'applybuff',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: true,
    abilityGameID,
    fight: 1,
    extraAbilityGameID: 0,
  });

  const createRemoveBuffEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number
  ): BuffEvent => ({
    timestamp,
    type: 'removebuff',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: true,
    abilityGameID,
    fight: 1,
  });

  // Mock debuff events for testing
  const createApplyDebuffEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number
  ): DebuffEvent => ({
    timestamp,
    type: 'applydebuff',
    sourceID: 1,
    sourceIsFriendly: false,
    targetID,
    targetIsFriendly: false,
    abilityGameID,
    fight: 1,
  });

  const createRemoveDebuffEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number
  ): DebuffEvent => ({
    timestamp,
    type: 'removedebuff',
    sourceID: 1,
    sourceIsFriendly: false,
    targetID,
    targetIsFriendly: false,
    abilityGameID,
    fight: 1,
  });

  describe('createBuffLookup', () => {
    it('should create a BuffLookupData instance', () => {
      const buffEvents: BuffEvent[] = [];
      const lookup = createBuffLookup(buffEvents);

      expect(lookup).toBeDefined();
      expect(lookup.buffIntervals).toBeInstanceOf(Object);
    });

    it('should return false for empty buff events', () => {
      const buffEvents: BuffEvent[] = [];
      const lookup = createBuffLookup(buffEvents);

      expect(isBuffActive(lookup, 12345, 1000)).toBe(false);
      expect(isBuffActiveOnTarget(lookup, 12345, 1000, 1)).toBe(false);
    });

    it('should track basic buff apply/remove cycle', () => {
      const buffEvents: BuffEvent[] = [
        createApplyBuffEvent(1000, 12345, 1),
        createRemoveBuffEvent(3000, 12345, 1),
      ];
      const lookup = createBuffLookup(buffEvents);

      // Before buff
      expect(isBuffActive(lookup, 12345, 500)).toBe(false);
      expect(isBuffActiveOnTarget(lookup, 12345, 500, 1)).toBe(false);

      // During buff
      expect(isBuffActive(lookup, 12345, 2000)).toBe(true);
      expect(isBuffActiveOnTarget(lookup, 12345, 2000, 1)).toBe(true);

      // After buff removal
      expect(isBuffActive(lookup, 12345, 4000)).toBe(false);
      expect(isBuffActiveOnTarget(lookup, 12345, 4000, 1)).toBe(false);
    });

    it('should track buffs on multiple targets simultaneously', () => {
      const buffEvents: BuffEvent[] = [
        createApplyBuffEvent(1000, 12345, 1), // Player 1 gets buff
        createApplyBuffEvent(1500, 12345, 2), // Player 2 gets buff
        createRemoveBuffEvent(2500, 12345, 1), // Player 1 loses buff
        createRemoveBuffEvent(3500, 12345, 2), // Player 2 loses buff
      ];
      const lookup = createBuffLookup(buffEvents);

      // At 1200ms: Only player 1 has buff
      expect(isBuffActive(lookup, 12345, 1200)).toBe(true);
      expect(isBuffActiveOnTarget(lookup, 12345, 1200, 1)).toBe(true);
      expect(isBuffActiveOnTarget(lookup, 12345, 1200, 2)).toBe(false);

      // At 2000ms: Both players have buff
      expect(isBuffActive(lookup, 12345, 2000)).toBe(true);
      expect(isBuffActiveOnTarget(lookup, 12345, 2000, 1)).toBe(true);
      expect(isBuffActiveOnTarget(lookup, 12345, 2000, 2)).toBe(true);

      // At 4000ms: No players have buff
      expect(isBuffActive(lookup, 12345, 4000)).toBe(false);
      expect(isBuffActiveOnTarget(lookup, 12345, 4000, 1)).toBe(false);
      expect(isBuffActiveOnTarget(lookup, 12345, 4000, 2)).toBe(false);
    });
  });

  describe('createDebuffLookup', () => {
    it('should create a debuff lookup with same interface as buff lookup', () => {
      const debuffEvents: DebuffEvent[] = [];
      const lookup = createDebuffLookup(debuffEvents);

      expect(lookup).toBeDefined();
      expect(lookup.buffIntervals).toBeInstanceOf(Object);
    });

    it('should track debuff apply/remove cycles', () => {
      const debuffEvents: DebuffEvent[] = [
        createApplyDebuffEvent(1000, 12345, 1),
        createRemoveDebuffEvent(3000, 12345, 1),
      ];
      const lookup = createDebuffLookup(debuffEvents);

      expect(isBuffActive(lookup, 12345, 500)).toBe(false);
      expect(isBuffActive(lookup, 12345, 2000)).toBe(true);
      expect(isBuffActiveOnTarget(lookup, 12345, 2000, 1)).toBe(true);
      expect(isBuffActive(lookup, 12345, 4000)).toBe(false);
    });
  });

  describe('isBuffActive', () => {
    it('should detect when any target has the buff', () => {
      const buffEvents: BuffEvent[] = [
        createApplyBuffEvent(1000, 12345, 1),
        createApplyBuffEvent(1500, 12345, 2),
        createRemoveBuffEvent(2000, 12345, 1),
        createRemoveBuffEvent(3000, 12345, 2),
      ];
      const lookup = createBuffLookup(buffEvents);

      expect(isBuffActive(lookup, 12345, 1200)).toBe(true); // Only player 1 has it
      expect(isBuffActive(lookup, 12345, 1800)).toBe(true); // Both players have it
      expect(isBuffActive(lookup, 12345, 2500)).toBe(true); // Only player 2 has it
      expect(isBuffActive(lookup, 12345, 3500)).toBe(false); // No players have it
    });
  });

  describe('isBuffActiveOnTarget', () => {
    it('should detect buff on specific target when targetID is provided', () => {
      const buffEvents: BuffEvent[] = [
        createApplyBuffEvent(1000, 12345, 1),
        createApplyBuffEvent(1500, 12345, 2),
        createRemoveBuffEvent(2000, 12345, 1),
        createRemoveBuffEvent(3000, 12345, 2),
      ];
      const lookup = createBuffLookup(buffEvents);

      expect(isBuffActiveOnTarget(lookup, 12345, 1200, 1)).toBe(true);
      expect(isBuffActiveOnTarget(lookup, 12345, 1200, 2)).toBe(false);
      expect(isBuffActiveOnTarget(lookup, 12345, 2500, 1)).toBe(false);
      expect(isBuffActiveOnTarget(lookup, 12345, 2500, 2)).toBe(true);
    });

    it('should detect buff on any target when targetID is not provided', () => {
      const buffEvents: BuffEvent[] = [
        createApplyBuffEvent(1000, 12345, 1),
        createRemoveBuffEvent(2000, 12345, 1),
      ];
      const lookup = createBuffLookup(buffEvents);

      expect(isBuffActiveOnTarget(lookup, 12345, 1500)).toBe(true);
      expect(isBuffActiveOnTarget(lookup, 12345, 2500)).toBe(false);
    });
  });
});
