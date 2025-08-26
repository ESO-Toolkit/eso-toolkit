<<<<<<< HEAD
// DEPRECATED: This file contained complex object-creating selectors that caused infinite renders.
// Components should use basic selectors from store/events/eventsSelectors directly and
// compute derived state using useMemo hooks in components instead.

export {};

// If you need to access events data, use:
// - selectBuffEvents for buff events
// - selectEventPlayers for player data
// - selectEventCharacters for character data
// - selectEventsLoadingState for loading states
// - selectMasterDataLoadingState for master data loading states

// Then compute loading states and other derived data in your component using useMemo
// to avoid creating new objects every render that cause infinite re-renders.
=======
// DEPRECATED: This file contained complex object-creating selectors that caused infinite renders.
// Components should use basic selectors from store/events/eventsSelectors directly and
// compute derived state using useMemo hooks in components instead.

// If you need to access events data, use:
// - selectBuffEvents for buff events
// - selectEventPlayers for player data
// - selectEventCharacters for character data
// - selectEventsLoadingState for loading states
// - selectMasterDataLoadingState for master data loading states

// Then compute loading states and other derived data in your component using useMemo
// to avoid creating new objects every render that cause infinite re-renders.
>>>>>>> pr-21
