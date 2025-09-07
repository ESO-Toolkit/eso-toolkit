// Debug script to check for pet events in fight replay
// This should be run in the browser console while on the fight replay page

function debugPetEvents() {
  console.log('=== Pet Events Debug ===');

  // Get the Redux state (assuming it's available on window)
  const state = window.__REDUX_DEVTOOLS_EXTENSION__ && window.store?.getState();
  if (!state) {
    console.log('Redux state not available. Please ensure Redux DevTools is enabled.');
    return;
  }

  // Get events and actors data
  const damageEvents = state.eventsData?.damage?.events || [];
  const healingEvents = state.eventsData?.healing?.events || [];
  const deathEvents = state.eventsData?.deaths?.events || [];
  const actorsById = state.reportMasterData?.reportData?.actorsById || {};

  console.log(`Total damage events: ${damageEvents.length}`);
  console.log(`Total healing events: ${healingEvents.length}`);
  console.log(`Total death events: ${deathEvents.length}`);

  // Find all pet actors
  const petActors = Object.values(actorsById).filter(
    (actor) => actor && actor.type === 'Pet' && actor.subType === 'Pet',
  );

  console.log(
    `Found ${petActors.length} pet actors:`,
    petActors.map((pet) => ({
      id: pet.id,
      name: pet.name,
      petOwner: pet.petOwner,
    })),
  );

  // Find events involving pets
  const petIds = new Set(petActors.map((pet) => pet.id));

  const petDamageEvents = damageEvents.filter(
    (event) => petIds.has(event.sourceID) || petIds.has(event.targetID),
  );

  const petHealingEvents = healingEvents.filter(
    (event) => petIds.has(event.sourceID) || petIds.has(event.targetID),
  );

  const petDeathEvents = deathEvents.filter((event) => petIds.has(event.targetID));

  console.log(`Pet damage events: ${petDamageEvents.length}`);
  console.log(`Pet healing events: ${petHealingEvents.length}`);
  console.log(`Pet death events: ${petDeathEvents.length}`);

  if (petDamageEvents.length > 0) {
    console.log('Sample pet damage events:', petDamageEvents.slice(0, 5));
  }

  if (petHealingEvents.length > 0) {
    console.log('Sample pet healing events:', petHealingEvents.slice(0, 5));
  }

  if (petDeathEvents.length > 0) {
    console.log('Sample pet death events:', petDeathEvents.slice(0, 5));
  }

  // Check if any pets are currently visible in actor positions
  const actorPositions = state.fightReplay?.actorPositions?.timeline?.actorTimelines || {};
  const petTimelines = Object.values(actorPositions).filter(
    (timeline) => timeline && timeline.type === 'pet',
  );

  console.log(`Pet timelines in actor positions: ${petTimelines.length}`);
  if (petTimelines.length > 0) {
    console.log(
      'Pet timelines:',
      petTimelines.map((timeline) => ({
        actorId: timeline.actorId,
        name: timeline.name,
        type: timeline.type,
      })),
    );
  }
}

// Export for manual execution
window.debugPetEvents = debugPetEvents;

console.log('Pet events debug function loaded. Run debugPetEvents() in console.');
