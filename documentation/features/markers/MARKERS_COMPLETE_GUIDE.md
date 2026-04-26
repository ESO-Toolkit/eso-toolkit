# M0R Markers System - Complete Documentation

**Last Updated**: October 16, 2025  
**Status**: Production  
**Related Jira**: ESO-374, ESO-375

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Implementation Guide](#implementation-guide)
5. [UI Components](#ui-components)
6. [Troubleshooting](#troubleshooting)
7. [Reference Documentation](#reference-documentation)

---

## Overview

The M0R (Markers on Replay) system integrates 3D map markers into the ESO Log Aggregator's arena visualization, allowing users to import, view, and interact with combat markers during fight replays.

### What is M0R?

M0R is a community-created tool for marking positions on ESO maps. This integration:
- Imports M0R marker files (`.txt` format)
- Displays markers in 3D arena view
- Supports multiple marker types (shapes, icons, labels)
- Provides real-time marker visualization during replay
- Handles multi-map scenarios and zone scaling

---

## Features

### Core Functionality
✅ **Import M0R Files** - Load marker definitions from `.txt` files  
✅ **3D Visualization** - Render markers in React Three Fiber scene  
✅ **Multiple Shapes** - Support for circles, squares, arrows, icons  
✅ **Dynamic Scaling** - Auto-scale based on zone coordinates  
✅ **Info Panels** - Hover tooltips with marker details  
✅ **Multi-Map Support** - Handle markers across different map instances  
✅ **Bounding Box Filtering** - Show/hide markers by visibility  
✅ **Performance Optimized** - Efficient rendering for large marker sets

### Marker Types

- **📍 Position Markers** - Simple point markers
- **⭕ Area Markers** - Circular or square regions
- **➡️ Directional Markers** - Arrows indicating movement/direction
- **🏷️ Label Markers** - Text labels for callouts
- **🎨 Custom Icons** - Player-defined icon markers

---

## Architecture

### Component Hierarchy

```
<FightReplay3D>
  └── <Arena3D>
      ├── <AnimationFrameActor3D> (players)
      ├── <CameraFollower>
      └── <M0RMarkersLayer>
          ├── <MarkerMesh> (3D geometry)
          ├── <MarkerLabel> (text overlays)
          └── <MarkerInfoPanel> (tooltips)
```

### Data Flow

```
M0R File (.txt)
  ↓
Parser (parseM0RFile)
  ↓
Redux Store (markers slice)
  ↓
Zone Scale Calculator
  ↓
3D Renderer (React Three Fiber)
  ↓
Visual Output
```

### Key Files

| File | Purpose |
|------|---------|
| `src/features/markers/M0RMarkersLayer.tsx` | Main 3D rendering component |
| `src/features/markers/parseM0RFile.ts` | File parser |
| `src/features/markers/M0RMarkersModal.tsx` | Import UI modal |
| `src/store/slices/markersSlice.ts` | Redux state management |
| `src/utils/zoneScaling.ts` | Coordinate transformation |

---

## Implementation Guide

### 1. Import M0R File

```typescript
// User clicks "Load Markers" button
const handleFileUpload = async (file: File) => {
  const text = await file.text();
  const markers = parseM0RFile(text);
  dispatch(setMarkers(markers));
};
```

### 2. Parse Marker Data

```typescript
interface M0RMarker {
  id: string;
  type: 'circle' | 'square' | 'arrow' | 'icon' | 'label';
  position: { x: number; y: number; z: number };
  size: number;
  color: string;
  label?: string;
  rotation?: number;
}
```

### 3. Apply Zone Scaling

```typescript
// Transform M0R coordinates to arena coordinates
const arenaPosition = {
  x: (marker.position.x - zoneOffset.x) * scaleFactor,
  y: marker.position.y,
  z: (marker.position.z - zoneOffset.z) * scaleFactor,
};
```

### 4. Render in 3D

```typescript
<M0RMarkersLayer markers={markers} zoneInfo={currentZone}>
  {markers.map(marker => (
    <MarkerMesh
      key={marker.id}
      position={arenaPosition}
      geometry={getMarkerGeometry(marker.type)}
      material={getMarkerMaterial(marker.color)}
    />
  ))}
</M0RMarkersLayer>
```

---

## UI Components

### M0R Markers Modal

**Location**: `src/features/markers/M0RMarkersModal.tsx`

Modal for importing M0R files with validation and preview.

**Features**:
- File drag-and-drop
- Format validation
- Preview marker count
- Error handling

**Usage**:
```typescript
<M0RMarkersModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onImport={(markers) => dispatch(setMarkers(markers))}
/>
```

### Load Markers Button

**Location**: `src/components/controls/LoadMarkersButton.tsx`

Button to trigger marker import modal.

**Fixes Applied**:
- Performance optimization (debouncing)
- Proper state management
- Accessibility improvements

### Marker Info Panels

**Location**: `src/features/markers/MarkerInfoPanel.tsx`

Hover tooltips showing marker details.

**Content**:
- Marker label
- Position coordinates
- Type and size
- Custom metadata

---

## Troubleshooting

### Common Issues

#### Markers Not Appearing

**Symptoms**: Markers imported but not visible in 3D view

**Causes**:
1. Incorrect zone scaling
2. Markers outside camera view
3. Z-fighting with arena floor

**Solutions**:
```typescript
// 1. Verify zone scaling
console.log('Zone scale factor:', zoneInfo.scaleFactor);

// 2. Check bounding box
const inView = isMarkerInView(marker, camera);

// 3. Adjust Z-offset
marker.position.y += 0.1; // Raise above floor
```

#### Performance Issues with Many Markers

**Symptoms**: FPS drops with 100+ markers

**Solutions**:
- Enable marker batching
- Use instanced rendering
- Implement marker LOD (Level of Detail)
- Cull off-screen markers

```typescript
// Implement culling
const visibleMarkers = markers.filter(m => 
  frustum.containsPoint(m.position)
);
```

#### WebGL Crash

**Symptoms**: Application crashes when loading large marker sets

**Cause**: Too many THREE.js objects created

**Solution**: Use instanced meshes (see `MOR_MARKERS_WEBGL_CRASH_FIX.md`)

```typescript
// Use InstancedMesh for repeated markers
<instancedMesh args={[geometry, material, count]}>
  {/* Update instance matrices */}
</instancedMesh>
```

#### Scale Multiplier Issues

**Symptoms**: Markers appear too small or too large

**Solution**: Apply correct scale multiplier (see `MOR_MARKERS_SCALE_MULTIPLIER_FIX.md`)

```typescript
const scaledSize = marker.size * zoneInfo.scaleFactor * SCALE_MULTIPLIER;
```

---

## Reference Documentation

### Original M0R Documentation
Individual documentation files retained for historical reference:

**Feature Implementation**:
- `M0R_MARKERS_COMPLETE_SUMMARY.md` - Overall system summary
- `M0R_MARKERS_IMPORT_FEATURE.md` - Import feature specifics
- `M0R_MARKERS_IMPORT_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `MOR_MARKERS_IMPLEMENTATION.md` - Core implementation

**3D Integration**:
- `MOR_MARKERS_3D_INTEGRATION_STATUS.md` - Integration status
- `MARKER_3D_BOUNDING_BOX.md` - Bounding box implementation
- `MARKER_BOUNDING_BOX_FILTERING.md` - Filtering logic

**Scaling & Coordinates**:
- `MOR_MARKERS_SCALE_FACTOR_IMPLEMENTATION.md` - Scale factor logic
- `MOR_MARKERS_ZONE_SCALE_INTEGRATION.md` - Zone scaling integration
- `MOR_MARKERS_SCALE_MULTIPLIER_FIX.md` - Scale multiplier fix
- `M0R_MARKERS_POSITIONING_FIX.md` - Positioning corrections

**UI Components**:
- `M0R_MARKERS_UI_VISUAL_GUIDE.md` - Visual design guide
- `M0R_MARKERS_MODAL.md` - Modal component docs
- `M0R_MARKERS_INFO_PANELS.md` - Info panel implementation
- `M0R_MARKERS_SHAPES_IMPLEMENTATION.md` - Shape rendering

**Fixes & Optimizations**:
- `LOAD_MARKERS_BUTTON_FIX.md` - Button fixes
- `M0R_MARKERS_BUTTON_PERFORMANCE_FIX.md` - Performance optimization
- `MOR_MARKERS_WEBGL_CRASH_FIX.md` - WebGL crash resolution

**Multi-Map Support**:
- `MARKER_MULTI_MAP_EXPLANATION.md` - Multi-map handling
- `MAP_MARKERS_COMPLETE_RENAME.md` - Rename refactoring
- `MAP_MARKERS_FILE_REFERENCE.md` - File structure
- `MAP_MARKERS_RENAME_SUMMARY.md` - Rename summary

**Development Tools**:
- `MARKER_DEBUG_GUIDE.md` - Debugging techniques
- `MOR_MARKERS_PREMADES_VALIDATION.md` - Validation testing

---

## API Reference

### parseM0RFile(text: string): M0RMarker[]

Parses M0R file content into marker objects.

**Parameters**:
- `text`: Raw file content

**Returns**: Array of marker objects

**Example**:
```typescript
const markers = parseM0RFile(fileContent);
```

### calculateZoneScale(zoneId: number): ScaleInfo

Calculates scaling factors for zone coordinate transformation.

**Parameters**:
- `zoneId`: ESO zone identifier

**Returns**: Scale info with factor and offset

---

## Testing

### Unit Tests
```powershell
npm test -- markers
```

### E2E Tests
```powershell
npm run test:smoke:e2e -- markers
```

### Manual Testing Checklist
- [ ] Import M0R file with various marker types
- [ ] Verify markers render in correct positions
- [ ] Test multi-map scenarios
- [ ] Check performance with 100+ markers
- [ ] Validate info panels on hover
- [ ] Test marker filtering
- [ ] Verify scaling across different zones

---

## Future Enhancements

### Planned Features
- 🔮 **Marker editing** - Create/edit markers in-app
- 🔮 **Marker animation** - Animated markers for mechanics
- 🔮 **Marker persistence** - Save marker sets
- 🔮 **Marker sharing** - Import/export marker presets
- 🔮 **Advanced filtering** - Filter by type, label, etc.

---

## Related Documentation

- **[Architecture](../../architecture/system-architecture.md)** - Overall system design
- **[3D Rendering](../../architecture/performance-patterns.md)** - Rendering optimization
- **Jira**: ESO-374

---

**Last Updated**: October 16, 2025  
**Maintained By**: Development Team  
**Navigation**: [🏠 Features Index](../INDEX.md) | [📖 Documentation Home](../../INDEX.md)
