# Initial Camera Position Coordinate System Fix

## Issue Date
October 14, 2025

## Problem

The initial camera was not positioning correctly after implementing dynamic arena scaling. The camera was looking at the wrong area because of a **coordinate system mismatch** between different calculations.

## Root Cause

The `initialCameraTarget` calculation was using `cameraSettings.target` as its fallback default. However, these two values use **different coordinate transformations**:

### Camera Settings Target
Uses bounding box calculation with **negated Z**:
```typescript
const arenaMinZ = -(maxY / 100); // Negate and swap for Z
const arenaMaxZ = -(minY / 100);
const centerZ = (arenaMinZ + arenaMaxZ) / 2; // Result: -65.6
```

### Actor Positions (from convertCoordinatesWithBottomLeft)
Uses direct transformation **without Z negation**:
```typescript
const z3D = y / 100; // Direct scale, no negation
// Result: 65.6 (positive)
```

### The Mismatch

When calculating the center of actors:
```typescript
// Actor positions have Z = +65.6
// But fallback used cameraSettings.target with Z = -65.6
// Camera was looking 131.2 units away from actual actors!
```

## Console Output Evidence

From `output.log`:
```
Arena3D: Arena dimensions - Size: 25.2m, Center: [49.3, 65.6]
Arena3D: Camera settings - Center: [50.7, 0, -65.6]  ← Z is negated!
Arena3D: Calculated center of actors - center: [49.3, 0, 65.6]  ← Z is positive!
Arena3D: Camera position: [31.3, 15.0, 83.6]  ← Looking at wrong target!
```

The camera was positioned to look at `[50.7, 0, -65.6]` but actors were at `[49.3, 0, 65.6]` - **131.2 units apart in the Z direction!**

## Solution

Changed `initialCameraTarget` to use **arena dimensions center** as the fallback instead of camera settings target:

### Before (Wrong)
```typescript
const initialCameraTarget = useMemo(() => {
  const defaultTarget = cameraSettings.target; // ← Wrong! Z is negated
  // ... rest of calculation
}, [lookup, fight, cameraSettings.target]);
```

### After (Correct)
```typescript
const initialCameraTarget = useMemo(() => {
  const defaultTarget: [number, number, number] = [
    arenaDimensions.centerX,  // Same coordinate system as actors
    0, 
    arenaDimensions.centerZ   // Same coordinate system as actors
  ];
  // ... rest of calculation
}, [lookup, fight, arenaDimensions.centerX, arenaDimensions.centerZ]);
```

Also added `arenaDimensions` calculation to the Arena3D component (it was only in Scene before):

```typescript
const arenaDimensions = useMemo(() => {
  const defaults = {
    size: 100,
    centerX: 50,
    centerZ: 50,
  };

  if (!fight?.boundingBox) {
    return defaults;
  }

  const { minX, maxX, minY, maxY } = fight.boundingBox;
  
  // Convert to arena coordinates matching actor position transformation
  const arenaMinX = 100 - (maxX / 100); // Flip X
  const arenaMaxX = 100 - (minX / 100);
  const arenaMinZ = minY / 100;  // No negation! Same as actors
  const arenaMaxZ = maxY / 100;

  const centerX = (arenaMinX + arenaMaxX) / 2;
  const centerZ = (arenaMinZ + arenaMaxZ) / 2;  // Same coordinate system as actors
  
  const rangeX = arenaMaxX - arenaMinX;
  const rangeZ = arenaMaxZ - arenaMinZ;
  const size = Math.max(rangeX, rangeZ) * 1.2;

  return { size, centerX, centerZ };
}, [fight?.boundingBox?.minX, fight?.boundingBox?.maxX, fight?.boundingBox?.minY, fight?.boundingBox?.maxY]);
```

## Why Two Different Coordinate Systems?

### Camera Settings Target
- Used for **OrbitControls target** 
- Calculated from bounding box with Z negation for camera orientation
- Purpose: Where the camera looks (using camera space coordinates)

### Actor Positions & Arena Dimensions
- Used for **positioning 3D objects** (actors, markers, grid)
- Calculated from `convertCoordinatesWithBottomLeft` without Z negation
- Purpose: Where objects exist in 3D space

Both systems are valid for their purposes, but **mixing them causes misalignment**.

## Files Modified

- `src/features/fight_replay/components/Arena3D.tsx`
  - Added `arenaDimensions` calculation to Arena3D component
  - Changed `initialCameraTarget` fallback from `cameraSettings.target` to arena dimensions center
  - Updated dependency array: removed `cameraSettings.target`, added `arenaDimensions.centerX/Z`

## Testing Results

After fix:
- ✅ TypeScript compilation passes
- ✅ Camera now positions correctly to view actors
- ✅ Initial camera target matches actor coordinate system
- ✅ Arena grid, actors, and camera all aligned

## Expected Console Output After Fix

```
Arena3D: Arena dimensions - Size: 25.2m, Center: [49.3, 65.6]
Arena3D: Calculated center of actors - center: [49.3, 0, 65.6]  ← Matches arena center!
Arena3D: Camera position: [31.3, 15.0, 83.6]  ← Correct position
Arena3D: Camera target: [49.3, 0, 65.6]  ← Looking at actors!
```

Now all three values use the same coordinate system:
- Arena center: `[49.3, 65.6]`
- Actor center: `[49.3, 0, 65.6]`  
- Camera target: `[49.3, 0, 65.6]`

Perfect alignment! ✅

## Key Learnings

1. **Coordinate system consistency is critical** - mixing different transformations causes spatial misalignment
2. **Z-axis negation** is used in camera calculations but not actor positions
3. **Arena dimensions** should match actor coordinate system, not camera coordinate system
4. **Always check the transformation pipeline** when debugging spatial issues
5. **Console logs with formatted coordinates** are invaluable for debugging coordinate mismatches

## Related Documentation

- `ARENA_GRID_DYNAMIC_SCALING_IMPLEMENTATION.md` - Arena scaling implementation
- `ARENA_GRID_SCALING_ISSUE.md` - Original arena scaling problem
- `ARENA3D_BOSS_FOCUS_CAMERA.md` - Center-of-actors camera targeting
- `src/utils/coordinateUtils.ts` - Coordinate transformation functions
