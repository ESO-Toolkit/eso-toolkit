# Loading Panel Fix - Prevent Unnecessary Unmounting

## Problem
After clicking "Load Markers" in the Map Markers modal, the loading panel was showing and unmounting the entire FightReplay component, causing the 3D view to disappear temporarily.

## Root Cause
The loading state logic was too aggressive - it was checking if ANY data fetching was in progress (`isActorPositionsLoading`, `isFriendlyBuffEventsLoading`, etc.) and showing the loading panel whenever any of these were `true`.

**What was actually triggering the reload:**

The issue was that the loading check was **too sensitive to transient loading states**. Even though data was already loaded, the loading panel would show if any of these conditions were true:

1. **React re-render batching**: When closing the modal and updating marker state, React batches multiple state updates, which can cause loading selectors to temporarily return `true` during the render cycle
2. **Redux loading state checks**: The code was checking `isActorPositionsLoading` without checking if `lookup` (the actual data) already existed
3. **Component unmounting on any loading state**: The early return pattern meant that ANY loading state would unmount the entire component tree, destroying the 3D scene

The key insight: **Just because loading states are `true` doesn't mean the data isn't already available**. Background refetches or state reconciliation can set loading flags without the data actually being missing.

This was problematic because:
1. The data was already loaded and available
2. We were just updating marker state, not refetching fight data
3. Unmounting the component destroyed the 3D scene and all loaded resources
4. It created a jarring user experience

## Solution
Changed the loading logic to only show the loading panel when we're **actually missing data**, not just when data is being refreshed.

### Before (Aggressive Loading State):
```tsx
const isLoading =
  isActorPositionsLoading ||
  isFriendlyBuffEventsLoading ||
  isHostileBuffEventsLoading ||
  isFightLoading;

if (isLoading) {
  // Show loading panel - unmounts everything
  return <LoadingPanel />;
}
```

### After (Smart Loading State):
```tsx
// Only show loading if we don't have the necessary data yet
// Don't show loading if we're just updating markers
const isInitialLoading =
  (isActorPositionsLoading && !lookup) ||
  (isFriendlyBuffEventsLoading && friendlyBuffEvents.length === 0) ||
  (isHostileBuffEventsLoading && hostileBuffEvents.length === 0) ||
  (isFightLoading && !fight);

if (isInitialLoading) {
  // Show loading panel - only when data is truly missing
  return <LoadingPanel />;
}
```

## Key Changes

### 1. Check for Data Availability
- `isActorPositionsLoading && !lookup` - Only load if we don't have position data yet
- `isFriendlyBuffEventsLoading && friendlyBuffEvents.length === 0` - Only load if we don't have buff events yet
- `isHostileBuffEventsLoading && hostileBuffEvents.length === 0` - Only load if we don't have hostile buff events yet
- `isFightLoading && !fight` - Only load if we don't have fight data yet

### 2. Renamed Variable for Clarity
- `isLoading` → `isInitialLoading` - Makes it clear this is for initial data loading only

### 3. Preserve Component State
- Component stays mounted when data is already available
- 3D scene persists across state updates
- Marker updates don't trigger full component remount

## Benefits

1. **No Unnecessary Unmounting**: Component stays mounted when updating markers
2. **Better Performance**: 3D scene and resources aren't destroyed and recreated
3. **Smoother UX**: No flash of loading panel when just updating state
4. **Data Refresh Support**: Still allows background data refreshes without blocking UI
5. **Correct Loading States**: Loading panel only shows when truly needed (first load, navigation, etc.)

## Testing
- ✅ TypeScript compilation passes
- ✅ Loading panel shows on initial page load (when data is missing)
- ✅ Loading panel does NOT show when clicking "Load Markers" (data already present)
- ✅ Component stays mounted when updating marker state
- ✅ 3D scene persists across marker updates

## Related Files
- `src/features/fight_replay/FightReplay.tsx` - Main component with loading logic fix

## Date
October 15, 2025
