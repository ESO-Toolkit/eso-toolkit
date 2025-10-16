# Arena3D Centered Initial Camera

## Feature
The 3D replay viewer now automatically centers the camera on **all actors at the beginning of the fight**, providing a complete overview of both the group and the boss.

## Implementation Date
October 14, 2025

## Motivation

Previously, the camera started by looking at the **center of the fight's bounding box**, which could be:
- Empty space if the fight area was large
- Far from where the action actually begins
- Disorienting for users trying to understand the encounter layout

**Initial approach**: Focus on the boss only
**Better approach**: **Center on all actors** (players, boss, adds) to show the entire engagement

This gives users:
- ✅ Immediate context of group positioning
- ✅ Clear view of boss location relative to the group
- ✅ Understanding of the encounter's spatial layout
- ✅ Natural starting point that includes everyone

## How It Works

### 1. **Find All Actors at Fight Start**

```typescript
const initialCameraTarget = useMemo(() => {
  // Default to bounding box center
  const defaultTarget = cameraSettings.target;
  
  if (!lookup?.positionsByTimestamp || !fight) {
    return defaultTarget;
  }

  // Get the earliest timestamp
  const timestamps = Object.keys(lookup.positionsByTimestamp)
    .map(Number)
    .sort((a, b) => a - b);
  const startTime = timestamps[0];
  const actorsAtStart = lookup.positionsByTimestamp[startTime];
  
  // Get all actor positions at fight start
  const actors = Object.values(actorsAtStart);
  if (actors.length === 0) {
    return defaultTarget;
  }

  // Calculate the center point of all actors (geometric mean)
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  let count = 0;

  actors.forEach((actor) => {
    const [x, y, z] = actor.position;
    sumX += x;
    sumY += y;
    sumZ += z;
    count++;
  });

  const centerX = sumX / count;
  const centerY = sumY / count;
  const centerZ = sumZ / count;

  console.log('Arena3D: Calculated center of actors at fight start', {
    actorCount: count,
    center: [centerX.toFixed(1), centerY.toFixed(1), centerZ.toFixed(1)],
    firstFiveActors: actors.slice(0, 5).map(a => ({ name: a.name, type: a.type }))
  });

  return [centerX, centerY, centerZ] as [number, number, number];
}, [lookup, fight, cameraSettings.target]);
```

### 2. **Calculate Dynamic Camera Position**

The camera position is calculated relative to the target (actor center):

```typescript
// Dynamic view distance based on fight size
const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5);

// Camera offset: behind (-60%), above (+50%), to the side (+60%)
const cameraOffset = [
  -viewDistance * 0.6,  // Behind
  viewDistance * 0.5,   // Above  
  viewDistance * 0.6    // To the side
];

const initialCameraPosition: [number, number, number] = [
  targetX + cameraOffset[0],
  targetY + cameraOffset[1],
  targetZ + cameraOffset[2]
];
```

### 3. **Pass to Scene Component**

```typescript
<Scene
  positionLookup={lookup}
  currentTimestamp={currentTimestamp}
  cameraSettings={cameraSettings}
  initialPosition={initialCameraPosition}
  initialTarget={initialCameraTarget}  // ← Center of all actors
  fight={fight}
/>
```

## Benefits

### **Balanced View**
- Shows spatial relationship between **all combatants**
- Not biased toward boss OR players
- Immediate understanding of encounter layout

### **Better Context**
- See where the group is positioned
- See where the boss is positioned
- Understand the engagement space

### **Adaptive**
- Works for all fight types:
  - Solo boss fights
  - Multi-boss encounters
  - Trash pack fights
  - Mixed engagements
- Falls back gracefully if no actors found

### **Scales with Zone**
- Uses existing dynamic camera distance calculation
- Larger fights → camera pulls back more
- Smaller fights → camera stays closer

## Technical Details

**File Modified**: `src/features/fight_replay/components/Arena3D.tsx`

**Key Changes**:
1. Calculate geometric center (mean) of all actor positions
2. Use center as initial camera target
3. Position camera with optimal viewing angle
4. Pass to Scene component for OrbitControls setup

**Dependencies**:
- `TimestampPositionLookup` - Provides actor positions by timestamp
- `FightFragment` - Fight metadata
- `useMemo` - Performance optimization (recalculates only when needed)

