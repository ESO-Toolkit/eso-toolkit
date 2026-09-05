import { renderHook } from '@testing-library/react';

import { actorPositionsActions } from '@/store/worker_results/taskSlices';
import { workerManager } from '@/workers';

import { useReplayTeardown } from './useReplayTeardown';

jest.mock('@/workers', () => ({
  workerManager: { destroyPool: jest.fn() },
}));

const destroyPool = workerManager.destroyPool as jest.MockedFunction<
  typeof workerManager.destroyPool
>;

describe('useReplayTeardown', () => {
  let dispatch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatch = jest.fn();
  });

  const render = (isMobileReplay: boolean) =>
    renderHook(({ mobile }) => useReplayTeardown(dispatch, mobile), {
      initialProps: { mobile: isMobileReplay },
    });

  it('tears down the replay pool on unmount', () => {
    const { unmount } = render(false);
    expect(destroyPool).not.toHaveBeenCalled();

    unmount();
    expect(destroyPool).toHaveBeenCalledWith('replay');
  });

  it('clears the position result on unmount only on mobile', () => {
    const desktop = render(false);
    desktop.unmount();
    expect(dispatch).not.toHaveBeenCalled();

    dispatch.mockClear();
    const mobile = render(true);
    mobile.unmount();
    expect(dispatch).toHaveBeenCalledWith(actorPositionsActions.clearResult());
  });

  // The regression this hook exists for: useIsMobileReplay is a LIVE media query that flips
  // mid-session (a phone rotating into landscape). If it were an effect dependency, rotating
  // would run the teardown while the user is still in the replay — killing the in-flight
  // position compute and, on mobile -> desktop, stranding the arena on "Loading 3D Arena...".
  it('does NOT tear down when the mobile flag flips mid-session', () => {
    const { rerender } = render(true);

    rerender({ mobile: false }); // phone rotates / window widens past the breakpoint
    expect(destroyPool).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();

    rerender({ mobile: true }); // and back again
    expect(destroyPool).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('uses the CURRENT mobile value at unmount, not the value it mounted with', () => {
    // Mounted on desktop, unmounted after flipping to mobile: the large result must still be
    // dropped, so the ref has to be read at teardown time rather than captured at mount.
    const { rerender, unmount } = render(false);
    rerender({ mobile: true });
    unmount();

    expect(dispatch).toHaveBeenCalledWith(actorPositionsActions.clearResult());
    expect(destroyPool).toHaveBeenCalledWith('replay');
  });
});
