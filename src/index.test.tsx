import { startFieldWebVitalsCollection } from './reportWebVitals';
import { trackFieldWebVital } from './utils/analytics';

jest.mock('react-dom/client', () => {
  const createRoot = () => ({ render: () => undefined });
  return { __esModule: true, default: { createRoot }, createRoot };
});
jest.mock('@fontsource-variable/inter', () => ({}));
jest.mock('@fontsource-variable/material-symbols-outlined', () => ({}));
jest.mock('@fontsource-variable/space-grotesk', () => ({}));
jest.mock('./App', () => () => null);
jest.mock('./features/latest_reports/latestReportsRequest', () => ({
  prefetchLatestReportsForUrl: jest.fn(),
}));
jest.mock('./reportWebVitals', () => ({ startFieldWebVitalsCollection: jest.fn() }));
jest.mock('./store/storeWithHistory', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({ ui: { perfTier: 'medium' } })),
    subscribe: jest.fn(),
  },
}));
jest.mock('./store/ui/uiSlice', () => ({ setPerfTier: jest.fn() }));
jest.mock('./utils/analytics', () => ({ trackFieldWebVital: jest.fn() }));
jest.mock('./utils/detectPerfTier', () => ({ heuristicPerfTier: jest.fn(() => 'medium') }));
jest.mock('./utils/envUtils', () => ({ getRoutePathname: jest.fn(() => '/') }));
jest.mock('./utils/itemDataWarmup', () => ({ scheduleItemDataWarmupForPath: jest.fn() }));

describe('application bootstrap telemetry', () => {
  it('registers the privacy-safe field Web Vitals transport during startup', () => {
    jest.isolateModules(() => {
      require('./index');
    });

    expect(startFieldWebVitalsCollection).toHaveBeenCalledWith({ onSample: trackFieldWebVital });
  });
});
