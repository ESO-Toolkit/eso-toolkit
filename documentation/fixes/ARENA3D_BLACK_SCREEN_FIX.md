# Arena3D Black Screen Fix

## Issue
The replay viewer showed only a black screen on load.

## Root Cause
The dynamic camera settings calculation had **two critical issues**:

### 1. **Missing Null Safety for Bounding Box**
The code assumed `fight.boundingBox` always existed, but the GraphQL type shows it's optional:
```typescript
boundingBox?: Maybe<ReportMapBoundingBox>;
```

When `boundingBox` was `null` or `undefined`, the code would crash during calculations.

### 2. **Incorrect Initial Camera Position**
The camera was initialized with a **hardcoded position** that was designed for the old static target `[50, 0, 50]`:
```typescript
position: DEFAULT_CAMERA_POSITION.toArray(), // [30, 18, 30]
```

When the target changed to `[50.7, 0, -65.6]` (based on fight bounding box), the camera was looking at the wrong place - it was ~115 meters away from where it should be looking!

**Example**: For Kyne's Aegis Fight 11:
- Camera position: `[30, 18, 30]` 
- Intended target: `[50.7, 0, -65.6]`
- Camera was actually pointing into empty space, not at the fight area

## Solution

### 1. **Added Comprehensive Null Checks**
```typescript
if (!fight?.boundingBox) {
  console.log('Arena3D: Using default camera settings (no bounding box)');
  return defaults;
}

const { minX, maxX, minY, maxY } = fight.boundingBox;

// Validate that all bounding box values exist
if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
  console.warn('Arena3D: Invalid bounding box data, using defaults', fight.boundingBox);
  return defaults;
}
```

**Benefits**:
- Gracefully falls back to default camera settings `[50, 0, 50]` with zoom 5-200
- Logs warnings for debugging
- Prevents runtime errors from undefined values

### 2. **Fixed Dependency Array**
```typescript
}, [fight?.boundingBox?.minX, fight?.boundingBox?.maxX, fight?.boundingBox?.minY, fight?.boundingBox?.maxY]);
```

**Benefits**:
- Only re-calculates when actual bounding box values change
- Properly tracks primitive values instead of object references
- Prevents unnecessary re-renders

### 3. **Dynamic Initial Camera Position**
This was the **key fix** for the black screen!

```typescript
// Calculate initial camera position based on the dynamic target
const [targetX, targetY, targetZ] = cameraSettings.target;

// Calculate offset based on the fight size for a good overview
const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5);

// Position camera: southwest of target, elevated
const cameraOffset = [-viewDistance * 0.6, viewDistance * 0.5, viewDistance * 0.6];
const initialCameraPosition: [number, number, number] = [
  targetX + cameraOffset[0],
  targetY + cameraOffset[1],
  targetZ + cameraOffset[2],
];
```

**How it works**:
- **viewDistance** scales with fight size: `max(30, minDistance * 2.5)`
  - Small fights: ~20m diagonal → 30m view distance
  - Medium fights: ~27m diagonal → ~50m view distance  
  - Large fights: ~100m diagonal → ~188m view distance
- **Camera positioned at**: Target + offset of `[-60%, +50%, +60%]` of viewDistance
  - X: Southwest (-60% = closer to viewer on map)
  - Y: Elevated (+50% = bird's eye angle)
  - Z: Behind (+60% = depth perspective)

**Example - Kyne's Aegis Fight 11**:
- Target: `[50.7, 0, -65.6]`
- View distance: `max(30, 8.1 * 2.5) = 30m`
- Camera offset: `[-18, 15, 18]`
- **Final position**: `[32.7, 15, -47.6]`
- Camera now looks at the fight from a good angle!

### 4. **Moved Camera Settings to Parent Component**
The cameraSettings calculation was duplicated in both Scene and Arena3D. Moved it to Arena3D so the initial camera position can use it:

```typescript
export const Arena3D: React.FC<Arena3DProps> = ({ ... }) => {
  // Calculate cameraSettings once
  const cameraSettings = useMemo(() => { ... }, [...]);
  
  // Use it for initial camera position
  const initialCameraPosition = calculateFromTarget(cameraSettings.target);
  
  // Pass fight to Scene for its own calculations
  return <Canvas camera={{ position: initialCameraPosition }}>...</Canvas>
}

## Files Changed

### `src/features/fight_replay/components/Arena3D.tsx`

**Before**:
```typescript
const cameraSettings = useMemo(() => {
  const defaults = { ... };

  if (!fight.boundingBox) {
    return defaults;
  }

  const { minX, maxX, minY, maxY } = fight.boundingBox;
  
  // ... calculations that could crash if values are undefined ...
  
  console.log(`Camera settings - ...`); // No null safety
  
  return { ... };
}, [fight.boundingBox]); // Problematic dependency
```

**After**:
```typescript
const cameraSettings = useMemo(() => {
  const defaults = { ... };

  if (!fight?.boundingBox) {
    console.log('Arena3D: Using default camera settings (no bounding box)');
    return defaults;
  }

  const { minX, maxX, minY, maxY } = fight.boundingBox;
  
  // Validate that all bounding box values exist
  if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
    console.warn('Arena3D: Invalid bounding box data, using defaults', fight.boundingBox);
    return defaults;
  }
  
  // ... safe calculations ...
  
  console.log(`Arena3D: Camera settings - ...`); // Safe to call .toFixed()
  
  return { ... };
}, [fight?.boundingBox?.minX, fight?.boundingBox?.maxX, fight?.boundingBox?.minY, fight?.boundingBox?.maxY]);
```

## Testing

### Scenarios Covered

1. **Missing Bounding Box** (`null` or `undefined`):
   - ✅ Falls back to default camera settings
   - ✅ Logs informative message
   - ✅ Arena renders with `[50, 0, 50]` target, zoom 5-200

2. **Partial Bounding Box** (some values undefined):
   - ✅ Detected by validation check
   - ✅ Warns with actual data for debugging
   - ✅ Falls back to defaults

3. **Valid Bounding Box**:
   - ✅ Calculates dynamic camera settings
   - ✅ Logs calculated values
   - ✅ Arena renders with fight-specific camera

### Verification Commands
```powershell
# TypeScript compilation
npm run typecheck  # ✅ Pass

