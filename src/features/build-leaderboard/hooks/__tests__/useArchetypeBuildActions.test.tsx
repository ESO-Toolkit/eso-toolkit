import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import savedBuildsReducer from '../../../../store/saved_builds/savedBuildsSlice';
import { dpsParsesApi } from '../../api/dpsParsesApi';
import type { BuildCluster } from '../../types/clustering.types';
import type { DpsParseBuildResponse } from '../../types/dpsParses.types';
import { toBuildExtractionData, useArchetypeBuildActions } from '../useArchetypeBuildActions';

const mockNavigate = jest.fn();
const mockEnqueue = jest.fn();
const mockAssertSessionCurrent = jest.fn();
const mockAcquireSession = jest.fn();
const mockPutSavedBuildRecord = jest.fn();

jest.mock('../../../../store/saved_builds/savedBuildStorage', () => ({
  acquireBuildStorageSessionGeneration: (...args: unknown[]) => mockAcquireSession(...args),
  assertBuildStorageSessionCurrent: (...args: unknown[]) => mockAssertSessionCurrent(...args),
  putSavedBuildRecord: (...args: unknown[]) => mockPutSavedBuildRecord(...args),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueue }),
}));

/** Shaped like a real /build response: 12 gear pieces, 12 talents. */
const BUILD_RESPONSE: DpsParseBuildResponse = {
  parseId: '4-122-abc',
  playerName: 'Someone',
  combatant: {
    gear: [
      {
        slot: 0,
        itemId: 209109,
        setId: 777,
        name: 'Corpseburster Helmet',
        icon: 'a',
        trait: 1,
        cp: 160,
        enchantType: 35,
        enchantQuality: 5,
      },
      {
        slot: 1,
        itemId: 153319,
        setId: 456,
        name: 'Azureblight Jack',
        icon: 'b',
        trait: 1,
        cp: 160,
        enchantType: 35,
        enchantQuality: 5,
      },
      {
        slot: 2,
        itemId: 95180,
        setId: 270,
        name: 'Slimecraw Arm Cops',
        icon: 'c',
        trait: 1,
        cp: 160,
        enchantType: 35,
        enchantQuality: 5,
      },
    ],
    talents: Array.from({ length: 12 }, (_, i) => ({
      slot: i,
      abilityId: 100_000 + i,
      name: `Ability ${i}`,
      icon: `icon-${i}`,
    })),
    sets: [
      { setId: 777, name: 'Corpseburster' },
      { setId: 456, name: 'Azureblight Reaper' },
      { setId: 270, name: 'Slimecraw' },
    ],
  },
};

const CLUSTER = {
  id: 'c0',
  label: 'Corpseburster + Azureblight Reaper',
  size: 20,
  share: 0.5,
  memberParseIds: ['4-122-abc'],
  medoidParseId: '4-122-abc',
  dps: { min: 1, q1: 1, median: 300_000, q3: 1, p90: 1, max: 1, mean: 1, count: 20 },
  core: [],
  flex: [],
  cohesion: 0.1,
} as unknown as BuildCluster;

function makeWrapper(strictMode = false) {
  const store = configureStore({ reducer: { savedBuilds: savedBuildsReducer } });
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const content = (
      <Provider store={store}>
        <MemoryRouter>{children}</MemoryRouter>
      </Provider>
    );
    return strictMode ? <React.StrictMode>{content}</React.StrictMode> : content;
  };
  return { store, wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(dpsParsesApi, 'getBuild').mockResolvedValue(BUILD_RESPONSE);
  mockAcquireSession.mockResolvedValue('session-1');
  mockAssertSessionCurrent.mockImplementation(() => undefined);
  mockPutSavedBuildRecord.mockResolvedValue(undefined);
});

