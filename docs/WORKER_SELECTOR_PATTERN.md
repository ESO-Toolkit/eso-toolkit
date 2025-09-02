# Worker-Based Redux Selector Pattern

This pattern enables performing heavy computational tasks in web workers while maintaining Redux selector semantics with proper memoization and progress reporting.

## Overview

The worker-based selector pattern consists of:

1. **Worker Implementation** - The heavy computation logic
2. **Hook Integration** - React hook that manages worker communication and caching
3. **Redux Selector** - Function that integrates with Redux state and provides memoization
4. **Progress Reporting** - Optional progress updates during computation

## Key Benefits

- ✅ **Non-blocking UI** - Heavy computations run on worker threads
- ✅ **Proper memoization** - Results are cached based on input changes
- ✅ **Progress reporting** - Real-time updates on computation progress
- ✅ **Redux integration** - Works seamlessly with existing Redux selectors
- ✅ **Type safety** - Full TypeScript support with proper typing

## Implementation

### 1. Create Worker Implementation

```typescript
// src/workers/myCalculationWorker.ts
import { BaseWorker } from './BaseWorker';

interface MyCalculationTask {
  data: SomeDataType[];
  options?: CalculationOptions;
}

interface MyCalculationProgress {
  processed: number;
  total: number;
  phase: string;
}

class MyCalculationWorker extends BaseWorker {
  constructor() {
    super();
    this.registerTask('myCalculation', this.performCalculation.bind(this));
  }

  private async performCalculation(
    task: MyCalculationTask,
    onProgress?: (progress: MyCalculationProgress) => void
  ): Promise<CalculationResult> {
    const { data, options } = task;

    // Report initial progress
    onProgress?.({ processed: 0, total: data.length, phase: 'starting' });

    // Perform heavy computation
    const result = {
      /* ... */
    };

    for (let i = 0; i < data.length; i++) {
      // Do computation work

      // Report progress periodically
      if (i % 100 === 0) {
        onProgress?.({
          processed: i,
          total: data.length,
          phase: 'processing',
        });
      }
    }

    onProgress?.({ processed: data.length, total: data.length, phase: 'complete' });

    return result;
  }
}

const myCalculationWorker = new MyCalculationWorker();
export { myCalculationWorker };
export type { MyCalculationTask, MyCalculationProgress };
```

### 2. Create Worker-Based Selector Hook

```typescript
// src/selectors/myWorkerSelectors.ts
import { useSelector } from 'react-redux';
import { useWorkerSelector } from '../hooks/useWorkerSelector';
import { RootState } from '../store/storeWithHistory';

export function useMyWorkerCalculation(): {
  result: CalculationResult;
  isLoading: boolean;
  progress?: MyCalculationProgress;
} {
  // Get Redux state
  const sourceData = useSelector((state: RootState) => state.myData.items);
  const options = useSelector((state: RootState) => state.myData.options);
  const isDataLoading = useSelector((state: RootState) => state.myData.loading);

  return useWorkerSelector<CalculationResult, MyCalculationProgress>({
    inputSelector: () => [sourceData, options, isDataLoading],
    taskName: 'myCalculation',
    taskData: {
      data: sourceData || [],
      options,
    },
    defaultValue: {
      /* default result */
    },
    poolName: 'myCalculation',
    workerFactory: () => {
      return new Worker(new URL('../workers/myCalculationWorker.ts', import.meta.url), {
        type: 'module',
      });
    },
    onProgress: (progress) => {
      console.log('Calculation progress:', progress);
      // Optionally dispatch progress to Redux store
    },
  });
}
```

### 3. Use in Components

```typescript
// src/components/MyCalculationComponent.tsx
import React from 'react';
import { useMyWorkerCalculation } from '../selectors/myWorkerSelectors';

export const MyCalculationComponent: React.FC = () => {
  const { result, isLoading, progress } = useMyWorkerCalculation();

  if (isLoading) {
    return (
      <div>
        <p>Calculating... {progress?.phase}</p>
        {progress && (
          <progress value={progress.processed} max={progress.total} />
        )}
      </div>
    );
  }

  return (
    <div>
      <h3>Calculation Complete</h3>
      <p>Result: {JSON.stringify(result, null, 2)}</p>
    </div>
  );
};
```

## Pattern Requirements

### For Selectors

1. **Memoization**: Results must be cached when inputs haven't changed
2. **Consistency**: Multiple calls with same inputs return same reference
3. **Worker execution**: Heavy computation runs on worker thread
4. **Progress support**: Optional progress reporting during computation

### For Redux Integration

1. **State dependency**: Selector should depend on relevant Redux state
2. **Loading states**: Handle loading states from data fetching
3. **Error handling**: Graceful handling of worker errors
4. **Cleanup**: Proper cleanup when components unmount

## Advanced Usage

### Progress Integration with Redux

Dispatch progress updates to Redux store:

```typescript
onProgress: (progress) => {
  dispatch(updateCalculationProgress(progress));
};
```

### Multiple Worker Pools

Create different pools for different types of calculations:

```typescript
// Heavy math calculations
const mathPool = workerManager.createPool('math', mathWorkerFactory, {
  maxWorkers: 4,
  taskTimeout: 30000,
});

// Data processing
const dataPool = workerManager.createPool('dataProcessing', dataWorkerFactory, {
  maxWorkers: 2,
  taskTimeout: 60000,
});
```

## Example: Buff Lookup Calculation

See `src/selectors/workerSelectors.ts` for a complete implementation of the pattern used for ESO buff lookup calculations:

- **Worker**: `buffCalculationWorker.ts` - Processes buff events into lookup structure
- **Selector**: `useWorkerFriendlyBuffLookup()` - Redux-connected hook
- **Component**: `WorkerBuffLookupExample.tsx` - Usage example

## Best Practices

1. **Worker Pool Management**: Initialize pools early in app lifecycle
2. **Error Boundaries**: Wrap components using worker selectors
3. **Loading States**: Always handle loading states in UI
4. **Progress Reporting**: Use for operations > 1 second
5. **Memory Management**: Clean up worker pools on app unload
6. **Testing**: Mock worker responses in tests

## Performance Considerations

- Workers have startup overhead - use pools for frequent calculations
- Serialize/deserialize costs for large data - consider chunking
- Progress reporting frequency - balance updates vs. performance
- Memory usage - workers maintain separate memory spaces
