# Migration Guide: selectFriendlyBuffLookup to Worker Pattern

## Overview

The `selectFriendlyBuffLookup` selector has been enhanced with a worker-based pattern that performs heavy buff calculations on a separate thread, preventing UI blocking and providing progress feedback.

## Migration Steps

### 1. Replace Selector Usage with Hook

**Old Pattern (Synchronous):**

```typescript
// In component
import { useSelector } from 'react-redux';
import { selectFriendlyBuffLookup } from '../store/selectors/eventsSelectors';

const MyComponent: React.FC = () => {
  const buffLookup = useSelector(selectFriendlyBuffLookup);

  // buffLookup is BuffLookupData
  return <div>Found {buffLookup.buffIntervals.size} buffs</div>;
};
```

**New Pattern (Worker-based):**

```typescript
// In component
import { useSelectFriendlyBuffLookup } from '../store/selectors/workerBuffSelectors';

const MyComponent: React.FC = () => {
  const { result: buffLookup, isLoading, progress } = useSelectFriendlyBuffLookup();

  if (isLoading) {
    return (
      <div>
        Calculating buffs... {progress?.phase}
        {progress && (
          <div>Progress: {progress.processed}/{progress.total}</div>
        )}
      </div>
    );
  }

  // buffLookup is BuffLookupData (same structure as before)
  return <div>Found {buffLookup.buffIntervals.size} buffs</div>;
};
```

### 2. Update Import Statements

**Before:**

```typescript
import { selectFriendlyBuffLookup } from '../store/selectors/eventsSelectors';
```

**After:**

```typescript
import { useSelectFriendlyBuffLookup } from '../store/selectors/workerBuffSelectors';
```

### 3. Handle Loading States

The new pattern requires handling loading states in your UI:

```typescript
const { result, isLoading, progress } = useSelectFriendlyBuffLookup();

// Always check isLoading first
if (isLoading) {
  return <LoadingSpinner message={`Calculating... ${progress?.phase || ''}`} />;
}

// Now safe to use result
const buffCount = result.buffIntervals.size;
```

### 4. Update Component Structure

**Before:**

```typescript
const MyComponent: React.FC = () => {
  const buffData = useSelector(selectFriendlyBuffLookup);

  // Immediate access to data
  return <BuffDisplay data={buffData} />;
};
```

**After:**

```typescript
const MyComponent: React.FC = () => {
  const { result: buffData, isLoading, progress } = useSelectFriendlyBuffLookup();

  if (isLoading) {
    return <LoadingIndicator progress={progress} />;
  }

  // Same data structure as before
  return <BuffDisplay data={buffData} />;
};
```

## Data Structure Changes

**No changes** - The `BuffLookupData` structure remains identical:

```typescript
interface BuffLookupData {
  buffIntervals: Map<number, BuffTimeInterval[]>;
}

interface BuffTimeInterval {
  start: number;
  end: number;
  targetID: number;
}
```

## Progress Information

The new pattern provides detailed progress updates:

```typescript
interface BuffCalculationProgress {
  processed: number;  // Items processed so far
  total: number;      // Total items to process
  phase: 'sorting' | 'processing' | 'building_lookup' | 'complete';
}

const { result, isLoading, progress } = useSelectFriendlyBuffLookup();

// Use progress for detailed feedback
if (isLoading && progress) {
  const percentage = (progress.processed / progress.total) * 100;
  return (
    <div>
      <div>Phase: {progress.phase}</div>
      <div>Progress: {percentage.toFixed(1)}%</div>
      <ProgressBar value={percentage} />
    </div>
  );
}
```

## Performance Considerations

### Benefits

- ✅ **Non-blocking UI** - Heavy calculations don't freeze the interface
- ✅ **Progress feedback** - Users see real-time calculation progress
- ✅ **Better UX** - Loading states provide clear feedback
- ✅ **Scalable** - Can handle larger datasets without performance issues

