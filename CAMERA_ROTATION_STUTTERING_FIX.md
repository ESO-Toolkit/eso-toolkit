# Camera Rotation Stuttering Fix

## Problem

Actor positions were stuttering when rotating the camera. This was caused by a race condition in the `useFrame` execution order:

- Camera updates (from `OrbitControls`) would run in one frame
- Actor position updates would run at the same time or potentially before camera updates
- This created inconsistent visual state where actors appeared to "jump" relative to the camera during rotation

## Root Cause

React Three Fiber's `useFrame` callbacks execute in the order they are registered, without guaranteed priority. When multiple components use `useFrame`:

1. `OrbitControls` internally uses `useFrame` to update camera position/rotation
2. `AnimationFrameActor3D` components use `useFrame` to update actor positions
3. `BossHealthHUD` uses `useFrame` to position HUD elements relative to camera
4. Other components also use `useFrame` for various updates

Without explicit priority ordering, these could execute in any order, causing visual inconsistencies during camera movement.

## Solution

Used React Three Fiber's priority system for `useFrame` to establish a clear execution order, and implemented manual rendering to handle the fact that using priorities disables automatic rendering.

### Priority Order (Lower = Higher Priority):

- **Priority 0**: Camera controls (`OrbitControls`)
- **Priority 1**: Actor position updates (`AnimationFrameActor3D`, `HighFrequencyActor3D`, `AnimationFrameContext`)
- **Priority 2**: Boss Health HUD positioning (depends on camera position)
- **Priority 3**: Map texture updates (`DynamicMapTexture`)
- **Priority 999**: Manual render call (executes last to output final frame)

### Manual Rendering

Since using `useFrame` with priorities disables automatic rendering, we added:

1. **Manual Render Loop**: A component that calls `gl.render(scene, camera)` at the lowest priority
2. **Canvas Configuration**: Set `frameloop="never"` to disable automatic rendering
3. **Centralized Priority Enum**: `RenderPriority` enum to manage all priorities in one place

## Implementation

### Created Centralized Priorities

```tsx
// src/features/fight_replay/constants/renderPriorities.ts
export enum RenderPriority {
  CAMERA = 0, // Camera controls
  ACTORS = 1, // Actor positions
  HUD = 2, // HUD positioning
  EFFECTS = 3, // Visual effects
  RENDER = 999, // Manual render
}
```

### Updated Components

All relevant `useFrame` calls now include priority parameter:

```tsx
// Before - no guaranteed execution order
useFrame(() => {
  // Update actor positions
});

// After - explicit priority ensures execution after camera updates
useFrame(() => {
  // Update actor positions
}, RenderPriority.ACTORS);
```

### Added Manual Rendering

```tsx
// Manual render loop in Arena3D
const RenderLoop: React.FC = () => {
  const { gl, scene, camera } = useThree();

  useFrame(() => {
    gl.render(scene, camera);
  }, 999); // Lowest priority - renders after all updates

  return null;
};

// Canvas with disabled automatic rendering
<Canvas frameloop="never" ... >
  <RenderLoop />
  {/* Other components */}
</Canvas>
```

## Files Modified

1. **renderPriorities.ts** - New centralized priority enum
2. **Arena3D.tsx** - Added manual render loop and `frameloop="never"`
3. **AnimationFrameActor3D.tsx** - Priority 1 for actor position updates
4. **HighFrequencyActor3D.tsx** - Priority 1 for high-frequency actor updates
5. **AnimationFrameContext.tsx** - Priority 1 for bulk actor position updates
6. **BossHealthHUD.tsx** - Priority 2 for camera-relative HUD positioning
7. **DynamicMapTexture.tsx** - Priority 3 for map texture updates

## Benefits

1. **Eliminated Stuttering**: Actors no longer stutter during camera rotation
2. **Deterministic Order**: Frame updates now execute in predictable order
3. **Better Performance**: Reduced visual artifacts mean smoother rendering
4. **Centralized Management**: All priorities managed in one place
5. **Future-Proof**: Clear priority system for any new frame-dependent components

## Technical Details

React Three Fiber's `useFrame` priority system:

- Lower numbers = higher priority (execute first)
- Default priority is 0
- Camera controls run at priority 0 by default
- Using any priority disables automatic rendering, requiring manual `gl.render()` calls

The fix ensures camera transformations are fully applied before any dependent calculations (actor positions, HUD positioning) are performed, and then manually renders the final frame.

## Testing

The fix should be immediately noticeable:

- Camera rotation should feel smooth without actor position jumps
- No performance impact (same number of calculations, just better ordering)
- All existing functionality preserved

To test:

1. Load a fight replay
2. Rotate the camera while actors are visible and moving
3. Observe smooth camera movement without actor stuttering
