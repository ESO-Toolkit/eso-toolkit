# High-Frequency 3D Position Rendering

## Problem

The existing 3D position rendering system was limited by React's rendering cycle (typically 60fps or lower), causing stuttery animation even though:

- The position calculation system supports 240Hz sampling (`SAMPLE_INTERVAL_MS = 4.7`)
- The position lookup system provides O(1) access to actor positions
- Modern displays and browsers can render at 120fps+ for smooth motion

## Root Cause

Actor positions were driven by React state through `useActorPositionsAtTime` hook, which:

1. Returns positions via `useMemo` that triggers on `currentTime` changes
2. Relies on React's render cycle for updates
3. Creates a bottleneck where 3D rendering waits for React state updates

## Solution: High-Frequency Position Updates

The new system bypasses React state for position updates while maintaining React state for UI synchronization.

### Key Components

#### 1. `HighFrequencyActorMarker`

- Uses `useFrame` to update 3D positions directly at render loop frame rate
- Calls `getActorPositionAtClosestTimestamp()` for O(1) position lookup
- Updates Three.js object positions directly, bypassing React state
- Still uses React state for infrequent updates (colors, visibility, etc.)

#### 2. `HighFrequencyActorManager`

- Efficiently manages multiple actors
- Uses `getAllActorPositionsAtTimestamp()` for bulk position lookups
- Handles visibility culling and actor lifecycle

#### 3. `useHighFrequencyTiming`

- Provides frame-rate timing that updates every render frame
- Syncs with React state periodically for UI components
- Maintains separate high-frequency and React state timestamps

### Performance Characteristics

| Aspect              | Before                      | After                  |
| ------------------- | --------------------------- | ---------------------- |
| Position Updates    | ~60fps (React limited)      | ~120fps+ (render loop) |
| Position Lookup     | O(1) (wasted by React)      | O(1) (fully utilized)  |
| React State Updates | Every position change       | Periodic sync (60fps)  |
| Memory Allocation   | High (React reconciliation) | Low (direct updates)   |

### Usage

#### Basic Integration

```tsx
import { HighFrequencyActorManager } from './HighFrequencyActorManager';
import { useHighFrequencyTiming } from '../../../hooks/useHighFrequencyTiming';

function FightReplay() {
  // Get optimized position lookup (O(1) access)
  const { timeline } = useActorPositionsTask();
  const positionLookup = timeline?.lookup; // New optimized lookup structure

  // High-frequency timing
  const { getCurrentTimestamp } = useHighFrequencyTiming({
    isPlaying,
    playbackSpeed,
    baseTimestamp: currentTimestamp,
    fightEndTimestamp: fightEndTime,
    onTimestampUpdate: setCurrentTimestamp, // Sync back to React
  });

  return (
    <Canvas>
      <HighFrequencyActorManager
        positionLookup={positionLookup}
        getCurrentTime={() => getCurrentTimestamp() - fightStartTime}
        fightStartTime={fightStartTime}
        hiddenActorIds={hiddenActorIds}
        selectedActorId={selectedActorId}
      />
    </Canvas>
  );
}
```

#### Migration Strategy

1. **Phase 1**: Run both systems in parallel
   - Keep existing `ActorMarker` for compatibility
   - Add `HighFrequencyActorMarker` as opt-in
   - Compare performance and accuracy

2. **Phase 2**: Feature flag toggle
   - Add user preference for high-frequency rendering
   - Allow switching between modes for comparison

3. **Phase 3**: Full migration
   - Replace `ActorMarker` with `HighFrequencyActorMarker`
   - Remove old React state-driven position system

### Technical Details

#### Position Update Flow

**Before (React-limited):**

```
currentTimestamp (React State)
  → useActorPositionsAtTime
  → useMemo recalculates
  → React re-renders
  → ActorMarker receives new props
  → 3D position updates
```

**After (High-frequency):**

```
useFrame (every render frame)
  → getCurrentTimestamp()
  → getActorPositionAtClosestTimestamp()
  → Direct Three.js position update
  → No React re-render needed
```

#### Memory Optimization

- Reuses Vector3 objects to prevent garbage collection
- Throttles non-critical updates (sizes, colors) to 60fps
- Uses object pooling for frequently updated data

#### Fallback Compatibility

The system gracefully falls back to React state when:

- `positionLookup` is not available
- WebGL context is lost
- Performance issues are detected

### Configuration Options

```tsx
// High-frequency timing options
const timingOptions = {
  isPlaying: boolean,
  playbackSpeed: number,
  baseTimestamp: number,        // React state timestamp
  fightEndTimestamp: number,
  onTimestampUpdate?: (t: number) => void, // Sync back to React
};

// Actor rendering options
const renderOptions = {
  hiddenActorIds: Set<number>,
  selectedActorId?: number,
  showActorNames?: boolean,
  // ... other display options
};
```

### Performance Monitoring

Enable debug mode with `?debug=performance` to see:

- Frame rate comparisons
- Position lookup timing
- Memory allocation patterns
- Render loop performance

### Benefits

1. **Smooth Animation**: 120fps+ rendering for fluid motion
2. **Better Utilization**: Fully leverages O(1) position lookup optimization
3. **Reduced React Overhead**: Fewer state updates and re-renders
4. **Scalability**: Handles more actors without performance degradation
5. **Backward Compatibility**: Can run alongside existing system

### Future Enhancements

1. **Interpolation**: Frame-level position interpolation for even smoother motion
2. **Prediction**: Predictive rendering for reduced latency
3. **LOD**: Level-of-detail based on actor importance and screen size
4. **WebWorkers**: Move position calculations to background threads

This approach maintains the excellent O(1) position lookup optimization while removing the React rendering bottleneck, resulting in significantly smoother 3D animations.
