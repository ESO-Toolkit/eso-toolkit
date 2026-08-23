import React from 'react';
import ReactDOM from 'react-dom/client';

import '@fontsource-variable/inter';
import '@fontsource-variable/material-symbols-outlined';
import '@fontsource-variable/space-grotesk';

import App from './App';
import './index.css';
import './styles/view-transitions.css';
import store, { type RootState } from './store/storeWithHistory';
import { setPerfTier } from './store/ui/uiSlice';
import { heuristicPerfTier } from './utils/detectPerfTier';

// First-paint perf-tier priming. For a first-time visitor with no
// persisted store, the default is 'medium' — which would leave a low-end
// Moto rendering all blur layers until the async GPU benchmark resolves
// seconds later. Run the cheap synchronous heuristic here (RAM + cores +
// prefers-reduced-motion) so a 'low' verdict reaches the first paint.
// Only downgrades: never overwrite a persisted 'low' or 'medium' with a
// more optimistic heuristic, since the async benchmark will do that if
// warranted.
const primeTierFromHeuristic = (): void => {
  const ui = (store.getState() as RootState).ui;
  const sync = heuristicPerfTier();
  const tierOrder = { low: 0, medium: 1, high: 2 } as const;
  if (tierOrder[sync] < tierOrder[ui.perfTier]) {
    store.dispatch(setPerfTier(sync));
  }
};
primeTierFromHeuristic();

// Mirror the effective perf tier onto `<html data-perf="...">` from the
// Redux store. A subscriber (not a useEffect) so the attribute is set
// before React composites — the CSS blur gates in index.css then apply
// to the first paint, avoiding a flash of heavy filters on low-end
// devices.
const applyPerfTierAttr = (): void => {
  const ui = (store.getState() as RootState).ui;
  const effective = ui.perfTierOverride === 'auto' ? ui.perfTier : ui.perfTierOverride;
  if (document.documentElement.dataset.perf !== effective) {
    document.documentElement.dataset.perf = effective;
  }
};
applyPerfTierAttr();
store.subscribe(applyPerfTierAttr);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  // StrictMode disabled due to incompatibility with WebGL contexts
  //
  // Strict Mode intentionally unmounts and remounts components during development
  // to help find bugs. However, this causes the WebGL context in the 3D replay
  // viewer to be destroyed and rapidly recreated, which leads to context loss.
  //
  // The WebGL context loss handlers in Arena3D.tsx help with real context loss
  // scenarios (GPU issues, tab backgrounding, etc.) but cannot prevent the
  // context destruction caused by Strict Mode's remounting behavior.
  //
  // Note: Production builds don't use Strict Mode, so this only affects development.
  <App />,
);

// Warm the item data + icon caches off the critical path. A STATIC import of
// itemIconResolver here would drag the loadout data module graph (+ ~2 MB set
// collections) into the entry chunk, parsed before first paint on every
// page — the dynamic import keeps that code in its own async chunk, and
// idle scheduling keeps even the fetches (icon JSON chunk + the ~12 MB
// itemIdMap JSON asset) out of the startup window. This is best-effort:
// consumers that need the data (GearPicker, Extract Build, /bv) await
// preloadIconData()/preloadItemData() themselves and retry on failure.
const warmItemIconData = (): void => {
  void import('./features/loadout-manager/utils/itemIconResolver')
    .then((m) => m.preloadIconData())
    .catch(() => {});
  void import('./features/loadout-manager/data/itemIdMap')
    .then((m) => m.preloadItemData())
    .catch(() => {});
};

type NavigatorWithConnection = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean };
};
const connection = (navigator as NavigatorWithConnection).connection;
const shouldWarmLargeData =
  !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '');

// Do not force a multi-megabyte background transfer in browsers without a true
// idle callback. Feature consumers already await these datasets when needed.
if (shouldWarmLargeData && typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(warmItemIconData, { timeout: 15000 });
}
