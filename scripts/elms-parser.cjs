/**
 * Parser for ELMS marker input format
 * Format: /zoneId//x,y,z,playerId/
 */

function parseELMSMarkerInput(input) {
  const markers = [];
  const seenMarkers = new Set();
  let duplicateCount = 0;

  // Split by // and filter out empty entries
  const entries = input.split('//').filter(entry => entry.trim() !== '');

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i].trim();
    
    // Skip entries that start with / (zone markers)
    if (entry.startsWith('/')) {
      continue;
    }

    // Parse coordinate,playerId format: "x,y,z,playerId"
    const parts = entry.split(',');
    if (parts.length !== 4) {
      continue;
    }

    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);  
    const z = parseInt(parts[2], 10);
    const playerId = parseInt(parts[3], 10);

    // Get zone ID from previous entry
    let zoneId = 1196; // Default zone ID seen in the data
    if (i > 0) {
      const prevEntry = entries[i - 1];
      if (prevEntry.startsWith('/')) {
        const zoneMatch = prevEntry.match(/\/(\d+)\//);
        if (zoneMatch) {
          zoneId = parseInt(zoneMatch[1], 10);
        }
      }
    }

    // Check for duplicates
    const markerKey = `${zoneId}-${x}-${y}-${z}-${playerId}`;
    if (seenMarkers.has(markerKey)) {
      duplicateCount++;
      continue;
    }
    seenMarkers.add(markerKey);

    // Validate parsed numbers
    if (!isNaN(x) && !isNaN(y) && !isNaN(z) && !isNaN(playerId)) {
      markers.push({ zoneId, x, y, z, playerId });
    }
  }

  // Generate summary
  const uniqueZones = Array.from(new Set(markers.map(m => m.zoneId)));
  const uniquePlayers = Array.from(new Set(markers.map(m => m.playerId)));

  return {
    markers,
    summary: {
      totalMarkers: markers.length,
      uniqueZones,
      uniquePlayers,
      duplicateMarkers: duplicateCount,
    }
  };
}

// Parse the provided input
const input = `/1196//113786,25771,72172,25//1196//114260,25778,72203,26//1196//24979,21670,8047,13//1196//24416,21703,7763,24//1196//23788,21701,7843,34//1196//24538,21670,8249,25//1196//23980,21670,8432,35//1196//25671,21704,7609,27//1196//26372,21695,7862,37//1196//26372,21695,7862,37//1196//25590,21671,8116,26//1196//26226,21680,8204,36//1196//24844,21670,8999,1//1196//25615,21670,9010,2//1196//23149,21670,9932,2//1196//24812,21670,9624,24//1196//24994,21670,10028,13//1196//24524,21670,9078,34//1196//24570,21670,10242,25//1196//23915,21670,10554,35//1196//25298,21670,10426,26//1196//25760,21670,10984,36//1196//25515,21670,9695,27//1196//26137,21670,9191,37//1196//65531,25276,95399,13//1196//65305,25277,95703,24//1196//65656,25275,95788,25//1196//65939,25317,95411,26//1196//65782,25281,95024,27//1196//114030,25814,71912,13//1196//113643,25775,71848,24//1196//114346,25828,71938,27//1196//113786,25771,72172,25//1196//114260,25778,72203,26//1196//24979,21670,8047,13//1196//24416,21703,7763,24//1196//23788,21701,7843,34//1196//24538,21670,8249,25//1196//23980,21670,8432,35//1196//25671,21704,7609,27//1196//26372,21695,7862,37//1196//26372,21695,7862,37//1196//25590,21671,8116,26//1196//26226,21680,8204,36//1196//24844,21670,8999,1//1196//25615,21670,9010,2//1196//23149,21670,9932,2//1196//24812,21670,9624,24//1196//24994,21670,10028,13//1196//24524,21670,9078,34//1196//24570,21670,10242,25//1196//23915,21670,10554,35//1196//25298,21670,10426,26//1196//25760,21670,10984,36//1196//25515,21670,9695,27//1196//26137,21670,9191,37//1196//65531,25276,95399,13//1196//65305,25277,95703,24//1196//65656,25275,95788,25//1196//65939,25317,95411,26//1196//65782,25281,95024,27//1196//114030,25814,71912,13//1196//113643,25775,71848,24//1196//114346,25828,71938,27/`;

const result = parseELMSMarkerInput(input);

console.log('=== ELMS Marker Parse Results ===');
console.log(`Total markers: ${result.summary.totalMarkers}`);
console.log(`Unique zones: ${result.summary.uniqueZones.join(', ')}`);
console.log(`Unique players: ${result.summary.uniquePlayers.join(', ')}`);
console.log(`Duplicate markers removed: ${result.summary.duplicateMarkers}`);

console.log('\n=== Sample Markers ===');
result.markers.slice(0, 10).forEach((marker, index) => {
  console.log(`${index + 1}. Zone ${marker.zoneId}: (${marker.x}, ${marker.y}, ${marker.z}) - Player ${marker.playerId}`);
});

if (result.markers.length > 10) {
  console.log(`... and ${result.markers.length - 10} more markers`);
}
