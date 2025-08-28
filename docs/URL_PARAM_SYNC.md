# URL Parameter Sync with Redux-First-History

This implementation provides seamless synchronization between URL parameters and Redux state using `redux-first-history` with hash routing support.

## Key Performance Optimizations

### 1. **React 18 Batching**

- Uses `React.startTransition()` to batch state updates
- Prevents multiple re-renders when updating multiple parameters

### 2. **Debounced URL Parsing**

- URL parameter parsing is debounced by 16ms (~1 frame at 60fps)
- Prevents excessive parsing during rapid navigation

### 3. **Change Detection**

- Only dispatches Redux actions when values actually change
- Avoids unnecessary re-renders and Redux store updates

### 4. **Memoization**

- URL parsing results are memoized with `useMemo`
- Update functions are memoized with `useCallback`
- Read-only hook returns memoized objects

### 5. **Automatic Batching**

- Redux store configured with React 18's automatic batching
- Multiple state updates are batched into single re-render

## Usage

### For Components That Need to Update Parameters

```typescript
import { useUrlParamSync } from '../hooks';

function MyComponent() {
  const {
    selectedTargetId,
    selectedPlayerId,
    updateSelectedTargetId,
    updateSelectedPlayerId,
    updateParams
  } = useUrlParamSync();

  // Single parameter update
  const handleTargetChange = (targetId: number) => {
    updateSelectedTargetId(targetId); // Replaces history by default
  };

  // Multiple parameter update (more efficient)
  const handleBulkUpdate = () => {
    updateParams({
      selectedTargetId: 123,
      selectedPlayerId: 456,
      selectedTab: 2
    });
  };

  return (
    <div>
      <p>Target: {selectedTargetId}</p>
      <p>Player: {selectedPlayerId}</p>
    </div>
  );
}
```

### For Read-Only Components (Better Performance)

```typescript
import { useUrlParams } from '../hooks';

function ReadOnlyComponent() {
  // More performant for components that only read values
  const { selectedTargetId, selectedPlayerId } = useUrlParams();

  return (
    <div>
      <p>Current Target: {selectedTargetId}</p>
      <p>Current Player: {selectedPlayerId}</p>
    </div>
  );
}
```

## Supported Parameters

- `selectedTargetId`: number | null
- `selectedPlayerId`: number | null
- `selectedTab`: number | null
- `showExperimentalTabs`: boolean

## URL Format

The implementation uses hash routing with search parameters:

```
https://example.com/#/report/123?selectedTargetId=456&selectedPlayerId=789&selectedTab=2&showExperimentalTabs=true
```

## Performance Tips

### 1. Use Read-Only Hook When Possible

If your component only needs to read parameter values, use `useUrlParams()` instead of `useUrlParamSync()`:

```typescript
// ✅ Good - for read-only components
const params = useUrlParams();

// ❌ Less optimal - for read-only components
const { selectedTargetId, updateSelectedTargetId } = useUrlParamSync();
```

### 2. Batch Multiple Updates

When updating multiple parameters, use `updateParams()` instead of individual updates:

```typescript
// ✅ Good - single URL update, batched Redux updates
updateParams({
  selectedTargetId: 123,
  selectedPlayerId: 456,
});

// ❌ Less optimal - multiple URL updates
updateSelectedTargetId(123);
updateSelectedPlayerId(456);
```

### 3. Use Replace History for UI State

For UI state changes (like tab selection), use replace instead of push to avoid cluttering browser history:

```typescript
// ✅ Good - replaces current history entry
updateSelectedTab(2, true); // true = replace (default)

// ❌ Less optimal - adds new history entry
updateSelectedTab(2, false); // false = push
```

## Implementation Details

### Redux Store Setup

The store is configured with:

- `redux-first-history` router middleware and reducer
- Hash history for compatibility with static hosting
- React 18 automatic batching enabled

### URL Parameter Parsing

- Parameters are parsed from hash fragment search params
- Parsing is memoized and debounced for performance
- Invalid values are ignored (fallback to Redux state)

### State Synchronization

- URL changes update Redux state (with debouncing)
- Redux updates trigger URL changes (with change detection)
- Both directions include performance optimizations

## Troubleshooting

### UI Lag Issues

If you experience UI lag:

1. **Check for unnecessary re-renders**: Use React DevTools Profiler
2. **Use read-only hook**: Replace `useUrlParamSync()` with `useUrlParams()` for read-only components
3. **Batch updates**: Use `updateParams()` for multiple changes
4. **Check dependency arrays**: Ensure useCallback/useMemo dependencies are correct

### URL Not Updating

1. **Check hash routing**: Ensure using `HistoryRouter` from `redux-first-history/rr6`
2. **Verify parameter names**: Check spelling in URL vs hook calls
3. **Check Redux DevTools**: Verify actions are dispatched

### State Not Syncing

1. **Check router reducer**: Ensure router reducer is added to store
2. **Verify middleware**: Ensure router middleware is applied
3. **Check selectors**: Verify selector imports are correct

## Migration Guide

### From React Router's useSearchParams

```typescript
// Before
const [searchParams, setSearchParams] = useSearchParams();
const targetId = searchParams.get('selectedTargetId');
setSearchParams((params) => {
  params.set('selectedTargetId', '123');
  return params;
});

// After
const { selectedTargetId, updateSelectedTargetId } = useUrlParamSync();
updateSelectedTargetId(123);
```

### From Manual Redux Dispatch

```typescript
// Before
const dispatch = useDispatch();
const targetId = useSelector(selectSelectedTargetId);
dispatch(setSelectedTargetId(123));

// After
const { selectedTargetId, updateSelectedTargetId } = useUrlParamSync();
updateSelectedTargetId(123); // Updates both Redux and URL
```
