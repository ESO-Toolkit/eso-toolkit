/**
 * Utility script to analyze fight 16 data and display bounding box and player coordinate ranges
 */

// First, let's check what's currently loaded in the Redux store
function analyzeFight16() {
  // Access the Redux store if available
  if (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__) {
    const store =
      window.store ||
      (window.__REDUX_DEVTOOLS_EXTENSION__ &&
        window.__REDUX_DEVTOOLS_EXTENSION__.getStore &&
        window.__REDUX_DEVTOOLS_EXTENSION__.getStore());

    if (store) {
      const state = store.getState();
      console.log('Current Redux State:', state);

      // Check if we have report data
      if (state.report && state.report.data) {
        const fights = state.report.data.fights;
        console.log('Available fights:', fights);

        // Find fight 16
        const fight16 = fights?.find((fight) => fight.id === 16);
        if (fight16) {
          console.log('Fight 16 data:', fight16);

          // Display bounding box if available
          if (fight16.boundingBox) {
            console.log('Fight 16 Bounding Box:');
            console.log(`  Min X: ${fight16.boundingBox.minX}`);
            console.log(`  Max X: ${fight16.boundingBox.maxX}`);
            console.log(`  Min Y: ${fight16.boundingBox.minY}`);
            console.log(`  Max Y: ${fight16.boundingBox.maxY}`);
            console.log(`  Width: ${fight16.boundingBox.maxX - fight16.boundingBox.minX}`);
            console.log(`  Height: ${fight16.boundingBox.maxY - fight16.boundingBox.minY}`);

            // Calculate center
            const centerX = (fight16.boundingBox.minX + fight16.boundingBox.maxX) / 2;
            const centerY = (fight16.boundingBox.minY + fight16.boundingBox.maxY) / 2;
            console.log(`  Center: (${centerX}, ${centerY})`);
          } else {
            console.log('No bounding box data available for fight 16');
          }

          // Check for player coordinate data
          console.log('\nChecking for player coordinate data...');

          // Check events data for position information
          if (state.events) {
            const checkEventTypeForPositions = (eventType, events) => {
              if (events && events.length > 0) {
                console.log(`\nAnalyzing ${eventType} events (${events.length} total)...`);

                let playerCoordinates = {
                  minX: Infinity,
                  maxX: -Infinity,
                  minY: Infinity,
                  maxY: -Infinity,
                  coordinates: [],
                };

                let hasPositionData = false;

                events.forEach((event) => {
                  // Check if event is within fight 16 timeframe
                  if (event.timestamp >= fight16.startTime && event.timestamp <= fight16.endTime) {
                    // Check for position data in various resource fields
                    const checkResources = (resources, sourceType) => {
                      if (
                        resources &&
                        typeof resources.x === 'number' &&
                        typeof resources.y === 'number'
                      ) {
                        hasPositionData = true;
                        playerCoordinates.minX = Math.min(playerCoordinates.minX, resources.x);
                        playerCoordinates.maxX = Math.max(playerCoordinates.maxX, resources.x);
                        playerCoordinates.minY = Math.min(playerCoordinates.minY, resources.y);
                        playerCoordinates.maxY = Math.max(playerCoordinates.maxY, resources.y);

                        playerCoordinates.coordinates.push({
                          x: resources.x,
                          y: resources.y,
                          timestamp: event.timestamp,
                          sourceType: sourceType,
                          actorId: sourceType === 'source' ? event.sourceID : event.targetID,
                        });
                      }
                    };

                    if (event.sourceResources) {
                      checkResources(event.sourceResources, 'source');
                    }

                    if (event.targetResources) {
                      checkResources(event.targetResources, 'target');
                    }
                  }
                });

                if (hasPositionData) {
                  console.log(`  Found position data in ${eventType}:`);
                  console.log(
                    `    Player X range: ${playerCoordinates.minX} to ${playerCoordinates.maxX} (width: ${playerCoordinates.maxX - playerCoordinates.minX})`,
                  );
                  console.log(
                    `    Player Y range: ${playerCoordinates.minY} to ${playerCoordinates.maxY} (height: ${playerCoordinates.maxY - playerCoordinates.minY})`,
                  );
                  console.log(
                    `    Total coordinate points: ${playerCoordinates.coordinates.length}`,
                  );

                  // Show sample coordinates
                  if (playerCoordinates.coordinates.length > 0) {
                    console.log(`    Sample coordinates (first 5):`);
                    playerCoordinates.coordinates.slice(0, 5).forEach((coord, i) => {
                      console.log(
                        `      ${i + 1}. (${coord.x}, ${coord.y}) at ${coord.timestamp} - Actor ${coord.actorId} (${coord.sourceType})`,
                      );
                    });
                  }

                  return playerCoordinates;
                } else {
                  console.log(`    No position data found in ${eventType} events`);
                  return null;
                }
              } else {
                console.log(`    No ${eventType} events available`);
                return null;
              }
            };

            // Check different event types for position data
            const damageCoords = checkEventTypeForPositions('damage', state.events.damage?.events);
            const healingCoords = checkEventTypeForPositions(
              'healing',
              state.events.healing?.events,
            );
            const resourceCoords = checkEventTypeForPositions(
              'resource',
              state.events.resources?.events,
            );

            // Combine all coordinate data
            const allCoordinates = [];
            [damageCoords, healingCoords, resourceCoords].forEach((coords) => {
              if (coords && coords.coordinates) {
                allCoordinates.push(...coords.coordinates);
              }
            });

            if (allCoordinates.length > 0) {
              console.log('\n=== COMBINED PLAYER COORDINATE ANALYSIS ===');
              const combinedStats = {
                minX: Math.min(...allCoordinates.map((c) => c.x)),
                maxX: Math.max(...allCoordinates.map((c) => c.x)),
                minY: Math.min(...allCoordinates.map((c) => c.y)),
                maxY: Math.max(...allCoordinates.map((c) => c.y)),
              };

              console.log(`Total coordinate points found: ${allCoordinates.length}`);
              console.log(
                `Player movement X range: ${combinedStats.minX} to ${combinedStats.maxX} (width: ${combinedStats.maxX - combinedStats.minX})`,
              );
              console.log(
                `Player movement Y range: ${combinedStats.minY} to ${combinedStats.maxY} (height: ${combinedStats.maxY - combinedStats.minY})`,
              );

              // Compare with bounding box
              if (fight16.boundingBox) {
                console.log('\n=== COMPARISON WITH FIGHT BOUNDING BOX ===');
                console.log(
                  `Fight bounding box: X(${fight16.boundingBox.minX} to ${fight16.boundingBox.maxX}), Y(${fight16.boundingBox.minY} to ${fight16.boundingBox.maxY})`,
                );
                console.log(
                  `Player coordinates: X(${combinedStats.minX} to ${combinedStats.maxX}), Y(${combinedStats.minY} to ${combinedStats.maxY})`,
                );

                const xWithinBounds =
                  combinedStats.minX >= fight16.boundingBox.minX &&
                  combinedStats.maxX <= fight16.boundingBox.maxX;
                const yWithinBounds =
                  combinedStats.minY >= fight16.boundingBox.minY &&
                  combinedStats.maxY <= fight16.boundingBox.maxY;

                console.log(`Player X coordinates within bounding box: ${xWithinBounds}`);
                console.log(`Player Y coordinates within bounding box: ${yWithinBounds}`);

                if (!xWithinBounds || !yWithinBounds) {
                  console.log('⚠️  Player coordinates extend beyond the fight bounding box!');
                } else {
                  console.log('✅ Player coordinates are within the fight bounding box');
                }
              }
            } else {
              console.log('\n❌ No player coordinate data found in any events');
            }
          } else {
            console.log('No events data available in state');
          }
        } else {
          console.log('Fight 16 not found in available fights');
          console.log(
            'Available fight IDs:',
            fights?.map((f) => f.id),
          );
        }
      } else {
        console.log('No report data available in state');
      }
    } else {
      console.log('Redux store not accessible');
    }
  } else {
    console.log('Redux DevTools not available');
  }
}

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  // Run the analysis
  analyzeFight16();
} else {
  console.log(
    'This script needs to be run in a browser environment with access to the Redux store',
  );
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyzeFight16 };
}
