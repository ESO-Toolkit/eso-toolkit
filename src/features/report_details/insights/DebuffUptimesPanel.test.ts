/**
 * Tests for DebuffUptimesPanel - Nazaray debuff tracking (ESO-606)
 *
 * Verifies that:
 * 1. IMPORTANT_DEBUFF_ABILITIES includes the Nazaray monster set debuff
 * 2. The Nazaray debuff uptime is correctly calculated through the buff uptime calculator
 * 3. The IMPORTANT_DEBUFF_ABILITIES filter correctly includes/excludes abilities
 */

import { KnownAbilities } from '../../../types/abilities';
import { computeBuffUptimes } from '../../../utils/buffUptimeCalculator';
import { createDebuffLookup } from '../../../utils/BuffLookupUtils';
import { DebuffEvent } from '../../../types/combatlogEvents';

import { IMPORTANT_DEBUFF_ABILITIES } from './DebuffUptimesPanel';

describe('DebuffUptimesPanel', () => {
  describe('IMPORTANT_DEBUFF_ABILITIES', () => {
    it('should include the Nazaray monster set debuff (167065)', () => {
      expect(IMPORTANT_DEBUFF_ABILITIES.has(KnownAbilities.NAZARAY_DEBUFF)).toBe(true);
    });

    it('should include all expected important debuffs', () => {
      const expectedDebuffs = [
        KnownAbilities.BURNING,
        KnownAbilities.CRUSHER,
        KnownAbilities.ENGULFING_FLAMES_BUFF,
        KnownAbilities.MAJOR_BREACH,
        KnownAbilities.MAJOR_COWARDICE,
        KnownAbilities.MAJOR_VULNERABILITY,
        KnownAbilities.MINOR_BREACH,
        KnownAbilities.MINOR_BRITTLE,
        KnownAbilities.MINOR_LIFESTEAL,
        KnownAbilities.MINOR_VULNERABILITY,
        KnownAbilities.NAZARAY_DEBUFF,
        KnownAbilities.OFF_BALANCE,
        KnownAbilities.RUNIC_SUNDER_DEBUFF,
        KnownAbilities.STAGGER,
        KnownAbilities.TOUCH_OF_ZEN,
      ];

      expectedDebuffs.forEach((debuff) => {
        expect(IMPORTANT_DEBUFF_ABILITIES.has(debuff)).toBe(true);
      });

      // Verify the set size matches to catch any accidental additions
      expect(IMPORTANT_DEBUFF_ABILITIES.size).toBe(expectedDebuffs.length);
    });

    it('should not include non-debuff abilities', () => {
      expect(IMPORTANT_DEBUFF_ABILITIES.has(KnownAbilities.MAJOR_COURAGE)).toBe(false);
      expect(IMPORTANT_DEBUFF_ABILITIES.has(KnownAbilities.MAJOR_RESOLVE)).toBe(false);
      expect(IMPORTANT_DEBUFF_ABILITIES.has(KnownAbilities.EMPOWER)).toBe(false);
    });
  });

  describe('Nazaray debuff uptime calculation', () => {
    const NAZARAY_ABILITY_ID = KnownAbilities.NAZARAY_DEBUFF; // 167065
    const ENEMY_ID = 500;
    const PLAYER_ID = 100;
    const FIGHT_START = 1000;
    const FIGHT_END = 11000;
    const FIGHT_DURATION = FIGHT_END - FIGHT_START; // 10 seconds

    const createApplyDebuffEvent = (
      timestamp: number,
      abilityGameID: number,
      targetID: number,
      sourceID: number,
    ): DebuffEvent => ({
      timestamp,
      type: 'applydebuff',
      sourceID,
      sourceIsFriendly: true,
      targetID,
      targetIsFriendly: false,
      abilityGameID,
      fight: 1,
      extraAbilityGameID: 0,
    });

    const createRemoveDebuffEvent = (
      timestamp: number,
      abilityGameID: number,
      targetID: number,
      sourceID: number,
    ): DebuffEvent => ({
      timestamp,
      type: 'removedebuff',
      sourceID,
      sourceIsFriendly: true,
      targetID,
      targetIsFriendly: false,
      abilityGameID,
      fight: 1,
      extraAbilityGameID: 0,
    });

    it('should correctly build debuff lookup from Nazaray debuff events', () => {
      const debuffEvents: DebuffEvent[] = [
        createApplyDebuffEvent(FIGHT_START + 1000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
        createRemoveDebuffEvent(FIGHT_START + 6000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
      ];

      const lookup = createDebuffLookup(debuffEvents, FIGHT_END);
      const intervals = lookup.buffIntervals[String(NAZARAY_ABILITY_ID)];

      expect(intervals).toBeDefined();
      expect(intervals).toHaveLength(1);
      expect(intervals[0].start).toBe(FIGHT_START + 1000);
      expect(intervals[0].end).toBe(FIGHT_START + 6000);
      expect(intervals[0].targetID).toBe(ENEMY_ID);
      expect(intervals[0].sourceID).toBe(PLAYER_ID);
    });

    it('should calculate Nazaray debuff uptime percentage correctly', () => {
      const debuffEvents: DebuffEvent[] = [
        createApplyDebuffEvent(FIGHT_START + 1000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
        createRemoveDebuffEvent(FIGHT_START + 6000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
      ];

      const lookup = createDebuffLookup(debuffEvents, FIGHT_END);

      const result = computeBuffUptimes(lookup, {
        abilityIds: new Set([NAZARAY_ABILITY_ID]),
        targetIds: new Set([ENEMY_ID]),
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_END,
        fightDuration: FIGHT_DURATION,
        abilitiesById: {
          [NAZARAY_ABILITY_ID]: { name: 'Nazaray', icon: 'gear_undspriggan_head_a' },
        },
        isDebuff: true,
        hostilityType: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].abilityGameID).toBe(String(NAZARAY_ABILITY_ID));
      expect(result[0].abilityName).toBe('Nazaray');
      expect(result[0].uptimePercentage).toBe(50); // 5s out of 10s
      expect(result[0].isDebuff).toBe(true);
    });

    it('should handle multiple Nazaray debuff applications across a fight', () => {
      const debuffEvents: DebuffEvent[] = [
        // First application: 2 seconds
        createApplyDebuffEvent(FIGHT_START + 1000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
        createRemoveDebuffEvent(FIGHT_START + 3000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
        // Second application: 3 seconds
        createApplyDebuffEvent(FIGHT_START + 5000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
        createRemoveDebuffEvent(FIGHT_START + 8000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
      ];

      const lookup = createDebuffLookup(debuffEvents, FIGHT_END);

      const result = computeBuffUptimes(lookup, {
        abilityIds: new Set([NAZARAY_ABILITY_ID]),
        targetIds: new Set([ENEMY_ID]),
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_END,
        fightDuration: FIGHT_DURATION,
        abilitiesById: {
          [NAZARAY_ABILITY_ID]: { name: 'Nazaray', icon: 'gear_undspriggan_head_a' },
        },
        isDebuff: true,
        hostilityType: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].uptimePercentage).toBe(50); // 5s out of 10s
      expect(result[0].applications).toBe(2);
    });

    it('should filter Nazaray correctly through the IMPORTANT_DEBUFF_ABILITIES set', () => {
      const debuffEvents: DebuffEvent[] = [
        // Nazaray debuff - should be included
        createApplyDebuffEvent(FIGHT_START + 1000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
        createRemoveDebuffEvent(FIGHT_START + 6000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
        // Some unrelated debuff (not in important list) - should be excluded
        createApplyDebuffEvent(FIGHT_START + 2000, 99999, ENEMY_ID, PLAYER_ID),
        createRemoveDebuffEvent(FIGHT_START + 4000, 99999, ENEMY_ID, PLAYER_ID),
      ];

      const lookup = createDebuffLookup(debuffEvents, FIGHT_END);

      // Simulate the filtering logic from DebuffUptimesPanel
      const allDebuffs = computeBuffUptimes(lookup, {
        abilityIds: new Set([NAZARAY_ABILITY_ID, 99999]),
        targetIds: new Set([ENEMY_ID]),
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_END,
        fightDuration: FIGHT_DURATION,
        abilitiesById: {
          [NAZARAY_ABILITY_ID]: { name: 'Nazaray', icon: 'gear_undspriggan_head_a' },
          99999: { name: 'Some Random Debuff', icon: 'unknown' },
        },
        isDebuff: true,
        hostilityType: 1,
      });

      // All debuffs mode returns both
      expect(allDebuffs).toHaveLength(2);

      // Important-only filtering (same logic as DebuffUptimesPanel)
      const importantOnly = allDebuffs.filter((debuff) => {
        const abilityIdNum = parseInt(debuff.abilityGameID, 10);
        return IMPORTANT_DEBUFF_ABILITIES.has(abilityIdNum as KnownAbilities);
      });

      expect(importantOnly).toHaveLength(1);
      expect(importantOnly[0].abilityGameID).toBe(String(NAZARAY_ABILITY_ID));
      expect(importantOnly[0].abilityName).toBe('Nazaray');
    });

    it('should handle Nazaray debuff that remains active until fight end', () => {
      const debuffEvents: DebuffEvent[] = [
        // Applied but never removed - lasts until fight end
        createApplyDebuffEvent(FIGHT_START + 5000, NAZARAY_ABILITY_ID, ENEMY_ID, PLAYER_ID),
      ];

      const lookup = createDebuffLookup(debuffEvents, FIGHT_END);

      const result = computeBuffUptimes(lookup, {
        abilityIds: new Set([NAZARAY_ABILITY_ID]),
        targetIds: new Set([ENEMY_ID]),
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_END,
        fightDuration: FIGHT_DURATION,
        abilitiesById: {
          [NAZARAY_ABILITY_ID]: { name: 'Nazaray', icon: 'gear_undspriggan_head_a' },
        },
        isDebuff: true,
        hostilityType: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].uptimePercentage).toBe(50); // 5s out of 10s (from +5000 to end)
    });
  });
});
