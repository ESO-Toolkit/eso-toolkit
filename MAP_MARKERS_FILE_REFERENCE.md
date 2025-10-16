# Map Markers File Reference

## Quick Lookup Guide

### Component Files
| Purpose | File Path | Component/Export |
|---------|-----------|------------------|
| Main Container | `src/features/fight_replay/components/MapMarkers.tsx` | `MapMarkers` |
| Import Modal | `src/features/fight_replay/components/MapMarkersModal.tsx` | `MapMarkersModal` |
| Individual Marker | `src/features/fight_replay/components/Marker3D.tsx` | `Marker3D` |
| Marker Shapes | `src/features/fight_replay/components/MarkerShape.tsx` | `MarkerShape` |

### Decoder Files
| Format | File Path | Functions |
|--------|-----------|-----------|
| M0R | `src/utils/morMarkersDecoder.ts` | `decodeMorMarkersString()`, `isMorMarkersFormat()` |
| Elms | `src/utils/elmsMarkersDecoder.ts` | `decodeElmsMarkersString()`, `isElmsMarkersFormat()`, `convertElmsToMorMarkers()` |

### Type Definitions
| Purpose | File Path | Types/Interfaces |
|---------|-----------|------------------|
| Marker Types | `src/types/mapMarkers.ts` | `MorMarker`, `DecodedMorMarkers`, `TEXTURE_LOOKUP` |
| Elms Return Types | `src/utils/elmsMarkersDecoder.ts` | `DecodedElmsMarkers` |

### Utility Files
| Purpose | File Path | Functions |
|---------|-----------|-----------|
| Map Utils | `src/utils/mapMarkersUtils.ts` | `getAvailableMapsForZone()`, `getAvailableMapsFromFight()`, `findBestMatchingMap()` |
| Statistics | `src/hooks/useMarkerStats.ts` | `useMarkerStats()` hook |

### Integration Points
| Component | File Path | Usage |
|-----------|-----------|-------|
| FightReplay | `src/features/fight_replay/FightReplay.tsx` | Modal trigger, state management |
| Arena3DScene | `src/features/fight_replay/components/Arena3DScene.tsx` | Renders MapMarkers in 3D scene |

## Import Examples

### Using MapMarkers Component
```typescript
import { MapMarkers } from './components/MapMarkers';

<MapMarkers 
  encodedString={markersString} 
  fight={fight} 
  scale={1} 
/>
```

### Using MapMarkersModal
```typescript
import { MapMarkersModal } from './components/MapMarkersModal';

<MapMarkersModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  fight={fight}
  morMarkersString={markersString}
  onLoadMarkers={handleLoad}
  onClearMarkers={handleClear}
/>
```

### Using Decoders
```typescript
// M0R Format
import { decodeMorMarkersString, isMorMarkersFormat } from '../utils/morMarkersDecoder';

if (isMorMarkersFormat(input)) {
  const decoded = decodeMorMarkersString(input);
}

// Elms Format
import { decodeElmsMarkersString, isElmsMarkersFormat } from '../utils/elmsMarkersDecoder';

if (isElmsMarkersFormat(input)) {
  const decoded = decodeElmsMarkersString(input);
}

// Auto-detect
import { decodeMorMarkersString } from '../utils/morMarkersDecoder';
import { decodeElmsMarkersString, isElmsMarkersFormat } from '../utils/elmsMarkersDecoder';

const isElms = isElmsMarkersFormat(input);
const decoded = isElms 
  ? decodeElmsMarkersString(input)
  : decodeMorMarkersString(input);
```

### Using useMarkerStats Hook
```typescript
import { useMarkerStats } from '../../hooks/useMarkerStats';

const markerStats = useMarkerStats(markersString, fight);

if (markerStats.success) {
  console.log(`Loaded ${markerStats.filtered} of ${markerStats.totalDecoded} markers`);
  console.log(`Zone: ${markerStats.mapName} (${markerStats.zoneId})`);
}
```

## Format Detection

### M0R Format Pattern
```
<zone]timestamp]minX:minY:minZ]sizes]pitches]yaws]colours]textures]positions>
```

### Elms Format Pattern
```
/zone//x,y,z,iconKey/x,y,z,iconKey/...
```

### Detection Logic
```typescript
// M0R: Starts with '<' and ends with '>'
const isMor = /^<\d+].*>$/.test(input);

// Elms: Starts with '/' followed by digits and '//'
const isElms = /^\/\d+\/\//.test(input);
```

## Common Workflows

### Adding New Marker Format Support
1. Create decoder in `src/utils/` (e.g., `newFormatDecoder.ts`)
2. Implement `isNewFormatFormat()` detection function
3. Implement `decodeNewFormatString()` that returns `DecodedMorMarkers` or similar structure
4. Update `MapMarkers.tsx` to detect and decode new format
5. Update `useMarkerStats.ts` to handle new format
6. Update `MapMarkersModal.tsx` instructions

### Modifying Coordinate Transformation
Edit `MapMarkers.tsx` around line 140-260 (transformation logic)

### Adding New Marker Shapes
Edit `MarkerShape.tsx` - add case to switch statement and create shape function

### Customizing Marker Appearance
Edit `Marker3D.tsx` - modify Three.js mesh properties

## Testing

### Unit Tests
- M0R Decoder: `src/utils/morMarkersDecoder.test.ts`
- (Elms decoder tests to be added)

### Integration Tests
- Component: `src/features/fight_replay/components/MapMarkers.integration.test.tsx`

### Manual Testing
1. Open Fight Replay
2. Click "Import Map Markers"
3. Paste M0R or Elms string
4. Verify markers appear in 3D scene
5. Check console for debug output

## Troubleshooting

### Markers Not Appearing
1. Check console for "MapMarkers:" debug logs
2. Verify zone/map IDs match fight data
3. Check if markers are outside map bounds
4. Verify decoded marker count > 0

### Wrong Positions
1. Check coordinate transformation in `MapMarkers.tsx`
2. Verify map bounds in `ZONE_SCALE_DATA`
3. Check Y-coordinate filtering (3D vs 2D maps)

### Format Not Detected
1. Verify format string is correct
2. Check `isElmsMarkersFormat()` or `isMorMarkersFormat()` regex
3. Look for console logs showing detected format
