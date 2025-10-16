# M0R Markers Shape Implementation

## Overview
Implemented support for the various marker shapes defined by the M0RMarkers ESO addon, replacing our simplified circle-only rendering with accurate shape representations.

## Supported Shapes

### Built-in M0RMarkers Shapes
Based on `bgTexture` path, we now render:

1. **Circle** (`M0RMarkers/textures/circle.dds`)
   - Rendered as: `CircleGeometry` with 32 segments
   - Default fallback for unknown textures

2. **Hexagon** (`M0RMarkers/textures/hexagon.dds`)
   - Rendered as: 6-sided polygon using `ShapeGeometry`
   - Regular hexagon with flat top

3. **Octagon** (`M0RMarkers/textures/octagon.dds`)
   - Rendered as: 8-sided polygon using `ShapeGeometry`
   - Regular octagon

4. **Square** (`M0RMarkers/textures/square.dds`)
   - Rendered as: 4-sided polygon using `ShapeGeometry`
   - Axis-aligned square

5. **Diamond** (`M0RMarkers/textures/diamond.dds`)
   - Rendered as: 4-sided polygon rotated 45 degrees
   - Used for "squaretwo" variants in Elms conversion

6. **Chevron** (`M0RMarkers/textures/chevron.dds`)
   - Rendered as: V-shaped arrow pointing upward
   - Used for directional markers (commonly lime green in Elms)

7. **Blank** (`M0RMarkers/textures/blank.dds`)
   - Rendered as: Circle (text-only marker)
   - Used for text labels without prominent background

8. **SharkPog** (`M0RMarkers/textures/sharkpog.dds`)
   - Rendered as: Circle (placeholder)
   - Could be replaced with custom SVG in the future

## Implementation Details

### File Structure
```
src/features/fight_replay/components/
├── MarkerShape.tsx       # New: Shape geometry renderer
├── Marker3D.tsx          # Updated: Uses MarkerShape
└── MorMarkers.tsx        # Unchanged: Container component
```

### MarkerShape Component
**Purpose**: Render different geometric shapes based on texture path

**Props**:
```typescript
interface MarkerShapeProps {
  texturePath: string;  // e.g., "M0RMarkers/textures/hexagon.dds"
  size: number;         // Diameter in meters
  color: THREE.Color;   // RGB color
  opacity: number;      // Alpha channel (0-1)
}
```

**Shape Creation**:
- Uses `THREE.Shape` for custom polygons
- Creates `ShapeGeometry` from shapes
- Fallback to `CircleGeometry` for circle/blank/unknown

### Shape Generation Functions

#### `createHexagonShape(radius)`
```typescript
// 6-sided polygon
const sides = 6;
const angleStep = (Math.PI * 2) / sides;
// Starts at top, draws clockwise
```

#### `createOctagonShape(radius)`
```typescript
// 8-sided polygon
const sides = 8;
const angleStep = (Math.PI * 2) / sides;
```

#### `createDiamondShape(radius)`
```typescript
// 4 points: top, right, bottom, left
// Forms a diamond shape (45° rotated square)
```

#### `createSquareShape(radius)`
```typescript
// 4 corners at ±halfSize
// Axis-aligned square
```

#### `createChevronShape(radius)`
```typescript
// V-shaped arrow
// Outer V points + inner V points = thick arrow arms
```

### Texture Path Parsing
```typescript
function getShapeFromTexture(texturePath: string): string {
  // "M0RMarkers/textures/circle.dds" -> "circle"
  const match = texturePath.match(/\/([^/]+)\.dds$/i);
  return match?.[1]?.toLowerCase() || 'circle';
}
```

### Integration with Marker3D

**Before**:
```typescript
<mesh>
  <circleGeometry args={[markerSize / 2, 32]} />
  <meshBasicMaterial color={color} opacity={opacity} transparent={true} />
</mesh>
```

**After**:
```typescript
<MarkerShape
  texturePath={marker.bgTexture}
  size={markerSize}
  color={color}
  opacity={marker.colour[3]}
/>
```

## Visual Comparison

### Common M0RMarkers Usage Patterns

