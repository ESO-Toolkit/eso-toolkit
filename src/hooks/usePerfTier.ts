import { useSelector } from 'react-redux';

import { selectEffectivePerfTier, selectPerfTierResolved } from '../store/ui/uiSelectors';
import type { PerfTier } from '../store/ui/uiSlice';

// Read the effective performance tier (override wins over detected).
// Feature gates should use this rather than doing their own detection —
// single source of truth, persisted via Redux Persist, reactive to the
// user's override.
export const usePerfTier = (): PerfTier => useSelector(selectEffectivePerfTier);

// True once async GPU detection has resolved (or was skipped for a manual override).
// Heavy mounts gate on this so first paint uses the real tier, not the placeholder.
export const usePerfTierResolved = (): boolean => useSelector(selectPerfTierResolved);