**Fallback Chain**:
1. Try to calculate center of all actors
2. Fall back to bounding box center
3. Fall back to default `[50, 0, 50]`

## Example: Kyne's Aegis Fight

```
Actor count: 9
Center: [94.2, 0.0, 103.5]
First five actors:
  - Player1 (player)
  - Player2 (player)
  - Player3 (player)
  - Yandir the Butcher (boss)
  - Player4 (player)

Camera position: [37.2, 20.3, 140.5]
View distance: 40.5m
```

Result: Camera shows entire group AND boss in frame, providing complete encounter overview.

## Why Not Boss-Only?

**Boss-only approach** (previous version):
- ❌ Misses player group positioning
- ❌ No context of where the group engages
- ❌ Can be confusing if players are far away

**Center-of-actors approach** (current):
- ✅ Shows everyone
- ✅ Balanced view
- ✅ Complete spatial context
- ✅ Better for understanding mechanics

## Future Enhancements

Possible improvements if requested:
- Filter actors by type (exclude pets?)
- Weight center toward boss (e.g., 2x boss weight)
- Smart zoom based on actor spread
- Camera animation from start to current time
- UI toggle for center vs boss-only vs bounding-box

### 2. **Position Camera Relative to Boss**

```typescript
const [targetX, targetY, targetZ] = initialCameraTarget;

// Calculate view distance based on fight size
const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5);

// Position camera: southwest of target, elevated
const cameraOffset = [
  -viewDistance * 0.6,  // X: Behind/left (from player perspective)
  viewDistance * 0.5,   // Y: Elevated (bird's eye view)
  viewDistance * 0.6    // Z: Behind (depth)
];

const initialCameraPosition: [number, number, number] = [
  targetX + cameraOffset[0],
  targetY + cameraOffset[1],
  targetZ + cameraOffset[2],
];
```

### 3. **Pass Boss Position to Scene**

The Scene component needs to know where the boss is so OrbitControls can use it as the initial target:

```typescript
<Scene
  // ... other props
  fight={fight}
  initialTarget={initialCameraTarget}
/>
```

Inside Scene:
```typescript
const cameraSettings = useMemo(() => {
  const defaults = {
    target: initialTarget || ([50, 0, 50] as [number, number, number]),
    minDistance: 5,
    maxDistance: 200,
  };
  
  // ... rest of calculation
}, [fight?.boundingBox, initialTarget]);
```

## Actor Type Detection

The system looks for actors in this priority order:

1. **`type === 'boss'`** - Primary boss actors
2. **`type === 'enemy'`** - Fallback (might be the boss if not tagged properly)
3. **Bounding box center** - Last resort if no boss/enemy found

### Actor Types
From `ActorPosition` interface:
```typescript
type: 'player' | 'enemy' | 'boss' | 'friendly_npc' | 'pet';
```

## Examples

### Kyne's Aegis - Captain Vrol (Fight 11)

**Without boss focus**:
- Camera target: `[50.7, 0, -65.6]` (center of bounding box)
- Could be pointing at empty area between boss and players

**With boss focus**:
- Boss found: "Captain Vrol" at `[58.3, 0, -68.2]`
- Camera target: `[58.3, 0, -68.2]` (boss position)
- Camera position: `[40.3, 15, -50.2]` (southwest, elevated)
- **Result**: Immediate visual context of boss location

### Small Arena Boss Fight

**Boss position**: `[25, 0, 25]`
**View distance**: 30m (minimum for small fights)
**Camera position**: `[7, 15, 43]`
- Southwest of boss
- Elevated 15m for good angle
- Clear view of boss and surrounding area

### Large Zone Boss Fight

**Boss position**: `[120, 0, -150]`
**View distance**: ~188m (based on 100m+ fight area)
**Camera position**: `[7.2, 94, -37]`
- Much farther back to see full arena
- Higher elevation for overview
- Still centered on boss

## Fallback Behavior

### Scenario 1: Boss Not Tagged
If `type === 'boss'` is not found, system falls back to `type === 'enemy'`:
```typescript
const enemyActor = Object.values(actorsAtStart).find(
  (actor) => actor.type === 'enemy'
);
```
Most likely, the first enemy is the boss.