### Trade-offs

- ⚠️ **Async nature** - Must handle loading states in UI
- ⚠️ **Memory overhead** - Worker threads use additional memory
- ⚠️ **Complexity** - Slightly more complex component structure

## Example Component Migration

**Complete Before/After Example:**

```typescript
// BEFORE: Traditional selector
import React from 'react';
import { useSelector } from 'react-redux';
import { selectFriendlyBuffLookup } from '../store/selectors/eventsSelectors';

const BuffAnalysis: React.FC = () => {
  const buffLookup = useSelector(selectFriendlyBuffLookup);

  return (
    <div>
      <h3>Buff Analysis</h3>
      <p>Total unique buffs: {buffLookup.buffIntervals.size}</p>
      {Array.from(buffLookup.buffIntervals.entries()).map(([abilityId, intervals]) => (
        <div key={abilityId}>
          Ability {abilityId}: {intervals.length} intervals
        </div>
      ))}
    </div>
  );
};

// AFTER: Worker-based selector with loading states
import React from 'react';
import { CircularProgress, LinearProgress, Typography, Box } from '@mui/material';
import { useSelectFriendlyBuffLookup } from '../store/selectors/workerBuffSelectors';

const BuffAnalysis: React.FC = () => {
  const { result: buffLookup, isLoading, progress } = useSelectFriendlyBuffLookup();

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Analyzing Buffs...</Typography>
        {progress ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              Phase: {progress.phase}
            </Typography>
            <Typography variant="caption">
              {progress.processed} / {progress.total} processed
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(progress.processed / progress.total) * 100}
              sx={{ mt: 1 }}
            />
          </Box>
        ) : (
          <CircularProgress sx={{ mt: 2 }} />
        )}
      </Box>
    );
  }

  return (
    <div>
      <h3>Buff Analysis</h3>
      <p>Total unique buffs: {buffLookup.buffIntervals.size}</p>
      {Array.from(buffLookup.buffIntervals.entries()).map(([abilityId, intervals]) => (
        <div key={abilityId}>
          Ability {abilityId}: {intervals.length} intervals
        </div>
      ))}
    </div>
  );
};
```

## Backward Compatibility

The original `selectFriendlyBuffLookup` selector is still available but marked as deprecated:

```typescript
// Still works but shows deprecation warning
const buffLookup = useSelector(selectFriendlyBuffLookup);
```

**Migration Timeline:**

1. **Phase 1**: New hook available alongside old selector
2. **Phase 2**: Deprecation warnings for old selector usage
3. **Phase 3**: Remove old selector in future version

## Testing Considerations

When testing components with worker selectors:

```typescript
// Mock the worker selector in tests
jest.mock('../store/selectors/workerBuffSelectors', () => ({
  useSelectFriendlyBuffLookup: () => ({
    result: { buffIntervals: new Map() },
    isLoading: false,
    progress: undefined,
  }),
}));

// Or test loading states
jest.mock('../store/selectors/workerBuffSelectors', () => ({
  useSelectFriendlyBuffLookup: () => ({
    result: { buffIntervals: new Map() },
    isLoading: true,
    progress: { processed: 50, total: 100, phase: 'processing' },
  }),
}));
```

## Common Patterns

### Conditional Rendering Based on Data Size

```typescript
const { result, isLoading, progress } = useSelectFriendlyBuffLookup();

if (isLoading) {
  // Show progress for large datasets
  return <ProgressIndicator progress={progress} />;
}

if (result.buffIntervals.size === 0) {
  return <EmptyState message="No buffs found" />;
}

return <BuffVisualization data={result} />;
```

### Error Boundaries

```typescript
// Wrap components using worker selectors with error boundaries
<ErrorBoundary fallback={<ErrorMessage />}>
  <ComponentWithWorkerSelector />
</ErrorBoundary>
```

This migration preserves all existing functionality while adding significant performance and UX improvements for heavy buff calculations.
