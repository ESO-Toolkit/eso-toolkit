# Redux Buff Lookup Selectors

This document describes the Redux selectors that provide efficient buff lookup functionality with loading states.

## Overview

The buff lookup selectors combine the raw buff/debuff events from the Redux store with the efficient `BuffLookupUtils` to provide ready-to-use buff lookup objects. Each selector returns a `{buffLookup, isLoading}` object that handles both data availability and loading states.

## Available Selectors

### `selectFriendlyBuffLookup`

Returns buff lookup data for friendly buff events with loading state.

```typescript
const friendlyBuffData = useSelector(selectFriendlyBuffLookup);
// Returns: { buffLookup: BuffLookupData | null, isLoading: boolean }
```

**Use Cases:**

- Tracking party/raid buff states
- Checking self-buffs on the player
- Analyzing friendly buff uptime

### `selectHostileBuffLookup`

Returns buff lookup data for hostile buff events with loading state.

```typescript
const hostileBuffData = useSelector(selectHostileBuffLookup);
// Returns: { buffLookup: BuffLookupData | null, isLoading: boolean }
```

**Use Cases:**

- Tracking enemy buff states
- Analyzing hostile buff applications
- Monitoring threat-related buffs

### `selectDebuffLookup`

Returns buff lookup data for debuff events with loading state.

```typescript
const debuffData = useSelector(selectDebuffLookup);
// Returns: { buffLookup: BuffLookupData | null, isLoading: boolean }
```

**Use Cases:**

- Tracking debuff applications on targets
- Analyzing damage-over-time effects
- Monitoring crowd control effects

### `selectCombinedBuffLookup`

Returns buff lookup data combining both friendly and hostile buff events.

```typescript
const combinedBuffData = useSelector(selectCombinedBuffLookup);
// Returns: { buffLookup: BuffLookupData | null, isLoading: boolean }
```

**Use Cases:**

- General buff state checking regardless of source
- Comprehensive buff analysis
- Simplified buff tracking when source doesn't matter

## Return Value Interface

All selectors return the same interface:

```typescript
interface BuffLookupWithLoading {
  buffLookup: BuffLookupData | null;
  isLoading: boolean;
}
```

**Properties:**

- `buffLookup`: The processed buff lookup data structure, or `null` if no data available or still loading
- `isLoading`: Boolean indicating if the underlying events are still being fetched

## Usage Patterns

### Basic Usage

```typescript
import { useSelector } from 'react-redux';
import { selectFriendlyBuffLookup } from '../../store/selectors/eventsSelectors';
import { isBuffActiveOnTarget } from './BuffLookupUtils';

const MyComponent = () => {
  const { buffLookup, isLoading } = useSelector(selectFriendlyBuffLookup);

  if (isLoading) {
    return <div>Loading buff data...</div>;
  }

  if (!buffLookup) {
    return <div>No buff data available</div>;
  }

  const isBuffActive = isBuffActiveOnTarget(buffLookup, abilityId, timestamp, playerId);

  return <div>Buff active: {isBuffActive ? 'Yes' : 'No'}</div>;
};
```

### Multiple Selectors

```typescript
const MyAnalysisComponent = () => {
  const friendlyBuffs = useSelector(selectFriendlyBuffLookup);
  const debuffs = useSelector(selectDebuffLookup);

  const isLoading = friendlyBuffs.isLoading || debuffs.isLoading;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Use both lookups for comprehensive analysis
  const hasFriendlyBuff = friendlyBuffs.buffLookup &&
    isBuffActiveOnTarget(friendlyBuffs.buffLookup, buffId, timestamp, playerId);

  const hasDebuff = debuffs.buffLookup &&
    isBuffActiveOnTarget(debuffs.buffLookup, debuffId, timestamp, playerId);

  return (
    <div>
      <p>Friendly buff: {hasFriendlyBuff ? 'Active' : 'Inactive'}</p>
      <p>Debuff: {hasDebuff ? 'Active' : 'Inactive'}</p>
    </div>
  );
};
```

### Performance Considerations

