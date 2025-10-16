# Dynamic Camera Controls Based on Fight Scale

## Overview
Updated camera controls to dynamically adjust zoom limits and target position based on the actual fight area size, enabling better viewing of content at all scales.

## Implementation Date
October 14, 2025

## Problem Statement

After implementing zone-based marker scaling, camera controls were still hardcoded:
- **Fixed target**: `[50, 0, 50]` (center of hardcoded 100x100 arena)
- **Fixed zoom**: 5-200 units regardless of fight size
- **Issue**: In large zones, users couldn't zoom in close enough to see smaller details
- **Issue**: In small fights, the zoom range was inappropriately large

### Example: Kyne's Aegis Fight 11
- **Fight bounding box**: 4021-6119cm (X), 5704-7424cm (Y)
- **Arena coordinates**: ~40-61m (X), ~57-74m (Y)
- **Fight area**: ~21m x ~17m (relatively small area within a 1180m zone)
- **Problem**: Camera centered at `[50, 0, 50]` was off-center, and couldn't zoom in close enough

## Solution

### Dynamic Camera Settings Based on Fight Bounding Box

Calculate camera target and zoom limits based on actual fight area:

```typescript
const cameraSettings = useMemo(() => {
  const { minX, maxX, minY, maxY } = fight.boundingBox;
  
  // Convert to arena coordinates
  const arenaMinX = minX / 100;
  const arenaMaxX = maxX / 100;
  const arenaMinZ = -(maxY / 100);
  const arenaMaxZ = -(minY / 100);

  // Calculate center of fight area
  const centerX = (arenaMinX + arenaMaxX) / 2;
  const centerZ = (arenaMinZ + arenaMaxZ) / 2;

  // Calculate diagonal size
  const rangeX = arenaMaxX - arenaMinX;
  const rangeZ = arenaMaxZ - arenaMinZ;
  const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);

  // Dynamic zoom limits
  const minDistance = Math.max(5, diagonal * 0.3);
  const maxDistance = Math.min(500, Math.max(50, diagonal * 3));

  return {
    target: [centerX, 0, centerZ],
    minDistance,
    maxDistance,
  };
}, [fight.boundingBox]);
```

### Key Calculations

#### 1. **Camera Target (Look-At Point)**
Centers the camera on the actual fight area:
```typescript
centerX = (minX + maxX) / 2
centerZ = -(minY + maxY) / 2  // Negate for Z-axis conversion
```

#### 2. **Minimum Zoom Distance**
Allows closer zoom for smaller fight areas:
```typescript
diagonal = sqrt(rangeX² + rangeZ²)
minDistance = max(5, diagonal * 0.3)  // 30% of diagonal, minimum 5
```

#### 3. **Maximum Zoom Distance**
Scales with fight size for better overview:
```typescript
maxDistance = min(500, max(50, diagonal * 3))  // 3x diagonal, 50-500 range
```

## Examples

### Small Fight in Large Zone: Kyne's Aegis Fight 11
**Fight Area**:
- Bounding box: 4021-6119cm (X), 5704-7424cm (Y)
- Arena coords: 40.2-61.2m (X), -74.2 to -57.0m (Z)
- Size: 21m x 17m
- Diagonal: ~27m

**Camera Settings**:
```
target: [50.7, 0, -65.6]           // Center of actual fight area
minDistance: max(5, 27 * 0.3) = 8.1m   // Can zoom in closer
maxDistance: min(500, 27 * 3) = 81m    // Reasonable max for small area
```

**Before**: 
- Target `[50, 0, 50]` - 16m away from fight center!
- Min zoom: 5m
- Max zoom: 200m (way too far)

**After**:
- Target `[50.7, 0, -65.6]` - Centered on fight ✅
- Min zoom: 8.1m - Appropriate for 27m diagonal ✅
- Max zoom: 81m - Perfect for overview ✅

### Large Fight: Hel Ra Citadel
**Fight Area**:
- Assume bounding box: 10000-60000cm (X), 5000-55000cm (Y)
- Arena coords: 100-600m (X), -550 to -50m (Z)
- Size: 500m x 500m
- Diagonal: ~707m

**Camera Settings**:
```
target: [350, 0, -300]                    // Center of fight
minDistance: max(5, 707 * 0.3) = 212m     // Can't zoom too close
maxDistance: min(500, 707 * 3) = 500m     // Capped at safe limit
```

