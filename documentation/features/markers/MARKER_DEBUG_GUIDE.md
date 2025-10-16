# M0R Markers Debug Guide

## Your Sample Marker String

```
<1196]1759814404]5e77:391b:25d2]0.8:34,35,36,37]]]ff0000:5,10,15,20,29;0000ff:1,2,3,4,6,7,8,9,11,12,13,14,16,17,18,19,21,22,23,24,30,31,32,33;00ff00:25,26,27,28;ffffff:34,35,36,37]^4:1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33;^7:34,35,36,37]9f9e:29e2:14f3f:1,a0b1:29d3:14fec:2,a1c1:29d3:14ee6:3,a142:29d2:14d9f:4,a05f:29d3:14e73:,a4ef:29d7:1466a:1,a456:29dc:1480b:2,a5db:2a2e:14975:3,a7b2:2a56:1491b:4,a691:2a2c:147a3:,9f9e:29e2:14f3f:1,a0b1:29d3:14fec:2,a1c1:29d3:14ee6:3,a142:29d2:14d9f:4,a05f:29d3:14e73:,a4ef:29d7:1466a:1,a456:29dc:1480b:2,a5db:2a2e:14975:3,a7b2:2a56:1491b:4,a691:2a2c:147a3:,485:1bbd:0:4,4a5:1bbd:2ac:3,1ea:1bbd:2ce:2,1df:1bbd:11:1,0:1bbd:159:1,699:1bbd:156:1,3:0:14c:1,6c4:0:147:1,15e8e:2be3:f24e:,15d42:2bb8:f238:1,15ddf:2bc6:f3a0:2,15f5a:2bdd:f3b6:3,1603d:2bfe:f2a5:4,a84c:2a8a:15294:R,a6b0:2a3a:1540f:L,15e65:2cb9:fbf3:L,1611d:2c9a:fb2d:R>
```

**Zone**: 1196 (Kyne's Aegis / vKA)
**Number of markers**: 37 markers

## Debug Steps

### 1. Open Browser Console
When viewing the replay, open your browser's developer console (F12) to see debug messages.

### 2. Load the Markers
1. Navigate to a fight's replay view
2. Expand the "M0R Markers Import" section
3. Paste the marker string into the text field
4. Click "Load Markers"

### 3. Check Console Output

You should see one of these message patterns:

#### ✅ **Success Pattern** (markers render):
```
MorMarkers: Successfully decoded 37 markers from zone 1196
MorMarkers: Found zone scale data { zoneName: "Kyne's Aegis", zoneId: 1196, mapId: 1805 }
MorMarkers: Rendering 37 markers with scale 1
```

#### ❌ **Missing Fight Data** (most likely issue):
```
MorMarkers: Successfully decoded 37 markers from zone 1196
MorMarkers: Fight missing gameZone or maps data { hasGameZone: false, hasMaps: true, mapsLength: 1, fightName: "..." }
MorMarkers: Not rendering - no transformed markers { hasTransformedMarkers: false, markersLength: 0 }
```

**Solution**: The fight you're viewing doesn't have proper zone data. Try a different fight, or check that your combat log includes zone information.

#### ❌ **Wrong Zone/Map**:
```
MorMarkers: Successfully decoded 37 markers from zone 1196
MorMarkers: No map data found for mapId 1234 in zone 1196 Available maps: [1805, 1806, 1807, 1808]
MorMarkers: Not rendering - no transformed markers { hasTransformedMarkers: false, markersLength: 0 }
```

**Solution**: The fight is in a different map within vKA. Your markers are for mapId 1805 (main Kyne's Aegis arena).

#### ❌ **Decoding Failed**:
```
MorMarkers: Failed to decode M0RMarkers string: Error: ...
MorMarkers: Not rendering - no transformed markers { hasTransformedMarkers: false, markersLength: 0 }
```

**Solution**: The marker string is malformed. Check for copy/paste errors.

## Common Issues

### Issue 1: Fight has no gameZone data
**Symptom**: Console shows "Fight missing gameZone or maps data"

**Cause**: The combat log didn't capture zone information, or the fight was created before zone tracking was implemented.

**Fix**: 
- Use a fight from a recent combat log that includes zone data
- Or load markers into a fight that has proper zone information

### Issue 2: Zone mismatch
**Symptom**: Your markers are for zone 1196 (vKA) but you're viewing a vAS fight (zone 1000)

**Cause**: Markers are zone-specific and won't render in different zones.

**Fix**: 
- Load vKA markers into a vKA fight
- Or use markers that match your current fight's zone

### Issue 3: Map mismatch within same zone
**Symptom**: Zone matches but mapId doesn't match available maps

**Cause**: Your markers might be for a different floor/area within the same trial.

**Fix**: 
- Check which floor/area your fight is in
- Kyne's Aegis has 4 maps: 1805 (main), 1806 (Falgravn Ruins), 1807 (Hidden Barrow), 1808 (Ritual Vault)

### Issue 4: Markers render but appear in wrong location
**Symptom**: Markers render but are offset from expected positions

**Cause**: Coordinate transformation issue or wrong zone scale data.

**Fix**: 
- Verify the fight's zone/map matches the marker string
- Check console logs for coordinate warnings

## Testing with Known Good Data

If you want to test with a known working example, try this vAS marker string in a vAS fight:

```
<1000]0]63360:75410:61450]1A,1A,1A,1A,1A,1A,1A,1A]0,0,0,0,0,0,0,0]0,0,0,0,0,0,0,0]^3^2^9^7^0^0,^3^7^5^0^0^0,^3^7^5^0^0^0,^3^7^5^0^0^0,^3^7^5^0^0^0,^3^7^5^0^0^0,^3^2^9^7^0^0,^3^7^5^0^0^0]^3,^6,^1,^2,^4,^5,^3,^6]16940:8000:16420,16940:37450:16420,16940:0:16420,18080:18880:16420,15800:18880:16420,16940:18880:17560,16940:8000:16420,16940:29450:16420>
```

**Zone**: 1000 (Asylum Sanctorium / vAS)
**Markers**: 8 markers for Olms jumps

## Next Steps

1. **Run the dev server**: `npm run dev`
2. **Navigate to a fight replay**
3. **Open console** (F12)
4. **Load your markers**
5. **Check the console messages**
6. **Report back what you see!**

The debug logs will tell us exactly why the markers aren't displaying. Most likely it's a zone/map data mismatch between the marker string and the fight you're viewing.
