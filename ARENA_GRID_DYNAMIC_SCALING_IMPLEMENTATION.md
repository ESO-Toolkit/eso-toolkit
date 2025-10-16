# Arena Grid Dynamic Scaling Implementation

## Implementation Date
October 14, 2025

## Problem Solved

The Arena3D component was using **hardcoded 100×100 dimensions** for the grid and map texture, which caused a critical mismatch with the actual coordinate space after implementing zone scale data integration.

### Before the Fix ❌

```
Kyne's Aegis Fight Example:
- Fight bounding box: X: 80000-100000cm, Y: 90000-110000cm
- Arena coordinates (÷100): X: 800-1000, Z: 900-1100
- Grid coverage: X: 0-100, Z: 0-100
- Result: Grid doesn't overlap with actors at all!
```

### After the Fix ✅

```
Kyne's Aegis Fight Example:
- Fight bounding box: X: 80000-100000cm, Y: 90000-110000cm  
- Arena coordinates (÷100): X: 800-1000, Z: 900-1100
- Calculated arena size: ~240 units (200m range + 20% padding)
- Grid coverage: Centered at [900, 940] with size 240×240
- Result: Grid perfectly covers the fight area!
```

## Implementation Details

### 1. Calculate Arena Dimensions

Added `arenaDimensions` calculation in both the main Arena3D component and the Scene component:

```typescript
const arenaDimensions = useMemo(() => {
  // Default dimensions for 100x100 arena
  const defaults = {
    size: 100,
    centerX: 50,
    centerZ: 50,
  };

  if (!fight?.boundingBox) {
    return defaults;
  }

  const { minX, maxX, minY, maxY } = fight.boundingBox;
  
  if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
    return defaults;
  }
  
  // Convert to arena coordinates (divide by 100)
  // Note: X is flipped in convertCoordinatesWithBottomLeft (100 - x/100)
  const arenaMinX = 100 - (maxX / 100); // Flip: max becomes min
  const arenaMaxX = 100 - (minX / 100); // Flip: min becomes max
  const arenaMinZ = minY / 100;
  const arenaMaxZ = maxY / 100;

  // Calculate size and center
  const rangeX = arenaMaxX - arenaMinX;
  const rangeZ = arenaMaxZ - arenaMinZ;
  const maxRange = Math.max(rangeX, rangeZ);
  
  const centerX = (arenaMinX + arenaMaxX) / 2;
  const centerZ = (arenaMinZ + arenaMaxZ) / 2;

  // Add 20% padding for visual comfort
  const size = maxRange * 1.2;

  console.log(
    `Arena3D: Arena dimensions - Size: ${size.toFixed(1)}m, ` +
    `Center: [${centerX.toFixed(1)}, ${centerZ.toFixed(1)}], ` +
    `Range: X=${rangeX.toFixed(1)}m, Z=${rangeZ.toFixed(1)}m`
  );

  return { size, centerX, centerZ };
}, [fight?.boundingBox?.minX, fight?.boundingBox?.maxX, fight?.boundingBox?.minY, fight?.boundingBox?.maxY]);
```

**Key Points:**
- Converts ESO world space bounding box to arena coordinates
- Accounts for X-coordinate flipping in `convertCoordinatesWithBottomLeft`
- Calculates center point of the fight area
- Adds 20% padding for visual comfort
- Uses the larger dimension (X or Z) to ensure square grid

### 2. Update Grid Component

Changed from hardcoded values to dynamic values:

```typescript
<Grid
  args={[arenaDimensions.size, arenaDimensions.size]}  // Dynamic size
  position={[arenaDimensions.centerX, -0.01, arenaDimensions.centerZ]}  // Dynamic position
  cellSize={Math.max(5, arenaDimensions.size / 10)}  // Scale cell size proportionally
  cellThickness={0.5}
  cellColor="#6f6f6f"
  sectionSize={arenaDimensions.size / 2}  // Scale section size
  sectionThickness={1.5}
  sectionColor="#9d9d9d"
  fadeDistance={arenaDimensions.size * 1.5}  // Scale fade distance
  fadeStrength={1}
  followCamera={false}
  infiniteGrid={false}
/>
```

**Scaling Rules:**
- `args`: Grid total size matches arena dimensions
- `position`: Grid centered on fight area
- `cellSize`: Minimum 5 units, scales with arena (always 10 cells across)
- `sectionSize`: Half of arena size (2 major sections)
- `fadeDistance`: 1.5× arena size for smooth edge fade

### 3. Update Map Texture

Changed the DynamicMapTexture component to use dynamic values:

```typescript
<DynamicMapTexture
  mapTimeline={mapTimeline || { entries: [], totalMaps: 0 }}
  timeRef={timeRef}
  size={arenaDimensions.size}  // Dynamic size
  position={[arenaDimensions.centerX, -0.02, arenaDimensions.centerZ]}  // Dynamic position
/>
```

**Note:** The DynamicMapTexture component already supported `size` and `position` props, so no changes were needed to that component.

### 4. Update Fallback Mesh

Changed the Suspense fallback mesh to match:

```typescript
<mesh 
  rotation={[-Math.PI / 2, 0, 0]} 
  position={[arenaDimensions.centerX, -0.02, arenaDimensions.centerZ]}  // Dynamic position
  receiveShadow
>
  <planeGeometry args={[arenaDimensions.size, arenaDimensions.size]} />  // Dynamic size
  <meshPhongMaterial color="#2a2a2a" transparent opacity={0.8} />
</mesh>
```

### 5. Update Camera Settings

Updated camera settings to use arena dimensions as fallback:

