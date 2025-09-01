// Comprehensive loading state reset script
// Run this in browser console to clear all stuck loading states

console.log('🔄 Starting comprehensive loading state reset...');

// Clear all event data
window.store.dispatch({ type: 'events/clearAll' });
console.log('✅ Cleared all events data');

// Clear player data
window.store.dispatch({ type: 'playerData/clearPlayerData' });
console.log('✅ Cleared player data');

// Reset master data loading state
window.store.dispatch({ type: 'masterData/resetLoadingState' });
console.log('✅ Reset master data loading state');

// Reset individual loading states for any that might be stuck
window.store.dispatch({ type: 'playerData/resetPlayerDataLoading' });
window.store.dispatch({ type: 'combatantInfoEvents/resetCombatantInfoEventsLoading' });
window.store.dispatch({ type: 'damageEvents/resetDamageEventsLoading' });
console.log('✅ Reset all individual loading states');

// Log current state for debugging
const state = window.store.getState();
console.log('📊 Current loading states after reset:', {
  masterDataLoading: state.masterData?.loading,
  playerDataLoading: state.playerData?.loading,
  damageEventsLoading: state.events?.damage?.loading,
  combatantInfoEventsLoading: state.events?.combatantInfo?.loading,
  castEventsLoading: state.events?.casts?.loading,
  healingEventsLoading: state.events?.healing?.loading,
});

console.log('🎉 Loading state reset complete! Try navigating to a fight now.');