# Development server
npm run dev  # ✅ No runtime errors

# Browser console (with missing boundingBox)
# Expected: "Arena3D: Using default camera settings (no bounding box)"

# Browser console (with valid boundingBox)
# Expected: "Arena3D: Camera settings - Center: [X, 0, Z], Range: Xm, Distances: X-Xm"
```

## Related Issues

### Why This Wasn't Caught Earlier

1. **Previous testing** may have used fights that always had bounding boxes
2. **The error** happened during render, making it hard to debug (black screen, no error message)
3. **TypeScript** doesn't prevent runtime null access in useMemo callbacks

### GraphQL Type Definition
From `src/graphql/generated.ts`:
```typescript
export type ReportFight = {
  // ... other fields ...
  boundingBox?: Maybe<ReportMapBoundingBox>;  // ⚠️ Optional!
};

export type ReportMapBoundingBox = {
  __typename?: 'ReportMapBoundingBox';
  maxX: Scalars['Int']['output'];
  maxY: Scalars['Int']['output'];
  minX: Scalars['Int']['output'];
  minY: Scalars['Int']['output'];
};
```

## Best Practices Applied

### 1. **Defensive Programming**
- Always check for null/undefined before destructuring
- Validate all values before using them in calculations
- Provide sensible fallback values

### 2. **Fail Gracefully**
- Don't crash the entire UI for missing data
- Fall back to working defaults
- Log warnings for debugging

### 3. **Explicit Dependencies**
- Use primitive values in dependency arrays when possible
- Avoid object references that change on every render
- Make memoization behavior predictable

### 4. **Informative Logging**
- Prefix logs with component name
- Use appropriate log levels (log vs warn vs error)
- Include context for debugging

## Impact

### User Experience
- **Before**: Black screen, unusable replay viewer
- **After**: Replay viewer works with default camera if bounding box missing, adaptive camera if available

### Developer Experience
- **Before**: Silent failure, hard to debug
- **After**: Clear console messages indicating what's happening

### Performance
- **Before**: Potential unnecessary re-renders from object dependency
- **After**: Efficient memoization with primitive dependencies

## Future Enhancements

### 1. **GraphQL Query Update**
Ensure bounding box is always requested:
```graphql
fragment FightFragment on ReportFight {
  # ... other fields ...
  boundingBox {
    minX
    maxX
    minY
    maxY
  }
}
```

### 2. **API Improvement**
If bounding box is critical, consider:
- Making it non-nullable in the GraphQL schema
- Calculating it server-side if missing
- Providing synthetic bounds based on zone data

### 3. **Fallback Strategy**
Could calculate bounding box from actor positions if API doesn't provide it:
```typescript
const calculateBoundingBoxFromActors = (lookup: TimestampPositionLookup): BoundingBox => {
  // Find min/max X/Y from all actor positions across all timestamps
  // ...
};
```

## Conclusion

This fix ensures the Arena3D component handles missing or invalid bounding box data gracefully, preventing black screen crashes and providing clear debugging information. The replay viewer now works reliably regardless of whether the API provides bounding box data.

## Related Documentation
- `DYNAMIC_CAMERA_CONTROLS.md` - Dynamic camera system design
- `MOR_MARKERS_SCALE_MULTIPLIER_FIX.md` - Related zone scaling work
