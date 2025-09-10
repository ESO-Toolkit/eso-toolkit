import { DamageEvent } from '../../types/combatlogEvents';
import { calculateStaggerStacks } from './CalculateStaggerStacks';
import { KnownAbilities } from '../../types/abilities';

describe('CalculateStaggerStacks', () => {
  const STONE_GIANT_ID = KnownAbilities.STONE_GIANT;
  const FIGHT_START = 10000;
  const FIGHT_END = 30000;
  const TARGET_ID = 123;

  const createMockDamageEvent = (
    timestamp: number,
    abilityGameID: number = STONE_GIANT_ID,
    sourceID: number = 100,
    targetID: number = TARGET_ID,
  ): DamageEvent => ({
    timestamp,
    type: 'damage',
    sourceID,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: false,
    abilityGameID,
    fight: 1,
    hitType: 1 as any,
    amount: 1000,
    castTrackID: 12345,
    sourceResources: { hitPoints: 100, maxHitPoints: 100 } as any,
    targetResources: { hitPoints: 100, maxHitPoints: 100 } as any,
  });

  it('should return empty results when no Stone Giant damage events', () => {
    const damageEvents: DamageEvent[] = [
      createMockDamageEvent(FIGHT_START + 1000, 99999), // Different ability
    ];

    const result = calculateStaggerStacks({
      damageEvents,
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
    });

    expect(result.stackResults).toEqual([]);
  });

  it('should calculate single stagger application correctly', () => {
    const damageEvents: DamageEvent[] = [
      createMockDamageEvent(FIGHT_START + 5000), // Single Stone Giant hit
    ];

    const result = calculateStaggerStacks({
      damageEvents,
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
    });

    expect(result.stackResults).toHaveLength(1);
    const stack1Result = result.stackResults[0];
    expect(stack1Result.stackLevel).toBe(1);
    expect(stack1Result.abilityName).toBe('Stagger (1 Stack)');
    expect(stack1Result.totalDuration).toBe(6000);
    expect(stack1Result.uptime).toBe(6);
    expect(stack1Result.applications).toBe(1);
  });

  it('should build multiple stacks when hits are within 6 seconds', () => {
    const damageEvents: DamageEvent[] = [
      createMockDamageEvent(FIGHT_START + 1000), // 1st hit: 1 stack - expires at 7000
      createMockDamageEvent(FIGHT_START + 2000), // 2nd hit: 2 stacks - expires at 8000
      createMockDamageEvent(FIGHT_START + 3000), // 3rd hit: 3 stacks - expires at 9000
    ];

    const result = calculateStaggerStacks({
      damageEvents,
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
    });

    expect(result.stackResults).toHaveLength(3);

    const stack1Result = result.stackResults.find((r) => r.stackLevel === 1);
    const stack2Result = result.stackResults.find((r) => r.stackLevel === 2);
    const stack3Result = result.stackResults.find((r) => r.stackLevel === 3);

    expect(stack1Result).toBeDefined();
    expect(stack2Result).toBeDefined();
    expect(stack3Result).toBeDefined();

    // With refreshing mechanics:
    // 1000: 1 stack starts
    // 2000: 2 stacks
    // 3000: 3 stacks
    // 9000: all stacks expire (3000 + 6000)

    // Stack 1 should be active from 1000-9000 (8 seconds total)
    expect(stack1Result!.totalDuration).toBe(8000);

    // Stack 2 should be active from 2000-9000 (7 seconds total)
    expect(stack2Result!.totalDuration).toBe(7000);

    // Stack 3 should be active from 3000-9000 (6 seconds)
    expect(stack3Result!.totalDuration).toBe(6000);
  });

  it('should refresh stacks when 4th hit occurs (not replace)', () => {
    const damageEvents: DamageEvent[] = [
      createMockDamageEvent(FIGHT_START + 1000), // 1st hit: 1 stack
      createMockDamageEvent(FIGHT_START + 2000), // 2nd hit: 2 stacks
      createMockDamageEvent(FIGHT_START + 3000), // 3rd hit: 3 stacks
      createMockDamageEvent(FIGHT_START + 4000), // 4th hit: refreshes 3 stacks (expires at 10000)
    ];

    const result = calculateStaggerStacks({
      damageEvents,
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
    });

    // Should still cap at 3 stacks
    expect(result.stackResults).toHaveLength(3);

    const stack1Result = result.stackResults.find((r) => r.stackLevel === 1);
    const stack2Result = result.stackResults.find((r) => r.stackLevel === 2);
    const stack3Result = result.stackResults.find((r) => r.stackLevel === 3);

    expect(stack1Result).toBeDefined();
    expect(stack2Result).toBeDefined();
    expect(stack3Result).toBeDefined();

    // Timeline with refreshing mechanics:
    // 1000: 1 stack starts
    // 2000: 2 stacks
    // 3000: 3 stacks
    // 4000: 3 stacks refreshed (new expiration at 10000)
    // 10000: all stacks expire

    // Stack 1 should be active from 1000-10000 (9 seconds total)
    expect(stack1Result!.totalDuration).toBe(9000);

    // Stack 2 should be active from 2000-10000 (8 seconds total)
    expect(stack2Result!.totalDuration).toBe(8000);

    // Stack 3 should be active from 3000-10000 (7 seconds)
    expect(stack3Result!.totalDuration).toBe(7000);
  });

  it('should handle multiple targets independently', () => {
    const TARGET_A = 123;
    const TARGET_B = 456;

    const damageEvents: DamageEvent[] = [
      createMockDamageEvent(FIGHT_START + 1000, STONE_GIANT_ID, 100, TARGET_A),
      createMockDamageEvent(FIGHT_START + 2000, STONE_GIANT_ID, 100, TARGET_B),
      createMockDamageEvent(FIGHT_START + 3000, STONE_GIANT_ID, 100, TARGET_A),
    ];

    const result = calculateStaggerStacks({
      damageEvents,
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
    });

    expect(result.stackResults.length).toBeGreaterThan(0);
    const totalUptime = result.stackResults.reduce((sum, r) => sum + r.totalDuration, 0);
    expect(totalUptime).toBeGreaterThan(6000); // More than single target
  });

  it('should handle edge cases', () => {
    // Empty events
    expect(
      calculateStaggerStacks({
        damageEvents: [],
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_END,
      }).stackResults,
    ).toEqual([]);

    // Missing fight times
    expect(
      calculateStaggerStacks({
        damageEvents: [createMockDamageEvent(FIGHT_START + 1000)],
      }).stackResults,
    ).toEqual([]);

    // Event at fight end
    expect(
      calculateStaggerStacks({
        damageEvents: [createMockDamageEvent(FIGHT_END)],
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_END,
      }).stackResults,
    ).toEqual([]);
  });

  it('should count higher stacks as lower stack levels (3 stacks = 3+2+1)', () => {
    const damageEvents: DamageEvent[] = [
      createMockDamageEvent(FIGHT_START + 1000), // Stack 1 - expires at 7000
      createMockDamageEvent(FIGHT_START + 2000), // Stack 2 - expires at 8000
      createMockDamageEvent(FIGHT_START + 3000), // Stack 3 - expires at 9000
    ];

    const result = calculateStaggerStacks({
      damageEvents,
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
    });

    expect(result.stackResults).toHaveLength(3);

    const stack1Result = result.stackResults.find((r) => r.stackLevel === 1);
    const stack2Result = result.stackResults.find((r) => r.stackLevel === 2);
    const stack3Result = result.stackResults.find((r) => r.stackLevel === 3);

    // Stack 3 uptime should be less than or equal to Stack 2 uptime
    // Stack 2 uptime should be less than or equal to Stack 1 uptime
    expect(stack3Result!.totalDuration).toBeLessThanOrEqual(stack2Result!.totalDuration);
    expect(stack2Result!.totalDuration).toBeLessThanOrEqual(stack1Result!.totalDuration);

    // Specifically with refreshing: 1 stack = 8000ms, 2 stacks = 7000ms, 3 stacks = 6000ms
    expect(stack1Result!.totalDuration).toBe(8000);
    expect(stack2Result!.totalDuration).toBe(7000);
    expect(stack3Result!.totalDuration).toBe(6000);
  });

  it('should handle stacks that are active at fight end', () => {
    const damageEvents: DamageEvent[] = [
      createMockDamageEvent(FIGHT_END - 3000), // Hit 3 seconds before fight end
    ];

    const result = calculateStaggerStacks({
      damageEvents,
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
    });

    expect(result.stackResults).toHaveLength(1);
    const stack1Result = result.stackResults[0];

    // Stack should be active from (FIGHT_END - 3000) to FIGHT_END = 3000ms = 3 seconds
    // Even though natural expiration would be at (FIGHT_END - 3000) + 6000 = FIGHT_END + 3000
    expect(stack1Result.totalDuration).toBe(3000);
    expect(stack1Result.uptime).toBe(3);
  });

  it('should handle multiple hits where final stacks extend to fight end', () => {
    const damageEvents: DamageEvent[] = [
      createMockDamageEvent(FIGHT_START + 1000), // Early hit that will expire
      createMockDamageEvent(FIGHT_END - 2000), // Hit 2 seconds before fight end
    ];

    const result = calculateStaggerStacks({
      damageEvents,
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
    });

    expect(result.stackResults).toHaveLength(1);
    const stack1Result = result.stackResults[0];

    // First interval: 1000ms -> 7000ms = 6000ms (6 seconds)
    // Second interval: (FIGHT_END - 2000) -> FIGHT_END = 2000ms (2 seconds)
    // Total: 6000 + 2000 = 8000ms = 8 seconds
    expect(stack1Result.totalDuration).toBe(8000);
    expect(stack1Result.uptime).toBe(8);
    expect(stack1Result.applications).toBe(2); // Two separate intervals
  });
});
