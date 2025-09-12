# Hybrid setInterval + useFrame Solution

## Approach

This solution uses a **dual-frequency update system** to eliminate stuttering while maintaining React's declarative nature:

1. **High-frequency position updates** (120-240Hz) via `useFrame` - for smooth movement
2. **Low-frequency React state updates** (16Hz) via `setInterval` - for visual state changes

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ setInterval (60ms) - React State Updates                   │
├─────────────────────────────────────────────────────────────┤
│ • isAlive, isDead, isTaunted                               │
│ • rotation, dynamicSize                                    │
│ • Triggers React re-renders for visual changes            │
│ • ~16fps update rate (smooth enough for visual state)     │
└─────────────────────────────────────────────────────────────┘
                            │
                      Separate from
                            │
┌─────────────────────────────────────────────────────────────┐
│ useFrame (every frame) - Position Updates                  │
├─────────────────────────────────────────────────────────────┤
│ • groupRef.current.position updates                       │
│ • Direct Three.js object manipulation                     │
│ • No React state involvement                               │
│ • 120-240Hz update rate (hardware limited)                │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits

### ✅ Eliminates Position Stuttering

- Position updates happen at hardware frame rate (120-240Hz)
- No React re-renders interrupt position updates
- Direct Three.js object manipulation for maximum performance

### ✅ Maintains React Declarative UI

- Visual state changes (alive/dead, rotation, taunt) still use React state
- JSX conditionally renders based on actor state
- Clean, readable component structure

### ✅ Optimal Update Frequencies

- **Position**: Updated every frame for smooth movement
- **Visual state**: Updated at 16fps (sufficient for state changes)
- **Performance**: No unnecessary high-frequency React re-renders

## Implementation Details

### Position Updates (High Frequency)

```typescript
useFrame(() => {
  // Get current position data
  const actorPosition = getActorPositionAtClosestTimestamp(/*...*/);

  // Update position directly - no React state
  if (actorPosition) {
    currentPosition.set(
      actorPosition.position[0],
      actorPosition.position[1],
      actorPosition.position[2],
    );
    groupRef.current.position.copy(currentPosition);
  }
});
```

### Visual State Updates (Low Frequency)

```typescript
useEffect(
  () => {
    const interval = setInterval(() => {
      const actorPosition = getActorPositionAtClosestTimestamp(/*...*/);

      if (actorPosition) {
        // Update React state for visual changes
        setIsAlive(actorPosition.isAlive);
        setRotation(actorPosition.rotation);
        setIsTaunted(actorPosition.isTaunted);
        // ... etc
      }
    }, 60); // 16fps updates

    return () => clearInterval(interval);
  },
  [
    /* dependencies */
  ],
);
```

### React Rendering

```typescript
// JSX uses React state (updated at 16fps)
return (
  <group ref={groupRef}> {/* Position updated at 120-240Hz */}
    {!isAlive && type === 'player' ? (
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color={color} />
      </mesh>
    ) : (
      <mesh>
        <sphereGeometry args={[size / 2, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    )}
  </group>
);
```

## Performance Characteristics

| Update Type      | Frequency | Method                       | Purpose             |
| ---------------- | --------- | ---------------------------- | ------------------- |
| Position         | 120-240Hz | `useFrame` + direct Three.js | Smooth movement     |
| Visual State     | 16Hz      | `setInterval` + React state  | UI state changes    |
| React Re-renders | 16Hz      | Triggered by `setInterval`   | Visual updates only |

## Comparison with Previous Approaches

### Before (Stuttering)

```typescript
useFrame(() => {
  // Position update
  groupRef.current.position.copy(newPosition);

  // React state updates - CAUSES STUTTERING
  setIsAlive(actorPosition.isAlive); // Re-render!
  setRotation(actorPosition.rotation); // Re-render!
});
```

### After (Smooth)

```typescript
// High-frequency: Position only
useFrame(() => {
  groupRef.current.position.copy(newPosition); // No re-renders
});

// Low-frequency: Visual state only
setInterval(() => {
  setIsAlive(actorPosition.isAlive); // 16fps re-renders
}, 60);
```

## Why This Works

1. **Decoupled Updates**: Position and visual state updates are completely separate
2. **Optimal Frequencies**: Each update type runs at its optimal frequency
3. **No Interference**: High-frequency position updates don't trigger React re-renders
4. **Smooth Visuals**: 16fps is sufficient for visual state changes (alive/dead, rotation)
5. **Performance**: Minimal React overhead while maintaining declarative benefits

## Usage

The component API remains unchanged:

```typescript
<HighFrequencyActorMarker
  actorId={actor.id}
  positionLookup={positionLookup}
  getCurrentTime={getCurrentTime}
  // ... other props
/>
```

## Result

**Completely smooth actor movement** with:

- ✅ No position stuttering
- ✅ Proper visual state updates
- ✅ React declarative benefits
- ✅ High-performance rendering
- ✅ Clean, maintainable code

This hybrid approach provides the best of both worlds: hardware-limited smooth movement with React's declarative UI management.
