# Actor Billboard Square Screen Space Fix

## Problem

Actor name billboards were using a fixed rectangular geometry (8.0 x 2.0 units) that didn't maintain consistent appearance relative to screen space. This caused several issues:

1. **Non-square appearance**: Billboards appeared stretched or compressed depending on camera angle and distance
2. **Inconsistent sizing**: Text size varied dramatically based on camera distance
3. **Poor readability**: Text could become too small when far away or too large when close

## Solution

Updated the ActorNameBillboard component to dynamically scale based on camera distance and maintain consistent screen-space appearance:

### Key Changes

1. **Square Base Geometry**: Changed from `PlaneGeometry(8.0, 2.0)` to `PlaneGeometry(1.0, 1.0)` for consistent scaling
2. **Dynamic Distance Scaling**: Calculate scale based on camera distance to maintain readable size
3. **Aspect Ratio Correction**: Account for text canvas ratio (1024x256) to ensure proper text display
4. **Screen-Space Consistency**: Billboards maintain consistent apparent size regardless of camera distance

### Implementation

```tsx
// Calculate square scaling based on screen space and camera distance
if (meshRef.current) {
  // Get world position of the billboard
  const worldPosition = new THREE.Vector3();
  groupRef.current.getWorldPosition(worldPosition);

  // Calculate distance from camera to billboard
  const distance = camera.position.distanceTo(worldPosition);

  // Calculate scale to maintain consistent screen size
  const referenceDistance = 50; // Reference distance for scaling
  const baseScale = 2.0; // Base scale at reference distance
  const scaleFactor = (distance / referenceDistance) * baseScale;

  // Apply aspect ratio correction for text canvas (4:1 ratio)
  const textAspectRatio = 1024 / 256; // 4:1 canvas ratio
  const widthScale = scaleFactor * textAspectRatio; // Wider for text
  const heightScale = scaleFactor; // Height for readability

  // Apply the scaling
  meshRef.current.scale.set(widthScale, heightScale, 1);
}
```

## Benefits

1. **Consistent Readability**: Text maintains readable size at all camera distances
2. **Square Screen Appearance**: Billboards appear proportionally correct from any angle
3. **Better UX**: More predictable and professional-looking text labels
4. **Performance**: Single geometry shared across all billboards with dynamic scaling

## Files Modified

- **ActorNameBillboard.tsx**: Updated geometry creation and added dynamic scaling logic

## Technical Details

### Scaling Algorithm

1. **Distance Calculation**: Measure 3D distance from camera to billboard world position
2. **Reference Scaling**: Use a reference distance (50 units) as baseline for readable text size
3. **Proportional Scaling**: Scale linearly with distance to maintain consistent apparent size
4. **Aspect Correction**: Account for text canvas aspect ratio (4:1) to prevent text distortion

### Canvas Text Rendering

- Canvas size: 1024x256 pixels (4:1 aspect ratio)
- Text rendered at center with outline for visibility
- Texture updated only when text content changes for performance

### Screen Space Consistency

The scaling ensures that:

- Billboards appear the same size in screen pixels regardless of 3D distance
- Text remains readable at zoom levels from close-up to overview
- Aspect ratio is preserved to prevent stretching or compression

## Testing

To verify the fix:

1. Load a fight replay with actor names enabled
2. Zoom in/out while observing billboard text
3. Rotate camera around actors from different angles
4. Confirm text maintains consistent readable size and square appearance

Expected results:

- Text size appears consistent when zooming in/out
- Billboards don't appear stretched or compressed at any angle
- Text remains readable from both close and far distances
