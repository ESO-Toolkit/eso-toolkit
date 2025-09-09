# Panel Flickering Fixes - Implementation Summary

## Issues Identified

During the analysis of the codebase, I found several issues that could cause panel flickering on page load:

### 1. **Duplicate Loading Checks**

- **Issue**: Some components (like `HealingDonePanel.tsx`) had duplicate `if (isLoading)` conditions
- **Fix**: Removed duplicate checks and ensured proper conditional flow

### 2. **Inconsistent Loading State Coordination**

- **Issue**: Different panels used different combinations of loading state checks
- **Fix**: Created centralized loading coordination with `useLoadingCoordination` hook

### 3. **Race Conditions Between Data Sources**

- **Issue**: Multiple data fetching operations could complete at different times causing flickering
- **Fix**: Implemented stable loading states with debouncing via `useStableLoading` hook

### 4. **Layout Shifts During Loading**

- **Issue**: Loading components had inconsistent dimensions causing layout shifts
- **Fix**: Created `SmoothPanelTransition` and `ConsistentLoading` components with stable dimensions

### 5. **Missing Loading State Dependencies**

- **Issue**: Some panels didn't account for all their data dependencies
- **Fix**: Enhanced loading state calculations to include all required dependencies

## New Components Created

### 1. `useLoadingCoordination` Hook

**Location**: `src/hooks/useLoadingCoordination.ts`

Centralizes all loading state management across the application:

- **Core data loading**: Master data, player data, report data
- **Events data loading**: All event types (damage, healing, buffs, etc.)
- **Worker tasks loading**: Background computation tasks
- **Data readiness flags**: Panel-specific readiness indicators

### 2. `useStableLoading` Hook

**Location**: `src/hooks/useStableLoading.ts`

Prevents rapid loading state changes that cause flickering:

- **Debounced transitions**: Delays loading→loaded transitions by 150ms
- **Immediate loading**: Shows loading state immediately when starting
- **Stable states**: Indicates when data is truly stable

### 3. `ConsistentLoading` Component

**Location**: `src/components/ConsistentLoading.tsx`

Provides consistent loading UI with stable dimensions:

- **Multiple variants**: Panel, table, chart, card skeletons
- **Stable dimensions**: Prevents layout shifts
- **Smooth transitions**: Opacity-based transitions

### 4. `SmoothPanelTransition` Component

**Location**: `src/components/SmoothPanelTransition.tsx`

Wrapper for smooth loading→content transitions:

- **Maintains dimensions**: Consistent width/height during transitions
- **Opacity transitions**: Smooth visual transitions
- **Flexible loading states**: Supports various loading UI variants

### 5. Loading State Debug Utility

**Location**: `src/utils/debugLoadingStates.js`

Console utility for diagnosing loading state issues:

- **State analysis**: Comprehensive loading state inspection
- **Issue detection**: Identifies stuck loading states and race conditions
- **Quick fixes**: Provides reset functions for common issues

## Updated Components

### 1. `InsightsPanel.tsx`

- **Before**: Manual loading state combination
- **After**: Uses `useLoadingCoordination` for stable loading state

### 2. `DamageDonePanel.tsx`

- **Before**: Individual loading state checks
- **After**: Centralized loading coordination with `isDamageDataReady`

### 3. `PlayersPanel.tsx`

- **Before**: Long manual loading state combination
- **After**: Simplified with `isPlayersDataReady` from coordination hook

### 4. `StatusEffectUptimesPanel.tsx`

- **Before**: Complex manual loading state logic
- **After**: Enhanced with `useStableLoading` for smooth transitions

### 5. `HealingDonePanel.tsx`

- **Before**: Duplicate loading checks
- **After**: Fixed conditional flow with proper no-data handling

### 6. `FightDetailsView.tsx`

- **Before**: Basic loading fallback
- **After**: Consistent dimensions for loading states

## Key Improvements

### 1. **Eliminated Race Conditions**

- Centralized loading coordination prevents inconsistent states
- Stable loading hook debounces rapid state changes
- All dependencies tracked consistently

### 2. **Prevented Layout Shifts**

- Consistent dimensions maintained during loading→content transitions
- Loading skeletons match expected content dimensions
- Smooth opacity transitions replace jarring content swaps

### 3. **Improved Loading State Logic**

- Single source of truth for loading states
- Panel-specific readiness indicators
- Comprehensive dependency tracking

### 4. **Enhanced Developer Experience**

- Debug utility for diagnosing loading issues
- Centralized loading patterns reduce code duplication
- Clear separation of concerns

## Usage Guidelines

### For Panel Components

```tsx
import { useLoadingCoordination } from '../../../hooks/useLoadingCoordination';
import { SmoothPanelTransition } from '../../../components/SmoothPanelTransition';

export const MyPanel: React.FC = () => {
  const { isDamageDataReady } = useLoadingCoordination();

  return (
    <SmoothPanelTransition isLoading={!isDamageDataReady} loadingVariant="table" height={400}>
      {/* Panel content */}
    </SmoothPanelTransition>
  );
};
```

### For Complex Loading States

```tsx
import { useStableLoading } from '../../../hooks/useStableLoading';

export const ComplexPanel: React.FC = () => {
  const isDataLoading = /* complex loading logic */;
  const hasData = /* data availability check */;

  const { isLoading: stableLoading } = useStableLoading(isDataLoading, hasData);

  if (stableLoading) {
    return <ConsistentLoading variant="panel" />;
  }

  return /* content */;
};
```

## Testing

To test the fixes:

1. **Load any report page** and observe panel loading behavior
2. **Switch between tabs** rapidly to test transition smoothness
3. **Use browser dev tools** to simulate slow network and observe loading states
4. **Run debug script** in console: Copy content from `debugLoadingStates.js`
5. **Check for layout shifts** using Chrome DevTools' Layout Shift analysis

## Future Considerations

1. **Performance Monitoring**: Consider adding loading time metrics
2. **Error Boundaries**: Enhance error handling for failed loading states
3. **Progressive Loading**: Implement partial data display for large datasets
4. **Accessibility**: Ensure loading states are properly announced to screen readers

The implemented solution provides a robust foundation for preventing panel flickering while maintaining good performance and user experience.