### Tiny Fight: Boss Arena
**Fight Area**:
- Bounding box: 3000-3500cm (X), 2000-2400cm (Y)
- Arena coords: 30-35m (X), -24 to -20m (Z)
- Size: 5m x 4m
- Diagonal: ~6.4m

**Camera Settings**:
```
target: [32.5, 0, -22]                    // Center of small arena
minDistance: max(5, 6.4 * 0.3) = 5m       // Minimum safety bound
maxDistance: min(500, max(50, 19.2)) = 50m // Reasonable for tiny area
```

## Implementation Details

### Files Modified

#### `src/features/fight_replay/components/Arena3D.tsx`

**Changes**:

1. **Added useMemo for Camera Settings** (lines 145-188):
```typescript
const cameraSettings = useMemo(() => {
  // Default fallback
  const defaults = {
    target: [50, 0, 50] as [number, number, number],
    minDistance: 5,
    maxDistance: 200,
  };

  if (!fight.boundingBox) {
    return defaults;
  }

  // Calculate from bounding box...
  return {
    target: [centerX, 0, centerZ],
    minDistance,
    maxDistance,
  };
}, [fight.boundingBox]);
```

2. **Updated OrbitControls** (lines 268-280):
```typescript
<OrbitControls
  enablePan={true}
  enableZoom={true}
  enableRotate={true}
  minDistance={cameraSettings.minDistance}    // Dynamic
  maxDistance={cameraSettings.maxDistance}    // Dynamic
  maxPolarAngle={Math.PI / 2 - 0.1}
  minPolarAngle={0.1}
  target={cameraSettings.target}              // Dynamic
  makeDefault
/>
```

3. **Added Debug Logging** (lines 176-179):
```typescript
console.log(
  `Camera settings - Center: [${centerX.toFixed(1)}, 0, ${centerZ.toFixed(1)}], ` +
  `Range: ${maxRange.toFixed(1)}m, Distances: ${minDistance.toFixed(1)}-${maxDistance.toFixed(1)}m`
);
```

### Before vs After

**Before** (Static):
```typescript
<OrbitControls
  minDistance={5}
  maxDistance={200}
  target={[50, 0, 50]}  // Always center of 100x100 space
  makeDefault
/>
```

**After** (Dynamic):
```typescript
const cameraSettings = calculateFromBoundingBox(fight.boundingBox);

<OrbitControls
  minDistance={cameraSettings.minDistance}  // Scales with fight size
  maxDistance={cameraSettings.maxDistance}  // Scales with fight size
  target={cameraSettings.target}            // Centers on actual fight
  makeDefault
/>
```

## Benefits

### 1. **Proper Framing**
- Camera automatically centers on the actual fight area
- No more looking at empty space
- Consistent framing across different fights

### 2. **Appropriate Zoom Range**
- Small fights: Can zoom in closer (min ~8m for 27m diagonal)
- Large fights: Can zoom out further (max scales to 3x diagonal)
- Prevents zooming too close/far for the content

### 3. **Scale-Aware Controls**
- Zoom limits match the visual scale of the content
- Works in harmony with marker scale multipliers
- Consistent user experience across zone sizes

### 4. **Safety Bounds**
- Minimum distance: Never less than 5m (prevents camera clipping)
- Maximum distance: Capped at 500m (prevents WebGL precision issues)
- Graceful fallback if bounding box unavailable

## Coordinate System Details

### Bounding Box Conversion
```typescript
// API provides bounding box in ESO coordinates (cm)
minX: 4021, maxX: 6119, minY: 5704, maxY: 7424

// Convert to arena coordinates (meters)
arenaMinX = minX / 100 = 40.21m
arenaMaxX = maxX / 100 = 61.19m

// Z-axis conversion (Y becomes Z, negated)
arenaMinZ = -(maxY / 100) = -74.24m
arenaMaxZ = -(minY / 100) = -57.04m
```

### Center Calculation
```typescript
centerX = (40.21 + 61.19) / 2 = 50.7m
centerZ = (-74.24 + -57.04) / 2 = -65.64m

target = [50.7, 0, -65.64]
```

### Diagonal Calculation
```typescript
rangeX = 61.19 - 40.21 = 20.98m
rangeZ = -57.04 - (-74.24) = 17.2m
diagonal = sqrt(20.98² + 17.2²) = 27.08m
```

## Console Output Examples

