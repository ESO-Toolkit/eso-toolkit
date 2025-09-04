# Buff Lookup Utility

This utility provides an efficient way to determine whether a specific buff or debuff was active at a given timestamp. It's optimized for repeated lookups across large datasets of combat events.

## Features

- **Efficient Lookups**: O(log n) time complexity for buff status queries
- **Target-Specific Queries**: Check if buffs are active on specific targets
- **Multi-Target Analysis**: Get all targets with active buffs at any timestamp
- **Memory Optimized**: Uses sorted intervals to minimize memory usage
- **Handles Edge Cases**: Properly manages overlapping buffs and fight end times
- **Type Safe**: Full TypeScript support with proper type definitions

## Enhanced API Reference (v2.0)

The BuffLookup interface now provides three methods for different query needs:

```typescript
interface BuffLookup {
  // Check if buff is active anywhere (any target) - Original functionality
  isBuffActive: (abilityGameID: number, timestamp: number) => boolean;

  // NEW: Check if buff is active on a specific target
  isBuffActiveOnTarget: (abilityGameID: number, timestamp: number, targetID: number) => boolean;

  // NEW: Get all targets that have the buff active at timestamp
  getActiveTargets: (abilityGameID: number, timestamp: number) => number[];
}
```

## API Reference

### Data Structure

#### `BuffLookupData`

A POJO (Plain Old JavaScript Object) containing the processed buff lookup data:

```typescript
interface BuffLookupData {
  buffIntervals: Map<number, BuffTimeInterval[]>;
}
```

### Creation Functions

#### `createBuffLookup(buffEvents, fightEndTime?)`

Creates a buff lookup data structure from a list of buff events.

**Parameters:**

- `buffEvents: BuffEvent[]` - Array of buff events to process
- `fightEndTime?: number` - Optional fight end time to handle buffs that remain active

**Returns:** `BuffLookupData` object containing the processed buff intervals

**Time Complexity:**

- Creation: O(n log n) where n is the number of events
- Lookup: O(log m) where m is the number of intervals for a specific buff

**Space Complexity:** O(n) where n is the number of buff intervals

#### `createDebuffLookup(debuffEvents, fightEndTime?)`

Similar to `createBuffLookup` but for debuff events.

**Parameters:**

- `debuffEvents: DebuffEvent[]` - Array of debuff events to process
- `fightEndTime?: number` - Optional fight end time to handle debuffs that remain active

**Returns:** `BuffLookupData` object containing the processed debuff intervals

### Utility Functions

#### `isBuffActive(buffLookup, abilityGameID, timestamp)`

Checks if a specific buff/debuff was active at a given timestamp for any target.

**Parameters:**

- `buffLookup: BuffLookupData` - The buff lookup data structure
- `abilityGameID: number` - The ability game ID to check
- `timestamp: number` - The timestamp to check

**Returns:** `boolean` - True if the buff/debuff was active at the timestamp

#### `isBuffActiveOnTarget(buffLookup, abilityGameID, timestamp, targetID?)`

Checks if a specific buff/debuff was active on a specific target at a given timestamp.
If no target is specified, checks if the buff is active on any target.

**Parameters:**

- `buffLookup: BuffLookupData` - The buff lookup data structure
- `abilityGameID: number` - The ability game ID to check
- `timestamp: number` - The timestamp to check
- `targetID?: number` - Optional target ID to check. If not provided, checks any target

**Returns:** `boolean` - True if the buff/debuff was active on the target (or any target if targetID not specified) at the timestamp

#### `isBuffActiveOnAnyTarget(buffLookup, abilityGameID, timestamp)`

Convenience function that explicitly checks if a buff/debuff is active on any target at a given timestamp.
This is equivalent to calling `isBuffActive()` or `isBuffActiveOnTarget()` without a target.

**Parameters:**

- `buffLookup: BuffLookupData` - The buff lookup data structure
- `abilityGameID: number` - The ability game ID to check
- `timestamp: number` - The timestamp to check

**Returns:** `boolean` - True if the buff/debuff was active on any target at the timestamp

#### `getActiveTargets(buffLookup, abilityGameID, timestamp)`

Gets all targets that have a specific buff/debuff active at a given timestamp.

**Parameters:**

