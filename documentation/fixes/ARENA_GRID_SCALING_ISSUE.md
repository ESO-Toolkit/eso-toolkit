# Arena Grid Scaling Issue

## Issue Discovery
**Date**: October 14, 2025

## Problem

The Arena3D component is **not correctly scaling the arena grid and map texture** to match the fight's actual coordinate space after implementing zone scale data integration.

### Current Behavior

1. **Actor Coordinates**: ESO world coordinates (cm) → `/100` → arena coordinates ✅
2. **M0R Marker Coordinates**: ESO world coordinates (cm) → `/100` → arena coordinates ✅
3. **Camera Settings**: Dynamically calculated from fight bounding box ✅
4. **Arena Grid**: **HARDCODED to 100x100 units** ❌
5. **Map Texture**: **HARDCODED to 100x100 units** ❌

### The Problem

After dividing ESO world coordinates by 100, different zones have different coordinate ranges:

- **Small zone** (100m): Coordinates 0-100 → Grid fits perfectly
- **Large zone** (Kyne's Aegis, ~1180m): Coordinates 0-1180 → **Grid only covers first 8.5% of the area!**

Example for Kyne's Aegis:
```
Fight bounding box (ESO world space):
  X: minX=80000, maxX=100000 (20000cm = 200m range)
  Y: minY=90000, maxY=110000 (20000cm = 200m range)

Arena coordinates (divided by 100):
  X: 800-1000 (200m range)
  Z: -1100 to -900 (200m range, negated for Z)

Current Grid:
  Size: 100x100 units
  Position: [50, -0.01, 50]
  Coverage: 0-100 in both X and Z
  
Result: Actors are at 800-1000 in X, but grid only goes 0-100!
        The grid doesn't even come close to where the fight is happening!
```

## Root Cause

The coordinate transformation from ESO world space to arena space is **NOT normalizing to a fixed range**. It's a direct scale:

```typescript
// coordinateUtils.ts - convertCoordinatesWithBottomLeft
const x3D = 100 - x / 100; // Direct scale, not normalized to 0-100
const z3D = y / 100;       // Direct scale, not normalized to 0-100
```

This means:
- Actors can be at ANY position in arena space (e.g., [850, 0, -950])
- Grid is fixed at 0-100
- Map texture is fixed at 0-100
- **They don't overlap!**

## Solution

The **arena grid and map texture must be dynamically sized and positioned** based on the fight's bounding box:

### 1. Calculate Arena Dimensions from Bounding Box

```typescript
// In Arena3D component
const arenaDimensions = useMemo(() => {
  if (!fight?.boundingBox) {
    return { size: 100, centerX: 50, centerZ: 50 };
  }

  const { minX, maxX, minY, maxY } = fight.boundingBox;
  
  // Convert to arena coordinates
  const arenaMinX = 100 - (maxX / 100);  // Flip X
  const arenaMaxX = 100 - (minX / 100);
  const arenaMinZ = minY / 100;
  const arenaMaxZ = maxY / 100;

  // Calculate size and center
  const rangeX = arenaMaxX - arenaMinX;
  const rangeZ = arenaMaxZ - arenaMinZ;
  const maxRange = Math.max(rangeX, rangeZ);
  
  const centerX = (arenaMinX + arenaMaxX) / 2;
  const centerZ = (arenaMinZ + arenaMaxZ) / 2;

  // Add 10% padding for visual comfort
  const size = maxRange * 1.1;

  return { size, centerX, centerZ };
}, [fight?.boundingBox]);
```

### 2. Update Grid Component

```typescript
<Grid
  args={[arenaDimensions.size, arenaDimensions.size]}  // Dynamic size
  position={[arenaDimensions.centerX, -0.01, arenaDimensions.centerZ]}  // Dynamic position
  cellSize={Math.max(10, arenaDimensions.size / 10)}  // Scale cell size
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

### 3. Update Map Texture Component

```typescript
<DynamicMapTexture
  mapTimeline={mapTimeline || { entries: [], totalMaps: 0 }}
  timeRef={timeRef}
  size={arenaDimensions.size}  // Dynamic size
  position={[arenaDimensions.centerX, -0.02, arenaDimensions.centerZ]}  // Dynamic position
/>
```

### 4. Update Fallback Mesh

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

## Impact

### Before Fix
- Actors outside the visible grid area
- Map texture doesn't align with actor positions
- Confusing for users (where is everything?)
- Camera looking at the correct location, but grid elsewhere

### After Fix
- Grid sized and positioned to match fight area
- Map texture properly positioned under actors
- Visual consistency across all zone sizes
- Everything aligned and visible

## Testing

Test with different zone sizes:

1. **Small zone** (e.g., dungeon boss): Grid ~50-100 units
2. **Medium zone** (e.g., overland): Grid ~200-500 units
3. **Large zone** (Kyne's Aegis): Grid ~200-300 units (fight area, not full zone)
4. **Very large zone** (Cyrodiil): Grid size depends on actual fight area

## Related Files

- `src/features/fight_replay/components/Arena3D.tsx` - Main arena component (needs update)
- `src/utils/coordinateUtils.ts` - Coordinate transformation (working correctly)
- `src/features/fight_replay/components/DynamicMapTexture.tsx` - May need size/position props
- `MOR_MARKERS_ZONE_SCALE_INTEGRATION.md` - Related zone scaling work

## Priority

**HIGH** - This is a critical visual bug that makes the 3D replay confusing and potentially unusable for large zones.