### Kyne's Aegis Fight 11
```
Camera settings - Center: [50.7, 0, -65.6], Range: 21.0m, Distances: 8.1-81.2m
```

### Large Fight
```
Camera settings - Center: [350.0, 0, -300.0], Range: 500.0m, Distances: 212.1-500.0m
```

### Small Boss Arena
```
Camera settings - Center: [32.5, 0, -22.0], Range: 6.4m, Distances: 5.0-50.0m
```

## Edge Cases Handled

### 1. Missing Bounding Box
```typescript
if (!fight.boundingBox) {
  return defaults;  // Fallback to [50, 0, 50] and 5-200
}
```

### 2. Very Small Diagonal
```typescript
minDistance = Math.max(5, diagonal * 0.3);  // Never less than 5
```

### 3. Very Large Diagonal
```typescript
maxDistance = Math.min(500, diagonal * 3);  // Capped at 500
```

### 4. Minimum Max Distance
```typescript
maxDistance = Math.min(500, Math.max(50, diagonal * 3));  // At least 50
```

## Performance Considerations

### Memoization
```typescript
const cameraSettings = useMemo(() => {
  // Expensive calculations...
}, [fight.boundingBox]);
```

Only recalculates when bounding box changes (typically once per fight).

### No Runtime Overhead
- Calculations done once on fight load
- No per-frame computation
- Pure mathematical operations (fast)

## Future Enhancements

### 1. Dynamic Initial Camera Position
Calculate starting camera position based on fight size:
```typescript
const initialDistance = diagonal * 1.5;
const initialPosition = [
  centerX - initialDistance * 0.7,
  initialDistance * 0.6,
  centerZ - initialDistance * 0.7
];
```

### 2. Adaptive FOV
Adjust field of view for different fight sizes:
```typescript
const fov = diagonal > 100 ? 40 : 30;  // Wider FOV for large areas
```

### 3. Zone-Specific Overrides
Allow manual camera tuning per zone:
```typescript
const zoneOverrides = {
  1196: { minDistanceMultiplier: 0.5 },  // Kyne's Aegis: Allow closer zoom
  636: { maxDistanceMultiplier: 1.5 },   // Hel Ra: Allow farther zoom
};
```

### 4. Smart Camera Presets
Pre-calculated optimal views:
```typescript
const presets = {
  overview: { distance: diagonal * 2.5, angle: 45 },
  ground: { distance: diagonal * 0.5, angle: 15 },
  aerial: { distance: diagonal * 1.5, angle: 75 },
};
```

## Testing Validation

### Visual Verification
- ✅ Camera centers on fight area correctly
- ✅ Zoom limits feel natural for fight size
- ✅ Can zoom close enough to see details
- ✅ Can zoom far enough for overview
- ✅ No clipping or precision issues

### Mathematical Verification
| Fight Size | Diagonal | Min Zoom | Max Zoom | Target |
|------------|----------|----------|----------|--------|
| 21m x 17m | 27m | 8.1m | 81m | Center of fight |
| 500m x 500m | 707m | 212m | 500m (capped) | Center of fight |
| 5m x 4m | 6.4m | 5m (capped) | 50m (min) | Center of fight |

### Compilation
- ✅ TypeScript compilation passes
- ✅ No type errors
- ✅ Proper memoization dependencies

## Related Changes

This enhancement works in conjunction with:
1. **Marker Scale Multiplier** - Visual marker size scales with zone
2. **Zone Scale Factor** - Provides zone size information
3. **Coordinate System** - Consistent coordinate transformation

Together, these create a fully scale-aware 3D viewing experience.

## Conclusion

Dynamic camera controls complete the scale-aware visualization system:

1. ✅ **Markers scale** based on zone size (3.54x for Kyne's Aegis)
2. ✅ **Camera centers** on actual fight area (not arbitrary origin)
3. ✅ **Zoom limits** match content scale (closer for details, farther for overview)
4. ✅ **Consistent UX** across all fight sizes and zones

Users can now effectively view and navigate fights of any scale, with appropriate zoom ranges and automatic framing.

## Related Documentation
- `MOR_MARKERS_SCALE_MULTIPLIER_FIX.md` - Marker visual scaling
- `MOR_MARKERS_SCALE_FACTOR_IMPLEMENTATION.md` - Initial scale factor work
- `zoneScaleData.ts` - Zone boundary definitions