```typescript
// Good: Use memoized selectors
const MyComponent = () => {
  const { buffLookup, isLoading } = useSelector(selectFriendlyBuffLookup);

  // The selector is memoized and will only recompute when:
  // - Friendly buff events change
  // - Loading state changes
  // - Fight data changes (for end time)

  return <div>{/* render content */}</div>;
};

// Good: Conditional rendering based on loading state
const MyComponent = () => {
  const { buffLookup, isLoading } = useSelector(selectFriendlyBuffLookup);

  if (isLoading) return <LoadingSpinner />;
  if (!buffLookup) return <NoDataMessage />;

  // Only perform buff queries when data is available
  return <BuffAnalysis buffLookup={buffLookup} />;
};
```

## Integration with BuffLookupUtils

These selectors are designed to work seamlessly with the BuffLookupUtils functions:

```typescript
import {
  isBuffActive,
  isBuffActiveOnTarget,
  isBuffActiveOnAnyTarget,
  getActiveTargets
} from './BuffLookupUtils';

const MyComponent = () => {
  const { buffLookup } = useSelector(selectFriendlyBuffLookup);

  if (!buffLookup) return null;

  // All BuffLookupUtils functions work with the selector output
  const isActive = isBuffActive(buffLookup, abilityId, timestamp);
  const isActiveOnPlayer = isBuffActiveOnTarget(buffLookup, abilityId, timestamp, playerId);
  const isActiveAnywhere = isBuffActiveOnAnyTarget(buffLookup, abilityId, timestamp);
  const activeTargets = getActiveTargets(buffLookup, abilityId, timestamp);

  return (
    <div>
      <p>Active: {isActive}</p>
      <p>Active on player: {isActiveOnPlayer}</p>
      <p>Active anywhere: {isActiveAnywhere}</p>
      <p>Active targets: {activeTargets.join(', ')}</p>
    </div>
  );
};
```

## Error Handling

The selectors handle various error states gracefully:

- **No events**: Returns `{ buffLookup: null, isLoading: false }`
- **Loading state**: Returns `{ buffLookup: null, isLoading: true }`
- **Empty events array**: Returns `{ buffLookup: null, isLoading: false }`
- **Missing fight data**: Uses `undefined` for fight end time, buffs remain active until explicitly removed

## Performance Characteristics

- **O(1) selector access**: Redux selectors use memoization
- **O(log n) buff queries**: BuffLookupUtils uses binary search for efficient lookups
- **Minimal re-renders**: Selectors only recompute when underlying data changes
- **Memory efficient**: POJO-based data structure with Map-based organization

## Testing

The selectors come with comprehensive tests covering:

- Loading states
- Empty data scenarios
- Data availability scenarios
- Combined selector behavior
- Error conditions

See `eventsSelectors.test.ts` for complete test coverage.

## Migration from Direct BuffLookup Usage

If you're currently creating BuffLookup objects manually:

```typescript
// Before: Manual buff lookup creation
const MyComponent = () => {
  const buffEvents = useSelector(selectFriendlyBuffEvents);
  const isLoading = useSelector(selectFriendlyBuffEventsLoading);
  const fights = useSelector(selectReportFights);

  const buffLookup = useMemo(() => {
    if (!buffEvents || buffEvents.length === 0) return null;
    const fightEndTime = fights?.[0]?.endTime;
    return createBuffLookup(buffEvents, fightEndTime);
  }, [buffEvents, fights]);

  // Component logic...
};

// After: Using selectors
const MyComponent = () => {
  const { buffLookup, isLoading } = useSelector(selectFriendlyBuffLookup);

  // Component logic...
};
```

## Best Practices

1. **Always check loading state** before using buffLookup
2. **Handle null buffLookup** gracefully
3. **Use appropriate selector** for your use case (friendly vs hostile vs debuff vs combined)
4. **Combine selectors** when you need multiple buff types
5. **Leverage memoization** - selectors are automatically memoized by Redux
6. **Test edge cases** - loading states, empty data, missing fights

## Example Implementation

See `BuffLookupExample.tsx` for a complete working example demonstrating all selectors and usage patterns.
