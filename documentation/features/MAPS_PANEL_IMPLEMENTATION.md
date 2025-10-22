# Maps Experimental Tab - Implementation Summary

**Date**: October 14, 2025  
**Feature**: Maps Panel for Fight Details  
**Status**: ✅ Complete

---

## What Was Implemented

### 1. New MapsPanel Component
**File**: `src/features/report_details/maps/MapsPanel.tsx` (NEW)

A clean, card-based panel that displays:
- **Fight Maps**: All maps associated with the fight
  - Map name (e.g., "Asylum Atrium", "Ancient City of Rockgrove")
  - Map ID (numeric identifier)
  - Map file path (used for texture loading)
  - Primary map indicator (first map gets a "Primary" badge)
  - Numbered badges (Map 1, Map 2, etc.)
  
- **Game Zone Information**: 
  - Zone name (e.g., "Asylum Sanctorium", "Rockgrove")
  - Zone ID (numeric identifier)

**UI Features**:
- Material-UI Cards with elevation for visual hierarchy
- Color-coded chips for easy identification
- Monospace font for IDs and file paths
- Responsive grid layout
- Empty state handling when no maps are available

### 2. TabId Enum Update
**File**: `src/utils/getSkeletonForTab.tsx` (MODIFIED)

Added new tab identifier:
```typescript
export enum TabId {
  // ... existing tabs
  MAPS = 'maps',
}
```

Added skeleton case for loading state:
```typescript
case TabId.MAPS:
  return <GenericTabSkeleton title="Maps" showTable={false} />;
```

### 3. FightDetailsView Integration
**File**: `src/features/report_details/FightDetailsView.tsx` (MODIFIED)

**Changes made**:
1. **Import**: Added TerrainIcon from Material-UI
2. **Lazy Loading**: Added MapsPanel to lazy-loaded components
3. **Experimental Tabs Array**: Added `TabId.MAPS` to experimental tabs
4. **Tab Component**: Added Maps tab with TerrainIcon
5. **Rendering Logic**: Added Suspense-wrapped MapsPanel rendering

---

## How to Use

### Accessing the Maps Tab

1. Navigate to any fight details page
2. Enable **Experimental Features** using the toggle in the top-right corner
3. Scroll through the tabs to find the **Maps** tab (terrain icon 🏔️)
4. Click to view all maps associated with the fight

### What You'll See

**For Single-Map Fights** (most common):
```
┌─────────────────────────────────────────┐
│ Map 1  [Primary]                        │
│                                         │
│ Name: Asylum Atrium                     │
│ Map ID: 1391                            │
│ File: asylum_atrium.jpg                 │
└─────────────────────────────────────────┘

Game Zone
┌─────────────────────────────────────────┐
│ Zone Name: Asylum Sanctorium            │
│ Zone ID: 1000                           │
└─────────────────────────────────────────┘
```

**For Multi-Map Fights** (phase transitions):
```
┌─────────────────────────────────────────┐
│ Map 1  [Primary]                        │
│ Name: Kyne's Aegis                      │
│ Map ID: 1805                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Map 2                                   │
│ Name: Ruins                             │
│ Map ID: 1806                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Map 3                                   │
│ Name: Hidden Barrow                     │
│ Map ID: 1807                            │
└─────────────────────────────────────────┘
```

---

## Technical Details

### Data Source

Maps data comes from the GraphQL `FightFragment`:
```typescript
fight.maps?: Array<{
  __typename?: 'ReportMap';
  file?: string | null;
  id: number;
  name?: string | null;
} | null> | null;
```

Game zone data:
```typescript
fight.gameZone?: { 
  __typename?: 'GameZone'; 
  id: number; 
  name?: string | null 
} | null;
```

### Component Architecture

```
FightDetailsView
├── Tab Component (TerrainIcon)
└── AnimatedTabContent
    └── Suspense
        └── MapsPanel (lazy-loaded)
            ├── Maps Section
            │   └── Card for each map
            └── Game Zone Section
                └── Card with zone info
```

### Why Experimental?

This tab is marked as experimental because:
1. **Data completeness**: Not all fights have complete map data
2. **User interest**: May be more useful for debugging than general use
3. **Future enhancements**: May expand to show map transitions, coordinate ranges, etc.

---

## Future Enhancements

Potential improvements:
- [ ] Show map transition timestamps (when the fight moved between maps)
- [ ] Display coordinate boundaries (minX, maxX, minY, maxY) from bounding box
- [ ] Visualize map changes on a timeline
- [ ] Link to map textures (preview images)
- [ ] Show which phase corresponds to which map
- [ ] Display dungeon pulls per map
- [ ] Integration with M0R Markers zone data for coordinate mapping

---

## Testing Checklist

✅ TypeScript compilation passes  
✅ Component renders without errors  
✅ Lazy loading works correctly  
✅ Empty state displays when no maps available  
✅ Multiple maps display correctly  
✅ Game zone info displays  
✅ Experimental toggle hides/shows tab  
✅ Tab icon (TerrainIcon) displays  
✅ Skeleton loading state works  

---

## Files Modified/Created

### New Files
- `src/features/report_details/maps/MapsPanel.tsx` (126 lines)

### Modified Files
- `src/utils/getSkeletonForTab.tsx` - Added TabId.MAPS enum and skeleton case
- `src/features/report_details/FightDetailsView.tsx` - Added tab, import, and rendering logic

---

## Example Map IDs by Zone

**vAS (Asylum Sanctorium - Zone 1000)**:
- Map 1391: Asylum Atrium
- Map 1392: Upper Level

**vRG (Rockgrove - Zone 1263)**:
- Map 2004: Ancient City of Rockgrove
- Map 2005: Xanmeer Corridors
- Map 2006: Tower of the Five Crimes

**vKA (Kyne's Aegis - Zone 1196)**:
- Map 1805: Kyne's Aegis
- Map 1806: Ruins (Falgravn)
- Map 1807: Hidden Barrow (Floor 2)
- Map 1808: Ritual Vault (Floor 3)

**vDSR (Dreadsail Reef - Zone 1344)**:
- Map 2164: Dreadsail Beach
- Map 2165: Bloodsport Arena (Twins)
- Map 2166: Reef Warren
- Map 2179: Tempest Heights (Bird)
- Map 2180: Reef Caverns (Crab)
- Map 2181: Coral Cavern (Reef Guardian)
- Map 2182: Coral Cavern Whorlpools
- Map 2183: Fleet Queen's Parlors
- Map 2184: Coral Caldera (Taleria)

---

**Implementation Complete** ✅  
All code passes type checking and follows existing patterns. Feature is production-ready in experimental tab section.
