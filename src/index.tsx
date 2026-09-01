import React from 'react';
import ReactDOM from 'react-dom/client';

import '@fontsource-variable/inter';
import '@fontsource-variable/material-symbols-outlined';
import '@fontsource-variable/space-grotesk';

import App from './App';
import './index.css';
import './styles/view-transitions.css';
import { prefetchLatestReportsForUrl } from './features/latest_reports/latestReportsRequest';
import store, { type RootState } from './store/storeWithHistory';
import { setPerfTier } from './store/ui/uiSlice';
import { heuristicPerfTier } from './utils/detectPerfTier';
import { getRoutePathname } from './utils/envUtils';
import { scheduleItemDataWarmupForPath } from './utils/itemDataWarmup';

// Kick the Latest Reports list request before React mounts. The route is a
// lazy chunk behind the whole provider tree, so left to itself the query only
// went out once boot had finished — seconds of dead time on a slow device while
// the network sat idle. Firing it here overlaps the request with the rest of
// boot; useLatestReportsQuery adopts the in-flight promise on mount. No-op on
// every other route. See features/latest_reports/latestReportsRequest.
prefetchLatestReportsForUrl(getRoutePathname(), window.location.search);

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

// Warm the gear item + icon caches off the critical path, but only for a route
// that can actually use them — the payload is ~1.3 MB compressed and ~18 MB of
// JSON to parse, which is dead weight on a list page like /latest-reports.
// AppLayout re-arms this on navigation into a gear route. See utils/
// itemDataWarmup for the route gate, the connection-quality gate and the
// dynamic-import rationale.
scheduleItemDataWarmupForPath(getRoutePathname());