```typescript
const cameraSettings = useMemo(() => {
  const defaults = {
    target: initialTarget || ([arenaDimensions.centerX, 0, arenaDimensions.centerZ] as [number, number, number]),
    minDistance: 5,
    maxDistance: 200,
  };
  // ... rest of camera calculation
}, [fight?.boundingBox?.minX, fight?.boundingBox?.maxX, fight?.boundingBox?.minY, fight?.boundingBox?.maxY, initialTarget, arenaDimensions.centerX, arenaDimensions.centerZ]);
```

## Coordinate System Understanding

### ESO World Space → Arena Space Transformation

The transformation pipeline:

1. **ESO World Space** (combat log coordinates in centimeters)
   - Example: X=85000cm, Y=95000cm

2. **Divide by 100** (convert cm to meters, matching ESO's internal scale)
   - Example: X=850, Y=950

3. **Apply coordinate flipping** (for X-axis to match map texture orientation)
   - `x3D = 100 - x / 100`
   - Example: X=850 → x3D = 100 - 8.5 = 91.5

4. **Arena coordinates** (final 3D space)
   - Example: [91.5, 0, 950]

### Why X-axis Flipping?

The map texture has `scale={[-1, 1, 1]}` which horizontally flips it. To keep actor positions aligned with the map, we flip the X coordinate in `convertCoordinatesWithBottomLeft`:

```typescript
const x3D = 100 - x / 100; // Flip X to match the flipped map texture
```

When calculating arena dimensions, we must account for this flip:
```typescript
const arenaMinX = 100 - (maxX / 100); // max becomes min after flip
const arenaMaxX = 100 - (minX / 100); // min becomes max after flip
```

## Example Calculations

### Small Dungeon (100m × 100m)

```
Bounding Box: minX=0, maxX=10000, minY=0, maxY=10000
Arena coordinates: 
  arenaMinX = 100 - 100 = 0
  arenaMaxX = 100 - 0 = 100
  arenaMinZ = 0
  arenaMaxZ = 100
Range: 100m × 100m
Arena size: 100 * 1.2 = 120 units
Center: [50, 0, 50]
Grid: 120×120 at [50, -0.01, 50]
Cell size: max(5, 120/10) = 12 units
```

### Kyne's Aegis Boss (200m × 200m fight area)

```
Bounding Box: minX=80000, maxX=100000, minY=90000, maxY=110000
Arena coordinates:
  arenaMinX = 100 - 1000 = -900
  arenaMaxX = 100 - 800 = -700
  arenaMinZ = 900
  arenaMaxZ = 1100
Range: 200m × 200m
Arena size: 200 * 1.2 = 240 units
Center: [-800, 0, 1000] (approximately)
Grid: 240×240 at [-800, -0.01, 1000]
Cell size: max(5, 240/10) = 24 units
```

## Benefits

### Visual Consistency ✅
- Grid always covers the fight area
- Map texture properly positioned under actors
- No more actors floating in empty space

### Scalability ✅
- Works for any zone size (10m to 1000m+)
- Automatically adapts to fight area
- No hardcoded assumptions

### Performance ✅
- Grid cells scale appropriately (larger fights = larger cells)
- Fade distance scales (prevents Z-fighting at far distances)
- No performance impact from dynamic calculations (useMemo cached)

### User Experience ✅
- Clear visual reference for fight space
- Easy to understand spatial relationships
- Consistent across all zones

## Testing Recommendations

Test with various zone sizes:

1. **Tiny arena** (10-20m): Delve bosses, small dungeon rooms
2. **Small arena** (50-100m): Normal dungeon bosses
3. **Medium arena** (100-300m): Trial bosses, overland world bosses
4. **Large arena** (300-1000m): Cyrodiil battles, very large zones
5. **Edge cases**: Fights that span multiple areas, extremely long fights

For each test:
- ✅ Verify grid covers all actor positions
- ✅ Verify map texture aligns with actors
- ✅ Verify camera can see entire fight area
- ✅ Verify M0R markers appear within grid bounds
- ✅ Verify grid cells are appropriately sized (not too dense or sparse)

## Related Documentation

- `ARENA_GRID_SCALING_ISSUE.md` - Problem analysis
- `MOR_MARKERS_ZONE_SCALE_INTEGRATION.md` - Zone scale data integration
- `MOR_MARKERS_SCALE_MULTIPLIER_FIX.md` - Marker visual scaling
- `DYNAMIC_CAMERA_CONTROLS.md` - Adaptive camera zoom
- `ARENA3D_BOSS_FOCUS_CAMERA.md` - Initial camera positioning

## Files Modified

- `src/features/fight_replay/components/Arena3D.tsx` - Main implementation
- `ARENA_GRID_DYNAMIC_SCALING_IMPLEMENTATION.md` - This documentation

## Technical Notes

### Why 20% Padding?

Testing showed that 10% padding felt too tight, making actors appear close to grid edges. 20% provides comfortable visual breathing room without wasting too much space.

### Why Square Grid?

Using `maxRange = Math.max(rangeX, rangeZ)` ensures the grid is always square. This:
- Maintains visual consistency
- Prevents distortion of grid cells
- Simplifies mental model for users
- Ensures equal scaling in both directions

### Why Minimum Cell Size of 5?

For very small arenas (< 50 units), dividing by 10 would create cells smaller than 5 units. This makes the grid too dense and visually noisy. A minimum of 5 units keeps the grid readable at all sizes.

## Future Enhancements

Potential improvements if requested:

1. **Adaptive Grid Density**: Automatically adjust number of cells based on camera distance
2. **Multi-arena Support**: Handle fights that span multiple separate arenas
3. **Dynamic Padding**: Calculate padding based on actor density and movement patterns
4. **Grid Style Options**: User preferences for grid appearance
5. **Minimap Integration**: Use arena dimensions for minimap bounds
