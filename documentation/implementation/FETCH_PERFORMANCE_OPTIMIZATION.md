# Report Summary Fetch Performance Optimizations

## Overview
The `useReportSummaryData` hook has been optimized to dramatically improve fetch performance by replacing sequential fight-by-fight fetching with intelligent parallel/single-query strategies.

## Performance Improvements

### Before Optimization (Sequential Fetching)
```typescript
// OLD APPROACH: Sequential processing
for (const fight of fights) {
  await fetchDamageEvents(fight);    // 1 API call per fight
  await fetchDeathEvents(fight);     // 1 API call per fight  
  await fetchHealingEvents(fight);   // 1 API call per fight
}
// Total: N fights × 3 event types = 3N API calls
```

### After Optimization (Parallel/Single Query)
```typescript
// NEW APPROACH: Report-level fetching
if (shouldUseSingleQuery) {
  // Single query for ALL events
  reportEvents = await fetcher.fetchAllEventsOptimized(reportCode, fights);
  // Total: 1 API call
} else {
  // Parallel queries for all event types
  reportEvents = await fetcher.fetchReportEventsParallel(reportCode, startTime, endTime);
  // Total: 3 API calls (in parallel)
}

// Client-side filtering by fight (fast)
const fightEventsMap = fetcher.filterEventsByFights(reportEvents, fights);
```

## Strategy Selection Logic

### Intelligent Strategy Selection
- **Single Query Strategy**: Used for large reports (>8 fights) or long duration (>1 hour)
  - Fetches ALL events in one GraphQL query using `dataType: "All"`
  - Best for reports with many fights or extensive event data
  
- **Parallel Strategy**: Used for smaller reports (≤8 fights)
  - Fetches 3 event types in parallel queries
  - Optimal for smaller reports where parallel processing provides best balance

### Performance Metrics

| Report Size | Old Approach | New Approach | Performance Gain |
|-------------|--------------|--------------|------------------|
| 5 fights    | 15 API calls | 3 API calls  | 80% fewer calls  |
| 10 fights   | 30 API calls | 1 API call   | 97% fewer calls  |
| 20 fights   | 60 API calls | 1 API call   | 98% fewer calls  |

## Additional Optimizations

### 1. **Client-Side Event Filtering**
- Events are filtered by fight timestamp ranges on the client
- Eliminates need for fight-specific server queries
- Much faster than server-side filtering with multiple requests

### 2. **Event Caching**
- Report events are cached in component state
- Avoids re-fetching if same report is processed multiple times
- Improves performance for navigation back/forth

### 3. **Progress Tracking**
- Reduced progress steps from `3N + 2` to just `5` steps
- More accurate progress indicators
- Better user experience with clear status updates

### 4. **Memory Efficiency**
- Loads all event data once at report level
- Processes locally instead of multiple server roundtrips
- Better browser caching and reduced network overhead

## Technical Implementation

### Key Components Used:
- **OptimizedReportEventsFetcher**: Service providing multiple optimization strategies
- **Client-side filtering**: Fast local processing of events by fight
- **Intelligent strategy selection**: Adapts approach based on report characteristics
- **Performance logging**: Tracks and reports optimization gains

### Error Handling:
- Graceful fallback to parallel strategy if single query fails
- Detailed error reporting and recovery
- Maintains data consistency across optimization strategies

## Impact

### User Experience:
- **Faster Loading**: 80-98% reduction in API calls
- **Better Responsiveness**: Parallel processing reduces wait times
- **Smoother Navigation**: Cached events for repeated access

### Server Performance:
- **Reduced Load**: Dramatically fewer API requests
- **Better Scaling**: Single/parallel queries more efficient than many small requests
- **Network Efficiency**: Bulk data transfer vs. many small transfers

### Developer Experience:
- **Cleaner Code**: Centralized fetching logic vs. scattered fight loops
- **Better Debugging**: Clear performance logging and metrics
- **Maintainable**: Strategy pattern allows easy optimization adjustments

## Usage

The hook automatically selects the optimal strategy based on report characteristics. No changes needed in consuming components:

```typescript
const { summaryData, isLoading, error, progress } = useReportSummaryData(reportCode);
```

Performance gains are automatically applied and logged to console for monitoring and debugging.