import { fireEvent, render } from '@testing-library/react';

const mockAdoptSession = jest.fn();
const mockCaptureSession = jest.fn();
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('./savedBuildStorage', () => ({
  adoptBuildStorageSessionGeneration: (...args: unknown[]) => mockAdoptSession(...args),
  BUILD_STORAGE_SESSION_GENERATION_KEY: 'eso-build-storage-session-v1',
  captureBuildStorageSessionGeneration: (...args: unknown[]) => mockCaptureSession(...args),
}));

import { BuildStorageSessionSync } from './BuildStorageSessionSync';

const fireStorageEvent = (key: string | null, newValue: string | null): void => {
  const event = new Event('storage') as StorageEvent;
  Object.defineProperties(event, {
    key: { value: key },
    newValue: { value: newValue },
  });
  fireEvent(window, event);
};

describe('BuildStorageSessionSync', () => {
  beforeEach(() => {
    mockAdoptSession.mockReset();
    mockCaptureSession.mockReset().mockReturnValue('session-1');
    mockDispatch.mockReset();
  });

  it('clears account-bound state before adopting another tab session', () => {
    render(<BuildStorageSessionSync />);

    fireStorageEvent('eso-build-storage-session-v1', 'session-2');

    expect(mockDispatch.mock.calls.map(([action]) => action.type)).toEqual([
      'savedBuilds/clearSavedBuilds',
      'buildEditor/resetBuild',
    ]);
    expect(mockAdoptSession).toHaveBeenCalledWith('session-2');
    expect(mockDispatch.mock.invocationCallOrder[1]).toBeLessThan(
      mockAdoptSession.mock.invocationCallOrder[0],
    );
  });

  it('ignores unrelated, removed, and already-adopted session values', () => {
    render(<BuildStorageSessionSync />);

    fireStorageEvent('unrelated', 'session-2');
    fireStorageEvent('eso-build-storage-session-v1', null);
    fireStorageEvent('eso-build-storage-session-v1', 'session-1');

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockAdoptSession).not.toHaveBeenCalled();
  });

  it('stops synchronizing after unmount', () => {
    const { unmount } = render(<BuildStorageSessionSync />);
    unmount();

    fireStorageEvent('eso-build-storage-session-v1', 'session-2');

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockAdoptSession).not.toHaveBeenCalled();
  });
});