describe('useArchetypeBuildActions', () => {
  /**
   * The editor loads builds by ?id=, so the build must be SAVED before
   * navigating — otherwise the button lands on an empty editor.
   */
  it('saves the medoid build and navigates to it by id', async () => {
    const { store, wrapper } = makeWrapper();
    const { result } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    await act(async () => {
      await result.current.openInEditor(CLUSTER);
    });

    const saved = store.getState().savedBuilds.builds;
    expect(saved).toHaveLength(1);
    expect(mockPutSavedBuildRecord).toHaveBeenCalledWith(expect.any(Object), 'session-1');
    expect(mockNavigate).toHaveBeenCalledWith(`/build-editor?id=${saved[0].id}`);
  });

  it('does not persist live state or navigate after the storage session rotates', async () => {
    mockAssertSessionCurrent.mockImplementationOnce(() => {
      throw new Error('storage session changed');
    });
    const { store, wrapper } = makeWrapper();
    const { result } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    await act(async () => {
      await result.current.openInEditor(CLUSTER);
    });

    expect(mockPutSavedBuildRecord).toHaveBeenCalledWith(expect.any(Object), 'session-1');
    expect(store.getState().savedBuilds.builds).toHaveLength(0);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
  it('produces a real build from the parse, not an empty shell', async () => {
    const { store, wrapper } = makeWrapper();
    const { result } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    await act(async () => {
      await result.current.openInEditor(CLUSTER);
    });

    const { build } = store.getState().savedBuilds.builds[0];
    expect(build.name).toBe(CLUSTER.label);
    expect(build.shortDescription).toBe(
      'Observed sampled archetype — 20 sampled top-ranked parses share this pattern.',
    );
    expect(build.setups.length).toBeGreaterThan(0);

    // Gear and skills actually made it across the conversion.
    const setup = build.setups[0];
    expect(Object.keys(setup.gear).length).toBeGreaterThan(0);
    expect(Object.keys(setup.skills).length).toBeGreaterThan(0);
  });

  it('does not invent item quality when the ranking payload omits it', () => {
    const extracted = toBuildExtractionData(BUILD_RESPONSE);

    expect(extracted.gear).not.toHaveLength(0);
    extracted.gear.forEach((piece) => {
      expect(piece).not.toHaveProperty('quality');
    });
  });

  it('saves without navigating for Save to My Builds', async () => {
    const { store, wrapper } = makeWrapper();
    const { result } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    await act(async () => {
      await result.current.saveToMyBuilds(CLUSTER);
    });

    expect(store.getState().savedBuilds.builds).toHaveLength(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith(expect.stringContaining(CLUSTER.label), {
      variant: 'success',
    });
  });

  it('surfaces a fetch failure instead of navigating', async () => {
    jest.spyOn(dpsParsesApi, 'getBuild').mockRejectedValue(new Error('Parse not found'));
    const { store, wrapper } = makeWrapper();
    const { result } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    await act(async () => {
      await result.current.openInEditor(CLUSTER);
    });

    expect(mockEnqueue).toHaveBeenCalledWith('Parse not found', { variant: 'error' });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(store.getState().savedBuilds.builds).toHaveLength(0);
  });

  it('clears the pending action after it settles', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    await act(async () => {
      await result.current.openInEditor(CLUSTER);
    });

    await waitFor(() => expect(result.current.pendingAction).toBeNull());
  });

  /**
   * A single boolean could not tell the two apart, so saving rendered the primary
   * button as the editor-opening action.
   */
  it('reports which action is in flight, not merely that one is', async () => {
    let release: ((v: typeof BUILD_RESPONSE) => void) | undefined;
    jest.spyOn(dpsParsesApi, 'getBuild').mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    act(() => {
      void result.current.saveToMyBuilds(CLUSTER);
    });

    await waitFor(() => expect(result.current.pendingAction?.kind).toBe('save'));
    expect(result.current.pendingAction?.clusterId).toBe(CLUSTER.id);

    await act(async () => {
      release?.(BUILD_RESPONSE);
    });
    await waitFor(() => expect(result.current.pendingAction).toBeNull());
  });

  /** Double-clicking Save must not save the build twice. */
  it('ignores a second action while one is already running', async () => {
    let release: ((v: typeof BUILD_RESPONSE) => void) | undefined;
    const spy = jest.spyOn(dpsParsesApi, 'getBuild').mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const { store, wrapper } = makeWrapper();
    const { result } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    act(() => {
      void result.current.saveToMyBuilds(CLUSTER);
    });
    await waitFor(() => expect(result.current.pendingAction).not.toBeNull());

    // Second click while the first is still outstanding.
    await act(async () => {
      await result.current.saveToMyBuilds(CLUSTER);
    });
    expect(spy).toHaveBeenCalledTimes(1);

    await act(async () => {
      release?.(BUILD_RESPONSE);
    });
    expect(store.getState().savedBuilds.builds).toHaveLength(1);
  });

  it('passes an abort signal to the build request', async () => {
    const spy = jest.spyOn(dpsParsesApi, 'getBuild');
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    await act(async () => {
      await result.current.openInEditor(CLUSTER);
    });

    expect(spy).toHaveBeenCalledWith(CLUSTER.medoidParseId, expect.any(AbortSignal));
  });

  it('remains usable after StrictMode replays its lifecycle effect', async () => {
    const { store, wrapper } = makeWrapper(true);
    const { result } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    await act(async () => {
      await result.current.openInEditor(CLUSTER);
    });

    expect(store.getState().savedBuilds.builds).toHaveLength(1);
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/build-editor\?id=/));
  });

  it('aborts an in-flight request and performs no side effects after unmount', async () => {
    let requestSignal: AbortSignal | undefined;
    let release: ((response: DpsParseBuildResponse) => void) | undefined;
    jest.spyOn(dpsParsesApi, 'getBuild').mockImplementation((_parseId, signal) => {
      requestSignal = signal;
      return new Promise((resolve) => {
        release = resolve;
      });
    });

    const { store, wrapper } = makeWrapper();
    const { result, unmount } = renderHook(() => useArchetypeBuildActions(), { wrapper });

    act(() => {
      void result.current.openInEditor(CLUSTER);
    });
    await waitFor(() => expect(result.current.pendingAction).not.toBeNull());

    act(() => {
      unmount();
      release?.(BUILD_RESPONSE);
    });
    await Promise.resolve();

    expect(requestSignal?.aborted).toBe(true);
    expect(store.getState().savedBuilds.builds).toHaveLength(0);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
