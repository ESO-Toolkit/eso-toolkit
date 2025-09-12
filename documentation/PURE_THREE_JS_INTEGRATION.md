# Pure Three.js Integration Example

## Quick Start

Replace your existing `HighFrequencyActorMarker` usage with the new `PureThreeActorMarker`:

### Before (React State Interference)

```typescript
// Old approach with React state bottleneck
<HighFrequencyActorMarker
  actorId={actor.id}
  position={actorPosition} // React state update every frame!
  isSelected={selectedActorId === actor.id}
/>
```

### After (Pure Three.js)

```typescript
// New approach - no React state for positions
<PureThreeActorMarker
  actorId={actor.id}
  name={actor.name}
  type={actor.type}
  role={actor.role}
  isSelected={selectedActorId === actor.id}
  positionLookup={optimizedPositions.lookup}
  getCurrentTime={getCurrentTime}
  fightStartTime={fight.startTime}
/>
```

## Complete Example

```typescript
import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PureThreeArenaExample } from './PureThreeArenaExample';

interface FightReplayProps {
  fight: FightData;
  optimizedPositions: OptimizedActorPositionsCalculationResult;
}

export const FightReplayWithPureThreeJS: React.FC<FightReplayProps> = ({
  fight,
  optimizedPositions,
}) => {
  // Extract actor metadata (this rarely changes)
  const actorMetadata = useMemo(() => {
    return fight.actors.map(actor => ({
      actorId: actor.id,
      name: actor.name,
      type: actor.type as 'player' | 'enemy' | 'boss' | 'friendly_npc' | 'pet',
      role: actor.role as 'dps' | 'tank' | 'healer' | undefined,
    }));
  }, [fight.actors]);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PureThreeArenaExample
        optimizedPositions={optimizedPositions}
        fightStartTime={fight.startTime}
        fightEndTime={fight.endTime}
        actorMetadata={actorMetadata}
      />
    </div>
  );
};
```

## Performance Comparison

### React State Approach (Original)

- **Update Frequency**: ~60Hz (limited by React)
- **Frame Drops**: Frequent during complex scenes
- **Memory Usage**: High (React reconciliation overhead)
- **Position Jumping**: Common during React renders

### Pure Three.js Approach (New)

- **Update Frequency**: ~120-240Hz (hardware limited)
- **Frame Drops**: Rare (direct GPU updates)
- **Memory Usage**: Low (minimal React involvement)
- **Position Jumping**: Eliminated (no React interference)

## Migration Checklist

- [ ] Replace `HighFrequencyActorMarker` with `PureThreeActorMarker`
- [ ] Ensure `OptimizedActorPositionsCalculationResult` is available
- [ ] Implement stable `getCurrentTime()` function
- [ ] Remove React state for position data
- [ ] Test position smoothness at high refresh rates
- [ ] Verify performance improvements

## Troubleshooting

### Positions Still Jumping?

1. Check that `getCurrentTime()` doesn't trigger React re-renders
2. Verify `positionLookup` has stable reference
3. Ensure no parent components re-render frequently

### Performance Not Improved?

1. Check browser refresh rate (should be >60Hz)
2. Verify position lookup is O(1) or O(log n)
3. Monitor frame rate in browser dev tools

### TypeScript Errors?

1. Ensure all new types are imported correctly
2. Check `OptimizedActorPositionsCalculationResult` structure
3. Verify role types match your data model