| Use Case | Shape | Color | Example |
|----------|-------|-------|---------|
| Tank position | Hexagon | Orange | "MT", "OT" markers |
| Player positions | Square | Various | Numbered squares (1-12) |
| Add spawns | Diamond | Red/Orange | Numbered diamonds |
| Direction | Chevron | Lime Green | Arrow markers |
| Text labels | Blank | White | Letters, numbers |
| Boss position | Circle | Red | Boss icon |
| Safe spots | Octagon | Green | Safe zone markers |

### Elms Markers Conversion
When converting Elms markers, the shapes map as:
- `square_*` → Square geometry
- `squaretwo_*` → Diamond geometry
- `marker_*` → Chevron geometry
- Letters/numbers → Blank (circle with text)

## Performance Considerations

### Geometry Caching
- `useMemo` in `MarkerShape` ensures geometry is only created once per marker
- Geometries are reused when size/shape doesn't change
- Three.js efficiently handles multiple instances of same geometry

### Shape Complexity
| Shape | Vertices | Performance Impact |
|-------|----------|-------------------|
| Circle | 32 | Low (native geometry) |
| Hexagon | 6 | Very Low |
| Octagon | 8 | Very Low |
| Square | 4 | Very Low |
| Diamond | 4 | Very Low |
| Chevron | 7 | Very Low |

All custom shapes use fewer vertices than circles, so performance is excellent.

## Future Enhancements

### Custom Textures
Could support custom DDS texture loading:
```typescript
// Load actual texture instead of geometry
if (!isBuiltInShape(texturePath)) {
  return <TexturedPlane texture={texturePath} />;
}
```

### SVG Support
For complex markers like SharkPog:
```typescript
case 'sharkpog':
  return <SVGShape svgPath={sharkPogSVG} />;
```

### Texture Atlas
Bundle common textures into a sprite sheet:
```typescript
<Sprite 
  texture={atlas} 
  frame={getFrameForShape(shapeType)} 
/>
```

## Testing

### Test Scenarios

**Test 1: Circle Markers**
- Create marker with `bgTexture: "M0RMarkers/textures/circle.dds"`
- Verify circular shape renders
- Check size matches specification

**Test 2: Hexagon Markers**
- Create marker with `bgTexture: "M0RMarkers/textures/hexagon.dds"`
- Verify 6-sided polygon with flat top
- Common for "MT"/"OT" tank markers

**Test 3: Diamond Markers**
- Create marker with `bgTexture: "M0RMarkers/textures/diamond.dds"`
- Verify 45-degree rotated square
- Often used for numbered add spawns

**Test 4: Text-Only Markers (Blank)**
- Create marker with `bgTexture: "M0RMarkers/textures/blank.dds"`
- Verify circle background (barely visible)
- Text should be prominent

**Test 5: Unknown Texture Fallback**
- Create marker with custom/unknown texture path
- Should fallback to circle geometry gracefully

## Compatibility

### M0RMarkers Addon
✅ **Compatible** - Renders the same visual shapes
❌ **Limitation** - Doesn't load actual DDS textures (uses geometry instead)

### Elms Markers
✅ **Compatible** - Conversion maps Elms icons to appropriate shapes
✅ **Improved** - More accurate representation than Elms' texture-based system

## Documentation References

### Related Files
- `src/types/morMarkers.ts` - Type definitions and texture lookup
- `src/utils/morMarkersDecoder.ts` - Decoding logic (bgTexture handling)
- `src/features/fight_replay/components/Marker3D.tsx` - Main marker renderer
- `src/features/fight_replay/components/MarkerShape.tsx` - Shape geometry creator

### External References
- M0RMarkers GitHub: https://github.com/M0RGaming/M0RMarkers
- Texture definitions: `M0RMarkers/main.lua` (builtInTextureList)
- Elms conversion: `M0RMarkers/elmsConvert.lua` (elmsMap)

## Changelog
- **2025-10-15**: Initial implementation of marker shapes
- **2025-10-15**: Added support for circle, hexagon, octagon, square, diamond, chevron
- **2025-10-15**: Integrated MarkerShape component into Marker3D renderer
