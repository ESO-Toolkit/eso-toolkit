import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import uiReducer, {
  setPerfTier,
  setPerfTierOverride,
  setPerfLowNoticeSeen,
} from '../store/ui/uiSlice';

import { PerfLowNotice } from './PerfLowNotice';

const mockEnqueueSnackbar = jest.fn();
jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueueSnackbar }),
}));

const makeStore = () => configureStore({ reducer: { ui: uiReducer } });

const renderNotice = (store: ReturnType<typeof makeStore>) =>
  render(
    <Provider store={store}>
      <PerfLowNotice />
    </Provider>,
  );

describe('PerfLowNotice', () => {
  beforeEach(() => {
    mockEnqueueSnackbar.mockClear();
  });

  it('fires once for an auto-detected low tier and persists as seen', () => {
    const store = makeStore();
    store.dispatch(setPerfTier('low'));
    renderNotice(store);

    expect(mockEnqueueSnackbar).toHaveBeenCalledTimes(1);
    expect(store.getState().ui.perfLowNoticeSeen).toBe(true);
  });

  it('does not fire again once seen', () => {
    const store = makeStore();
    store.dispatch(setPerfTier('low'));
    store.dispatch(setPerfLowNoticeSeen(true));
    renderNotice(store);

    expect(mockEnqueueSnackbar).not.toHaveBeenCalled();
  });

  it('does not fire on medium/high tiers', () => {
    const store = makeStore();
    store.dispatch(setPerfTier('medium'));
    renderNotice(store);

    expect(mockEnqueueSnackbar).not.toHaveBeenCalled();
  });

  it('does not fire for a user-pinned low override (they chose it)', () => {
    const store = makeStore();
    store.dispatch(setPerfTier('medium'));
    store.dispatch(setPerfTierOverride('low'));
    renderNotice(store);

    expect(mockEnqueueSnackbar).not.toHaveBeenCalled();
  });
});
