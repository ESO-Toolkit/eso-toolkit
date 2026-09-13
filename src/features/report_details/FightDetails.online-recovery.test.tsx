import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { act, render } from '@testing-library/react';

import { EsoLogsClient } from '../../esologsClient';
import { FightFragment } from '../../graphql/gql/graphql';
import damageEventsReducer, { fetchDamageEvents } from '../../store/events_data/damageEventsSlice';

import { FightDetails } from './FightDetails';

const mockUseEagerEventPrefetch = jest.fn();
const mockFightDetailsViewMount = jest.fn();

jest.mock('../../hooks', () => ({
  useCurrentFight: () => ({ fight: { id: 7 }, isFightLoading: false }),
}));

jest.mock('../../hooks/useEagerEventPrefetch', () => ({
  useEagerEventPrefetch: () => mockUseEagerEventPrefetch(),
}));

jest.mock('../../ReportFightContext', () => ({
  useReportFightDetailsNavigation: () => ({
    selectedTabId: 'summary',
    showExperimentalTabs: false,
    setSelectedTab: jest.fn(),
    setShowExperimentalTabs: jest.fn(),
  }),
}));

jest.mock('./FightDetailsView', () => ({
  FightDetailsView: () => {
    mockFightDetailsViewMount();
    return <div>Fight details view</div>;
  },
}));

function setOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => online,
  });
  window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

describe('FightDetails online recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('remounts request hooks exactly once after reconnecting', () => {
    render(<FightDetails />);
    expect(mockUseEagerEventPrefetch).toHaveBeenCalledTimes(1);
    expect(mockFightDetailsViewMount).toHaveBeenCalledTimes(1);

    act(() => setOnline(false));
    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
      jest.runOnlyPendingTimers();
    });

    expect(mockUseEagerEventPrefetch).toHaveBeenCalledTimes(2);
    expect(mockFightDetailsViewMount).toHaveBeenCalledTimes(2);

    act(() => {
      window.dispatchEvent(new Event('online'));
      jest.runOnlyPendingTimers();
    });
    expect(mockUseEagerEventPrefetch).toHaveBeenCalledTimes(2);
  });
});

describe('FightDetails online recovery request suppression contract', () => {
  const fight = {
    id: 7,
    name: 'Recovery test fight',
    startTime: 1000,
    endTime: 2000,
  } as FightFragment;

  const createStore = () =>
    configureStore({
      reducer: {
        events: combineReducers({ damage: damageEventsReducer }),
      },
    });

  const emptyPage = {
    reportData: {
      report: {
        events: { data: [], nextPageTimestamp: null },
      },
    },
  };

  it('suppresses a recovery dispatch while the same request is in flight', async () => {
    const store = createStore();
    const client = {
      query: jest.fn(() => new Promise(() => undefined)),
    } as unknown as EsoLogsClient;

    const firstRequest = store.dispatch(
      fetchDamageEvents({ reportCode: 'ABC123', fight, client }) as never,
    ) as unknown as Promise<unknown> & { abort: () => void };
    const recoveryRequest = store.dispatch(
      fetchDamageEvents({ reportCode: 'ABC123', fight, client }) as never,
    ) as unknown as Promise<{ meta: { condition: boolean } }>;

    await expect(recoveryRequest).resolves.toMatchObject({ meta: { condition: true } });
    expect(client.query).toHaveBeenCalledTimes(1);

    firstRequest.abort();
    await firstRequest;
  });

  it('keeps a fresh successful empty stream cached across a recovery dispatch', async () => {
    const store = createStore();
    const client = {
      query: jest.fn().mockResolvedValue(emptyPage),
    } as unknown as EsoLogsClient;

    await store.dispatch(fetchDamageEvents({ reportCode: 'ABC123', fight, client }) as never);
    expect(client.query).toHaveBeenCalledTimes(2);

    await store.dispatch(fetchDamageEvents({ reportCode: 'ABC123', fight, client }) as never);
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
