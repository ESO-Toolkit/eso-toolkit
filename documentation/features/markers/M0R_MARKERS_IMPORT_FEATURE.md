# M0R Markers Import Feature

## Overview
The Fight Replay now includes the ability to import and display M0RMarkers directly in the 3D arena view. This allows users to visualize raid markers alongside combat replay data.

## Usage

### Accessing the Feature
1. Navigate to any fight's replay view: `/report/{reportId}/fight/{fightId}/replay`
2. Look for the "M0R Markers Import" collapsible panel above the 3D arena
3. Click to expand the panel

### Importing Markers
1. Paste a M0RMarkers encoded string into the text field
2. Click the **"Load Markers"** button to apply the markers
3. Markers will appear in the 3D arena
4. Click **"Clear"** to remove markers and reset the input field

**Note**: Markers are loaded on-demand via button click to avoid performance issues and potential WebGL context crashes from real-time parsing.

### M0RMarkers Format
M0RMarkers uses a compressed format:
```
<zone]timestamp]minX:minY:minZ]sizes]pitches]yaws]colours]textures]positions>
```

**Example** (vAS Olms Jumps preset):
```
<1000]0]63360:75410:61450]1A,1A,1A,1A,1A,1A,1A,1A]0,0,0,0,0,0,0,0]0,0,0,0,0,0,0,0]^3^2^9^7^0^0,^3^7^5^0^0^0,^3^7^5^0^0^0,^3^7^5^0^0^0,^3^7^5^0^0^0,^3^7^5^0^0^0,^3^2^9^7^0^0,^3^7^5^0^0^0]^3,^6,^1,^2,^4,^5,^3,^6]16940:8000:16420,16940:37450:16420,16940:0:16420,18080:18880:16420,15800:18880:16420,16940:18880:17560,16940:8000:16420,16940:29450:16420>
```

### Features
- **Collapsible UI**: Panel can be collapsed when not in use
- **Button-Based Loading**: Markers load on-demand to prevent WebGL context issues
- **Character Count**: Shows length of input for validation
- **Format Hints**: Placeholder and helper text guide the format
- **Monospace Font**: Uses monospace font for better readability of encoded strings
- **Success Feedback**: Visual confirmation when markers are loaded
- **Clear Function**: Easy button to clear both input and loaded markers

## Technical Details

### Architecture
- **Component**: `FightReplay.tsx` manages the marker string state
- **Prop Flow**: String passes through `FightReplay3D` → `Arena3D` → `MorMarkers` component
- **Decoder**: Uses `morMarkersDecoder.ts` to parse the string format
- **Zone Data**: Integrates with `zoneScaleData.ts` for coordinate mapping

### Coordinate System
- M0RMarkers use **absolute ESO world coordinates** in centimeters
- Zone scale data provides boundaries for each trial zone/map
- Coordinates are NOT normalized (ranges 81.8m - 1965.7m typically)
- Format includes compression via minimum coordinate + relative offsets

### Validated Against
All 19 official premade marker presets from the M0RMarkers addon:
- ✅ vAS (Asylum Sanctorium) - 2 presets
- ✅ vOC (Ossein Cage) - 2 presets  
- ✅ vSS (Sunspire) - 2 presets
- ✅ vRG (Rockgrove) - 3 presets
- ✅ vLC (Lucent Citadel) - 2 presets
- ✅ vKA (Kyne's Aegis) - 2 presets
- ✅ vDSR (Dreadsail Reef) - 1 preset
- ✅ vSE (Sanity's Edge) - 5 presets

See `MOR_MARKERS_PREMADES_VALIDATION.md` for complete test results.

## Future Enhancements
- [ ] Save imported markers per fight/report
- [ ] Export markers from replay view
- [ ] Marker editor UI (create/edit markers visually)
- [ ] Preset library browser
- [ ] Auto-detect zone from fight data
- [ ] Marker visibility toggle during playback
- [ ] Support for other marker formats (Elm's Markers, Akamatsu)

## Related Files
- `src/features/fight_replay/FightReplay.tsx` - Main UI component
- `src/features/fight_replay/components/FightReplay3D.tsx` - 3D view component
- `src/features/fight_replay/components/Arena3D.tsx` - Arena rendering
- `src/features/fight_replay/components/MorMarkers.tsx` - Marker rendering
- `src/utils/morMarkersDecoder.ts` - Decoder implementation
- `src/utils/morMarkersDecoder.test.ts` - Comprehensive tests (41 passing)
- `src/types/morMarkers.ts` - Type definitions and texture lookup
- `src/types/zoneScaleData.ts` - Zone coordinate boundaries

## Credits
- M0RMarkers addon: [M0RGaming/M0RMarkers](https://github.com/M0RGaming/M0RMarkers)
- Zone scale data: [sheumais/elmseditor](https://github.com/sheumais/elmseditor)
