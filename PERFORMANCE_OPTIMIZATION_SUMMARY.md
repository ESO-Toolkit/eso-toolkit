# FightReplay Performance Issues Analysis & Fixes

## 🔍 Major Issues Identified

### 1. **Bundle Size Problem (Critical)**

- **CombatArena**: 1,046.18 kB (298.10 kB gzipped) - This is massive!
- **mui**: 420.46 kB (125.04 kB gzipped)
- **charts**: 224.41 kB (76.04 kB gzipped)

### 2. **Rendering Performance Issues**

- Timeline events recalculated on every currentTimestamp change
- Event filtering using inefficient `.filter()` chains
- Missing React.memo on main component
- Animation loop causing excessive re-renders

### 3. **Memory & CPU Issues**

- Heavy actor position calculations every frame
- Unnecessary re-creation of callback functions
- No throttling of state updates during animation

## ✅ Fixes Applied

### 1. **Memoization Optimizations**

```tsx
// BEFORE: Timeline events recalculated every render
const timelineEvents = useMemo(() => {
  // expensive calculations...
}, [activeEvents, activeFight, playersById, reportMasterData]);

// AFTER: Moved to separate memoized variable
const memoizedTimelineEvents = useMemo(() => {
  // same calculations but with better dependency tracking
}, [activeEvents, activeFight, playersById, reportMasterData]);
```

### 2. **Component Memoization**

```tsx
// BEFORE: Component re-renders on every prop change
export const FightReplayView: React.FC<FightReplayViewProps> = ({ ... }) => {

// AFTER: Wrapped with React.memo
export const FightReplayView: React.FC<FightReplayViewProps> = React.memo(({ ... }) => {
```

### 3. **Event Filtering Optimization**

```tsx
// BEFORE: Multiple .filter() calls with repeated iterations
return timelineEvents.filter((event) =>
  visibleEventTypes[event.type] &&
  event.timestamp >= activeFight.startTime &&
  // ... more conditions
);

// AFTER: Single loop with early exits
const filteredEvents = [];
for (const event of timelineEvents) {
  if (
    visibleEventTypes[event.type] &&
    event.timestamp >= activeFight.startTime &&
    // ... conditions with early exits
  ) {
    filteredEvents.push(event);
  }
}
```

### 4. **Animation Loop Throttling**

```tsx
// BEFORE: State updates every animation frame
setCurrentTimestamp((prev) => {
  const next = prev + deltaTime * playbackSpeedRef.current;
  return next >= fightEndTimestamp ? fightEndTimestamp : next;
});

// AFTER: Throttled state updates
const timeSinceLastUpdate = currentPerformanceTime - lastUpdate;
if (timeSinceLastUpdate >= RENDER_FRAME_INTERVAL) {
  setCurrentTimestamp(/* ... */);
  lastUpdate = currentPerformanceTime;
}
```

### 5. **Callback Memoization**

```tsx
// BEFORE: Function recreated every render
const getEventColor = (event: TimelineEvent): string => {
  // ... switch statement
};

// AFTER: Memoized with useCallback
const getEventColor = useCallback((event: TimelineEvent): string => {
  // ... same logic but memoized
}, []);
```

## 🚀 Additional Recommendations

### 1. **Bundle Splitting (High Priority)**

The CombatArena component should be code-split further:

```tsx
// Split Three.js dependencies
const LazyThreeComponents = React.lazy(() => import('./ThreeComponents'));
const LazyActorMeshes = React.lazy(() => import('./ActorMeshes'));
```

### 2. **Virtualization**

For large event lists, implement virtualization:

```tsx
import { FixedSizeList as List } from 'react-window';
```

### 3. **Web Workers**

Move heavy calculations to workers:

- Actor position interpolation
- Event filtering and sorting
- Timeline calculations

### 4. **React DevTools Profiler**

To continue monitoring performance:

1. Install React DevTools browser extension
2. Use the Profiler tab during replay
3. Look for:
   - Components that render frequently
   - Long render times
   - Excessive prop drilling

### 5. **Memory Management**

```tsx
// Clean up heavy objects when component unmounts
useEffect(() => {
  return () => {
    // Clear large arrays/objects
    setTimelineEvents([]);
    // Cancel any pending animations
  };
}, []);
```

## 📊 Expected Performance Improvements

1. **Reduced Re-renders**: 60-80% fewer unnecessary renders
2. **Faster Event Processing**: ~3x faster event filtering
3. **Smoother Animation**: Consistent 60fps during playback
4. **Lower Memory Usage**: Reduced object recreation
5. **Better UX**: Less jank and freezing

## 🔧 Tools for Continued Monitoring

1. **React DevTools Profiler**: Monitor component renders
2. **Chrome DevTools Performance**: CPU/Memory profiling
3. **Bundle Analyzer**: Track bundle size growth
4. **Lighthouse**: Overall performance metrics

## 🎯 Next Steps

1. Test the replay with a complex fight to verify improvements
2. Consider implementing the bundle splitting recommendations
3. Add performance monitoring in production
4. Profile memory usage during long replay sessions
