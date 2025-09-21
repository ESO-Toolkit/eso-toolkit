/**
 * Convert parsed ELMS markers to the format used by the ESO log aggregator
 */

function convertToESOLogFormat(parsedMarkers) {
  // Map player IDs to roles (you may need to adjust this based on your data)
  const playerRoleMap = {
    1: 'tank', 2: 'tank',     // Assuming first few are tanks
    13: 'dps', 24: 'dps', 25: 'dps', 26: 'dps', 27: 'dps', // DPS players
    34: 'healer', 35: 'healer', 36: 'healer', 37: 'healer'  // Healers
  };

  const elmsMarkers = parsedMarkers.markers.map((marker, index) => {
    const role = playerRoleMap[marker.playerId] || 'dps'; // Default to DPS if unknown
    
    return {
      x: marker.x,
      y: marker.y,
      role: role,
      description: `Player ${marker.playerId} Position (Zone ${marker.zoneId})`,
      tankId: role === 'tank' ? marker.playerId.toString() : undefined
    };
  });

  return elmsMarkers;
}

function generateELMSCode(elmsMarkers) {
  let elmsCode = '// ELMS Markers Generated from Input Data\n';
  elmsCode += '// Copy this into ELMS addon\n\n';

  // Get unique tank IDs to assign consistent colors
  const uniqueTankIds = Array.from(
    new Set(elmsMarkers.map(marker => marker.tankId).filter(Boolean))
  );

  elmsMarkers.forEach((marker, index) => {
    let color = 'red'; // default color

    if (marker.role === 'tank' && marker.tankId) {
      const tankIndex = uniqueTankIds.indexOf(marker.tankId);
      color = tankIndex === 0 ? 'red' : tankIndex === 1 ? 'orange' : 'red';
    } else if (marker.role === 'healer') {
      color = 'green';
    } else if (marker.role === 'dps') {
      color = 'blue';
    }

    elmsCode += `-- ${marker.description}\n`;
    elmsCode += `/script ELMS.AddMarker(${marker.x}, ${marker.y}, "${marker.description}", "${color}")\n\n`;
  });

  return elmsCode;
}

// Convert the parsed data
const convertedMarkers = convertToESOLogFormat(result);
const elmsScript = generateELMSCode(convertedMarkers);

console.log('\n=== Converted ELMS Markers ===');
console.log(`Converted ${convertedMarkers.length} markers`);

// Group by role for summary
const roleGroups = convertedMarkers.reduce((groups, marker) => {
  groups[marker.role] = (groups[marker.role] || 0) + 1;
  return groups;
}, {});

console.log('Markers by role:');
Object.entries(roleGroups).forEach(([role, count]) => {
  console.log(`  ${role}: ${count} markers`);
});

console.log('\n=== Generated ELMS Script ===');
console.log(elmsScript);

// Also show coordinate ranges for context
const xCoords = convertedMarkers.map(m => m.x);
const yCoords = convertedMarkers.map(m => m.y);

console.log('\n=== Coordinate Analysis ===');
console.log(`X range: ${Math.min(...xCoords)} to ${Math.max(...xCoords)}`);
console.log(`Y range: ${Math.min(...yCoords)} to ${Math.max(...yCoords)}`);
console.log(`Map coverage: ${Math.max(...xCoords) - Math.min(...xCoords)} x ${Math.max(...yCoords) - Math.min(...yCoords)} units`);