- `buffLookup: BuffLookupData` - The buff lookup data structure
- `abilityGameID: number` - The ability game ID to check
- `timestamp: number` - The timestamp to check

**Returns:** `number[]` - Sorted array of target IDs that have the buff/debuff active

## Usage Examples

### Target-Specific Buff Checking

```typescript
import {
  createBuffLookup,
  isBuffActive,
  isBuffActiveOnTarget,
  isBuffActiveOnAnyTarget,
  getActiveTargets,
} from './BuffLookupUtils';

// Create the lookup data structure
const buffLookup = createBuffLookup(friendlyBuffEvents, fight.endTime);

const playerId = 12345;
const abilityGameID = 67890;
const timestamp = fight.startTime + 30000; // 30s into fight

// Check if buff is active on any target (original functionality)
const isActiveAnywhere = isBuffActive(buffLookup, abilityGameID, timestamp);

// NEW: Check if buff is active on specific player
const isActiveOnPlayer = isBuffActiveOnTarget(buffLookup, abilityGameID, timestamp, playerId);

// NEW: Check if buff is active on any target (alternative syntax)
const isActiveOnAnyTarget = isBuffActiveOnTarget(buffLookup, abilityGameID, timestamp); // No targetID
const isActiveOnAnyTargetExplicit = isBuffActiveOnAnyTarget(buffLookup, abilityGameID, timestamp); // Explicit function

// NEW: Get all targets with this buff active
const activeTargets = getActiveTargets(buffLookup, abilityGameID, timestamp);

console.log(`Buff active anywhere: ${isActiveAnywhere}`);
console.log(`Buff active on player ${playerId}: ${isActiveOnPlayer}`);
console.log(`Buff active on any target (alt syntax): ${isActiveOnAnyTarget}`);
console.log(`Buff active on targets: [${activeTargets.join(', ')}]`);
```

### General Buff State Detection

```typescript
// Flexible buff checking - handles both general and specific cases
function checkBuffState(buffLookup, abilityGameID, timestamp, targetID?) {
  if (targetID !== undefined) {
    // Check specific target
    return isBuffActiveOnTarget(buffLookup, abilityGameID, timestamp, targetID);
  } else {
    // Check any target - all these are equivalent:
    return isBuffActive(buffLookup, abilityGameID, timestamp);
    // OR: return isBuffActiveOnTarget(buffLookup, abilityGameID, timestamp);
    // OR: return isBuffActiveOnAnyTarget(buffLookup, abilityGameID, timestamp);
  }
}

// Usage examples
const buffLookup = createBuffLookup(buffEvents, fightEndTime);
const timestamp = 15000;
const buffAbility = 12345;

// General state detection
const isActiveGeneral = checkBuffState(buffLookup, buffAbility, timestamp);
console.log(`Buff ${buffAbility} active on any target: ${isActiveGeneral}`);

// Specific target detection
const isActiveOnTarget10 = checkBuffState(buffLookup, buffAbility, timestamp, 10);
console.log(`Buff ${buffAbility} active on target 10: ${isActiveOnTarget10}`);
```

### Critical Damage Calculation with Target Specificity

```typescript
// More accurate critical damage calculation
const buffLookup = createBuffLookup(friendlyBuffEvents, fight.endTime);

for (const source of criticalDamageSources) {
  if (source.source === 'buff') {
    // Use target-specific check instead of general buff presence
    const isActiveOnCurrentPlayer = isBuffActiveOnTarget(
      buffLookup,
      source.ability,
      currentTimestamp,
      currentPlayerId,
    );

    if (isActiveOnCurrentPlayer) {
      criticalDamage += source.value;
    }

    // Debug: Check if buff is active elsewhere
    const allActiveTargets = getActiveTargets(buffLookup, source.ability, currentTimestamp);
    if (allActiveTargets.length > 0 && !isActiveOnCurrentPlayer) {
      console.log(`Buff ${source.name} active on other targets: [${allActiveTargets.join(', ')}]`);
    }
  }
}
```

### Multi-Target Buff Analysis