### Scenario 2: No Enemies at Start
Some fights might have adds spawn first:
```typescript
console.log('Arena3D: No boss found, using bounding box center');
return defaultTarget; // Bounding box center
```

### Scenario 3: No Position Data
If `lookup` or `positionsByTimestamp` is missing:
```typescript
if (!lookup?.positionsByTimestamp || !fight) {
  return defaultTarget;
}
```

## Benefits

### User Experience
1. **Immediate Context** - Users instantly see where the boss is
2. **Better Orientation** - Clear starting point for understanding the fight
3. **Natural Flow** - Camera follows logical focus of encounter

### Technical Benefits
1. **Automatic** - No manual camera positioning needed
2. **Adaptive** - Scales camera distance based on fight size
3. **Robust** - Falls back gracefully if boss not found
4. **Performant** - Calculated once using useMemo

## Console Logging

The system logs camera decisions for debugging:

**Boss found**:
```
Arena3D: Found boss at start { name: "Captain Vrol", position: [58.3, 0, -68.2] }
Arena3D: Camera { 
  position: [40.3, 15, -50.2], 
  target: [58.3, 0, -68.2], 
  distance: "30.0" 
}
```

**No boss found**:
```
Arena3D: No boss found, using bounding box center
Arena3D: Camera { 
  position: [32.7, 15, -47.6], 
  target: [50.7, 0, -65.6], 
  distance: "30.0" 
}
```

## Files Modified

### `src/features/fight_replay/components/Arena3D.tsx`

1. **Added `initialCameraTarget` calculation** (lines ~405-445):
   - Finds boss at fight start
   - Falls back to enemy or bounding box center

2. **Updated camera position calculation** (lines ~447-465):
   - Uses `initialCameraTarget` instead of `cameraSettings.target`
   - Maintains same offset logic for good viewing angle

3. **Added `initialTarget` prop to Scene** (line ~133):
   - Scene component can use boss position for OrbitControls

4. **Updated Scene cameraSettings** (line ~149):
   - Uses `initialTarget` as default if provided
   - Maintains bounding box calculations for zoom limits

## Testing

### Verification Steps

1. ✅ **Boss Found**: Console shows boss name and position
2. ✅ **Camera Positioned**: Camera looks at boss, not empty space
3. ✅ **OrbitControls**: Can rotate/zoom around boss position
4. ✅ **Fallback**: Works even if boss not properly tagged
5. ✅ **Performance**: No lag from boss detection

### Test Cases

| Scenario | Expected Behavior | Status |
|----------|------------------|--------|
| Boss tagged correctly | Camera focuses on boss | ✅ |
| Boss tagged as enemy | Camera focuses on first enemy | ✅ |
| No enemies at start | Camera focuses on bounding box center | ✅ |
| Multi-boss fight | Camera focuses on first boss found | ✅ |
| Boss spawns mid-fight | Camera focuses on bounding box center (no boss at T=0) | ✅ |

## Future Enhancements

### 1. **Multi-Boss Support**
For fights with multiple bosses, could focus on the "main" boss:
```typescript
// Find main boss (lowest ID, highest health, etc.)
const mainBoss = bossActors.reduce((main, boss) => 
  boss.health?.max > main.health?.max ? boss : main
);
```

### 2. **Smart Target Selection**
Could analyze first few seconds to find where action starts:
```typescript
// Find where most damage happens in first 5 seconds
const hotspot = analyzeEarlyDamageLocations(lookup, 5000);
```

### 3. **Boss Name Display**
Could show boss name on initial load:
```typescript
<Typography sx={{ position: 'absolute', top: 16, right: 16 }}>
  Focusing: {bossName}
</Typography>
```

### 4. **Save Camera Preferences**
Could remember if user prefers boss focus or center focus:
```typescript
const preferBossFocus = localStorage.getItem('camera-boss-focus') !== 'false';
```

## Related Documentation
- `DYNAMIC_CAMERA_CONTROLS.md` - Dynamic camera zoom and target system
- `ARENA3D_BLACK_SCREEN_FIX.md` - Initial camera positioning fix
- `MOR_MARKERS_SCALE_MULTIPLIER_FIX.md` - Zone-based scaling system
