# Buff Events Chunking and Parallelization Changes

## Overview

Updated the `buffEventsSlice` to implement chunked fetching with 30-second intervals and parallel processing, while retaining pagination functionality for each interval.

## Key Changes

### 1. Updated State Interface (`BuffEventsState`)

Added new fields to track interval fetching progress:

- `intervalProgress`: Tracks total, completed, and failed intervals
- `cacheMetadata.intervalSize`: Tracks the interval size used for caching validation

### 2. New Helper Functions

- `createTimeIntervals()`: Splits fight duration into configurable intervals (default: 30 seconds)
- `fetchEventsForInterval()`: Fetches events for a single interval with pagination support

### 3. Enhanced `fetchBuffEvents` Async Thunk

**Before:**

- Sequential fetching for each hostility type
- Single pagination loop for the entire fight duration
- No progress tracking

**After:**

- Parallel fetching across multiple 30-second intervals
- Retained pagination within each interval
- Support for both friendly and enemy hostility types
- Configurable interval size (default: 30 seconds)
- Better error handling per interval

### 4. New Redux Actions

Added actions for progress tracking:

- `setIntervalProgress`: Initialize progress tracking
- `incrementCompleted`: Update completed interval count
- `incrementFailed`: Update failed interval count

### 5. Enhanced Selectors

Added `selectBuffEventsProgress` to access interval fetching progress.

### 6. Updated Hook

Enhanced `useBuffEvents` hook to expose progress information and support custom interval sizes.

## Usage

### Basic Usage (30-second intervals)

```typescript
const { buffEvents, isBuffEventsLoading, progress } = useBuffEvents();
```

### Custom Interval Size

```typescript
dispatch(
  fetchBuffEvents({
    reportCode,
    fight,
    client,
    intervalSize: 60000, // 60 seconds
  })
);
```

### Progress Tracking

```typescript
const progress = useSelector(selectBuffEventsProgress);
// progress = { total: 10, completed: 7, failed: 0 }
```

## Benefits

1. **Performance**: Parallel fetching significantly reduces total load time
2. **Resilience**: Individual interval failures don't break the entire fetch
3. **Progress**: Real-time progress tracking for better UX
4. **Flexibility**: Configurable interval sizes based on fight duration
5. **Compatibility**: Maintains existing API for components

## Technical Details

- **Interval Size**: Default 30 seconds (30000ms), configurable
- **Parallelization**: Uses `Promise.all()` for concurrent fetching
- **Pagination**: Maintained within each interval using `nextPageTimestamp`
- **Sorting**: Final events are sorted by timestamp for chronological order
- **Caching**: Enhanced cache validation includes interval size
- **Error Handling**: Per-interval error tracking with fallback

## Backwards Compatibility

All existing components continue to work without changes. The API remains the same:

- `fetchBuffEvents()` still takes the same required parameters
- Selectors return the same data types
- Loading states work as before

New features (progress tracking, custom intervals) are opt-in additions.