```typescript
// Analyze buff distribution across all targets
const buffLookup = createBuffLookup(friendlyBuffEvents, fight.endTime);
const analysisPoints = [];

for (let t = fight.startTime; t <= fight.endTime; t += 5000) {
  // Every 5 seconds
  const activeTargets = buffLookup.getActiveTargets(importantBuffAbility, t);

  analysisPoints.push({
    timestamp: t,
    relativeTime: (t - fight.startTime) / 1000,
    targetCount: activeTargets.length,
    targets: activeTargets,
    coverage: activeTargets.length / totalPlayerCount,
  });
}

console.log('Buff coverage analysis:', analysisPoints);
```

### Performance Comparison

#### Before (Inefficient):

```typescript
// O(n) for each lookup - very slow for repeated queries
const isBuffActive = buffEvents.some(
  (event) =>
    event.abilityGameID === targetAbility &&
    event.timestamp >= windowStart &&
    event.timestamp < windowEnd,
);
```

#### After (Efficient):

```typescript
// O(log m) for each lookup - much faster
const buffLookup = createBuffLookup(buffEvents, fightEndTime);
const isBuffActive = buffLookup.isBuffActive(targetAbility, timestamp);
```

### Voxelization Use Case

```typescript
// Efficient voxelized critical damage calculation
const buffLookup = createBuffLookup(friendlyBuffEvents, fight.endTime);
const debuffLookup = createDebuffLookup(debuffEvents, fight.endTime);

for (let i = 0; i < numVoxels; i++) {
  const voxelTimestamp = fight.startTime + i * voxelSize * 1000;

  // Fast lookups for each voxel
  const buffActive = buffLookup.isBuffActive(buffAbilityId, voxelTimestamp);
  const debuffActive = debuffLookup.isBuffActive(debuffAbilityId, voxelTimestamp);

  if (buffActive) {
    criticalDamage += buffCriticalDamageValue;
  }

  if (debuffActive) {
    criticalDamage += debuffCriticalDamageValue;
  }
}
```

### Multiple Ability Checking

```typescript
const buffLookup = createBuffLookup(friendlyBuffEvents, fight.endTime);

// Check multiple buffs at once
const abilities = [12345, 67890, 11111];
const activeBuffs = abilities.filter((abilityId) => buffLookup.isBuffActive(abilityId, timestamp));

console.log(`Active buffs at ${timestamp}:`, activeBuffs);
```

## Implementation Details

### Data Structure

The utility uses a `Map<number, BuffTimeInterval[]>` where:

- Key: `abilityGameID`
- Value: Array of sorted time intervals when the buff was active

### Algorithm

1. **Processing Events**: Events are sorted chronologically and processed to build time intervals
2. **Interval Creation**: Apply events start intervals, remove events end them
3. **Binary Search**: Lookups use binary search on sorted intervals for efficiency
4. **Edge Case Handling**: Active buffs at fight end are properly closed

### Memory Usage

For a typical fight with 1000 buff events creating 200 intervals:

- Memory usage: ~50KB (much less than storing all events)
- Lookup time: ~10 microseconds vs 1 millisecond for linear search

## Best Practices

1. **Create Once, Query Many**: Create the lookup once and reuse it for multiple queries
2. **Include Fight End Time**: Provide `fightEndTime` to properly handle buffs active at fight end
3. **Batch Processing**: Group related queries together to maximize cache efficiency
4. **Type Safety**: Use TypeScript types to catch errors at compile time

## Integration Examples

### In Critical Damage Analysis

```typescript
const buffLookup = createBuffLookup(friendlyBuffEvents, fight.endTime);

// Replace inefficient event filtering with fast lookups
for (const source of criticalDamageSources) {
  if (source.source === 'buff') {
    const isActive = buffLookup.isBuffActive(source.ability, currentTimestamp);
    if (isActive) {
      totalCriticalDamage += source.value;
    }
  }
}
```

### In Time Series Analysis

```typescript
const buffLookup = createBuffLookup(friendlyBuffEvents, fight.endTime);

// Generate time series data efficiently
const timeSeriesData = [];
for (let t = fight.startTime; t <= fight.endTime; t += 1000) {
  const activeBuffCount = buffAbilities.filter((ability) =>
    buffLookup.isBuffActive(ability, t),
  ).length;

  timeSeriesData.push({ timestamp: t, activeBuffs: activeBuffCount });
}
```

This utility significantly improves performance when dealing with large numbers of combat events and frequent buff status queries.
