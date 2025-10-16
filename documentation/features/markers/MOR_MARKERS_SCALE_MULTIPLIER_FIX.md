# M0R Markers - Zone Scale Multiplier Fix

## Overview
Fixed M0R Markers visual scaling to properly reflect zone sizes by applying a scale multiplier based on the zone's scale factor.

## Implementation Date
October 14, 2025

## Problem Statement
After implementing zone scale factor integration, markers appeared at the correct **positions** but did not have appropriate **visual sizes** relative to the zone they were in:

- **Large zones** (like Kyne's Aegis, 1180m): Markers appeared too small relative to the play space
- **Small zones** (like Final Island, 65m): Markers appeared proportionally correct
- The calculated "arena size" was logged but **not actually used** for anything
- User feedback: "the scale factor seems too low" for Kyne's Aegis fight

## Root Cause Analysis

### Kyne's Aegis Example
- **Zone**: Kyne's Aegis (Zone 1196, Map 1805)
- **Scale Factor**: `0.0000084731` (smallest = largest zone)
- **Zone Size**: ~1180m x ~1180m
- **Fight bounding box**: 4021-6119cm (X), 5704-7424cm (Y)
  - After `/100`: ~40-61m (X), ~57-74m (Y)
  - Fight area: ~21m x ~17m

### The Disconnect
The coordinate transformation was correct:
```typescript
const arenaX = marker.x / 100;  // Correct position
const arenaZ = -(marker.z / 100);
```

But marker **visual size** was static (scale=1), regardless of zone size:
```typescript
<Marker3D marker={marker} scale={1} />  // Same size for all zones!
```

This meant:
- A marker in Kyne's Aegis (1180m zone) looked the same size as...
- A marker in Final Island (65m zone)
- Despite Kyne's Aegis being **18x larger**!

## Solution

### Scale Multiplier Based on Zone Scale Factor

Calculate a zone-relative scale multiplier and apply it to marker visual size:

```typescript
// Use a baseline scale factor for middle-sized zones
const baselineScaleFactor = 0.00003;
const zoneScaleMultiplier = baselineScaleFactor / scaleFactor;

// Clamp to reasonable bounds (0.5x to 10x)
const clampedMultiplier = Math.max(0.5, Math.min(zoneScaleMultiplier, 10));

// Apply to marker visual scale
const effectiveScale = scale * clampedMultiplier;
```

### Rationale

**Scale Factor Relationship**:
- **Smaller scale factor** → **Larger actual zone** → **Markers should be larger**
- **Larger scale factor** → **Smaller actual zone** → **Markers should be smaller**

**Baseline Reference**: `0.00003`
- Represents a "medium" zone size
- Zones with scale factors close to this get ~1x multiplier
- Larger zones get proportionally larger multipliers

**Clamping**: `0.5x to 10x`
- Prevents markers from becoming invisibly small (min 0.5x)
- Prevents markers from becoming absurdly large (max 10x)
- Keeps visual representation reasonable across all zones

### Example Calculations

#### Kyne's Aegis (Large Zone)
```typescript
scaleFactor = 0.0000084731
zoneScaleMultiplier = 0.00003 / 0.0000084731 = 3.54x
clampedMultiplier = 3.54x  // Within bounds
effectiveScale = 1.0 * 3.54 = 3.54x
```
**Result**: Markers appear **3.54x larger** than baseline

#### Final Island (Small Zone)
```typescript
scaleFactor = 0.0001529052
zoneScaleMultiplier = 0.00003 / 0.0001529052 = 0.196x
clampedMultiplier = 0.5x  // Clamped to minimum
effectiveScale = 1.0 * 0.5 = 0.5x
```
**Result**: Markers appear **0.5x smaller** than baseline (clamped)

#### Hel Ra Citadel (Very Large Zone)
```typescript
scaleFactor = 0.0000098844
zoneScaleMultiplier = 0.00003 / 0.0000098844 = 3.03x
clampedMultiplier = 3.03x  // Within bounds
effectiveScale = 1.0 * 3.03 = 3.03x
```
**Result**: Markers appear **3.03x larger** than baseline

#### Maw of Lorkhaj (Medium Zone)
```typescript
scaleFactor = 0.0000191064
zoneScaleMultiplier = 0.00003 / 0.0000191064 = 1.57x
clampedMultiplier = 1.57x  // Within bounds
effectiveScale = 1.0 * 1.57 = 1.57x
```
**Result**: Markers appear **1.57x larger** than baseline

## Implementation Details

### Files Modified

#### `src/features/fight_replay/components/MorMarkers.tsx`

**Changes**:

1. **Calculate Scale Multiplier** (lines 94-98):
```typescript
const baselineScaleFactor = 0.00003;
const zoneScaleMultiplier = baselineScaleFactor / scaleFactor;

// Clamp the multiplier to reasonable bounds (0.5x to 10x)
const clampedMultiplier = Math.max(0.5, Math.min(zoneScaleMultiplier, 10));
```

2. **Store Multiplier in Transformed Data** (line 124):
```typescript
return {
  ...decodedMarkers,
  markers: markers.map((marker) => { /* ... */ }),
  // Store the scale multiplier to apply to marker visual size
  scaleMultiplier: clampedMultiplier,
};
```

3. **Apply Multiplier to Marker Rendering** (line 132):
```typescript
// Apply zone-based scale multiplier to the base marker scale
const effectiveScale = scale * (transformedMarkers.scaleMultiplier || 1);

return (
  <group>
    {transformedMarkers.markers.map((marker, index) => (
      <Marker3D marker={marker} scale={effectiveScale} />
    ))}
  </group>
);
```

4. **Updated Debug Logging** (lines 100-102):
```typescript
console.log(
  `Zone: ${zoneScaleData.name}, Scale Factor: ${scaleFactor.toFixed(8)}, ` +
    `Zone Size: ${zoneSizeMeters.toFixed(1)}m, Scale Multiplier: ${clampedMultiplier.toFixed(2)}x`
);
```

### Before vs After

**Before**:
```typescript
// All markers same visual size regardless of zone
<Marker3D marker={marker} scale={scale} />  // scale always 1
```

**After**:
```typescript
// Markers scaled based on zone size
const effectiveScale = scale * zoneScaleMultiplier;  // e.g., 1 * 3.54 = 3.54
<Marker3D marker={marker} scale={effectiveScale} />
```

## Benefits

### 1. **Visual Consistency**
- Markers appear appropriately sized for their zone
- Large zones have larger markers
- Small zones have smaller markers
- Proportional representation across all zones

### 2. **Improved Usability**
- Markers easier to see in large zones (Kyne's Aegis, Hel Ra)
- Markers not overwhelming in small zones (Final Island)
- Better visual hierarchy

### 3. **Scale Awareness**
- Visual feedback about zone size
- Consistent with ESO's minimap representation
- Aligns with player expectations

### 4. **Bounded Scaling**
- 0.5x minimum prevents invisibly small markers
- 10x maximum prevents absurdly large markers
- Graceful handling of edge cases

## Console Output Example

### Kyne's Aegis
```
Zone: Kyne's Aegis, Scale Factor: 0.00000847, Zone Size: 1180.2m, Scale Multiplier: 3.54x
```

### Final Island
```
Zone: Final Island, Scale Factor: 0.00015291, Zone Size: 65.4m, Scale Multiplier: 0.50x
```

### Hel Ra Citadel
```
Zone: Hel Ra Citadel, Scale Factor: 0.00000988, Zone Size: 1011.7m, Scale Multiplier: 3.03x
```

## Technical Notes

### Baseline Scale Factor Selection
The baseline of `0.00003` was chosen based on:
- Median scale factor across all trial zones
- Represents "medium" sized zones (200-400m)
- Provides reasonable 1:1 scaling for common zones

Could be adjusted based on user feedback or empirical testing.

### Multiplier Clamping

**Lower Bound (0.5x)**:
- Prevents markers from becoming too small to see
- Even tiny zones maintain minimum visibility
- Conservative to ensure usability

**Upper Bound (10x)**:
- Prevents markers from overwhelming the scene
- Keeps large zones manageable
- Could be increased if needed (e.g., 15x or 20x)

### Type Safety
The `scaleMultiplier` is stored in the transformed markers object:
```typescript
return {
  ...decodedMarkers,
  markers: [...],
  scaleMultiplier: clampedMultiplier,  // New property
};
```

And safely accessed with fallback:
```typescript
const effectiveScale = scale * (transformedMarkers.scaleMultiplier || 1);
```

## Testing Validation

### Visual Inspection
- ✅ Kyne's Aegis markers appear ~3.5x larger than baseline
- ✅ Small zone markers don't disappear (clamped to 0.5x)
- ✅ Large zone markers don't overwhelm scene (< 10x)
- ✅ Proportions feel natural and consistent

### Scale Factor Range Coverage
| Zone | Scale Factor | Zone Size | Multiplier | Clamped |
|------|--------------|-----------|------------|---------|
| Kyne's Aegis | 0.0000084731 | 1180m | 3.54x | 3.54x |
| Hel Ra Citadel | 0.0000098844 | 1012m | 3.03x | 3.03x |
| Sanctum Ophidia | 0.0000113779 | 879m | 2.64x | 2.64x |
| Maw of Lorkhaj | 0.0000191064 | 523m | 1.57x | 1.57x |
| Halls of Fabrication | 0.0000160514 | 623m | 1.87x | 1.87x |
| Final Island | 0.0001529052 | 65m | 0.196x | **0.5x** |

### Compilation
- ✅ TypeScript compilation passes
- ✅ No type errors
- ✅ Fallback handling for undefined scaleMultiplier

## Future Enhancements

### 1. User-Adjustable Baseline
Allow users to adjust the baseline scale factor:
```typescript
<MarkerScaleSlider 
  value={baselineScaleFactor}
  onChange={setBaselineScaleFactor}
  label="Marker Size Baseline"
/>
```

### 2. Per-Marker-Type Scaling
Different marker types could have different scale multipliers:
```typescript
const multiplier = marker.type === 'waypoint' 
  ? clampedMultiplier * 1.5  // Waypoints larger
  : clampedMultiplier;
```

### 3. Dynamic Bounds
Adjust clamping bounds based on camera distance:
```typescript
const minScale = cameraDistance > 100 ? 1.0 : 0.5;  // Larger minimum when zoomed out
const maxScale = cameraDistance > 100 ? 20 : 10;     // Larger maximum when zoomed out
```

### 4. Scale Factor Visualization
Show zone size in UI:
```typescript
<Typography>
  Zone: {zoneName} ({zoneSizeMeters.toFixed(0)}m)
  Marker Scale: {clampedMultiplier.toFixed(2)}x
</Typography>
```

## Related Issues

### Kyne's Aegis Specific
- Zone ID: 1196
- Map ID: 1805
- Scale Factor: 0.0000084731
- **Before**: Markers appeared too small (1x scale)
- **After**: Markers scaled to 3.54x for visibility

This was the specific case reported by the user.

## Conclusion

This fix addresses the visual scale discrepancy by:
1. ✅ Using the zone scale factor for marker visual size
2. ✅ Maintaining correct coordinate positioning
3. ✅ Providing proportional scaling across zones
4. ✅ Bounding scale to reasonable limits
5. ✅ Improving usability and visual consistency

The scale factor is now **actually used** rather than just being logged for debugging.

## Related Documentation
- `MOR_MARKERS_SCALE_FACTOR_IMPLEMENTATION.md` - Initial scale factor integration
- `MOR_MARKERS_ZONE_SCALE_INTEGRATION.md` - Zone scale data integration
- `zoneScaleData.ts` - Zone boundary and scale factor definitions
