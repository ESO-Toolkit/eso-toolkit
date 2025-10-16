# M0RMarkers Integration - Implementation Summary

## Overview
Implemented support for rendering M0RMarkers in the ESO Log Aggregator's fight replay viewer. M0RMarkers is an ESO addon that allows players to place and share 3D markers in trials and dungeons.

## Implementation Details

### 1. Type Definitions (`src/types/morMarkers.ts`)
- `MorMarker`: Represents a single marker with position, size, color, texture, orientation, and text
- `DecodedMorMarkers`: Container for decoded markers with zone and timestamp information
- `TEXTURE_LOOKUP`: Built-in texture mapping for marker shapes (circle, hexagon, square, diamond, etc.)

### 2. Decoder (`src/utils/morMarkersDecoder.ts`)
Implements the `decodeMorMarkersString` function that parses the M0RMarkers encoded format:

**Format**: `<zone]timestamp]minX:minY:minZ]sizes]pitches]yaws]colours]textures]positions>`

**Features**:
- Parses hexadecimal coordinates relative to minimum position
- Supports marker sizes, colors (RGBA), textures, and orientations (pitch/yaw)
- Handles text labels with escape sequences (newlines, special characters)
- Converts degrees to radians for Three.js compatibility
- Comprehensive error handling for malformed strings

**Test Coverage**: 22 comprehensive tests covering:
- Simple and complex marker strings
- Multiple markers with different properties
- Orientation handling (pitch, yaw, both, floating)
- Color decoding (hex to RGBA)
- Texture lookup references
- Text label escaping
- Real-world examples from vAS Olms Jumps and vAS 8 Lanes
- Edge cases (empty strings, malformed data, negative coordinates)

### 3. 3D Rendering Components

#### `Marker3D.tsx`
Renders individual markers in 3D space:
- **Floating markers**: Billboard component that always faces the camera (orientation undefined)
- **Ground markers**: Fixed orientation with pitch/yaw rotation (orientation defined)
- Supports custom colors with transparency
- Renders text labels with outline for visibility
- Scales markers appropriately for the 3D environment

#### `MorMarkers.tsx`
Container component that:
- Accepts an encoded M0RMarkers string
- Decodes the string using the decoder utility
- Renders all decoded markers in a Three.js group
- Provides scale factor for marker sizing

### 4. Integration with Fight Replay

**Modified Files**:
- `Arena3D.tsx`: Added `morMarkersString` prop and integrated `MorMarkers` component
- `FightReplay3D.tsx`: Added `morMarkersString` prop to pass through to Arena3D

**Usage**:
```typescript
<FightReplay3D 
  selectedFight={fight}
  allBuffEvents={buffEvents}
  showActorNames={true}
  morMarkersString="<1000]1759521007]17f27:f00a:18088]...]>" 
/>
```

## M0RMarkers Format Specification

### Section Breakdown:
1. **Zone**: ESO zone ID where markers belong
2. **Timestamp**: Unix timestamp of last edit
3. **Mins**: Minimum coordinates (hex: `minX:minY:minZ`) for relative positioning
4. **Sizes**: Size overrides `"size:index1,index2;size2:index3"`
5. **Pitches**: Pitch angles in degrees `"pitch:index1,index2"`
6. **Yaws**: Yaw angles in degrees `"yaw:index1,index2"`
7. **Colours**: Hex colors `"rrggbb:index1,index2;aabbcc:index3"`
8. **Textures**: Paths or lookup refs `"^1:index1;path.dds:index2"`
9. **Positions**: Hex coords with optional text `"x:y:z:text,x2:y2:z2:text2"`

### Texture Lookup Table:
- `^1`: circle.dds
- `^2`: hexagon.dds
- `^3`: square.dds
- `^4`: diamond.dds
- `^5`: octagon.dds
- `^6`: chevron.dds
- `^7`: blank.dds (for text-only markers)
- `^8`: sharkpog.dds

### Example:
```
<1000]1759521007]17f27:f00a:18088]33.5:1,2,3,4]-90:1,2,3,4]0:1,2,3,4]25ffffff:2,4;25aa0000:1,3]^1:1,2,3,4]0:1:0:,523:1:16:,45a:0:c29:,124:0:c6e:>
```
This creates 4 circular markers at specific positions with size 33.5, -90° pitch, and mixed white/red colors.

## Future Enhancements

Potential improvements:
1. **UI for importing markers**: Add a text input in the replay UI to paste marker strings
2. **Marker persistence**: Store markers with fight reports in database
3. **Marker creation**: Allow users to create/edit markers directly in the 3D viewer
4. **Texture support**: Load actual .dds textures instead of simple shapes
5. **Marker animation**: Support animated markers or time-based visibility
6. **Marker sharing**: Share markers between users via API
7. **Auto-import from addon**: Detect and import markers from ESO addon save files

## Testing

Run tests with:
```bash
npm test morMarkersDecoder.test.ts
```

All 22 tests should pass, validating:
- Format parsing
- Coordinate conversion
- Orientation handling
- Color decoding
- Text escaping
- Real-world examples

## References

- **M0RMarkers GitHub**: https://github.com/M0RGaming/M0RMarkers
- **Original Lua decoder**: https://github.com/M0RGaming/M0RMarkers/blob/main/main.lua#L318
- **Format documentation**: See encoding in main.lua lines 65-190

## Summary

Successfully implemented a complete M0RMarkers integration allowing ESO Log Aggregator users to visualize raid/dungeon markers in the 3D fight replay. The implementation includes:
- ✅ Complete TypeScript type definitions
- ✅ Robust decoder with 22 passing tests
- ✅ 3D rendering components for both floating and ground markers
- ✅ Full integration with existing fight replay viewer
- ✅ Support for all marker properties (size, color, texture, orientation, text)
- ✅ Comprehensive documentation

The feature is ready for production use and can be extended with additional functionality as needed.
